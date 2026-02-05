/**
 * API client config.
 * Includes Hono RPC client and Better Auth client.
 */

import { hc } from "hono/client";
import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";
import type { ApiRoutes } from "shared";

// Read from .env in all environments to avoid hardcoding.
export const API_BASE_URL = import.meta.env.VITE_API_URL;
if (!API_BASE_URL) {
  throw new Error("Missing VITE_API_URL in projects/client/.env");
}

// ==================== Hono RPC Client ====================
// Type-safe business API calls.
export const apiClient = hc<ApiRoutes>(API_BASE_URL, {
  init: {
    credentials: "include", // Send cookies for Better Auth sessions.
  },
});

// ==================== Better Auth Client ====================
// User auth flows (sign up, sign in, sign out, etc.).
export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [
    phoneNumberClient(), // Add phone number plugin.
  ],
});

// Common hooks and methods.
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  forgetPassword,
  resetPassword,
} = authClient;

// Extended user type for dashboard checks.
export type ExtendedUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean;
  status?: string;
  locale?: "zh-CN" | "en-US";
  vocabularyLevel?:
    | "primary_school"
    | "middle_school"
    | "high_school"
    | "cet4"
    | "cet6"
    | "ielts_toefl"
    | "gre"
    | null;
  onboardingCompleted?: boolean;
  lastLoginAt?: Date | null;
};

/**
 * Better Auth usage:
 *
 * 1) Sign up
 *    const { data, error } = await signUp.email({
 *      email: "user@example.com",
 *      password: "password123",
 *      name: "User Name"
 *    })
 *
 * 2) Sign in
 *    const { data, error } = await signIn.email({
 *      email: "user@example.com",
 *      password: "password123"
 *    })
 *
 * 3) Sign out
 *    await signOut()
 *
 * 4) Read session in a component
 *    const { data: session, isPending } = useSession()
 */
