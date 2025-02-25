import { resolvers } from '../resolvers';
import { PrismaClient } from '@prisma/client';
import { Role } from '../generated-types';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function getCallableResolver<TResult, TParent, TContext, TArgs>(
  resolver: any
): (parent: TParent, args: TArgs, context: TContext) => Promise<TResult> {
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
      type TMockPrisma = {
        prisma: DeepPartial<PrismaClient>;
        validatedUser: { id: number; roles: Array<Role> };
        res: any;
        req: any;
      };
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
      const mockContext: TMockPrisma = {
        prisma: mockPrisma,
        validatedUser: { id: 1, roles: [Role.Admin] },
        res: null,
        req: null,
      };

      // Get the callable users resolver
      const usersResolver = getCallableResolver(resolvers.Query.users);

      const result = await usersResolver(null, {}, mockContext);
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
