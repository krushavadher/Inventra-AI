<div align="center">

# Inventra AI

**AI-powered inventory management. Track stock, get low-stock alerts, and ask an AI assistant what to do next.**


</div>

---

## Overview

Inventra AI is a full-stack inventory management web app with a dark, glassmorphism-inspired interface. Businesses can manage their product catalog, record stock movements, watch for shortages, and ask a Gemini-powered assistant for plain-language answers and recommended next steps based on their live data.

The project focuses on three things: a **clean, fast dashboard**, **useful alerts**, and an **AI assistant that actually reads your inventory** instead of giving generic answers.

## Features

### Landing page
- Animated grid background with glowing accents
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
- Stock movement chart (stock in vs stock out, last 6 months)
- Inventory by category breakdown
- Recent activity feed and a stock health indicator

### Inventory
- Product catalog with SKU, category, supplier, stock, minimum stock and status
- Add, edit and delete products
- **Stock In** and **Stock Out** actions that update stock and write movement records
- Search, category filter and status filter (All, In Stock, Low, Out)

### Alerts
- Critical (out of stock) and low-stock warnings
- Search and filter by severity
- **Ask AI** button that opens the assistant with the product pre-filled as a question

### AI Assistant
- Powered by Google Gemini Flash
- Reads a summary of your live inventory from the database before answering
- Answers briefly and ends with recommended next steps
- Quick suggestion prompts, copy button and follow-up action

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
│   │   ├── pages/          # Landing, Login, Signup, Dashboard, Inventory, Alerts, Assistant, Profile
│   │   ├── context/        # Auth context
│   │   └── ...
│   └── package.json
├── server/                 # Express API
│   ├── src/
│   │   ├── models/         # User, Product, StockMovement
│   │   ├── routes/         # auth, products, stock, alerts, dashboard, assistant
│   │   ├── middleware/     # JWT auth
│   │   └── seed/           # Sample data script
│   └── package.json
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

Add sample data (about 25 products with stock levels and movements):

```bash
npm run seed
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
| GET | `/api/dashboard/summary` | KPI numbers, category split, monthly movement, recent activity |
| GET, POST | `/api/products` | List or create products |
| PUT, DELETE | `/api/products/:id` | Update or delete a product |
| POST | `/api/stock/in` | Record stock received |
| POST | `/api/stock/out` | Record stock removed |
| GET | `/api/alerts` | Low-stock and out-of-stock items |
| POST | `/api/assistant` | Ask the AI assistant a question |

Test the API with Thunder Client or Postman: log in, copy the `token` from the response, and send it as a Bearer token on the protected routes.

## How the AI Assistant Works

1. The user asks a question, for example "What should I reorder?"
2. The server builds a compact summary from MongoDB: low-stock items, out-of-stock items, top-moving products and total stock value.
3. The summary and the question are sent to Gemini with instructions to use only the provided data and to end with three recommended next steps.
4. The reply is returned to the interface and rendered with the steps highlighted.

The API key stays on the server, so it is never visible in the browser.

## Roadmap

- [ ] **Sales and profit tracking:** record sold products when removing stock, store cost and selling price at the time of sale, and calculate revenue, cost of goods, profit and margin
- [ ] **Sales page** with sales history, monthly revenue vs profit chart, top profit products and CSV export
- [ ] Revenue and profit cards on the dashboard
- [ ] AI assistant answers about profit, such as "Which products make the most profit?"
- [ ] Role-based permissions for admin, manager and staff
- [ ] Email notifications for critical stock levels

## Contributing

Contributions, issues and feature ideas are welcome. Open an issue to discuss a change, then submit a pull request.

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push the branch and open a pull request

## License

This project is licensed under the MIT License. Add a `LICENSE` file to the repository if you keep this section.




<div align="center">

If you find this project useful, consider giving it a star.

</div>
