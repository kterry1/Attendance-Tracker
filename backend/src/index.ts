import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';
import { gql } from 'graphql-tag';
import jwt from 'jsonwebtoken';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { resolvers, ValidatedUser } from './resolvers';
import { rateLimit } from './redis/rate-limit';
import authDirectiveTransformer from './authentication-directive';
import { GraphQLError } from 'graphql';
require('dotenv').config();

const typeDefs = gql(
  readFileSync(path.resolve(__dirname, 'schema.graphql'), {
    encoding: 'utf-8',
  })
);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// // Express middleware for token extraction
function extractToken(req: any, res: any) {
  // Check for token in the cookies first
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  // Fallback to checking the Authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    } else {
      return res
        .status(401)
        .json({ error: 'Token error in Authorization header' });
    }
  }

  return null; // No token provided
}

async function startApolloServers() {
  // Create the executable schema with typeDefs and resolvers
  let schema = makeExecutableSchema({ typeDefs, resolvers });

  // Apply the auth directive transformer
  schema = authDirectiveTransformer(schema, 'auth');

  const server = new ApolloServer({
    schema, // Use the transformed schema with @auth functionality
  });

  const { url } = await startStandaloneServer(server, {
    context: async ({ req, res }: { req: any; res: any }) => {
      const ip =
        req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        'unknown-ip';

      // Apply rate limiting (100 requests per minute per IP)
      await rateLimit(ip as string, 100, 60);

      let validatedUser: ValidatedUser | null = null;
      const extractedToken = extractToken(req, res);
      if (extractedToken) {
        try {
          validatedUser = jwt.verify(
            extractedToken,
            process.env.JWT_SECRET as string
          ) as ValidatedUser;

          const tokenIssuedAt: Date = new Date(validatedUser.iat * 1000);

          const dbUser = await prisma.user.findUnique({
            where: { id: validatedUser.id },
          });
          if (!dbUser || tokenIssuedAt < dbUser?.lastLogout) {
            res.clearCookie('token', {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
            throw new GraphQLError(
              'Your session has expired. Please log in again.',
              { extensions: { code: 'UNAUTHENTICATED' } }
            );
          }
        } catch (error) {
          // If the error is already a GraphQLError, rethrow it as is.
          if (error instanceof GraphQLError) {
            throw error;
          }
          if (error instanceof Error && error.name === 'TokenExpiredError') {
            console.warn('Token has expired. Clearing token.');
            // Clear expired token
            res.clearCookie('token', {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          }
          console.error('JWT verification error:', error);
          throw new GraphQLError('Invalid authentication token.', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }
      }

      return {
        prisma, // ORM client
        validatedUser, // User is added to the context for @auth directive
        res,
        req,
      };
    },
  });

  console.log(`🚀 Server running at ${url}`);
}

startApolloServers();
