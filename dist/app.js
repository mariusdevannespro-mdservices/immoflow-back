"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const billing_routes_1 = __importDefault(require("./modules/billing/billing.routes"));
const stripe_webhook_1 = require("./modules/billing/stripe.webhook");
const project_routes_1 = __importDefault(require("./modules/project/project.routes"));
const app = (0, express_1.default)();
// ✅ Stripe webhook: body brut obligatoire
app.post("/api/webhooks/stripe", express_1.default.raw({ type: "application/json" }), stripe_webhook_1.stripeWebhookHandler);
app.use((0, cors_1.default)({
    origin: env_1.env.FRONT_URL,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/api", auth_routes_1.default);
app.use("/api/billing", billing_routes_1.default);
app.use("/api", project_routes_1.default);
app.use((err, _req, res, _next) => {
    console.error("AUTH ERROR:", err?.name, err?.message);
    res.status(err?.status || 500).json({ error: err?.message || "Internal error" });
});
app.get("/health", (_, res) => {
    res.json({ status: "ok" });
});
exports.default = app;
