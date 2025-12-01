# Amora - Voice AI Companion

<div align="center">
  <h3>Intelligent Voice-Powered Wellness Companion</h3>
  <p>Real-time conversational AI for daily reflection, emotional processing, and personal growth</p>
</div>

[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev/)

## Overview

Amora is a sophisticated voice-powered AI companion application designed to facilitate meaningful daily reflection sessions. Built with modern web technologies, it leverages Google's Gemini Live API to provide natural, real-time voice conversations with intelligent analysis and personalized insights.

## Features

### Core Capabilities

#### Voice Interaction
- **Real-time Voice Sessions**: Natural, conversational interactions powered by Google Gemini Live API
- **Low-latency Audio Processing**: Optimized for ultra-low latency (32ms buffer) with echo cancellation
- **Voice Customization**: Multiple voice options (Kore, Charon, Fenrir, Aoede) with customizable personalities
- **Audio Playback**: Complete session replay with synchronized user and assistant audio tracks

#### Intelligence & Analysis
- **AI-Powered Session Analysis**: Post-session insights including mood analysis, psychological insights, and actionable recommendations
- **Knowledge Base Integration**: Upload documents (PDF, TXT, MD, CSV) to provide personalized context using RAG (Retrieval Augmented Generation)
- **Structured Conversations**: Guided 10-15 minute reflection sessions with therapeutic conversation flow
- **Session History**: Comprehensive archive with full transcripts, audio playback, and analysis summaries

#### User Experience
- **Secure Authentication**: PIN-based access with encrypted local storage
- **Premium Subscriptions**: Full Stripe integration for subscription management
- **Quick Actions Menu**: Command palette (Cmd+K/Ctrl+K) for efficient navigation
- **Auto-retry Logic**: Intelligent reconnection with exponential backoff on connection errors
- **Session Management**: 15-minute session duration with visual countdown and progress tracking
- **Modern UI/UX**: Dark-themed interface with smooth animations and responsive design

### Technical Excellence

- **TypeScript Strict Mode**: Full type safety with comprehensive type checking
- **Quality Assurance**: Automated quality gates (type checking, linting, formatting, unused code detection)
- **Error Handling**: Graceful error boundaries with user-friendly messaging
- **Performance**: Code splitting, lazy loading, and optimized asset delivery
- **Accessibility**: WCAG-compliant with ARIA labels, keyboard navigation, and screen reader support
- **Code Quality**: ESLint, Prettier, and Knip for maintaining high code standards

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bantoinese83/Amora.git
   cd amora---voice-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Required: Google Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional: Stripe Configuration (for payments)
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   VITE_STRIPE_PRICE_ID_MONTHLY=price_...
   VITE_STRIPE_PRICE_ID_YEARLY=price_...
   VITE_BACKEND_URL=http://localhost:3001
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot module replacement |
| `npm run build` | Build optimized production bundle |
| `npm run preview` | Preview production build locally |
| `npm run type-check` | Run TypeScript type checking in strict mode |
| `npm run lint` | Run ESLint with zero warnings policy |
| `npm run lint:fix` | Automatically fix ESLint errors |
| `npm run format` | Check code formatting with Prettier |
| `npm run format:fix` | Automatically fix code formatting |
| `npm run quality` | Run comprehensive quality checks (type-check, build, lint, format, knip) |
| `npm run quality:fix` | Fix all auto-fixable quality issues |

### Development Workflow

1. **Code Quality**: Run `npm run quality` before committing to ensure all checks pass
2. **Auto-fix**: Use `npm run quality:fix` to automatically resolve fixable issues
3. **Type Safety**: TypeScript strict mode is enabled - all types must be properly defined
4. **Linting**: ESLint is configured with zero warnings policy - all warnings must be resolved

## Payment Integration

Amora includes comprehensive Stripe integration for subscription management and payment processing.

### Stripe Setup

