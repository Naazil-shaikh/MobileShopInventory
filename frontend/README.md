# Mobile Shop Inventory — Frontend

React dashboard for the Mobile Shop Inventory Management API.

## Tech Stack

- React 19 + Vite
- Tailwind CSS 4
- React Router DOM
- TanStack React Query
- React Hook Form + Zod
- Axios

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # or use existing .env
npm run dev
```

Ensure the backend is running on `http://localhost:8000` with `CORS_ORIGIN=http://localhost:5173`.

## Environment

| Variable | Default |
|----------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` |

## Architecture

```
src/
├── api/           # Axios client + interceptors
├── services/      # API calls (no fetch in components)
├── schemas/       # Zod validation
├── context/       # Auth state
├── hooks/         # Shared hooks
├── components/    # Reusable UI + feature components
├── pages/         # Route pages
├── layouts/       # Dashboard shell
└── routes/        # Router + protected routes
```

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Authentication |
| `/` | Dashboard overview |
| `/products` | Product CRUD, search, filter |
| `/suppliers` | Supplier CRUD |
| `/customers` | Customers + purchase history |
| `/inventory` | Stock ops + history + low stock |
| `/mobile-units` | IMEI registration & search |
| `/sales` | Create sale + invoice history |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
