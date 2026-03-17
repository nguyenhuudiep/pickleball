// Sample data to populate database for testing

// Users
const users = [
  {
    name: "Admin User",
    email: "admin@pickleball.com",
    password: "password123",
    role: "admin"
  },
  {
    name: "Manager John",
    email: "manager@pickleball.com",
    password: "password123",
    role: "manager"
  }
];

// Members
const members = [
  {
    name: "John Doe",
    email: "john@example.com",
    phone: "555-0101",
    address: "123 Main St, City",
    membershipType: "premium",
    status: "active"
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "555-0102",
    address: "456 Oak Ave, City",
    membershipType: "basic",
    status: "active"
  },
  {
    name: "Mike Johnson",
    email: "mike@example.com",
    phone: "555-0103",
    address: "789 Pine Rd, City",
    membershipType: "vip",
    status: "active"
  }
];

// Courts
const courts = [
  {
    name: "Court A",
    courtNumber: "A1",
    surface: "hard",
    lights: true,
    hourlyRate: 25,
    status: "available"
  },
  {
    name: "Court B",
    courtNumber: "B1",
    surface: "clay",
    lights: true,
    hourlyRate: 20,
    status: "available"
  },
  {
    name: "Court C",
    courtNumber: "C1",
    surface: "hard",
    lights: false,
    hourlyRate: 15,
    status: "available"
  }
];

// Financial Transactions
const financials = [
  {
    type: "income",
    category: "Court Bookings",
    description: "Daily booking revenue",
    amount: 500,
    paymentMethod: "card",
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  },
  {
    type: "expense",
    category: "Maintenance",
    description: "Court resurfacing",
    amount: 200,
    paymentMethod: "transfer",
    date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
  },
  {
    type: "income",
    category: "Memberships",
    description: "Monthly membership fees",
    amount: 300,
    paymentMethod: "card",
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
  }
];

module.exports = {
  users,
  members,
  courts,
  financials
};
