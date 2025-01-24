import { PrismaClient } from "@prisma/client";
import { Resolvers, User, Role } from "./generated-types";

export const resolvers: Resolvers<{ prisma: PrismaClient }> = {
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
          roles: user.roles.map((role) => role.role as Role),
        };
      });
    },
  },
};
