# Pickleball Court Management System - Setup Guide

## 🚀 Getting Started

This comprehensive guide will help you set up and run the Pickleball Court Management System.

## Prerequisites

- Node.js v14+ ([Download](https://nodejs.org/))
- MongoDB ([Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- Git
- A code editor (VS Code recommended)

## Method 1: Manual Setup (Recommended for Development)

### Step 1: Clone and Navigate
```bash
cd d:\Code\AI\Pickleball
```

### Step 2: Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env
# On Windows: copy .env.example .env

# Edit .env and configure:
# - MONGODB_URI=mongodb://localhost:27017/pickleball
# - JWT_SECRET=your-secret-key-here

# Start backend (runs on port 5000)
npm run dev
```

⚠️ Keep this terminal open. Backend should show: "Server is running on port 5000"

### Step 3: Setup Frontend (New Terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start frontend development server (runs on port 3000)
npm run dev
```

Frontend will open at: http://localhost:3000

## Method 2: Docker Setup (Easiest)

```bash
# From project root
docker-compose up

# This starts:
# - MongoDB (port 27017)
# - Backend (port 5000)
# - Frontend (port 3000)
```

## First Time Setup

### 1. Database
MongoDB should be running (locally or MongoDB Atlas)

### 2. Create Admin Account
Go to: http://localhost:3000/register

```
Name: Admin User
Email: admin@pickleball.com
Password: password123
```

### 3. Login
Go to: http://localhost:3000/login

```
Email: admin@pickleball.com
Password: password123
```

## Default Test Account

After registration, you'll have an admin account. Additional accounts:

- **Manager Account**: manager@pickleball.com / password123
- **Staff Account**: staff@pickleball.com / password123

(These need to be created through the register page)

## Quick Test Data Setup

To add sample data to your database:

```bash
cd backend

# Create a setup script (optional)
node -e "
const { MongoClient } = require('mongodb');
const sampleData = require('./sampleData.js');

// This would connect and populate data
// Detailed instructions in backend/README.md
"
```

## Project URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: mongodb://localhost:27017

## Common Issues & Solutions

### Issue: "Cannot connect to MongoDB"
**Solution**: 
- Check if MongoDB is running
- Verify MONGODB_URI in .env file
- For MongoDB Atlas, ensure IP is whitelisted

### Issue: "Port 5000/3000 already in use"
**Solution**:
- Change PORT in backend/.env
- Change port in frontend/vite.config.js
- Or kill the process using the port

### Issue: "Module not found"
**Solution**:
- Delete node_modules folders
- Delete package-lock.json files
- Run `npm install` again

### Issue: CORS errors
**Solution**:
- Ensure backend is running
- Check proxy configuration in vite.config.js
- Verify API base URL in src/services/api.js

## Project Structure Quick Reference

```
Pickleball/
├── backend/               # Node.js Express API
│   ├── src/
│   │   ├── models/       # Database schemas
│   │   ├── controllers/  # Business logic
│   │   ├── routes/       # API endpoints
│   │   └── middleware/   # Auth & validation
│   ├── server.js        # Entry point
│   └── package.json
│
├── frontend/            # React application
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable UI components
│   │   ├── services/    # API calls
│   │   └── context/     # State management
│   ├── index.html
│   └── package.json
│
└── README.md
```

## Key Features to Try

### 1. Dashboard
- View overall statistics
- See profit charts
- Track members and bookings

### 2. Members Management
- Add new members
- View member details
- Track membership types (Basic/Premium/VIP)

### 3. Court Management
- Create courts with different surfaces
- Set hourly rates
- Track court status (available/occupied/maintenance)

### 4. Bookings
- Schedule court bookings
- Assign members to courts
- Set booking times and prices

### 5. Financial Tracking
- Record income (bookings, memberships)
- Track expenses (maintenance, supplies)
- View monthly profit/loss reports

## Development Tips

### VS Code Useful Extensions
- ES7+ React/Redux/React-Native snippets
- Thunder Client or REST Client
- MongoDB for VS Code
- Prettier - Code formatter
- ESLint

### Useful Commands

```bash
# Backend
npm run dev         # Start with auto-reload
npm start           # Production start
npm test            # Run tests

# Frontend
npm run dev         # Start dev server
npm run build       # Create production build
npm run preview     # Preview production build
npm run lint        # Check for linting errors
```

## Next Steps

1. ✅ Get the system running
2. 📝 Add some test members and courts
3. 📅 Create bookings
4. 💰 Track financial transactions
5. 📊 View reports and analytics

## Support & Documentation

- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [Main README](./README.md)

## Deployment Checklist

When ready to deploy:

- [ ] Set production environment variables
- [ ] Use strong JWT_SECRET
- [ ] Set up production MongoDB instance
- [ ] Build frontend: `npm run build`
- [ ] Deploy backend to cloud (Heroku, Railway, etc.)
- [ ] Deploy frontend to CDN (Vercel, Netlify, etc.)
- [ ] Update API URLs in frontend
- [ ] Enable HTTPS
- [ ] Setup email notifications (optional)
- [ ] Configure backups

---

**Happy building! 🏸** Feel free to customize and expand the system based on your needs.
