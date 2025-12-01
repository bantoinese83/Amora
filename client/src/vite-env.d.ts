/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PRICE_ID_MONTHLY?: string;
  readonly VITE_STRIPE_PRICE_ID_YEARLY?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_NEON_DATABASE_URL?: string;
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
