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
  ssl: {
    rejectUnauthorized: false,
  },
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
    property_id INT REFERENCES properties(id) ON DELETE SET NULL,
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

    // Update the properties table creation to include status:
    await pool.query(`
  CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    bedrooms INT,
    bathrooms INT,
    price DECIMAL(15,2),
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);
    await pool.query(`
  ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS property_id INT REFERENCES properties(id) ON DELETE SET NULL
`);

    // Add status column to properties
    await pool.query(`
  ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available'
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
app.get("/", (req, res) => {
  res.json({ message: "PropertyFlow CRM Backend is running!" });
});
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
      property_id,
      follow_up_date,
      notes,
    } = req.body;

    if (!client_name || !client_phone) {
      return res.status(400).json({ error: "Client name and phone required" });
    }

    // If property_id provided, verify it belongs to agent and update status
    if (property_id) {
      const propCheck = await pool.query(
        "SELECT id FROM properties WHERE id = $1 AND agent_id = $2",
        [property_id, req.user.id],
      );
      if (propCheck.rows.length === 0) {
        return res
          .status(400)
          .json({ error: "Property not found or not yours" });
      }
    }

    const result = await pool.query(
      `INSERT INTO leads (agent_id, client_name, client_phone, property_interest, property_id, follow_up_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'new') RETURNING *`,
      [
        req.user.id,
        client_name,
        client_phone,
        property_interest,
        property_id || null,
        follow_up_date,
        notes,
      ],
    );

    // If property assigned, update its status to booked
    if (property_id) {
      await pool.query(
        "UPDATE properties SET status = 'booked' WHERE id = $1",
        [property_id],
      );
    }

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
// GET /api/leads/:id - GET LEAD WITH PROPERTY DETAILS
app.get("/api/leads/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, p.address, p.bedrooms, p.bathrooms, p.price, p.type, p.status as property_status
       FROM leads l
       LEFT JOIN properties p ON l.property_id = p.id
       WHERE l.id = $1 AND l.agent_id = $2`,
      [req.params.id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const lead = result.rows[0];
    res.json({
      ...lead,
      property: lead.property_id
        ? {
            id: lead.property_id,
            address: lead.address,
            bedrooms: lead.bedrooms,
            bathrooms: lead.bathrooms,
            price: lead.price,
            type: lead.type,
            status: lead.property_status,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/leads/:id - UPDATE LEAD (can change property)
app.put("/api/leads/:id", authenticateToken, async (req, res) => {
  try {
    const {
      client_name,
      client_phone,
      property_interest,
      property_id,
      status,
      follow_up_date,
      notes,
    } = req.body;

    // Get current lead to see if property is changing
    const currentLead = await pool.query(
      "SELECT property_id FROM leads WHERE id = $1 AND agent_id = $2",
      [req.params.id, req.user.id],
    );

    if (currentLead.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const oldPropertyId = currentLead.rows[0].property_id;

    // If changing property, update statuses
    if (property_id && property_id !== oldPropertyId) {
      // Verify new property exists
      const propCheck = await pool.query(
        "SELECT id FROM properties WHERE id = $1 AND agent_id = $2",
        [property_id, req.user.id],
      );
      if (propCheck.rows.length === 0) {
        return res
          .status(400)
          .json({ error: "Property not found or not yours" });
      }

      // Release old property (set to available)
      if (oldPropertyId) {
        await pool.query(
          "UPDATE properties SET status = 'available' WHERE id = $1",
          [oldPropertyId],
        );
      }

      // Book new property
      await pool.query(
        "UPDATE properties SET status = 'booked' WHERE id = $1",
        [property_id],
      );
    }

    const result = await pool.query(
      `UPDATE leads 
       SET client_name = $1, client_phone = $2, property_interest = $3, property_id = $4, status = $5, follow_up_date = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND agent_id = $9
       RETURNING *`,
      [
        client_name,
        client_phone,
        property_interest,
        property_id || null,
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
// DELETE /api/leads/:id - DELETE LEAD (release property)
app.delete("/api/leads/:id", authenticateToken, async (req, res) => {
  try {
    // Get lead to find its property
    const leadResult = await pool.query(
      "SELECT property_id FROM leads WHERE id = $1 AND agent_id = $2",
      [req.params.id, req.user.id],
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const propertyId = leadResult.rows[0].property_id;

    // Delete the lead
    await pool.query("DELETE FROM leads WHERE id = $1 AND agent_id = $2", [
      req.params.id,
      req.user.id,
    ]);

    // Release the property (set to available)
    if (propertyId) {
      await pool.query(
        "UPDATE properties SET status = 'available' WHERE id = $1",
        [propertyId],
      );
    }

    res.json({ message: "Lead deleted and property released" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SMS REMINDER ROUTE - HYBRID APPROACH (AGENT + CLIENT) SANDBOXED FOR NOW
// app.post(
//   "/api/leads/:id/send-reminder",
//   authenticateToken,
//   async (req, res) => {
//     try {
//       const leadResult = await pool.query(
//         "SELECT * FROM leads WHERE id = $1 AND agent_id = $2",
//         [req.params.id, req.user.id],
//       );

//       if (leadResult.rows.length === 0) {
//         return res.status(404).json({ error: "Lead not found" });
//       }

//       const lead = leadResult.rows[0];
//       const agentResult = await pool.query(
//         "SELECT phone, name FROM agents WHERE id = $1",
//         [req.user.id],
//       );
//       const agent = agentResult.rows[0];

//       // SMS 1: Reminder to agent about the lead
//       const agentMessage = `PropertyFlow Reminder: Follow up with ${lead.client_name} (${lead.client_phone}) regarding ${lead.property_interest}. Status: ${lead.status}`;

//       // SMS 2: Notification to client about agent interest
//       const clientMessage = `Hi ${lead.client_name}, thanks for your interest in ${lead.property_interest}. ${agent.name} from PropertyFlow will contact you shortly. Reply STOP to opt out.`;

//       const results = {
//         agentSMS: null,
//         clientSMS: null,
//         message: "",
//         status: "sent",
//         timestamp: new Date(),
//       };

//       if (smsService) {
//         // Send SMS to AGENT
//         try {
//           console.log(`\n[SMS 1/2] Sending AGENT REMINDER to: ${agent.phone}`);
//           console.log(`Message: ${agentMessage}\n`);

//           const agentResponse = await smsService.send({
//             to: [agent.phone],
//             message: agentMessage,
//           });
//           console.log(
//             "AGENT SMS Response:",
//             agentResponse.SMSMessageData.Recipients,
//           );

//           // Extract agent SMS details
//           if (
//             agentResponse.SMSMessageData &&
//             agentResponse.SMSMessageData.Recipients &&
//             agentResponse.SMSMessageData.Recipients.length > 0
//           ) {
//             const recipient = agentResponse.SMSMessageData.Recipients[0];
//             results.agentSMS = {
//               number: recipient.number,
//               statusCode: recipient.statusCode,
//               status: recipient.status,
//               cost: recipient.cost,
//               messageId: recipient.messageId,
//             };
//           }
//         } catch (agentError) {
//           console.error("Agent SMS Error:", agentError.message);
//           results.agentSMS = {
//             error: agentError.message,
//             status: "failed",
//           };
//         }

//         // Send SMS to CLIENT
//         try {
//           console.log(
//             `[SMS 2/2] Sending CLIENT NOTIFICATION to: ${lead.client_phone}`,
//           );
//           console.log(`Message: ${clientMessage}\n`);

//           const clientResponse = await smsService.send({
//             to: [lead.client_phone],
//             message: clientMessage,
//           });
//           console.log(
//             "CLIENT SMS Response:",
//             clientResponse.SMSMessageData.Recipients,
//           );

//           // Extract client SMS details
//           if (
//             clientResponse.SMSMessageData &&
//             clientResponse.SMSMessageData.Recipients &&
//             clientResponse.SMSMessageData.Recipients.length > 0
//           ) {
//             const recipient = clientResponse.SMSMessageData.Recipients[0];
//             results.clientSMS = {
//               number: recipient.number,
//               statusCode: recipient.statusCode,
//               status: recipient.status,
//               cost: recipient.cost,
//               messageId: recipient.messageId,
//             };
//           }
//         } catch (clientError) {
//           console.error("Client SMS Error:", clientError.message);
//           results.clientSMS = {
//             error: clientError.message,
//             status: "failed",
//           };
//         }

//         // Determine overall success
//         if (results.agentSMS?.statusCode === 101) {
//           results.message =
//             "SMS sent successfully to both agent and client via Africa's Talking!";
//         } else if (results.agentSMS?.error) {
//           results.message = "SMS delivery failed";
//           results.status = "failed";
//         } else {
//           results.message = "SMS delivery completed";
//         }

//         res.json({
//           ...results,
//           provider: "Africa's Talking",
//           agentReminder: agentMessage,
//           clientNotification: clientMessage,
//         });
//       } else {
//         // Mock SMS (demo mode)
//         console.log(`\n[DEMO MODE] SMS SIMULATION`);
//         console.log(`\n[SMS 1/2] AGENT REMINDER to: ${agent.phone}`);
//         console.log(`Message: ${agentMessage}`);
//         console.log(`\n[SMS 2/2] CLIENT NOTIFICATION to: ${lead.client_phone}`);
//         console.log(`Message: ${clientMessage}\n`);

//         results.agentSMS = {
//           number: agent.phone,
//           status: "simulated",
//           statusCode: 101,
//         };
//         results.clientSMS = {
//           number: lead.client_phone,
//           status: "simulated",
//           statusCode: 101,
//         };
//         results.message =
//           "SMS reminders sent in DEMO MODE (Configure Africa's Talking for real SMS)";

//         res.json({
//           ...results,
//           provider: "mock",
//           agentReminder: agentMessage,
//           clientNotification: clientMessage,
//           hint: "To enable real SMS, set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME in .env",
//         });
//       }
//     } catch (error) {
//       console.error("Reminder Error:", error);
//       res.status(500).json({ error: error.message });
//     }
//   },
// );
// LIVE SEND SMS ROUTE - UNCOMMENT ABOVE AND COMMENT BELOW TO ENABLE REAL SMS
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
        "SELECT phone, name FROM agents WHERE id = $1",
        [req.user.id],
      );
      const agent = agentResult.rows[0];

      // SMS 1: Reminder to agent about the lead
      const agentMessage = `PropertyFlow Reminder: Follow up with ${lead.client_name} (${lead.client_phone}) regarding ${lead.property_interest}. Status: ${lead.status}`;

      // SMS 2: Notification to client about agent interest
      const clientMessage = `Hi ${lead.client_name}, thanks for your interest in ${lead.property_interest}. ${agent.name} from PropertyFlow will contact you shortly. Reply STOP to opt out.`;

      const results = {
        agentSMS: null,
        clientSMS: null,
        message: "",
        status: "sent",
        timestamp: new Date(),
      };

      if (smsService) {
        // Send SMS to AGENT
        try {
          console.log(`\n[SMS 1/2] Sending AGENT REMINDER to: ${agent.phone}`);
          console.log(`Message: ${agentMessage}\n`);

          const agentResponse = await smsService.send({
            to: [agent.phone],
            message: agentMessage,
            senderId: process.env.SMS_SENDER_ID || "PropertyFlow",
          });
          console.log(
            "AGENT SMS Response:",
            agentResponse.SMSMessageData.Recipients,
          );

          // Extract agent SMS details
          if (
            agentResponse.SMSMessageData &&
            agentResponse.SMSMessageData.Recipients &&
            agentResponse.SMSMessageData.Recipients.length > 0
          ) {
            const recipient = agentResponse.SMSMessageData.Recipients[0];
            results.agentSMS = {
              number: recipient.number,
              statusCode: recipient.statusCode,
              status: recipient.status,
              cost: recipient.cost,
              messageId: recipient.messageId,
            };
          }
        } catch (agentError) {
          console.error("Agent SMS Error:", agentError.message);
          results.agentSMS = {
            error: agentError.message,
            status: "failed",
          };
        }

        // Send SMS to CLIENT
        try {
          console.log(
            `[SMS 2/2] Sending CLIENT NOTIFICATION to: ${lead.client_phone}`,
          );
          console.log(`Message: ${clientMessage}\n`);

          const clientResponse = await smsService.send({
            to: [lead.client_phone],
            message: clientMessage,
            senderId: process.env.SMS_SENDER_ID || "PropertyFlow",
          });
          console.log(
            "CLIENT SMS Response:",
            clientResponse.SMSMessageData.Recipients,
          );

          // Extract client SMS details
          if (
            clientResponse.SMSMessageData &&
            clientResponse.SMSMessageData.Recipients &&
            clientResponse.SMSMessageData.Recipients.length > 0
          ) {
            const recipient = clientResponse.SMSMessageData.Recipients[0];
            results.clientSMS = {
              number: recipient.number,
              statusCode: recipient.statusCode,
              status: recipient.status,
              cost: recipient.cost,
              messageId: recipient.messageId,
            };
          }
        } catch (clientError) {
          console.error("Client SMS Error:", clientError.message);
          results.clientSMS = {
            error: clientError.message,
            status: "failed",
          };
        }

        // Determine overall success
        if (results.agentSMS?.statusCode === 101) {
          results.message =
            "SMS sent successfully to both agent and client via Africa's Talking!";
        } else if (results.agentSMS?.error) {
          results.message = "SMS delivery failed";
          results.status = "failed";
        } else {
          results.message = "SMS delivery completed";
        }

        res.json({
          ...results,
          provider: "Africa's Talking",
          agentReminder: agentMessage,
          clientNotification: clientMessage,
        });
      } else {
        // Mock SMS (demo mode)
        console.log(`\n[DEMO MODE] SMS SIMULATION`);
        console.log(`\n[SMS 1/2] AGENT REMINDER to: ${agent.phone}`);
        console.log(`Message: ${agentMessage}`);
        console.log(`\n[SMS 2/2] CLIENT NOTIFICATION to: ${lead.client_phone}`);
        console.log(`Message: ${clientMessage}\n`);

        results.agentSMS = {
          number: agent.phone,
          status: "simulated",
          statusCode: 101,
        };
        results.clientSMS = {
          number: lead.client_phone,
          status: "simulated",
          statusCode: 101,
        };
        results.message =
          "SMS reminders sent in DEMO MODE (Configure Africa's Talking for real SMS)";

        res.json({
          ...results,
          provider: "mock",
          agentReminder: agentMessage,
          clientNotification: clientMessage,
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
app.get("/api/properties/available", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, address, bedrooms, bathrooms, price, type, status
       FROM properties
       WHERE agent_id = $1
       ORDER BY status DESC, address ASC`,
      [req.user.id],
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
// PUT /api/properties/:id - UPDATE PROPERTY
app.put("/api/properties/:id", authenticateToken, async (req, res) => {
  try {
    const { address, bedrooms, bathrooms, price, type, status } = req.body;

    // If only status is being updated (from dropdown)
    if (status && !address) {
      const result = await pool.query(
        `UPDATE properties 
         SET status = $1
         WHERE id = $2 AND agent_id = $3
         RETURNING *`,
        [status, req.params.id, req.user.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Property not found" });
      }

      return res.json(result.rows[0]);
    }

    // If full property update (from edit modal)
    const result = await pool.query(
      `UPDATE properties 
       SET address = $1, bedrooms = $2, bathrooms = $3, price = $4, type = $5
       WHERE id = $6 AND agent_id = $7
       RETURNING *`,
      [address, bedrooms, bathrooms, price, type, req.params.id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update Property Error:", error);
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
app.delete("/api/properties/:id", authenticateToken, async (req, res) => {
  try {
    // Check if property is assigned to any leads
    const leadCheck = await pool.query(
      "SELECT COUNT(*) as count FROM leads WHERE property_id = $1 AND agent_id = $2",
      [req.params.id, req.user.id],
    );

    if (parseInt(leadCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: "Cannot delete property. It is assigned to one or more leads.",
      });
    }

    // Delete the property
    const result = await pool.query(
      "DELETE FROM properties WHERE id = $1 AND agent_id = $2 RETURNING id",
      [req.params.id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error("Delete Property Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// SMS DELIVERY REPORT CALLBACK
app.post("/api/sms/delivery", async (req, res) => {
  try {
    const { id, phoneNumber, status, statusCode } = req.body;
    console.log("\nSMS DELIVERY REPORT:");
    console.log("Message ID:", id);
    console.log("Phone:", phoneNumber);
    console.log("Status:", status);
    console.log("Status Code:", statusCode);
    res.status(200).json({ message: "Delivery report received" });
  } catch (error) {
    console.error("Delivery Report Error:", error);
    res.status(200).json({ message: "Delivery report received" });
  }
});

// SMS INBOX CALLBACK
// Africa's Talking will POST to this endpoint when clients reply
app.post("/api/sms/inbox", async (req, res) => {
  try {
    const { from, to, text, date } = req.body;
    console.log("\nSMS INBOX MESSAGE:");
    console.log("From:", from);
    console.log("Message:", text);
    console.log("Date:", date);

    if (text.toUpperCase().includes("STOP")) {
      console.log("Client opted out with STOP");
    }

    res.status(200).json({ message: "Inbox message received" });
  } catch (error) {
    console.error("Inbox Error:", error);
    res.status(200).json({ message: "Inbox message received" });
  }
});

// Optional: Get SMS logs (for viewing delivery history)
app.get("/api/sms/logs", authenticateToken, async (req, res) => {
  try {
    res.json({
      message:
        "SMS logging can be implemented by storing delivery reports in database",
      hint: "Create sms_logs table to track all sent messages and their delivery status",
    });
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
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  initializeDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`PropertyFlow CRM Backend running on port ${PORT}`);
    });
  });
}

module.exports = app;
