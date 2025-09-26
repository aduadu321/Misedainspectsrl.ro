# ITP NOTIFICATION - Copilot Instructions

## Project Overview

This is a bilingual (Romanian) React + TypeScript + Node.js authentication system for ITP (Vehicle Inspection) notifications. The project supports both MongoDB (development) and MariaDB (production) with dual-channel verification (email/SMS).

## Architecture

### Backend Structure (`server/`)

- **Express server** with Passport.js authentication (GitHub OAuth + local)
- **Dual verification system**: Users choose email or SMS for account verification
- **JWT tokens** for API authentication (7-day expiration)
- **Rate limiting**: General (100/15min) + Auth-specific (5/15min) via `express-rate-limit`
- **Romanian error messages** throughout the API responses

### Frontend Structure (`src/`)

- **React Router** SPA with login/register pages + dashboard placeholder
- **Tailwind CSS** with Romanian UI text
- **Vite dev server** on port 5173, backend on port 5000

### Key Services

- **Email**: Nodemailer with MISEDA INSPECT SRL SMTP config (port 587, STARTTLS)
- **SMS**: smsadvert.ro API integration with Romanian phone numbers
- **Deployment**: Automated cPanel deployment via SSH/SFTP

## Development Workflows

### Local Development

```bash
# Start both frontend and backend
npm run dev          # Frontend (Vite)
npm run server       # Backend with nodemon + ts-node

# Build for production
npm run build        # Frontend build
npm run server:build # Backend compilation to dist-server/
```

### Testing & Validation

```bash
npm run test:login   # Comprehensive auth flow tests with in-memory MongoDB
```

### Deployment

```bash
npm run zip:deploy      # Creates deployment package
npm run deploy:cpanel   # Automated SSH deployment to cPanel
```

## Critical Patterns

### Authentication Flow

1. **Registration** creates unverified users, sends verification via preferred channel
2. **Login** blocks unverified accounts with `needsVerification: true` response
3. **Verification** endpoints (`/verify-email`, `/verify-sms`) activate accounts
4. **JWT middleware missing** - currently uses `x-user-id` header (TODO in user routes)

### Database Transition

- **Development**: MongoDB via Mongoose (`mongoose.connect()`)
- **Production**: MariaDB schema in `database/schema.sql`
- **Model compatibility**: User model designed for dual-database support

### Error Handling

- **Custom asyncHandler** wraps all routes (`middleware/errorHandler.ts`)
- **Consistent Romanian responses**: `{ success: boolean, message: string }`
- **Rate limit violations**: Romanian error messages with 15-minute timeouts

### Environment Configuration

- **CORS origins**: `CLIENT_URL` comma-separated or defaults to localhost:5173
- **Verification services**: Graceful degradation if email/SMS configs missing
- **Deployment vars**: cPanel credentials for automated deployment scripts

## File Conventions

### Romanian Field Names

- User model uses Romanian: `nume`, `prenume`, `nrTelefon`, `parola`
- API endpoints mirror these field names
- Database schema (MariaDB) maintains Romanian column names

### Import Patterns

- **CommonJS requires** for core dependencies in `server/index.ts`
- **ES modules** for internal imports and route files
- **dotenv.config()** must be called before any other imports

### Deployment Structure

- **Source**: `server/` and `src/` directories
- **Build**: `dist-server/` (compiled backend) + `dist/` (frontend assets)
- **Deploy**: `deploy/` folder contains production-ready package

## External Dependencies

### Required Environment Variables

```bash
# Core
JWT_SECRET, SESSION_SECRET, NODE_ENV, PORT, CLIENT_URL

# Database
MONGODB_URI  # Development
# MariaDB connection for production (schema in database/schema.sql)

# Email (MISEDA INSPECT SRL)
EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_FROM

# SMS (smsadvert.ro)
SMS_API_TOKEN

# GitHub OAuth
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL

# cPanel Deployment
CPANEL_HOST, CPANEL_USER, CPANEL_PASS, CPANEL_APP_DIR, CPANEL_PUBLIC_HTML
```

### Key Integration Points

- **SMS API**: Romanian phone format (+40), company branding in messages
- **Email service**: MISEDA INSPECT SRL sender identity, HTML templates
- **cPanel deployment**: SSH/SFTP automation for shared hosting environment

## Testing Strategy

- **Authentication flows**: Complete registration → verification → login cycles
- **In-memory MongoDB**: Fast test isolation via `mongodb-memory-server`
- **Romanian validation**: Error messages and field validation in Romanian
- **Rate limiting**: Disabled in test environment (`NODE_ENV === "test"`)

When working on this codebase, prioritize maintaining Romanian language consistency, dual-verification system integrity, and the MongoDB→MariaDB migration path.