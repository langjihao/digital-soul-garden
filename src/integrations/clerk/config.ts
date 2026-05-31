// Clerk publishable key — safe to ship to the client (same security model as Supabase anon key).
// The matching secret key (`CLERK_SECRET_KEY`) lives in server env and is read by clerkMiddleware.
export const CLERK_PUBLISHABLE_KEY =
  "pk_test_ZGVzdGluZWQtbG9ic3Rlci0xMS5jbGVyay5hY2NvdW50cy5kZXYk";