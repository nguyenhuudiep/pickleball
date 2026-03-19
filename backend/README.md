# Pickleball Court Management System - Backend

Node.js Express API backend for the pickleball court management system.

## Features

- User authentication (Login, Register)
- Member management
- Court management
- Booking system
- Financial tracking and reporting
- Dashboard statistics

## Installation

```bash
cd backend
npm install
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pickleball
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Members
- `GET /api/members` - Get all members
- `POST /api/members` - Create member
- `GET /api/members/:id` - Get member by ID
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Courts
- `GET /api/courts` - Get all courts
- `POST /api/courts` - Create court
- `GET /api/courts/:id` - Get court by ID
- `PUT /api/courts/:id` - Update court
- `DELETE /api/courts/:id` - Delete court

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking

### Financial
- `GET /api/financial` - Get all transactions
- `POST /api/financial` - Create transaction
- `GET /api/financial/stats/monthly` - Get financial statistics

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database

This system uses MongoDB. Make sure MongoDB is running locally or update MONGODB_URI in .env file.

## Migrate MongoDB to SQL Server

The backend now includes a migration script that reads data from MongoDB and writes to SQL Server.

1. Update `backend/.env` with SQL Server settings:

```
SQL_HOST=localhost
SQL_PORT=1433
SQL_DATABASE=pickleball
SQL_USER=sa
SQL_PASSWORD=yourStrongPassword
SQL_ENCRYPT=false
SQL_TRUST_SERVER_CERTIFICATE=true
```

2. Optional: If source Mongo is different from `MONGODB_URI`, add:

```
MIGRATION_MONGODB_URI=mongodb+srv://...
```

3. Run migration:

```bash
npm run migrate:mongo-to-sql
```

4. If you want to clear SQL tables before importing, set:

```
MIGRATION_TRUNCATE=true
```

Then run migration again.

Note:
- A baseline SQL schema file is provided at `backend/sql/sqlserver-schema.sql`.
- If SQL Server is not running or not listening on the configured host/port, migration will fail at connection step.

## Notes

- All protected endpoints require JWT token in header: `Authorization: Bearer <token>`
- Passwords are hashed using bcryptjs
