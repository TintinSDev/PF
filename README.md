# PropertyFlow CRM

A production-ready Real Estate Customer Relationship Management system built with React, Node.js, Express, and PostgreSQL. Designed specifically for African real estate agents to manage leads, properties, and client communications with SMS integration via Africa's Talking.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [SMS Integration](#sms-integration)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

- Agent authentication with secure JWT tokens
- Lead management with full CRUD operations
- Lead status tracking (new, contacted, interested, closed)
- Property catalog management
- SMS reminders via Africa's Talking API
- Follow-up date scheduling
- Internal notes and client information storage
- Responsive design for mobile and desktop
- Real-time lead updates
- Dashboard with lead statistics

## Tech Stack

### Frontend
- React 18.2.0
- Vite (build tool and development server)
- React Router for navigation
- Axios for API communication
- CSS3 for styling

### Backend
- Node.js
- Express.js
- PostgreSQL database
- JWT for authentication
- bcryptjs for password hashing
- Africa's Talking SMS API
- HTTPS for secure requests

## Project Structure

```
propertyflow/
├── frontend/                 # React Vite application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LeadDetail.jsx
│   │   │   └── Properties.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── package.json
│   ├── .env
│   └── index.html
│
└── propertyflow-backend/     # Express.js API
    ├── server.js
    ├── package.json
    ├── .env
    └── .env.example
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- PostgreSQL (v12 or higher)
- Africa's Talking account (for SMS functionality)
- Git for version control

## Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd propertyflow
```

### Step 2: Backend Setup

```bash
cd propertyflow-backend
npm install
```

### Step 3: Frontend Setup

Open a new terminal in the project root:

```bash
cd propertyflow
npm install
```

## Configuration

### Backend .env File

Create a `.env` file in the `propertyflow-backend` directory:

```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=propertyflow
DB_PASSWORD=your_database_password
DB_PORT=5432

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

AFRICASTALKING_USERNAME=your_app_username
AFRICASTALKING_API_KEY=your_api_key

PORT=5000
```

### Frontend Configuration

Create a `.env` file in the `propertyflow` directory:

```
VITE_API_URL=http://localhost:5000/api
```

For production, update this to your deployed backend URL.

### PostgreSQL Setup

Create the database:

```bash
createdb propertyflow
```

The application automatically creates all required tables on first startup.

## Running the Application

### Terminal 1: Start Backend

```bash
cd propertyflow-backend
npm start
```

Expected output:
```
Africa's Talking SMS configured - REAL SMS ENABLED
Database tables initialized successfully
PropertyFlow CRM Backend running on port 5000
SMS Status: REAL SMS ENABLED
```

### Terminal 2: Start Frontend

```bash
cd propertyflow
npm run dev
```

The application will automatically open at `http://localhost:3000`

### Development Mode with Auto-Reload

For backend development:

```bash
npm run dev
```

This requires nodemon (included in dependencies).

## API Endpoints

### Authentication

