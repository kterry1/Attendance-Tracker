import { GraphQLScalarType, Kind } from 'graphql';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { Resolvers, User, Role } from './generated-types';
type UserRole = {
  id: number;
  role: Role;
  user: User;
  userId: number;
};

type validatedUser = {
  id: number;
  roles: Role[];
};

export const resolvers: Resolvers<{
  prisma: PrismaClient;
  validatedUser: validatedUser;
  res: any;
  req: any;
}> = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return new Date(value as Date); // value from the client
    },
    serialize(value) {
      return (value as Date).getTime(); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(+ast.value); // ast value is always in string format
      }
      return null;
    },
  }),
  Query: {
    users: async (parent, args, context) => {
      const users = await context.prisma.user.findMany({
        include: {
          roles: true,
        },
      });
      return users.map((user) => {
        return {
          ...user,
          id: user.id.toString(),
          roles: user.roles.map((role: UserRole) => role.role),
        };
      });
    },
    me: async (parent, args, context) => {
      if (!context.validatedUser) {
        throw new Error('You are not authenticated');
      }

      const user = await context.prisma.user.findUnique({
        where: {
          id: context.validatedUser.id,
        },
        include: {
          roles: true,
        },
      });
      return {
        ...user,
        id: user.id.toString(),
        roles: user.roles.map((role: UserRole) => role.role),
      };
    },
  },
  Mutation: {
    createUser: async (
      parent,
      {
        name,
        password,
        roles,
      }: { name: string; password: string; roles: Role[] },
      context
    ) => {
      const hashedPassword = await bcrypt.hash(password, 10);
      const uniqueRoles = [...new Set(roles)];
      const user = await context.prisma.user.create({
        data: {
          name,
          password: hashedPassword,
          roles: {
            create: uniqueRoles.map((role) => ({ role })),
          },
        },
      });

      const createdUser = await context.prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
          name: true,
          roles: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return {
        ...createdUser,
        id: createdUser.id.toString(),
        // This mapping of roles is getting duplicated quite a bit
        roles: createdUser.roles.map((role: UserRole) => role.role),
      };
    },
    login: async (
      parent,
      { username, password }: { username: string; password: string },
      context
    ) => {
      const user = await context.prisma.user.findUnique({
        where: {
          name: username,
        } as { name: string },
        select: {
          id: true,
          password: true,
          roles: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }
      const validatedPassword = await bcrypt.compare(password, user.password);

      if (!validatedPassword) {
        throw new Error('Invalid credentials');
      }

      // Create a JWT token. The payload includes user id
      const token = jwt.sign(
        { id: user.id, roles: user.roles.map((role: UserRole) => role.role) },
        process.env.JWT_SECRET,
        {
          expiresIn: '1h',
        }
      );

      // Set the token in a cookie
      context.res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // secure in production
        sameSite: 'lax',
        maxAge: 3600000, // 1 hour in milliseconds
      });

      // Return the token with encoded user id
      return {
        token,
      };
    },
  },
};
