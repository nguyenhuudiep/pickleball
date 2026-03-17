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

## Notes

- All protected endpoints require JWT token in header: `Authorization: Bearer <token>`
- Passwords are hashed using bcryptjs
