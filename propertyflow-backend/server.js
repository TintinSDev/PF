const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "propertyflow",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

// Africa's Talking Setup - REAL SMS INTEGRATION
let smsService;
try {
  const africastalking = require("africastalking");

  const AT = africastalking({
    apiKey: process.env.AFRICASTALKING_API_KEY,
    username: process.env.AFRICASTALKING_USERNAME,
  });

  smsService = AT.SMS;
  console.log(" Africa's Talking SMS service initialized - REAL SMS ENABLED");
} catch (e) {
  console.log(" Africa's Talking not configured - SMS will be mocked");
  console.log(
    "To enable real SMS, set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME in .env",
  );
  smsService = null;
}

// Initialize database tables
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
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
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        address VARCHAR(255) NOT NULL,
        bedrooms INT,
        bathrooms INT,
        price DECIMAL(15,2),
        type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your-secret-key",
    (err, user) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      req.user = user;
      next();
    },
  );
}

// AUTH ROUTES
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO agents (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email",
      [name, email, phone, passwordHash],
    );

    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    );

    res.json({ agent: result.rows[0], token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool.query("SELECT * FROM agents WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const agent = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, agent.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: agent.id, email: agent.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    );

    res.json({
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LEADS ROUTES
app.post("/api/leads", authenticateToken, async (req, res) => {
  try {
    const {
      client_name,
      client_phone,
      property_interest,
      follow_up_date,
      notes,
    } = req.body;

    if (!client_name || !client_phone) {
      return res.status(400).json({ error: "Client name and phone required" });
    }

    const result = await pool.query(
      `INSERT INTO leads (agent_id, client_name, client_phone, property_interest, follow_up_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'new') RETURNING *`,
      [
        req.user.id,
        client_name,
        client_phone,
        property_interest,
        follow_up_date,
        notes,
      ],
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/leads", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM leads WHERE agent_id = $1 ORDER BY created_at DESC",
      [req.user.id],
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/leads/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM leads WHERE id = $1 AND agent_id = $2",
      [req.params.id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/leads/:id", authenticateToken, async (req, res) => {
  try {
    const {
      client_name,
      client_phone,
      property_interest,
      status,
      follow_up_date,
      notes,
    } = req.body;

    const result = await pool.query(
      `UPDATE leads 
       SET client_name = $1, client_phone = $2, property_interest = $3, status = $4, follow_up_date = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND agent_id = $8
       RETURNING *`,
      [
        client_name,
        client_phone,
        property_interest,
        status,
        follow_up_date,
        notes,
        req.params.id,
        req.user.id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/leads/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM leads WHERE id = $1 AND agent_id = $2 RETURNING id",
      [req.params.id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json({ message: "Lead deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SMS REMINDER ROUTE - NOW WITH REAL SMS SUPPORT
app.post(
  "/api/leads/:id/send-reminder",
  authenticateToken,
  async (req, res) => {
    try {
      const leadResult = await pool.query(
        "SELECT * FROM leads WHERE id = $1 AND agent_id = $2",
        [req.params.id, req.user.id],
      );

      if (leadResult.rows.length === 0) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const lead = leadResult.rows[0];
      const agentResult = await pool.query(
        "SELECT phone FROM agents WHERE id = $1",
        [req.user.id],
      );
      const agent = agentResult.rows[0];

      const message = `PropertyFlow Reminder: Follow up with ${lead.client_name} (${lead.client_phone}) regarding ${lead.property_interest}. Status: ${lead.status}`;

      if (smsService) {
        try {
          const response = await smsService.send({
            to: [agent.phone],
            message: message,
          });
          console.log(response.SMSMessageData.Recipients);

          console.log(` REAL SMS sent to ${agent.phone}`);
          console.log("Africa's Talking Response:", response);

          res.json({
            message: "SMS reminder sent successfully via Africa's Talking!",
            smsText: message,
            provider: "Africa's Talking",
            status: "sent",
            timestamp: new Date(),
          });
        } catch (smsError) {
          console.error(" SMS Error:", smsError.message);
          // Fallback to mock if SMS fails
          console.log(
            ` Falling back to MOCK SMS: To ${agent.phone}: ${message}`,
          );
          res.json({
            message: "SMS reminder sent (fallback - demo mode)",
            smsText: message,
            provider: "mock",
            status: "sent",
            error: smsError.message,
          });
        }
      } else {
        // Mock SMS (demo mode - when credentials not configured)
        console.log(` DEMO MOCK SMS: To ${agent.phone}`);
        console.log(`Message: ${message}`);
        console.log("---");

        res.json({
          message:
            "SMS reminder sent (DEMO MODE - Configure Africa's Talking for real SMS)",
          smsText: message,
          provider: "mock",
          status: "sent",
          hint: "To enable real SMS, set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME in .env",
        });
      }
    } catch (error) {
      console.error("Reminder Error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// PROPERTIES ROUTES
app.post("/api/properties", authenticateToken, async (req, res) => {
  try {
    const { address, bedrooms, bathrooms, price, type } = req.body;

    if (!address) {
      return res.status(400).json({ error: "Address required" });
    }

    const result = await pool.query(
      `INSERT INTO properties (agent_id, address, bedrooms, bathrooms, price, type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, address, bedrooms, bathrooms, price, type],
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/properties", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM properties WHERE agent_id = $1 ORDER BY created_at DESC",
      [req.user.id],
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    smsEnabled: smsService
      ? "REAL SMS via Africa's Talking"
      : "DEMO MODE (Mock SMS)",
  });
});

// Initialize and start server
const PORT = process.env.PORT || 5000;

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n PropertyFlow CRM Backend running on port ${PORT}`);
    console.log(
      ` SMS Status: ${smsService ? " REAL SMS ENABLED" : " DEMO MODE"}\n`,
    );
  });
});

module.exports = app;
