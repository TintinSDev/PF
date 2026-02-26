# PropertyFlow CRM - Updated Pitch

## THE PROBLEM

In Kenya, real estate agents juggle dozens of clients across fragmented spreadsheets and WhatsApp chats—losing leads and missing follow-ups. They manage properties manually, struggle to track client interest levels, and have no way to systematically follow up without relying on memory or post-it notes. Even worse, when they need to reach clients, they're dependent on internet connectivity—a luxury not all agents have consistently.

The result: Lost deals, frustrated clients, and agents working harder than they need to.

## THE SOLUTION: PropertyFlow CRM

PropertyFlow is a lightweight, cloud-based CRM built specifically for African real estate agents. It centralizes everything an agent needs into one intuitive dashboard:

- Track all clients and their property interests in one place
- Manage property listings with real-time availability status
- Automatically link clients to properties—when a property is assigned to a lead, it's marked as "booked"
- Set follow-up dates and get SMS reminders when it's time to call back
- Send instant SMS notifications to both yourself and your clients

## KEY FEATURES

### 1. Lead Management Dashboard
Agents can create leads with client name, phone number, property interests, and notes. All leads are visible in a table with status tracking (New, Contacted, Interested, Closed). Stats cards show total leads and breakdown by status at a glance.

### 2. Property Inventory System
Agents manage their property portfolio. Each property shows:
- Address, bedrooms, bathrooms, price, property type
- Real-time status badges: Available, Booked, or Sold
- When a property is assigned to a client, it automatically shows "Booked" with the client's name
- Agents can manually update status when deals close

### 3. Lead-Property Connection
When adding a new lead, agents select from their available properties via dropdown. Only "Available" properties can be selected. When a property is assigned to a lead, it's instantly marked "Booked" in the property inventory. If a lead is deleted, the property reverts to "Available."

### 4. Hybrid SMS System
This is the game-changer. Agents click one SMS button and TWO things happen:

SMS 1 - Agent Gets Reminder:
"PropertyFlow Reminder: Follow up with [Client Name] ([Phone]) regarding [Property]. Status: [Status]"

SMS 2 - Client Gets Notification:
"Hi [Client Name], thanks for your interest in [Property]. [Agent Name] from PropertyFlow will contact you shortly. Reply STOP to opt out."

This engagement happens instantly. Both parties are in the loop. The agent has their follow-up reminder. The client knows someone is coming.

### 5. SMS Delivery Tracking
Africa's Talking integration provides real-time delivery confirmations. Agents see:
- Message ID and timestamp
- Delivery status (Success, Pending, Failed)
- Cost per SMS
- Which numbers were reached

### 6. Authentication & Security
Secure agent registration and login with JWT tokens. Each agent only sees their own leads and properties. Password hashing with bcryptjs.

## THE MARKET FIT

This solves three critical problems for African agents:

1. **Organization**: Everything in one place instead of scattered across WhatsApp and spreadsheets
2. **Accountability**: Status tracking ensures no lead falls through the cracks
3. **Engagement**: Automated SMS keeps clients and agents in sync, even without internet connectivity

## THE TECH: Built for Africa

- **Frontend**: React + Vite (fast, modern, lightweight)
- **Backend**: Node.js + Express (simple, scalable, reliable)
- **Database**: PostgreSQL (robust, proven)
- **SMS**: Africa's Talking API (works on any phone, any network)
- **Deployment**: Vercel (global CDN, serverless, always on)

## WHEN JUDGES ASK ABOUT SMS

"My app sends real SMS notifications via Africa's Talking. When an agent clicks the SMS button, two messages go out simultaneously:

1. The agent receives an SMS reminder about the client and property
2. The client receives an SMS notification that the agent will contact them

This happens in real-time. Watch - I'll click SMS on this lead right now."

[Click SMS]

"You'll see in the console:
- [SMS 1/2] Agent reminder sent to +254711326640
- [SMS 2/2] Client notification sent to +254758297550
- Both show delivery confirmation with status codes and costs

In about 10 seconds, I'll receive actual text messages on my phone confirming delivery. This isn't simulated—these are real SMS through Africa's Talking's production API."

[Show phone receiving the SMS]

"This is crucial for the African market. Agents don't need internet to receive alerts. The SMS arrives on any phone—smartphone or basic feature phone. It's how agents actually work here."

## THE BUSINESS MODEL

Freemium:
- Free tier: Up to 20 leads, basic property management
- Premium tier: Unlimited leads, advanced analytics, priority SMS delivery
- Per-SMS pricing through Africa's Talking (agents pay for what they use)

## COMPETITIVE ADVANTAGE

Unlike generic CRM tools built for the Western market, PropertyFlow is:
- **Africa-native**: Built with Africa's Talking from day one
- **Offline-friendly**: SMS works even without internet
- **Simple**: No complex features agents don't need
- **Affordable**: Free to start, pay-per-use SMS pricing
- **Mobile-first**: Works on any device, any connection

## TRACTION

- Fully functional MVP built and tested
- Real SMS integration working in production
- Property-lead linking system deployed
- User authentication and security implemented
- Database syncing across multiple agents

## CALL TO ACTION

PropertyFlow is ready to roll out to Kenyan real estate markets. We're looking for:
- Initial agent partners for feedback and testimonials
- Connection to real estate associations
- Distribution partnerships

This is day-one technology for a market that's desperate for it.
