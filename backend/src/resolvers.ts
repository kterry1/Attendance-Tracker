import { GraphQLScalarType, Kind, GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { PrismaClient } from '@prisma/client';
import zxcvbn from 'zxcvbn';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
require('dotenv').config();
import {
  sendVerificationCode,
  checkVerificationCode,
} from './helper-functions';
import {
  Resolvers,
  User,
  Role,
  LoginResponse,
  VerifiedUserResponse,
} from './generated-types';
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
    users: async (parent, args, context): Promise<User[]> => {
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
    me: async (parent, args, context): Promise<User> => {
      if (!context.validatedUser) {
        throw new GraphQLError('You are not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
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
        phoneNumber,
        roles,
      }: { name: string; password: string; phoneNumber: string; roles: Role[] },
      context
    ): Promise<User> => {
      const existingUser = await context.prisma.user.findUnique({
        where: {
          name: name,
        } as { name: string },
      });
      if (existingUser) {
        throw new GraphQLError('User already exists', {
          extensions: { code: ApolloServerErrorCode.BAD_USER_INPUT },
        });
      }

      // Evaluate the password's strength using 'zxcvbn'
      const { score, feedback } = zxcvbn(password);

      // Enforce a minimum strength threshold (e.g., 3 out of 4)
      if (score < 3) {
        throw new Error(
          `Password too weak: ${feedback.warning || 'Please choose a stronger password.'}`
        );
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const uniqueRoles = [...new Set(roles)];
      let user;
      try {
        user = await context.prisma.user.create({
          data: {
            name,
            password: hashedPassword,
            phoneNumber,
            roles: {
              create: uniqueRoles.map((role) => ({ role })),
            },
          },
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            verified: true,
            roles: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const codeResponse = await sendVerificationCode(phoneNumber);
        return {
          ...user,
          id: user.id.toString(),
          // This mapping of roles is getting duplicated quite a bit
          roles: user.roles.map((role: UserRole) => role.role),
        };
      } catch (error) {
        if (error.code === 'P2002') {
          throw new GraphQLError('Error creating user', {
            extensions: { code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR },
          });
        }
        throw error;
      }
    },
    verifyPhoneNumber: async (
      parent,
      {
        username,
        phoneNumber,
        verificationCode,
      }: { username: string; phoneNumber: string; verificationCode: string },
      context
    ): Promise<VerifiedUserResponse> => {
      const user = await context.prisma.user.findUnique({
        where: {
          name: username,
        },
      });

      if (!user) {
        throw new GraphQLError('User and/or phone number incorrect', {
          extensions: { code: 'USER_NOT_FOUND' },
        });
      }

      if (user.phoneNumber !== phoneNumber) {
        throw new GraphQLError('User and/or phone number incorrect', {
          extensions: { code: 'USER_NOT_FOUND' },
        });
      }

      const confirmVerification = await checkVerificationCode({
        code: verificationCode,
        phoneNumber,
      });
      console.log({ confirmVerification });
      if (confirmVerification !== 'approved') {
        throw new GraphQLError('Verification code is incorrect', {
          extensions: { code: 'INVALID_VERIFICATION_CODE' },
        });
      }
      const updatedUser = await context.prisma.user.update({
        where: { id: user.id },
        data: { verified: true },
      });
      if (!updatedUser) {
        throw new GraphQLError('Error verifying phone number', {
          extensions: { code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR },
        });
      }
      const { name, phoneNumber: number, verified } = updatedUser;
      return {
        name,
        phoneNumber: number,
        verified,
      };
    },
    login: async (
      parent,
      { username, password }: { username: string; password: string },
      context
    ): Promise<LoginResponse> => {
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
        throw new GraphQLError('User not found', {
          extensions: { code: 'USER_NOT_FOUND' },
        });
      }

      const validatedPassword = await bcrypt.compare(password, user.password);

      if (!validatedPassword) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'INVALID_CREDENTIALS' },
        });
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
