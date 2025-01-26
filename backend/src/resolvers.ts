import { PrismaClient } from '@prisma/client';
import { Resolvers, User, Role } from './generated-types';
import { GraphQLScalarType, Kind } from 'graphql';

type UserRole = {
  id: number;
  role: Role;
  user: User;
  userId: number;
};

export const resolvers: Resolvers<{ prisma: PrismaClient }> = {
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
          id: user.id.toString(),
          name: user.name,
          roles: user.roles.map((role: UserRole) => role.role),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      });
    },
  },
  Mutation: {
    createUser: async (
      parent,
      { name, roles }: { name: string; roles: Role[] },
      context
    ) => {
      const user = await context.prisma.user.create({
        data: { name },
      });

      await Promise.all(
        roles.map(async (role) => {
          await context.prisma.userRole.create({
            data: {
              role: role,
              user: {
                connect: {
                  id: user.id,
                },
              },
            },
          });
        })
      );

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
        roles: createdUser.roles.map((role: UserRole) => role.role),
      };
    },
  },
};