**POST /api/auth/register**
- Register a new agent account
- Request body:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+254712345678",
    "password": "securepassword"
  }
  ```
- Response: { agent, token }

**POST /api/auth/login**
- Login with email and password
- Request body:
  ```json
  {
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```
- Response: { agent, token }

### Leads

All lead endpoints require Authorization header: `Bearer <token>`

**GET /api/leads**
- Get all leads for logged-in agent
- Returns: Array of lead objects

**POST /api/leads**
- Create a new lead
- Request body:
  ```json
  {
    "client_name": "Peter Kinuthia",
    "client_phone": "+254758297550",
    "property_interest": "3 BR Apartment in Kilimani",
    "follow_up_date": "2026-03-01",
    "notes": "Interested in luxury apartments"
  }
  ```
- Returns: Created lead object

**GET /api/leads/:id**
- Get specific lead details
- Returns: Lead object with all information

**PUT /api/leads/:id**
- Update lead information
- Request body: Same as POST /api/leads
- Returns: Updated lead object

**DELETE /api/leads/:id**
- Delete a lead
- Returns: { message: "Lead deleted" }

**POST /api/leads/:id/send-reminder**
- Send SMS reminder to agent
- Returns: SMS response with status and delivery details

### Properties

All property endpoints require Authorization header: `Bearer <token>`

**GET /api/properties**
- Get all properties for logged-in agent
- Returns: Array of property objects

**POST /api/properties**
- Create a new property listing
- Request body:
  ```json
  {
    "address": "123 Main Street, Nairobi",
    "bedrooms": 3,
    "bathrooms": 2,
    "price": 5000000,
    "type": "residential"
  }
  ```
- Returns: Created property object

## Database Schema

### agents table

Stores agent/user information.

```sql
CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### leads table

Stores client lead information.

```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20) NOT NULL,
  property_interest VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new',
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### properties table

Stores property listings.

```sql
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  address VARCHAR(255) NOT NULL,
  bedrooms INT,
  bathrooms INT,
  price DECIMAL(15,2),
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## SMS Integration

PropertyFlow integrates with Africa's Talking for sending SMS reminders to agents about follow-ups.

### Setting Up SMS

1. Create an account at https://africastalking.com
2. Create an application in the dashboard
3. Generate an API key for your application
4. Note your application username
5. Add both to the backend .env file:
   ```
   AFRICASTALKING_USERNAME=your_app_username
   AFRICASTALKING_API_KEY=your_api_key
   ```
6. For production accounts, your number will work automatically
7. For testing/development, whitelist your phone number in Africa's Talking settings

### How SMS Works

When an agent clicks the SMS button on a lead:

1. The system sends an SMS reminder to the agent's phone
2. The SMS contains: Client name, phone number, property interest, and lead status
3. Africa's Talking API processes and delivers the message
4. The response shows delivery status and cost

### SMS Status Codes

- 101: SMS successfully sent
- 102: SMS queued for delivery
- 402: Invalid phone number format
- 403: Insufficient account credit
- 406: Phone number blacklisted (requires whitelisting)
- 401: Authentication failed

## Deployment

### Backend Deployment (Heroku)

```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
heroku config:set JWT_SECRET=your-secret-key
heroku config:set AFRICASTALKING_API_KEY=your-api-key
heroku config:set AFRICASTALKING_USERNAME=your-username
```

### Frontend Deployment (Vercel)

```bash
npm run build
npm i -g vercel
vercel --prod
```

In Vercel settings, set environment variable:
```
VITE_API_URL=https://your-backend-url.herokuapp.com/api
```

### Frontend Deployment (Netlify)

```bash
npm run build
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

## Troubleshooting

### Database Connection Error

Error: "Cannot connect to database"

Solution:
- Verify PostgreSQL is running: `psql --version`
- Check credentials in .env file match your PostgreSQL setup
- Ensure propertyflow database exists: `createdb propertyflow`
- Check database user has permissions

### Port Already in Use

Error: "Port 5000 is already in use" or "Port 3000 is already in use"

For Backend:
```bash
lsof -ti:5000 | xargs kill -9
npm start
```

For Frontend:
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

Or update vite.config.js:
```javascript
server: {
  port: 3001
}
```

### SMS Not Sending - Status Code 406

Error: "SMS Error: User/Number in Blacklist"

Solution:
- Your phone number is blacklisted for testing
- Add your number to whitelist in Africa's Talking dashboard
- Or use a test number like +254700000000
- Or request manual whitelisting from Africa's Talking support

### SMS Not Sending - Authentication Error

Error: "The supplied authentication is invalid"

Solution:
- Verify AFRICASTALKING_API_KEY in .env (must be exact)
- Verify AFRICASTALKING_USERNAME in .env
- Restart backend after .env changes
- Check that you're using correct credentials from your app, not sandbox

### Module Not Found

Error: "Cannot find module 'express'" or similar

Solution:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Frontend Can't Connect to Backend

Error: "Network request failed" or blank dashboard

Solution:
- Verify backend is running on port 5000
- Check VITE_API_URL in frontend .env matches backend URL
- Verify backend CORS is enabled (it is by default)
- Check browser console (F12) for exact error
- Try accessing http://localhost:5000/api/health

### JWT Token Errors

Error: "Invalid token" or "No token provided"

Solution:
- Log out and log back in
- Clear browser storage: Open DevTools > Application > Clear Storage
- Check JWT_SECRET is same on backend
- Verify token is being sent in Authorization header

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test thoroughly with both backend and frontend
5. Commit with clear messages: `git commit -m "Add feature description"`
6. Push to your branch: `git push origin feature/your-feature`
7. Submit a pull request with description of changes

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues, questions, or support:

1. Check the Troubleshooting section above
2. Review console errors (browser DevTools and terminal)
3. Check Africa's Talking documentation for SMS issues
4. Submit an issue on the project repository with:
   - Error message
   - Steps to reproduce
   - System information (OS, Node version, etc.)
   - Screenshots if applicable

## Project Information

**Created for**: Africa's Talking Real Estate Solutions Hackathon

**Purpose**: Provide African real estate agents with a modern CRM tool to manage leads, properties, and client communication efficiently.

**Key Achievement**: Integration of SMS reminders using Africa's Talking API for offline-first agent engagement.

## Acknowledgments

- Africa's Talking for SMS API and support
- The real estate community in Kenya for feedback and requirements
- All contributors and beta testers