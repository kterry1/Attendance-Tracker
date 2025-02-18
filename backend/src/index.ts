import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';
import { gql } from 'graphql-tag';

import { resolvers } from './resolvers';
import { rateLimit } from './redis/rate-limit';

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
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => {
      const ip =
        req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        'unknown-ip';

      // Apply rate limiting (100 requests per minute per IP)
      await rateLimit(ip as string, 100, 60);
      return {
        prisma,
      };
    },
  });

  console.log(`🚀 Server running at ${url}`);
}

startApolloServers();
