# Pickleball Court Management System - Frontend

Modern and responsive React frontend for the pickleball court management system.

## Features

- Modern, responsive UI with Tailwind CSS
- User Authentication (Login/Register)
- Dashboard with statistics and charts
- Member Management
- Court Management
- Booking System
- Financial Tracking
- Real-time Data Visualization

## Installation

```bash
cd frontend
npm install
```

## Running Development Server

```bash
npm run dev
```

The app will run on http://localhost:3000

## Building for Production

```bash
npm run build
```

## Technology Stack

- **React 18** - UI Framework
- **Vite** - Build tool
- **React Router 6** - Routing
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## File Structure

```
src/
├── components/        # Reusable components
├── pages/           # Page components
├── services/        # API services
├── context/         # React context (Auth)
├── App.jsx          # Main app component
└── index.css        # Global styles
```

## API Integration

The frontend is configured to connect to the backend API at `http://localhost:5000`.

Make sure the backend is running before starting the frontend.

## Notes

- All protected routes require authentication
- JWT token is stored in localStorage
- CORS is configured in the backend for local development
