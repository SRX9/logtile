import { betterAuth } from "better-auth";
import pool from "./pg";

export const auth = betterAuth({
  database: pool,
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scope: ["repo", "read:user", "repo:status", "read:org"],
    },
  },
});

// Simple encryption utilities for storing GitHub tokens securely
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY environment variable is required");
  }

  // Simple XOR-based encryption with key
  const key = ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0");
  let encrypted = "";

  for (let i = 0; i < token.length; i++) {
    const tokenChar = token.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    const encryptedChar = tokenChar ^ keyChar;
    encrypted += encryptedChar.toString(16).padStart(2, "0");
  }

  return Buffer.from(encrypted, "hex").toString("base64");
}

export function decryptToken(encryptedToken: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY environment variable is required");
  }

  try {
    // Decode from base64
    const encrypted = Buffer.from(encryptedToken, "base64").toString("hex");
    const key = ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0");
    let decrypted = "";

    // XOR decrypt
    for (let i = 0; i < encrypted.length; i += 2) {
      const encryptedChar = parseInt(encrypted.substr(i, 2), 16);
      const keyChar = key.charCodeAt(Math.floor(i / 2) % key.length);
      const decryptedChar = encryptedChar ^ keyChar;
      decrypted += String.fromCharCode(decryptedChar);
    }

    return decrypted;
  } catch (error) {
    throw new Error("Failed to decrypt token");
  }
}
