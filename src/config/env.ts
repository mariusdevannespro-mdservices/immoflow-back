// src/config/env.ts
import dotenv from "dotenv"


dotenv.config()

export const env = {
  PORT: process.env.PORT || 3001,
  FRONT_URL: process.env.FRONT_URL || "http://localhost:5173",
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || "",
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO || "",
  STRIPE_PRICE_PRO_PLUS: process.env.STRIPE_PRICE_PRO_PLUS || "",
}
