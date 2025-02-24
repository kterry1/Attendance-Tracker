import { resolvers } from '../resolvers';
import { GraphQLResolveInfo } from 'graphql';
import { PrismaClient } from '@prisma/client';

function getCallableResolver<TResult, TParent, TContext, TArgs>(
  resolver: any
): (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> {
  if (typeof resolver === 'function') {
    return resolver;
  } else if (resolver && typeof resolver.resolve === 'function') {
    return resolver.resolve;
  }
  throw new Error('Resolver is not callable');
}

describe('resolvers', () => {
  describe('users', () => {
    it('should return users with roles', async () => {
      // Create a partial mock for PrismaClient. You only need to implement what your test uses.
      const mockPrisma = {
        user: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1,
              name: 'John Doe',
              roles: [{ role: 'ADMIN' }],
            },
            {
              id: 2,
              name: 'Tom Smith',
              roles: [{ role: 'STUDENT' }],
            },
          ]),
        },
      };

      // Cast the mock to the expected PrismaClient type.
      const mockContext = {
        prisma: mockPrisma,
        validatedUser: { id: 1, roles: ['ADMIN'] },
        res: null as any,
        req: null as any,
      } as unknown as {
        prisma: PrismaClient;
        validatedUser: any;
        res: any;
        req: any;
      };

      // Get the callable users resolver
      const usersResolver = getCallableResolver(resolvers.Query.users);

      const result = await usersResolver(
        null,
        {},
        mockContext,
        {} as GraphQLResolveInfo
      );
      expect(result).toEqual([
        {
          id: '1',
          name: 'John Doe',
          roles: ['ADMIN'],
        },
        {
          id: '2',
          name: 'Tom Smith',
          roles: ['STUDENT'],
        },
      ]);
    });
  });
});
