# SecureBank API

A production-grade, secure REST API for core banking operations: built with Node.js, Express, TypeScript, Prisma, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express.js |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | JWT (access + refresh tokens) |
| Password hashing | bcrypt (rounds: 12) |
| Validation | Zod |
| Security headers | Helmet |
| Rate limiting | express-rate-limit |
| Logging | Winston |
| API docs | Swagger / OpenAPI 3.0 |
| Testing | Jest + Supertest |
| Containerisation | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Dependency scanning | Dependabot |
| Code security | Semgrep |

---

## Security Features

- JWT access tokens (15 min) + rotating refresh tokens (7 days)
- Refresh tokens are stored as SHA-256 hashes — never in plaintext
- Account lockout after configurable failed login attempts
- bcrypt password hashing with configurable rounds
- Zod schema validation on all inputs
- Helmet security headers (CSP, HSTS, X-Frame, X-XSS, noSniff)
- Global + per-route rate limiting (auth, transactions)
- Audit logging for all sensitive operations
- Role-based access control (ADMIN / AUDITOR)
- Request body size limit (10 KB)
- Sensitive fields stripped from all API responses
- Atomic database transactions for financial operations
- Non-root Docker user in production image

---

## Project Structure

```
securebank-api/
├── src/
│   ├── app.ts                  # Express app setup
│   ├── server.ts               # Entry point + graceful shutdown
│   ├── config/
│   │   ├── env.ts              # Validated environment variables (Zod)
│   │   ├── database.ts         # Prisma client singleton
│   │   ├── logger.ts           # Winston logger
│   │   └── swagger.ts          # Swagger/OpenAPI spec
│   ├── controllers/            # Request handlers (thin layer)
│   ├── services/               # Business logic
│   ├── routes/                 # Express routers
│   ├── middleware/
│   │   ├── auth.middleware.ts  # JWT authentication + RBAC
│   │   ├── validate.middleware.ts
│   │   ├── audit.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rateLimiter.middleware.ts
│   ├── schemas/                # Zod validation schemas
│   ├── utils/                  # Utilities (jwt, hash, response, sanitise)
│   └── types/                  # TypeScript types
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data
├── tests/
│   ├── setup.ts
│   ├── auth.test.ts
│   ├── account.test.ts
│   └── transaction.test.ts
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint, type-check, test, build, Semgrep
│       └── dependabot.yml
├── Dockerfile                  # Multi-stage production image
└── docker-compose.yml          # App + DB + test DB
```

---

## API Endpoints

### Auth `POST /api/v1/auth`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register a new user |
| POST | `/login` | — | Login, receive access + refresh tokens |
| POST | `/refresh` | — | Rotate refresh token |
| POST | `/logout` | Bearer | Revoke refresh token |
| GET | `/me` | Bearer | Get authenticated user profile |

### Accounts `GET /api/v1/accounts`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | Bearer | Open a new bank account |
| GET | `/` | Bearer | List user's accounts |
| GET | `/:id` | Bearer | Get account details |
| GET | `/:id/balance` | Bearer | Get account balance |

### Transactions `POST /api/v1/transactions`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/deposit` | Bearer | Deposit funds |
| POST | `/withdraw` | Bearer | Withdraw funds |
| POST | `/transfer` | Bearer | Transfer between accounts |
| GET | `/` | Bearer | List transactions (with filters) |
| GET | `/:id` | Bearer | Get a specific transaction |

### Admin `GET /api/v1/admin` (ADMIN role only)

| Method | Route | Description |
|---|---|---|
| GET | `/users` | List all users |
| GET | `/users/:id` | Get user with accounts |
| PATCH | `/users/:id/deactivate` | Deactivate a user |
| PATCH | `/users/:id/unlock` | Unlock a locked account |
| GET | `/audit-logs` | View audit logs |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- PostgreSQL (or use Docker)

### 1. Clone & install

```bash
git clone https://github.com/your-org/securebank-api.git
cd securebank-api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set strong JWT secrets
```

### 3. Start the database

```bash
docker-compose up -d db
```

### 4. Run migrations & seed

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 5. Start development server

```bash
npm run dev
```

API available at: `http://localhost:3000`
Swagger docs at: `http://localhost:3000/api-docs`

---

## Docker (Production)

```bash
# Build and run everything
docker-compose up -d

# View logs
docker-compose logs -f api
```

---

## Testing

```bash
# Requires a running test database (port 5433)
docker-compose up -d db_test

# Apply migrations to test DB
TEST_DATABASE_URL=postgresql://securebank:securebank_pass@localhost:5433/securebank_test \
  npx prisma migrate deploy

# Run tests
npm test

# With coverage
npm run test:coverage
```

---

## Seed Credentials

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@securebank.com | Admin@SecureBank1! |
| AUDITOR | auditor@securebank.com | Auditor@SecureBank1! |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_ACCESS_SECRET` | Access token signing secret (min 32 chars) | — |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (min 32 chars) | — |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `BCRYPT_ROUNDS` | bcrypt cost factor | `12` |
| `MAX_FAILED_LOGIN_ATTEMPTS` | Lock account after N failures | `5` |
| `ACCOUNT_LOCK_DURATION_MINUTES` | Lock duration | `30` |
| `RATE_LIMIT_MAX_REQUESTS` | Global rate limit per window | `100` |
| `AUTH_RATE_LIMIT_MAX` | Auth route rate limit | `10` |

---

## License

MIT
