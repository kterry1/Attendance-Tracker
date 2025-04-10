import { Prisma, PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { GraphQLResolveInfo } from 'graphql';
import { resolvers, ValidatedUser } from '../resolvers';
import { Role, Resolver } from '../generated-types';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
require('dotenv').config();

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      JWT_SECRET: string;
    }
  }
}

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

type TMockContext = (custom?: any) => {
  prisma: PrismaClient;
  validatedUser: ValidatedUser;
  res: any;
  req: Response;
  custom: any;
};

const hashedPassword =
  '$2b$10$FxvApY384tupQ4NWCC1EF.0d2vaHL6xmO/qmSwyk2K9xIQCk0dWum';

const mockPrisma = {
  $on: <V extends never>(
    _eventType: V,
    _callback: (
      event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent
    ) => void
  ): void => {},
  user: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Greg Hirsch',
        phoneNumber: '+1234567890',
        roles: [{ role: Role.Admin }],
      },
      {
        id: 2,
        name: 'Tom Wambsgans',
        phoneNumber: '+1234567899',
        roles: [{ role: Role.Student }],
      },
    ]),
    findUnique: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Greg Hirsch',
      phoneNumber: '+1234567890',
      roles: [{ role: Role.Admin }],
    }),
    create: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Greg Hirsch',
      phoneNumber: '+1234567890',
      roles: [{ role: Role.Admin }],
    }),
  },
} as unknown as PrismaClient;

// Cast the mock to the expected PrismaClient type.
const mockContext: TMockContext = (custom) => ({
  prisma: mockPrisma,
  validatedUser: { id: 1, roles: [Role.Admin] },
  res: {
    cookie: jest.fn(),
  },
  req: null,
  ...custom,
});

export const verificationMock = jest.fn().mockResolvedValue({
  sid: 'FAKE_SID',
  status: 'pending',
});

jest.mock('twilio', () => {
  return jest.fn(() => ({
    verify: {
      v2: {
        services: jest.fn(() => ({
          verifications: {
            create: verificationMock,
          },
        })),
      },
    },
  }));
});

describe('resolvers', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'your-secret-for-testing';
  });
  describe('Query', () => {
    describe('users', () => {
      it('should return users with roles', async () => {
        // Get the callable users resolver
        const usersResolver = getCallableResolver(resolvers.Query.users);
        const result = await usersResolver(null, {}, mockContext());
        expect(result).toEqual([
          {
            id: '1',
            name: 'Greg Hirsch',
            phoneNumber: '+1234567890',
            roles: [Role.Admin],
          },
          {
            id: '2',
            name: 'Tom Wambsgans',
            phoneNumber: '+1234567899',
            roles: [Role.Student],
          },
        ]);
      });
    });
    describe('me', () => {
      it('should return the authenticated user', async () => {
        // Get the callable me resolver
        const meResolver = getCallableResolver(resolvers.Query.me);

        const result = await meResolver(null, {}, mockContext());
        expect(result).toEqual({
          id: '1',
          name: 'Greg Hirsch',
          phoneNumber: '+1234567890',
          roles: [Role.Admin],
        });
      });
      it('should fail to reutrn the authenticated user', async () => {
        // Get the callable me resolver
        const meResolver = getCallableResolver(resolvers.Query.me);

        const result = meResolver(
          null,
          {},
          mockContext({ validatedUser: null })
        );
        await expect(result).rejects.toThrow('You are not authenticated');
      });
    });
  });
  describe('Mutation', () => {
    describe('createUser', () => {
      beforeEach(() => {
        jest.resetModules();
      });
      it('should create a user', async () => {
        (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
        // Get the callable createUser resolver
        const createUserResolver = getCallableResolver(
          resolvers.Mutation.createUser
        );

        const result = await createUserResolver(
          null,
          {
            name: 'Greg Hirsch',
            password: 'this_13_A-pass_Crossword',
            phoneNumber: '+1234567890',
            roles: [Role.Admin],
          },
          mockContext()
        );
        expect(result).toEqual({
          id: '1',
          name: 'Greg Hirsch',
          phoneNumber: '+1234567890',
          roles: [Role.Admin],
        });
      });
      it('should throw an error requiring a stronger password', async () => {
        (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
        // Get the callable createUser resolver
        const createUserResolver = getCallableResolver(
          resolvers.Mutation.createUser
        );

        const result = createUserResolver(
          null,
          {
            name: 'Greg Hirsch',
            password: 'too_easy',
            phoneNumber: '+1234567890',
            roles: [Role.Admin],
          },
          mockContext()
        );
        await expect(result).rejects.toThrow(
          'Password too weak: Please choose a stronger password.'
        );
      });
      it('should throw an error if a user already exists', async () => {
        (mockPrisma.user.create as jest.Mock).mockRejectedValueOnce(
          new PrismaClientKnownRequestError('User already exists', {
            code: 'P2002',
            clientVersion: '2.0.0',
          })
        );
        // Get the callable createUser resolver
        const createUserResolver = getCallableResolver(
          resolvers.Mutation.createUser
        );

        const result = createUserResolver(
          null,
          {
            name: 'Greg Hirsch',
            password: 'password',
            phoneNumber: '+1234567890',
            roles: [Role.Admin],
          },
          mockContext()
        );
        expect(result).rejects.toThrow('User already exists');
      });
    });
    describe('login', () => {
      it('should return a token for the logged in user', async () => {
        (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          id: 1,
          name: 'Greg Hirsch',
          roles: [{ role: Role.Admin }],
          password: hashedPassword,
        });
        // Get the callable login resolver
        const loginResolver = getCallableResolver(resolvers.Mutation.login);

        const result = await loginResolver(
          null,
          { username: 'John', password: 'password' },
          mockContext()
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
      it('should throw an error if no user is found', async () => {
        (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
        // Get the callable login resolver
        const loginResolver = getCallableResolver(resolvers.Mutation.login);

        const result = loginResolver(
          null,
          { username: 'John', password: 'password' },
          mockContext()
        );
        await expect(result).rejects.toThrow('User not found');
      });
      it('should throw an error if password is incorrect', async () => {
        (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          id: 1,
          name: 'Greg Hirsch',
          roles: [{ role: Role.Admin }],
          password: hashedPassword,
        });
        // Get the callable login resolver
        const loginResolver = getCallableResolver(resolvers.Mutation.login);

        const result = loginResolver(
          null,
          { username: 'Greg Hirsch', password: 'wrong_password' },
          mockContext()
        );
        await expect(result).rejects.toThrow('Invalid credentials');
      });
    });
  });
});
