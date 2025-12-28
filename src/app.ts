// src/app.ts
import express from "express"
import cors from "cors"
import { env } from "./config/env"
import authRoutes from "./modules/auth/auth.routes"
import billingRoutes from "./modules/billing/billing.routes"
import { stripeWebhookHandler } from "./modules/billing/stripe.webhook"
import projectRoutes from "./modules/project/project.routes"

const app = express()

// ✅ Stripe webhook: body brut obligatoire
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
)

app.use(
  cors({
    origin: env.FRONT_URL,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
)


app.use(express.json())

app.use("/api", authRoutes)
app.use("/api/billing", billingRoutes)
app.use("/api", projectRoutes)

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("AUTH ERROR:", err?.name, err?.message)
  res.status(err?.status || 500).json({ error: err?.message || "Internal error" })
})

app.get("/health", (_, res) => {
  res.json({ status: "ok" })
})

export default app
