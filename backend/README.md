# Attendance Tracker Backend

## Overview

This is the backend service for the Attendance Tracker application. It provides APIs for managing attendance records.

## Features

- User authentication and authorization
- CRUD operations for attendance records
- API endpoints for managing users and roles

## Technologies Used

- SQLite
- GraphQL
- Apollo Server
- Prisma(ORM)
- Redis
- Codegen
- TypeScript

## Getting Started

### Configuration

1. Create a `.env` file in the _backend_ directory and add the following environment variables:
   ```env
   DATABASE_URL="file:./dev.db"
   ```

### Installation

1. Navigate to the backend directory:
   ```sh
   cd backend
   ```
2. Install dependencies:
   ```sh
   pnpm install
   ```

### Running the Application

1. Start up server:
   ```sh
   pnpm run dev
   ```
2. The Apollo Studio sandbox will be running on `http://localhost:4000`.

### Redis

There is a redis cache for handling rate limiting. To run Redis locally:

1. Make sure you are in a separate terminal window
2. While in the backend directory, run:
   ```sh
   brew services start redis
   ```
3. To confirm it's working, run:
   ```sh
   redis-cli ping
   ```
   If successful, the terminal should respond with `PONG`

# Updating the Database and Code Generation

## Prisma Migrations

Whenever you modify the Prisma schema (located in `prisma/schema.prisma`), such as adding or changing models, fields, or relations, you need to update your database schema accordingly. Use the following command:

```bash
npx prisma migrate dev --name <your_migration_name>
```

### When to Run

Run this command after making changes to the Prisma schema that affect the database structure.

### What It Does

- Creates a new migration file in the `prisma/migrations` folder.
- Applies the migration to your development database.
- Updates your Prisma Client if necessary.

### Example

If you add a new field to the User model, you might run:

```bash
npx prisma migrate dev --name add-user-email
```

---

## Regenerating the Prisma Client

After making changes to the Prisma schema—even if they don't require a new migration (for example, if you change a field type or add a comment)—you should update the Prisma Client:

```bash
npx prisma generate
```

### When to Run

Run this command after any change to the Prisma schema to ensure the generated client reflects the current schema.

### What It Does

Regenerates the Prisma Client so that the application code uses the latest model definitions.

---

## GraphQL Code Generation

This project uses **GraphQL Code Generator** to generate TypeScript types (or other code artifacts) from the GraphQL schema. This is set up in the `backend/package.json` with the following script:

```json
"generate": "graphql-codegen --watch \"src/schema.graphql\""
```

### When to Run

This script runs continuously in watch mode during development. It automatically regenerates code whenever you change the GraphQL schema (`src/schema.graphql`).

### What It Does

Watches the GraphQL schema file for changes and regenerates the corresponding TypeScript types (or other output) to keep your API and client code in sync.

## Quick Reference

### For Database Schema Changes:

1. Update your `prisma/schema.prisma`.
2. Run:
   ```bash
   npx prisma migrate dev --name <your_migration_name>
   ```
   _(Creates & applies a migration)_
3. Run:
   ```bash
   npx prisma generate
   ```
   _(Regenerates the Prisma Client)_

### For GraphQL Schema Changes:

- The GraphQL Code Generator runs in watch mode (via `pnpm run generate`) to automatically update generated files as you edit `src/schema.graphql`.

## API Documentation

_TODO_

<!-- Detailed API documentation can be found [here](link_to_api_documentation). -->

## Contributing

_TODO_

<!--
Contributions are welcome! Please read the [contributing guidelines](link_to_contributing_guidelines) first. -->

## License

_TODO_

<!-- This project is licensed under the MIT License. See the [LICENSE](link_to_license_file) file for details. -->

## Contact

_TODO_

<!-- For any questions or feedback, please contact [yourname](mailto:your.email@example.com). -->
