-- SQL Server baseline schema for Pickleball app
-- Run this script only if you want to create tables manually.

IF OBJECT_ID('users', 'U') IS NULL
BEGIN
  CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mongoId NVARCHAR(24) NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    username NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) NOT NULL,
    permissions NVARCHAR(MAX) NULL,
    phone NVARCHAR(50) NULL,
    active BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('members', 'U') IS NULL
BEGIN
  CREATE TABLE members (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mongoId NVARCHAR(24) NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    username NVARCHAR(100) NULL,
    password NVARCHAR(255) NULL,
    phone NVARCHAR(50) NULL,
    address NVARCHAR(255) NULL,
    membershipType NVARCHAR(20) NOT NULL DEFAULT 'basic',
    skillLevel FLOAT NOT NULL DEFAULT 2.5,
    gender NVARCHAR(20) NOT NULL DEFAULT 'male',
    joinDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    expiryDate DATETIME2 NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    totalBookings INT NOT NULL DEFAULT 0,
    totalSpent FLOAT NOT NULL DEFAULT 0,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('courts', 'U') IS NULL
BEGIN
  CREATE TABLE courts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mongoId NVARCHAR(24) NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    courtNumber NVARCHAR(50) NOT NULL UNIQUE,
    surface NVARCHAR(20) NOT NULL DEFAULT 'hard',
    lights BIT NOT NULL DEFAULT 0,
    hourlyRate FLOAT NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'available',
    capacity INT NOT NULL DEFAULT 4,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('bookings', 'U') IS NULL
BEGIN
  CREATE TABLE bookings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mongoId NVARCHAR(24) NULL UNIQUE,
    memberId INT NOT NULL,
    courtId INT NOT NULL,
    bookingDate DATETIME2 NOT NULL,
    startTime NVARCHAR(10) NOT NULL,
    endTime NVARCHAR(10) NOT NULL,
    duration FLOAT NOT NULL,
    price FLOAT NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'pending',
    notes NVARCHAR(255) NULL,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_bookings_members FOREIGN KEY (memberId) REFERENCES members(id),
    CONSTRAINT FK_bookings_courts FOREIGN KEY (courtId) REFERENCES courts(id)
  );
END;

IF OBJECT_ID('financials', 'U') IS NULL
BEGIN
  CREATE TABLE financials (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mongoId NVARCHAR(24) NULL UNIQUE,
    type NVARCHAR(20) NOT NULL,
    category NVARCHAR(255) NOT NULL,
    description NVARCHAR(255) NULL,
    amount FLOAT NOT NULL,
    bookingId INT NULL,
    paymentMethod NVARCHAR(20) NOT NULL DEFAULT 'cash',
    [date] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    notes NVARCHAR(255) NULL,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_financials_bookings FOREIGN KEY (bookingId) REFERENCES bookings(id)
  );
END;

IF OBJECT_ID('tournaments', 'U') IS NULL
BEGIN
  CREATE TABLE tournaments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mongoId NVARCHAR(24) NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    [date] DATETIME2 NOT NULL,
    location NVARCHAR(255) NULL,
    description NVARCHAR(500) NULL,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('tournament_participants', 'U') IS NULL
BEGIN
  CREATE TABLE tournament_participants (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tournamentId INT NOT NULL,
    memberId INT NOT NULL,
    rank INT NULL,
    result NVARCHAR(255) NULL,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tournament_participants_tournaments FOREIGN KEY (tournamentId) REFERENCES tournaments(id),
    CONSTRAINT FK_tournament_participants_members FOREIGN KEY (memberId) REFERENCES members(id)
  );

  CREATE UNIQUE INDEX UX_tournament_participant_unique
  ON tournament_participants(tournamentId, memberId);
END;
