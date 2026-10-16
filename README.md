<div align="center">

# Inventra AI

**AI-powered inventory management. Track stock, record sales, see your profit, forecast stockouts, and ask an AI assistant what to do next.**





</div>

---

## Overview

Inventra AI is a full-stack inventory management web app with a dark, glassmorphism-inspired interface. Businesses can manage their product catalog, record stock movements and sales, see revenue and profit, predict when products will run out, and ask a Gemini-powered assistant for plain-language answers and recommended next steps based on their live data.

The project focuses on four things: a **clean, fast dashboard**, **real profit numbers** calculated from recorded sales, **forecasts you can verify** because the maths runs on your own sales history, and an **AI assistant that actually reads your inventory** instead of giving generic answers.

## Features

### Landing page
- Animated grid background with glowing accents and cursor spotlight
- Sections for features, the AI assistant, and how it works
- Smooth scrolling and scroll-triggered reveals
- Glass-style cards with hover effects

### Authentication
- Sign up and log in with email and password
- Passwords hashed with bcrypt, sessions with JWT
- Protected routes: app pages redirect to login when signed out
- Profile menu with name, role and logout

### Dashboard
- KPI cards: total products, stock value (₹), low stock, out of stock
- Revenue and profit for the current month with margin
- Stock movement chart (stock in vs stock out, last 6 months)
- Inventory by category breakdown
- Recent activity feed, stock health indicator, and a stockout risk card showing the nearest predicted stockouts

### Inventory
- Product catalog with SKU, category, supplier, cost, retail price, stock, minimum stock, lead time and status
- Add, edit and delete products
- **Stock In** and **Stock Out** actions that update stock and write movement records
- Stock Out asks for a reason (sold, damaged, returned, other); sold items record the selling price and calculate profit instantly
- Search, category filter and status filter (All, In Stock, Low, Out)
- Margin and estimated days of stock left shown per product

### Sales and profit
- Record sales with quantity, selling price, customer, note and date
- Cost price is saved with every sale, so past profit never changes when you update a product's cost later
- Revenue, cost of goods, profit and margin with change versus the previous period
- Date ranges: this month, last month, last 6 months, all time
- Revenue vs profit chart by month and a top-profit products list
- Sales history table with search, category filter, pagination and loss badges
- Void a sale to restore stock and remove it from all calculations
- Import sales from CSV (with a downloadable template and row-by-row validation) and export to CSV
- Stock can never go negative, even if two sales are recorded at the same moment

### Demand forecast
- Daily demand per product from your real sales history, weighting recent weeks more heavily
- Days of stock left, predicted stockout date, and demand trend (up, down, stable)
- Reorder point and suggested order quantity and cost, based on each product's lead time
- Risk levels: out, critical, warning, healthy, dead stock, and "not enough data" (no made-up numbers when history is thin)
- Confidence label for every forecast
- Product drawer with a 30-day sales chart, a projected stock line, lead-time marker and reorder point
- One-click actions: Stock In with the suggested quantity, copy a reorder note, or ask the AI
- AI insights that explain the computed numbers (the AI never invents figures)

### Alerts
- Critical (out of stock) and low-stock warnings
- Predicted stockouts from the forecast
- Search and filter by severity
- **Ask AI** button that opens the assistant with the product pre-filled as a question

### AI Assistant
- Powered by Google Gemini Flash
- Reads a summary of your live inventory, sales, profit and forecast before answering
- Answers briefly and ends with recommended next steps
- Quick suggestions such as "When will I run out of stock?" and "Which products make the most profit?"
- Markdown replies, copy button and follow-up action

## How the numbers are calculated

**Profit**

```
revenue = selling price x quantity
cost    = unit cost at the time of sale x quantity
profit  = revenue - cost
margin  = profit / revenue x 100
```

**Forecast** (per product, from non-voided sales)

```
daily demand  = 50% of the last 7 days average
              + 30% of days 8-30 average
              + 20% of days 31-60 average
days left     = current stock / daily demand
reorder point = daily demand x (lead time + safety days)
order qty     = daily demand x (lead time + safety days + cover days) - current stock
```

Defaults: 60 days of history, 5 safety days, 30 days of cover. They live in one config file. Forecasts are estimates and improve as more sales are recorded.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, Motion (Framer Motion), Recharts, Lenis |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT, bcrypt |
| AI | Google Gemini API (`@google/genai`) |

