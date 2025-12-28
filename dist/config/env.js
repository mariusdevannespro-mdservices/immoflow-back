"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// src/config/env.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    PORT: process.env.PORT || 3001,
    FRONT_URL: process.env.FRONT_URL || "http://localhost:5173",
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || "",
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || "",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
    STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO || "",
    STRIPE_PRICE_PRO_PLUS: process.env.STRIPE_PRICE_PRO_PLUS || "",
};
