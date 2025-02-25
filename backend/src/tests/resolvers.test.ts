import { Prisma, PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { GraphQLResolveInfo } from 'graphql';
import { resolvers } from '../resolvers';
import { Role, Resolver } from '../generated-types';

function getCallableResolver<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>
): (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info?: Partial<GraphQLResolveInfo>
) => Promise<TResult> | TResult {
  if (typeof resolver === 'function') {
    return resolver;
  } else if (resolver && typeof resolver.resolve === 'function') {
    return resolver.resolve;
  }
  throw new Error('Resolver is not callable');
}

type TMockContext = {
  prisma: PrismaClient;
  validatedUser: { id: number; roles: Array<Role> };
  res: any;
  req: Response;
};

const hashedPassword =
  '$2b$10$FxvApY384tupQ4NWCC1EF.0d2vaHL6xmO/qmSwyk2K9xIQCk0dWum';

const mockPrisma = {
  $on: <V extends never>(
    eventType: V,
    callback: (
      event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent
    ) => void
  ): void => {},
  user: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Greg Hirsch',
        roles: [{ role: Role.Admin }],
      },
      {
        id: 2,
        name: 'Tom Wambsgans',
        roles: [{ role: Role.Student }],
      },
    ]),
    findUnique: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Greg Hirsch',
      roles: [{ role: Role.Admin }],
    }),
    create: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Greg Hirsch',
      roles: [{ role: Role.Admin }],
    }),
  },
} as unknown as PrismaClient;

// Cast the mock to the expected PrismaClient type.
const mockContext: TMockContext = {
  prisma: mockPrisma,
  validatedUser: { id: 1, roles: [Role.Admin] },
  res: {
    cookie: jest.fn(),
  },
  req: null,
};

describe('resolvers', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'your-secret-for-testing';
  });
  describe('Query', () => {
    describe('users', () => {
      it('should return users with roles', async () => {
        // Get the callable users resolver
        const usersResolver = getCallableResolver(resolvers.Query.users);

        const result = await usersResolver(null, {}, mockContext);
        expect(result).toEqual([
          {
            id: '1',
            name: 'Greg Hirsch',
            roles: [Role.Admin],
          },
          {
            id: '2',
            name: 'Tom Wambsgans',
            roles: [Role.Student],
          },
        ]);
      });
    });
    describe('me', () => {
      it('should return the authenticated user', async () => {
        // Get the callable me resolver
        const meResolver = getCallableResolver(resolvers.Query.me);

        const result = await meResolver(null, {}, mockContext);
        expect(result).toEqual({
          id: '1',
          name: 'Greg Hirsch',
          roles: [Role.Admin],
        });
      });
    });
  });
  describe('Mutation', () => {
    describe('createUser', () => {
      it('should create a user', async () => {
        // Get the callable createUser resolver
        const createUserResolver = getCallableResolver(
          resolvers.Mutation.createUser
        );

        const result = await createUserResolver(
          null,
          { name: 'Greg Hirsch', password: 'password', roles: [Role.Admin] },
          mockContext
        );
        expect(result).toEqual({
          id: '1',
          name: 'Greg Hirsch',
          roles: [Role.Admin],
        });
      });
    });
    describe('login', () => {
      beforeAll(() => {
        (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          id: 1,
          name: 'Greg Hirsch',
          roles: [{ role: Role.Admin }],
          password: hashedPassword,
        });
      });
      it('should login a user', async () => {
        // Get the callable login resolver
        const loginResolver = getCallableResolver(resolvers.Mutation.login);

        const result = await loginResolver(
          null,
          { username: 'Greg Hirsch', password: 'password' },
          mockContext
        );
        const signedToken = jwt.sign(
          { id: 1, roles: [Role.Admin] },
          process.env.JWT_SECRET,
          {
            expiresIn: '1h',
          }
        );
        expect(result).toEqual({
          token: signedToken,
        });
      });
    });
  });
});
