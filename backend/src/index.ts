import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';
import { gql } from 'graphql-tag';
import jwt from 'jsonwebtoken';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { resolvers } from './resolvers';
import { rateLimit } from './redis/rate-limit';
import authDirectiveTransformer from './authentication-directive';

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

async function startApolloServers() {
  // Create the executable schema with typeDefs and resolvers
  let schema = makeExecutableSchema({ typeDefs, resolvers });

  // Apply the auth directive transformer
  schema = authDirectiveTransformer(schema, 'auth');

  const server = new ApolloServer({
    schema, // Use the transformed schema with @auth functionality
  });

  const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => {
      const ip =
        req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        'unknown-ip';

      // Apply rate limiting (100 requests per minute per IP)
      await rateLimit(ip as string, 100, 60);

      let user = null;
      const token = req.headers.authorization || '';

      try {
        if (token) {
          user = jwt.verify(token, process.env.JWT_SECRET as string);
        }
      } catch (error) {
        console.error('Error verifying token:', error);
      }

      return {
        prisma, // ORM client
        user, // User is added to the context for @auth directive
      };
    },
  });

  console.log(`🚀 Server running at ${url}`);
}

startApolloServers();
