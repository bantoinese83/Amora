# Amora - Voice AI Companion

<div align="center">
  <p><strong>Your AI companion for daily reflection and clarity</strong></p>
  <p>Real-time voice conversations with AI-powered insights and analysis</p>
</div>

[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://react.dev/)

## 🌟 Features

### Core Functionality
- **Real-time Voice Sessions**: Natural, conversational interactions with Amora using Google Gemini Live API
- **AI-Powered Analysis**: Post-session insights including mood analysis, key insights, and actionable recommendations
- **Session History**: View past conversations with full transcripts and audio playback
- **Knowledge Base Integration**: Upload documents (PDF, TXT, MD, CSV) to provide context for personalized conversations
- **Audio Playback**: Replay complete sessions with both user and assistant audio

### User Experience
- **Secure Authentication**: PIN-based access with encrypted session storage
- **Premium Subscriptions**: Stripe integration for monthly/yearly subscription plans
- **Quick Actions Menu**: Command palette (Cmd+K/Ctrl+K) for quick navigation
- **Auto-retry**: Automatic reconnection with exponential backoff on connection errors
- **Session Timer**: 15-minute session duration with visual countdown
- **Voice Customization**: Multiple voice options (Kore, Charon, Fenrir, Aoede, Kore)
- **Beautiful UI**: Modern, dark-themed interface with smooth animations

### Technical Features
- **TypeScript**: Full type safety with strict mode
- **Quality Gates**: Automated type checking, linting, formatting, and unused code detection
- **Error Boundaries**: Graceful error handling with user-friendly messages
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
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

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Check code formatting
- `npm run format:fix` - Fix code formatting
- `npm run quality` - Run all quality checks (type-check, build, lint, format, knip)
- `npm run quality:fix` - Fix all auto-fixable issues

## 💳 Stripe Payment Integration

Amora includes full Stripe integration for subscription management.

### Setup Steps

1. **Get Stripe Keys**
   - Sign up at [stripe.com](https://stripe.com)
   - Get your publishable key from Dashboard > Developers > API keys
   - Create products and prices for monthly/yearly subscriptions

2. **Configure Environment Variables**
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   VITE_STRIPE_PRICE_ID_MONTHLY=price_...
   VITE_STRIPE_PRICE_ID_YEARLY=price_...
   ```

3. **Set Up Backend Server**
   
   You need a backend server to securely create Stripe checkout and portal sessions.
   
   **Required Endpoints:**
   - `POST /api/create-checkout-session` - Creates Stripe Checkout session
   - `POST /api/create-portal-session` - Creates Stripe Customer Portal session
   
   **Example Backend (Node.js/Express):**
   ```javascript
   const express = require('express');
   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
   
   const app = express();
   app.use(express.json());
   
   // Create checkout session
   app.post('/api/create-checkout-session', async (req, res) => {
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
   });
   
   // Create portal session
   app.post('/api/create-portal-session', async (req, res) => {
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
   });
   
   app.listen(3001);
   ```

4. **Test Payments**
   - Use Stripe test cards: `4242 4242 4242 4242`
   - Any future expiry date and any CVC

## 🏗️ Architecture

### Project Structure
```
src/
├── components/          # React components
│   ├── common/         # Reusable UI components
│   └── ...             # Feature components
├── context/            # React Context providers
├── hooks/              # Custom React hooks
├── repositories/       # Data access layer (localStorage abstraction)
├── services/           # Business logic services
│   ├── liveClient.ts  # Gemini Live API client
│   ├── analysisService.ts  # Session analysis
│   ├── ragService.ts  # Knowledge base integration
│   └── stripeService.ts  # Payment integration
├── utils/              # Utility functions
└── types.ts            # TypeScript type definitions
```

### Key Design Patterns
- **Separation of Concerns**: Clear separation between UI, business logic, and data access
- **Repository Pattern**: Abstracted data access layer for localStorage
- **Custom Hooks**: Reusable business logic encapsulated in hooks
- **Context API**: Global state management for app-wide data
- **Error Boundaries**: Graceful error handling at component level

## 🔐 Security

- **PIN Authentication**: Secure 4-digit PIN for app access
- **Encrypted Storage**: Session data stored securely in browser
- **Stripe Integration**: PCI-compliant payment processing
- **No API Keys in Frontend**: Backend required for sensitive operations

## 🎨 Customization

### Voice Options
Available voices: `Kore`, `Charon`, `Fenrir`, `Aoede`

Change voice in Settings modal or via preferences.

### Session Duration
Default: 15 minutes (configurable in `src/constants.ts`)

## 🐛 Troubleshooting

### Connection Issues
- Check your internet connection
- Verify Gemini API key is correct
- Check browser console for errors
- Ensure microphone permissions are granted

### Payment Issues
- Verify Stripe keys are set correctly
- Ensure backend server is running
- Check browser console for API errors

### Build Errors
- Run `npm run quality:fix` to auto-fix issues
- Check TypeScript errors: `npm run type-check`
- Verify all dependencies are installed: `npm install`

## 📝 License

Private project - All rights reserved

## 🤝 Contributing

This is a private project. For questions or issues, please contact the project maintainer.

---

**Built with ❤️ using React, TypeScript, and Google Gemini Live API**
