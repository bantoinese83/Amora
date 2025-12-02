# 🎙️ Amora

<div align="center">

![Amora Logo](https://img.shields.io/badge/Amora-Therapist%2C%20Coach%20%26%20Journal-purple?style=for-the-badge&logo=google-assistant)

**A Therapist, Coach, and Journal in One App**

*Your voice-powered AI companion for emotional support, personal growth, and daily reflection*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-amora--mu.vercel.app-blue?style=flat-square)](https://amora-mu.vercel.app/)
[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue.svg)](https://neon.tech/)
[![Stripe](https://img.shields.io/badge/Stripe-Integrated-635BFF.svg)](https://stripe.com/)

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Development Setup](#-development-setup)
- [Database Setup](#-database-setup)
- [Stripe Integration](#-stripe-integration)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
  - [Vercel (Client)](#vercel-client-deployment)
  - [Railway (Server)](#railway-server-deployment)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🎯 Overview

Amora combines the best of therapy, coaching, and journaling into one powerful voice-powered app. Whether you need emotional support, guidance on personal growth, or a space to process your thoughts, Amora is there 24/7. Built with modern web technologies, it leverages Google's Gemini Live API to provide natural, real-time voice conversations with intelligent analysis and personalized insights.

**Three-in-One Value:**
- 🛋️ **Therapist**: Process emotions, gain insights, and work through challenges with empathetic AI support
- 🎯 **Coach**: Get actionable guidance, set goals, and stay accountable with personalized coaching
- 📔 **Journal**: Capture your thoughts, track your journey, and review your growth over time

### Key Highlights

- 🎤 **Real-time Voice Interaction** - Ultra-low latency (32ms) voice conversations
- 🧠 **AI-Powered Analysis** - Post-session insights with mood analysis and recommendations
- 🔐 **Secure Authentication** - Email + PIN with bcrypt hashing and PostgreSQL
- 💳 **Full Stripe Integration** - Complete subscription management and payment processing
- 📊 **Session History** - Comprehensive archive with transcripts, audio, and analysis
- 🎨 **Modern UI/UX** - Dark-themed interface with smooth animations

---

## ✨ Features

### Core Capabilities

#### 🎙️ Voice Interaction
- **Real-time Voice Sessions**: Natural, conversational interactions powered by Google Gemini Live API
- **Low-latency Audio Processing**: Optimized for ultra-low latency (32ms buffer) with echo cancellation
- **Voice Customization**: Multiple voice options (Kore, Charon, Fenrir, Aoede) with customizable personalities
- **Audio Playback**: Complete session replay with synchronized user and assistant audio tracks

#### 🧠 Intelligence & Analysis
- **AI-Powered Session Analysis**: Post-session insights including mood analysis, psychological insights, and actionable recommendations
- **Structured Conversations**: Guided 10-15 minute reflection sessions with therapeutic conversation flow
- **Session History**: Comprehensive archive with full transcripts, audio playback, and analysis summaries

#### 👤 User Experience
- **Secure Authentication**: Email + PIN authentication with bcrypt hashing and Neon PostgreSQL database
- **Premium Subscriptions**: Full Stripe integration for subscription management
- **Quick Actions Menu**: Command palette (Cmd+K/Ctrl+K) for efficient navigation
- **Auto-retry Logic**: Intelligent reconnection with exponential backoff on connection errors
- **Session Management**: 15-minute session duration with visual countdown and progress tracking
- **Modern UI/UX**: Light-themed minimalist interface with smooth animations and responsive design

### Technical Excellence

- **TypeScript Strict Mode**: Full type safety with comprehensive type checking
- **Quality Assurance**: Automated quality gates (type checking, linting, formatting, unused code detection)
- **Error Handling**: Graceful error boundaries with user-friendly messaging
- **Performance**: Code splitting, lazy loading, and optimized asset delivery
- **Accessibility**: WCAG-compliant with ARIA labels, keyboard navigation, and screen reader support
- **Code Quality**: ESLint, Prettier, and Knip for maintaining high code standards

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19.2
- **Language**: TypeScript 5.8 (Strict Mode)
- **Build Tool**: Vite 6.0
- **Styling**: Tailwind CSS 3.x
- **State Management**: React Context API
- **Payment**: Stripe.js

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript 5.8
- **Database**: Neon PostgreSQL (Serverless)
- **Payment Processing**: Stripe API

### AI & Services
- **AI Integration**: Google Gemini Live API
- **Database**: Neon PostgreSQL
- **Payment**: Stripe (Live Mode)
- **Deployment**: Vercel (Client) + Railway (Server)

### Development Tools
- **Code Quality**: ESLint, Prettier, Knip
- **Type Checking**: TypeScript Strict Mode
- **Package Manager**: npm workspaces

---

## 🏗️ Architecture

### Project Structure

```
amora---voice-ai/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # React UI components
│   │   │   ├── common/        # Reusable components (Button, Card, Modal, etc.)
│   │   │   ├── AuthPaymentModal.tsx
│   │   │   ├── PaymentCheckout.tsx
│   │   │   ├── PostSessionSummary.tsx
│   │   │   ├── SessionHistory.tsx
│   │   │   └── ...
│   │   ├── context/           # React Context providers
│   │   │   └── AppContext.tsx
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useVoiceClient.ts
│   │   │   ├── useSessionTimer.ts
│   │   │   └── ...
│   │   ├── services/          # Business logic and API integration
│   │   │   ├── liveClient.ts
│   │   │   ├── authService.ts
│   │   │   ├── sessionService.ts
│   │   │   ├── stripeService.ts
│   │   │   └── ...
│   │   ├── utils/             # Utility functions
│   │   └── types.ts           # TypeScript type definitions
│   ├── public/                # Static assets
│   ├── package.json
│   └── vite.config.ts
│
├── server/                    # Backend Express server
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.ts        # Authentication endpoints
│   │   │   ├── sessions.ts    # Session management endpoints
│   │   │   ├── checkout.ts    # Stripe checkout endpoints
│   │   │   ├── portal.ts      # Stripe portal endpoints
│   │   │   ├── webhooks.ts    # Stripe webhook handlers
│   │   │   └── subscription.ts # Subscription status endpoints
│   │   ├── types/             # Server-specific types
│   │   └── index.ts           # Express server setup
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                    # Shared code between client and server
│   ├── src/
│   │   ├── repositories/     # Data access layer (Neon database)
│   │   │   ├── userRepository.ts
│   │   │   ├── sessionRepository.ts
│   │   │   └── preferencesRepository.ts
│   │   ├── services/         # Shared services
│   │   │   ├── databaseService.ts
│   │   │   └── subscriptionService.ts
│   │   └── types/            # Shared TypeScript type definitions
│   ├── migrations/           # Database migrations
│   │   └── add_stripe_columns.sql
│   └── package.json
│
└── package.json              # Root workspace configuration
```

### Design Patterns

- **Separation of Concerns**: Clear boundaries between UI, business logic, and data access layers
- **Repository Pattern**: Abstracted data access layer for database operations
- **Custom Hooks**: Encapsulated business logic in reusable React hooks
- **Context API**: Global state management for application-wide data
- **Error Boundaries**: Graceful error handling at component boundaries
- **Service Layer**: Centralized business logic and external API interactions

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))
- **Stripe Account** ([Sign up](https://stripe.com))
- **Neon PostgreSQL Database** ([Get started](https://neon.tech))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bantoinese83/Amora.git
   cd amora---voice-ai
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   # Or install individually:
   npm install
   cd client && npm install
   cd ../server && npm install
   cd ../shared && npm install
   ```

3. **Set up environment variables** (see [Environment Variables](#-environment-variables) section)

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

---

## 💻 Development Setup

### Available Scripts

#### Root Level Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both client and server in development mode |
| `npm run build` | Build all packages (shared → client → server) |
| `npm run install:all` | Install dependencies for all packages |
| `npm run type-check` | Run TypeScript type checking for all packages |
| `npm run lint` | Run ESLint for all packages |
| `npm run format` | Check code formatting with Prettier |
| `npm run format:fix` | Automatically fix code formatting |

#### Client Commands

| Command | Description |
|---------|-------------|
| `cd client && npm run dev` | Start Vite dev server (port 3000) |
| `cd client && npm run build` | Build optimized production bundle |
| `cd client && npm run preview` | Preview production build locally |
| `cd client && npm run type-check` | Run TypeScript type checking |
| `cd client && npm run lint` | Run ESLint with zero warnings policy |
| `cd client && npm run lint:fix` | Automatically fix ESLint errors |

#### Server Commands

| Command | Description |
|---------|-------------|
| `cd server && npm run dev` | Start Express server with hot reload (port 3001) |
| `cd server && npm run build` | Build TypeScript to JavaScript |
| `cd server && npm start` | Start production server |
| `cd server && npm run type-check` | Run TypeScript type checking |

### Development Workflow

1. **Code Quality**: Run `npm run type-check && npm run lint` before committing
2. **Auto-fix**: Use `npm run format:fix` and `npm run lint:fix` to automatically resolve issues
3. **Type Safety**: TypeScript strict mode is enabled - all types must be properly defined
4. **Linting**: ESLint is configured with zero warnings policy - all warnings must be resolved

### Git Hooks (Pre-Push Checks)

To ensure code quality, a pre-push hook automatically runs type checks and builds before allowing a push:

**Install the hook:**
```bash
npm run install:hooks
```

**What it does:**
- ✅ Type checks client code (`npm run type-check:client`)
- ✅ Type checks server code (`npm run type-check:server`)
- ✅ Builds client (`npm run build:client`)
- ✅ Builds server (`npm run build:server`)

If any step fails, the push will be **aborted**. This ensures that only working, type-safe code is pushed to the repository.

**Note**: The hook runs automatically on every `git push`. To skip it (not recommended), use `git push --no-verify`.

---

## 🗄️ Database Setup

### Neon PostgreSQL Setup

1. **Create a Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Sign up for a free account
   - Create a new project

2. **Get Connection String**
   - In Neon Dashboard, go to your project
   - Click "Connection Details"
   - Copy the connection string (format: `postgresql://user:password@host/database?sslmode=require`)

3. **Run Database Schema**

   The database schema is automatically created on first connection. The application uses the following tables:

   - `users` - User accounts with authentication
   - `user_preferences` - User preferences (voice selection, etc.)
   - `sessions` - Voice session data with transcripts and analysis

   See [Database Schema](#-database-schema) section for detailed schema information.

4. **Apply Migrations** (if needed)

   If you need to add Stripe columns manually:
   ```bash
   # Connect to your Neon database and run:
   psql "your-connection-string" -f shared/migrations/add_stripe_columns.sql
   ```

### Database Connection

The application uses `@neondatabase/serverless` for serverless PostgreSQL connections. The connection string should be set in:

- **Client**: `VITE_NEON_DATABASE_URL` (for direct access - not recommended in production)
- **Server**: `NEON_DATABASE_URL` (recommended for production)

**Note**: In production, the client should NOT have direct database access. All database operations should go through the server API.

---

## 💳 Stripe Integration

### Stripe Account Setup

1. **Create Stripe Account**
   - Sign up at [stripe.com](https://stripe.com)
   - Complete account verification
   - Switch to Live mode (or use Test mode for development)

2. **Get API Keys**
   - Go to [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys)
   - Copy your **Publishable key** (starts with `pk_live_...` or `pk_test_...`)
   - Copy your **Secret key** (starts with `sk_live_...` or `sk_test_...`)

3. **Create Products and Prices**

   **Option A: Using Stripe Dashboard**
   - Go to [Products](https://dashboard.stripe.com/products)
   - Click "+ Add product"
   - Name: "Amora Premium"
   - Add pricing:
     - Monthly: $9.99/month (recurring)
     - Yearly: $99.99/year (recurring)
   - Copy the Price IDs (start with `price_...`)

   **Option B: Using Stripe CLI** (Recommended)
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login
   stripe login
   
   # Create monthly price
   stripe prices create \
     --product prod_TWcmey3pVuDZE2 \
     --unit-amount 999 \
     --currency usd \
     -d "recurring[interval]=month"
   
   # Create yearly price
   stripe prices create \
     --product prod_TWcmey3pVuDZE2 \
     --unit-amount 9999 \
     --currency usd \
     -d "recurring[interval]=year"
   ```

4. **Set Up Webhooks** (see [Deployment](#-deployment) section)

### Stripe Configuration

**Current Production Configuration:**
- **Account**: lamora (acct_1SZZStLoTzU5JHxj)
- **Mode**: Live
- **Product**: Amora Premium (prod_TWcmey3pVuDZE2)
- **Monthly Price**: price_1SZaBALoTzU5JHxjIT4WSaKk ($9.99/month)
- **Yearly Price**: price_1SZaBALoTzU5JHxjR6Q6huQr ($99.99/year)

### Testing Payments

**Test Mode Cards:**
- **Card Number**: `4242 4242 4242 4242`
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

**Other Test Cards:**
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

---

## 📡 API Documentation

### Base URLs

- **Production Server**: `https://amora-server-production.up.railway.app`
- **Local Development**: `http://localhost:3001`

### Authentication Endpoints

#### `POST /api/auth/check-email`
Check if an email exists in the system.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "exists": true
}
```

#### `POST /api/auth/signup`
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "pin": "1234",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "is_premium": false,
    "selected_voice": "Kore",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `POST /api/auth/signin`
Authenticate an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "pin": "1234"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "is_premium": false,
    "selected_voice": "Kore"
  }
}
```

#### `GET /api/auth/user/:userId`
Get user information with preferences.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "is_premium": false,
    "selected_voice": "Kore"
  }
}
```

### Session Endpoints

#### `GET /api/sessions/user/:userId`
Get all sessions for a user.

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "date": "2024-01-01T00:00:00.000Z",
      "durationSeconds": 900,
      "preview": "Session preview text...",
      "transcript": [...],
      "analysis": {...},
      "audioChunks": [...]
    }
  ]
}
```

#### `GET /api/sessions/:sessionId/user/:userId`
Get a specific session by ID.

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "date": "2024-01-01T00:00:00.000Z",
    "durationSeconds": 900,
    "preview": "Session preview text...",
    "transcript": [...],
    "analysis": {...},
    "audioChunks": [...]
  }
}
```

#### `POST /api/sessions/user/:userId`
Create a new session.

**Request:**
```json
{
  "transcript": [
    {
      "role": "user",
      "text": "Hello",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "durationSeconds": 900,
  "audioChunks": [
    {
      "role": "user",
      "data": "base64-encoded-audio",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "date": "2024-01-01T00:00:00.000Z",
    "durationSeconds": 900,
    "preview": "Hello",
    "transcript": [...],
    "audioChunks": [...]
  }
}
```

#### `PUT /api/sessions/:sessionId/user/:userId`
Update a session (typically to add analysis).

**Request:**
```json
{
  "analysis": {
    "title": "Daily Reflection",
    "mood": "calm",
    "icon": "leaf",
    "summary": "A moment of reflection.",
    "keyInsight": "Taking time for yourself is important.",
    "actionItem": "Take a few deep breaths.",
    "encouragement": "You're doing great."
  }
}
```

#### `DELETE /api/sessions/:sessionId/user/:userId`
Delete a session.

**Response:**
```json
{
  "success": true
}
```

### Stripe Endpoints

#### `POST /api/create-checkout-session`
Create a Stripe Checkout session for subscription.

**Request:**
```json
{
  "priceId": "price_1SZaBALoTzU5JHxjIT4WSaKk",
  "successUrl": "https://amora-mu.vercel.app/?payment=success",
  "cancelUrl": "https://amora-mu.vercel.app/?payment=cancel",
  "customerEmail": "user@example.com",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### `POST /api/create-portal-session`
Create a Stripe Customer Portal session for subscription management.

**Request:**
```json
{
  "returnUrl": "https://amora-mu.vercel.app/",
  "customerId": "cus_...",
  "customerEmail": "user@example.com",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

#### `POST /api/webhooks/stripe`
Stripe webhook endpoint (handled automatically by Stripe).

**Events Handled:**
- `checkout.session.completed` - Activate premium when checkout completes
- `customer.subscription.created` - Update subscription status
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Deactivate premium
- `invoice.paid` - Ensure premium is active
- `invoice.payment_failed` - Update subscription status based on current state

### Subscription Endpoints

#### `GET /api/subscription/status/:userId`
Get subscription status for a user.

**Response:**
```json
{
  "isActive": true,
  "customerId": "cus_...",
  "subscriptionId": "sub_...",
  "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
  "cancelAtPeriodEnd": false
}
```

#### `POST /api/subscription/verify-session`
Verify a Stripe Checkout session and update user status.

**Request:**
```json
{
  "sessionId": "cs_test_...",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "isActive": true
}
```

### Health Check

#### `GET /health`
Server health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🚀 Deployment

### Vercel (Client) Deployment

#### Prerequisites

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

#### Deployment Steps

1. **Link Project** (if not already linked)
   ```bash
   cd client
   vercel link
   ```

2. **Set Environment Variables**

   Use Vercel CLI or Dashboard:

   ```bash
   # Via CLI
   vercel env add VITE_GEMINI_API_KEY production
   vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
   vercel env add VITE_STRIPE_PRICE_ID_MONTHLY production
   vercel env add VITE_STRIPE_PRICE_ID_YEARLY production
   vercel env add VITE_BACKEND_URL production
   ```

   Or via Dashboard:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project
   - Go to Settings → Environment Variables
   - Add all required variables (see [Environment Variables](#-environment-variables))

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Verify Deployment**
   - Check deployment URL: `https://amora-mu.vercel.app/`
   - Test authentication flow
   - Test payment flow

#### Vercel Configuration

Create `vercel.json` in project root (already included):

```json
{
  "buildCommand": "npm run build:shared && npm run build:client",
  "outputDirectory": "client/dist",
  "framework": "vite"
}
```

### Railway (Server) Deployment

#### Prerequisites

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

#### Deployment Steps

1. **Initialize Project**
   ```bash
   cd server
   railway init
   # Select: Create new project
   # Project name: amora-server
   ```

2. **Link Service** (if needed)
   ```bash
   railway service
   # Select your service from the list
   ```

3. **Set Environment Variables**

   ```bash
   # Required variables
   railway variables --set "STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY"
   railway variables --set "STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET"
   railway variables --set "NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require"
   railway variables --set "STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk"
   railway variables --set "STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr"
   railway variables --set "NODE_ENV=production"
   
   # Optional variables
   railway variables --set "CLIENT_URL=https://amora-mu.vercel.app"
   railway variables --set "PORT=3001"
   ```

   Or via Railway Dashboard:
   - Go to [Railway Dashboard](https://railway.app/)
   - Select your project: `amora-server`
   - Go to Variables tab
   - Add all required variables

4. **Deploy**
   ```bash
   railway up
   ```

5. **Get Server URL**
   ```bash
   railway domain
   # Output: amora-server-production.up.railway.app
   ```

6. **Verify Deployment**
   ```bash
   curl https://amora-server-production.up.railway.app/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

#### Railway Configuration

The project uses a `Dockerfile` at the root for Railway deployment:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd shared && npm install
RUN cd server && npm install

# Copy source files
COPY shared ./shared
COPY server ./server

# Build shared package first
RUN cd shared && npm run build

# Build server
RUN cd server && npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server/dist/index.js"]
```

### Setting Up Stripe Webhooks

1. **Get Webhook Endpoint URL**
   ```
   https://amora-server-production.up.railway.app/api/webhooks/stripe
   ```

2. **Configure in Stripe Dashboard**
   - Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
   - Click **"+ Add endpoint"**
   - **Endpoint URL**: `https://amora-server-production.up.railway.app/api/webhooks/stripe`
   - **Description**: "Amora Production Webhooks"
   - **Events to send**:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Click **"Add endpoint"**

3. **Get Webhook Secret**
   - After creating the endpoint, click on it
   - Click **"Reveal"** next to "Signing secret"
   - Copy the secret (starts with `whsec_...`)

4. **Add to Railway**
   ```bash
   railway variables --set "STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET"
   ```

5. **Test Webhook**
   - In Stripe Dashboard → Webhooks → Your endpoint
   - Click **"Send test webhook"**
   - Select event: `checkout.session.completed`
   - Check Railway logs: `railway logs`

### Using Stripe CLI for Local Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
```

---

## 🔐 Environment Variables

### Client (Vercel) Environment Variables

Create `.env.local` in `client/` directory for local development:

```env
# Required: Google Gemini API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Required: Backend API URL
VITE_BACKEND_URL=https://amora-server-production.up.railway.app

# Required: Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SZZStLoTzU5JHxjcHJ4JkSh6WFPOUNwB3jB2Fe6PUQ8ZfQUCO9sftf2WfJJnO7cxIO0YaTpIkr36PvLH0zfLV1g008K6ZzRZr
VITE_STRIPE_PRICE_ID_MONTHLY=price_1SZZXTLoTzU5JHxjIUkoZZrq
VITE_STRIPE_PRICE_ID_YEARLY=price_1SZZXULoTzU5JHxjPqDZCb9r

# Optional
VITE_API_URL=https://amora-mu.vercel.app
```

**Set in Vercel:**
```bash
vercel env add VITE_GEMINI_API_KEY production
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
vercel env add VITE_STRIPE_PRICE_ID_MONTHLY production
vercel env add VITE_STRIPE_PRICE_ID_YEARLY production
vercel env add VITE_BACKEND_URL production
```

### Server (Railway) Environment Variables

Create `.env` in `server/` directory for local development:

```env
# Required: Stripe Configuration
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk
STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr

# Required: Database
NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Optional: Server Configuration
NODE_ENV=production
PORT=3001
CLIENT_URL=https://amora-mu.vercel.app
```

**Set in Railway:**
```bash
railway variables --set "STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY"
railway variables --set "STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET"
railway variables --set "NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require"
railway variables --set "STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk"
railway variables --set "STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr"
railway variables --set "NODE_ENV=production"
```

### Environment Variables Checklist

#### ✅ Client (Vercel) - All Set
- [x] `VITE_GEMINI_API_KEY`
- [x] `VITE_STRIPE_PUBLISHABLE_KEY`
- [x] `VITE_STRIPE_PRICE_ID_MONTHLY`
- [x] `VITE_STRIPE_PRICE_ID_YEARLY`
- [x] `VITE_BACKEND_URL`
- [x] `VITE_API_URL` (optional)

#### ✅ Server (Railway) - All Set
- [x] `STRIPE_SECRET_KEY`
- [x] `STRIPE_WEBHOOK_SECRET`
- [x] `NEON_DATABASE_URL`
- [x] `STRIPE_PRICE_ID_MONTHLY`
- [x] `STRIPE_PRICE_ID_YEARLY`
- [x] `NODE_ENV` (optional, defaults to production)
- [x] `PORT` (optional, defaults to 3001)
- [x] `CLIENT_URL` (optional, defaults to *)

---

## 🗄️ Database Schema

### Tables

#### `users`
Stores user account information and authentication data.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE NOT NULL,
  stripe_customer_id VARCHAR(255) NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT users_name_length CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 255)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_users_stripe_subscription_id ON users(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
```

**Columns:**
- `id` (UUID) - Primary key
- `email` (VARCHAR) - Unique user email
- `pin_hash` (VARCHAR) - bcrypt hashed PIN
- `name` (VARCHAR) - User's display name
- `is_premium` (BOOLEAN) - Premium subscription status
- `stripe_customer_id` (VARCHAR) - Stripe customer ID (nullable)
- `stripe_subscription_id` (VARCHAR) - Stripe subscription ID (nullable)
- `created_at` (TIMESTAMP) - Account creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

#### `user_preferences`
Stores user preferences and settings.

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  selected_voice VARCHAR(50) DEFAULT 'Kore' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

**Columns:**
- `user_id` (UUID) - Foreign key to users.id
- `selected_voice` (VARCHAR) - Preferred voice (Kore, Charon, Fenrir, Aoede, Puck)
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

#### `sessions`
Stores voice session data including transcripts, analysis, and audio.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  duration_seconds INTEGER NOT NULL,
  preview TEXT NOT NULL,
  transcript JSONB NOT NULL,
  analysis JSONB NULL,
  audio_chunks JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_date ON sessions(date DESC);
```

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users.id
- `date` (TIMESTAMP) - Session date/time
- `duration_seconds` (INTEGER) - Session duration in seconds
- `preview` (TEXT) - Preview text (first 100 chars of transcript)
- `transcript` (JSONB) - Full conversation transcript
- `analysis` (JSONB) - AI-generated session analysis (nullable)
- `audio_chunks` (JSONB) - Base64-encoded audio chunks (nullable)
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

### Data Types

#### Transcript Format (JSONB)
```typescript
interface MessageLog {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string; // ISO 8601
}
```

#### Analysis Format (JSONB)
```typescript
interface SessionAnalysis {
  title: string;
  mood: string;
  icon: string; // heart, sparkles, sun, moon, leaf, cloud, fire, star, lightbulb
  summary: string;
  keyInsight: string;
  actionItem: string;
  encouragement: string;
}
```

#### Audio Chunks Format (JSONB)
```typescript
interface AudioChunk {
  role: 'user' | 'assistant';
  data: string; // Base64-encoded PCM audio
  timestamp: string; // ISO 8601
}
```

### Migrations

#### Add Stripe Columns Migration

File: `shared/migrations/add_stripe_columns.sql`

```sql
-- Add Stripe customer and subscription ID columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) NULL;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id 
ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id 
ON users(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe subscription ID for active subscriptions';
```

---

## 🔧 Troubleshooting

### Common Issues

#### Connection Problems

**Symptom**: Unable to connect to voice session

**Solutions**:
1. Verify internet connection is stable
2. Check Gemini API key is correctly set in environment variables
3. Ensure microphone permissions are granted in browser settings
4. Check browser console for detailed error messages
5. Verify API key has access to Gemini Live API
6. Check if API key is expired or revoked

#### Audio Issues

**Symptom**: No audio playback or echo

**Solutions**:
1. Check browser audio permissions
2. Verify system audio settings
3. Try different browser (Chrome recommended)
4. Clear browser cache and reload
5. Check if audio context is properly initialized
6. Verify Web Audio API is supported in your browser

#### Payment Processing

**Symptom**: Checkout or portal session fails

**Solutions**:
1. Verify Stripe keys are correctly configured
2. Ensure backend server is running and accessible
3. Check `VITE_BACKEND_URL` matches your backend server URL
4. Review browser console for API error details
5. Verify Stripe webhook endpoints are configured
6. Check Stripe Dashboard for failed payment attempts
7. Verify price IDs match between client and server

#### Database Connection

**Symptom**: Database query errors

**Solutions**:
1. Verify `NEON_DATABASE_URL` is correctly set
2. Check database connection string format
3. Ensure database is accessible (not paused)
4. Check Railway/Vercel logs for connection errors
5. Verify SSL mode is set to `require` in connection string
6. Check if database has reached connection limits

#### Build Errors

**Symptom**: TypeScript or build errors

**Solutions**:
1. Run `npm run type-check` to see specific TypeScript errors
2. Run `npm run lint:fix` to auto-fix linting issues
3. Run `npm run format:fix` to auto-fix formatting issues
4. Verify all dependencies: `npm install`
5. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
6. Check if shared package is built: `npm run build:shared`

#### Webhook Not Receiving Events

**Symptom**: Premium status not updating after payment

**Solutions**:
1. Verify webhook URL in Stripe Dashboard matches Railway domain
2. Check `STRIPE_WEBHOOK_SECRET` is set correctly in Railway
3. Check Railway logs: `railway logs`
4. Verify events are being sent in Stripe Dashboard → Webhooks → Recent events
5. Test webhook locally with Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
6. Verify webhook endpoint is accessible: `curl https://amora-server-production.up.railway.app/api/webhooks/stripe`

#### Deployment Issues

**Symptom**: Server returns 404 or deployment fails

**Solutions**:
1. Wait a few minutes for deployment to complete
2. Check Railway Dashboard → Deployments → Build logs
3. Check Railway Dashboard → Service → Logs
4. Verify environment variables are set correctly
5. Check if Dockerfile is correctly configured
6. Verify build commands in Railway settings

### Getting Help

For additional support or to report issues:

1. Check browser console for detailed error messages
2. Review the [Troubleshooting](#-troubleshooting) section above
3. Check Railway logs: `railway logs`
4. Check Vercel deployment logs in dashboard
5. Review Stripe Dashboard for payment/webhook issues
6. Contact the project maintainer

---

## 🤝 Contributing

### Development Guidelines

1. **Code Quality**: All code must pass TypeScript strict mode and ESLint with zero warnings
2. **Testing**: Test all changes locally before committing
3. **Documentation**: Update README and code comments for significant changes
4. **Commits**: Use clear, descriptive commit messages

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with default configuration
- **Linting**: ESLint with zero warnings policy
- **Imports**: Use path aliases (`@/` for client, `@shared/` for shared)

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run quality checks: `npm run type-check && npm run lint`
5. Commit with clear messages
6. Push to your fork
7. Create a pull request

---

## 📄 License

This is a private project. All rights reserved.

---

## 🙏 Acknowledgments

- **Google Gemini Live API** - For real-time voice AI capabilities
- **Neon** - For serverless PostgreSQL database
- **Stripe** - For payment processing infrastructure
- **Vercel** - For frontend hosting
- **Railway** - For backend hosting

---

<div align="center">

**A Therapist, Coach, and Journal in One App**

Built with modern web technologies and AI-powered intelligence

React • TypeScript • Google Gemini Live API • Stripe • Neon PostgreSQL

[Live Demo](https://amora-mu.vercel.app/) • [Documentation](#-table-of-contents) • [Issues](https://github.com/bantoinese83/Amora/issues)

</div>