> Adjust this table if your project uses different libraries.

## Project Structure

```
inventra-ai/
├── client/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/     # Reusable UI (glass cards, charts, navbar)
│   │   ├── pages/          # Landing, Login, Signup, Dashboard, Inventory,
│   │   │                   # Sales, Alerts, Forecast, Assistant, Profile
│   │   ├── context/        # Auth context
│   │   └── ...
│   └── package.json
├── server/                 # Express API
│   ├── src/
│   │   ├── models/         # User, Product, StockMovement
│   │   ├── routes/         # auth, products, stock, sales, forecast, alerts, dashboard, assistant
│   │   ├── services/       # forecast calculations, sales recording
│   │   ├── config/         # forecast settings
│   │   ├── middleware/     # JWT auth
│   │   └── seed/           # Sample data scripts
│   └── package.json
├── .github/
├── render.yaml
└── README.md
```

> Update folder names to match your repository.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- A MongoDB database (local, or a free MongoDB Atlas cluster)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/inventra-ai.git
cd inventra-ai
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create a `.env` file in `server/`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
```

Add sample products (about 25 items with stock levels):

```bash
npm run seed
```

Optional: add clearly labeled demo sales (about 90 days of history) so the Sales and Forecast pages have something to show:

```bash
npm run seed:demo
```

Remove the demo sales whenever you want, without touching your real data:

```bash
npm run seed:demo:clear
```

Start the API:

```bash
npm run dev
```

### 3. Set up the frontend

```bash
cd ../client
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`), create an account, and sign in.

### Run the tests

```bash
cd server
npm test
```

The forecast calculations (demand, days left, reorder quantity and risk) have unit tests.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Port for the API server |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign login tokens |
| `JWT_EXPIRES_IN` | Token lifetime, for example `7d` |
| `GEMINI_API_KEY` | Gemini API key (server only, never exposed to the browser) |

Never commit your `.env` file. Make sure `.env` is listed in `.gitignore` and share a `.env.example` with empty values instead.

## API Reference

All routes except health, register and login require the header `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in and receive a token |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/profile` | Update name and company |
| GET | `/api/dashboard/summary` | KPIs, category split, monthly movement, recent activity, monthly sales |
| GET, POST | `/api/products` | List or create products |
| PUT, DELETE | `/api/products/:id` | Update or delete a product |
| POST | `/api/stock/in` | Record stock received |
| POST | `/api/stock/out` | Record stock removed (with an optional reason such as sale) |
| GET, POST | `/api/sales` | List sales or record a sale |
| POST | `/api/sales/:id/void` | Void a sale and restore stock |
| GET | `/api/sales/summary` | Revenue, cost, profit, margin, monthly trend, top products |
| POST | `/api/sales/import` | Import sales from validated CSV rows |
| DELETE | `/api/sales/demo` | Remove demo sales only |
| GET | `/api/forecast` | Forecast for every product |
| GET | `/api/forecast/summary` | Risk counts, suggested reorder cost, nearest stockouts |
| GET | `/api/forecast/:productId` | One product with its daily series and projection |
| POST | `/api/forecast/insights` | AI explanation of the computed forecast |
| GET | `/api/alerts` | Low-stock, out-of-stock and predicted-stockout items |
| POST | `/api/assistant` | Ask the AI assistant a question |

Test the API with Thunder Client or Postman: log in, copy the `token` from the response, and send it as a Bearer token on the protected routes.

## How the AI Works

**Assistant**

1. The user asks a question, for example "What should I reorder?"
2. The server builds a compact summary from MongoDB: low-stock and out-of-stock items, top-moving products, stock value, this month's revenue and profit, and the nearest predicted stockouts.
3. The summary and the question are sent to Gemini with instructions to use only the provided data and to end with three recommended next steps.
4. The reply is rendered with the steps highlighted.

**Forecast insights**

The forecast numbers are calculated by the server, not by the AI. Gemini only receives the finished numbers and writes a short explanation and recommended actions, with instructions not to invent figures.

The API key stays on the server, so it is never visible in the browser.

## Roadmap

- [ ] Barcode and QR scanning for quick Stock In and Out
- [ ] Email notifications for critical stock levels
- [ ] Role-based permissions for admin, manager and staff
- [ ] Bulk product import from CSV
- [ ] Product images
- [ ] Installable mobile app (PWA)
- [ ] Deployment with a live demo link




<div align="center">



</div>