1. **Create Stripe Account**
   - Sign up at [stripe.com](https://stripe.com)
   - Navigate to Dashboard > Developers > API keys
   - Copy your publishable key (starts with `pk_test_` or `pk_live_`)

2. **Create Products and Prices**
   - Create a product for "Amora Premium"
   - Add monthly and yearly pricing tiers
   - Copy the price IDs (starts with `price_`)

3. **Configure Environment Variables**
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   VITE_STRIPE_PRICE_ID_MONTHLY=price_...
   VITE_STRIPE_PRICE_ID_YEARLY=price_...
   VITE_BACKEND_URL=http://localhost:3001
   ```

### Backend Server Requirements

A backend server is required to securely handle Stripe operations. The frontend communicates with your backend to create checkout and portal sessions.

**Required API Endpoints:**

- `POST /api/create-checkout-session` - Creates Stripe Checkout session
- `POST /api/create-portal-session` - Creates Stripe Customer Portal session

**Example Implementation (Node.js/Express):**

```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl, customerEmail } = req.body;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create portal session
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { returnUrl, customerEmail } = req.body;
    
    const customers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });
    
    if (!customers.data[0]) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: returnUrl,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Backend server running on http://localhost:3001');
});
```

### Testing Payments

Use Stripe's test mode with the following test card:
- **Card Number**: `4242 4242 4242 4242`
- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

## Architecture

### Project Structure

```
src/
├── components/          # React UI components
│   ├── common/         # Reusable UI primitives (Button, Card, Modal, etc.)
│   └── ...             # Feature-specific components
├── context/            # React Context providers (AppContext)
├── hooks/              # Custom React hooks (business logic)
├── repositories/       # Data access layer (localStorage abstraction)
│   ├── sessionRepository.ts
│   ├── preferencesRepository.ts
│   ├── storageRepository.ts
│   └── cacheRepository.ts
├── services/           # Business logic and external API integration
│   ├── liveClient.ts           # Gemini Live API client
│   ├── analysisService.ts      # AI-powered session analysis
│   ├── ragService.ts           # Knowledge base (RAG) integration
│   └── stripeService.ts        # Payment processing
├── utils/              # Utility functions and helpers
└── types.ts            # TypeScript type definitions
```

### Design Patterns

- **Separation of Concerns**: Clear boundaries between UI, business logic, and data access layers
- **Repository Pattern**: Abstracted data access layer for localStorage operations
- **Custom Hooks**: Encapsulated business logic in reusable React hooks
- **Context API**: Global state management for application-wide data
- **Error Boundaries**: Graceful error handling at component boundaries
- **Service Layer**: Centralized business logic and external API interactions

## Security

### Authentication & Data Protection

- **PIN Authentication**: Secure 4-digit PIN for application access
- **Local Storage Encryption**: Session data encrypted and stored locally in the browser
- **No Sensitive Data Exposure**: API keys and secrets never exposed in frontend code
- **PCI Compliance**: Stripe handles all payment processing with PCI-DSS compliance

### Best Practices

- All sensitive operations (payment processing) handled by backend server
- Environment variables for configuration (never hardcoded)
- Secure communication with external APIs via HTTPS
- Input validation and sanitization

## Configuration

### Voice Options

Available voice personalities:
- **Kore** (Female): Calm, soothing, and empathetic
- **Aoede** (Female): Warm, engaging, and expressive
- **Puck** (Male): Playful, witty, and lighthearted
- **Charon** (Male): Deep, confident, and steady
- **Fenrir** (Male): Resonant, strong, and authoritative

Voice selection can be changed in the Settings modal or via user preferences.

### Session Configuration

- **Default Duration**: 15 minutes (900 seconds)
- **Configuration File**: `src/constants.ts`
- **Customizable**: Adjust `SESSION_DURATION_SECONDS` constant

### System Instructions

The AI companion's behavior is controlled by system instructions in `src/constants.ts`. The instructions follow prompt engineering best practices with structured XML tags, few-shot examples, and clear constraints.

## Troubleshooting

### Common Issues

#### Connection Problems
- **Symptom**: Unable to connect to voice session
- **Solutions**:
  - Verify internet connection is stable
  - Check Gemini API key is correctly set in `.env`
  - Ensure microphone permissions are granted in browser settings
  - Check browser console for detailed error messages
  - Verify API key has access to Gemini Live API

#### Audio Issues
- **Symptom**: No audio playback or echo
- **Solutions**:
  - Check browser audio permissions
  - Verify system audio settings
  - Try different browser (Chrome recommended)
  - Clear browser cache and reload

#### Payment Processing
- **Symptom**: Checkout or portal session fails
- **Solutions**:
  - Verify Stripe keys are correctly configured
  - Ensure backend server is running and accessible
  - Check `VITE_BACKEND_URL` matches your backend server URL
  - Review browser console for API error details
  - Verify Stripe webhook endpoints are configured (if applicable)

#### Build Errors
- **Symptom**: TypeScript or build errors
- **Solutions**:
  - Run `npm run quality:fix` to auto-fix common issues
  - Check TypeScript errors: `npm run type-check`
  - Verify all dependencies: `npm install`
  - Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Getting Help

For additional support or to report issues, please:
1. Check browser console for detailed error messages
2. Review the [Troubleshooting](#troubleshooting) section above
3. Contact the project maintainer

## Technology Stack

- **Frontend Framework**: React 19.2
- **Language**: TypeScript 5.8 (Strict Mode)
- **Build Tool**: Vite 6.0
- **Styling**: Tailwind CSS 3.x
- **AI Integration**: Google Gemini Live API
- **Payment Processing**: Stripe.js
- **State Management**: React Context API
- **Code Quality**: ESLint, Prettier, Knip

## License

This is a private project. All rights reserved.

---

<div align="center">
  <p>Built with modern web technologies and AI-powered intelligence</p>
  <p>React • TypeScript • Google Gemini Live API</p>
</div>
