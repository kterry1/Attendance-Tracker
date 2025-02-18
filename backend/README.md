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

## Codegen

_TODO_

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
