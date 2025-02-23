import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLError } from 'graphql';

const authDirectiveTransformer = (schema: any, directiveName: any) => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      // Get the @auth directive applied to this field.
      const authDirective = getDirective(
        schema,
        fieldConfig,
        directiveName
      )?.[0];
      if (authDirective) {
        const { roles: requiredRoles } = authDirective;
        const { resolve = defaultFieldResolver } = fieldConfig;
        fieldConfig.resolve = async function (source, args, context, info) {
          // Ensure the user is authenticated.
          if (!context.validatedUser) {
            throw new GraphQLError(
              'You must be authenticated to access this field.',
              {
                extensions: { code: 'UNAUTHENTICATED' },
              }
            );
          }
          // If roles are specified, ensure the user has at least one required role.
          if (requiredRoles && requiredRoles.length > 0) {
            const userRoles = context.validatedUser.roles || [];

            const hasRequiredRole = requiredRoles.some((role: any) =>
              userRoles.includes(role)
            );
            if (!hasRequiredRole) {
              throw new GraphQLError(
                'You are not authorized to access this field.',
                {
                  extensions: { code: 'FORBIDDEN' },
                }
              );
            }
          }
          // Call the original resolver if all checks pass.
          return resolve(source, args, context, info);
        };
      }
      return fieldConfig;
    },
  });
};

export default authDirectiveTransformer;
