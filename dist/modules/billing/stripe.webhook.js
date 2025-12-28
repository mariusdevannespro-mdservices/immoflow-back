"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhookHandler = stripeWebhookHandler;
const stripe_1 = require("../../stripe");
const env_1 = require("../../config/env");
const db_1 = require("../../db");
async function stripeWebhookHandler(req, res) {
    const sig = req.headers["stripe-signature"];
    if (!sig)
        return res.status(400).send("Missing Stripe-Signature");
    let event;
    try {
        event = stripe_1.stripe.webhooks.constructEvent(req.body, sig, env_1.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
        console.log("STRIPE WEBHOOK:", event.type, event.id);
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const customerId = session.customer;
                const subscriptionId = session.subscription;
                if (customerId && subscriptionId) {
                    await db_1.prisma.user.updateMany({
                        where: { stripeCustomerId: customerId },
                        data: { stripeSubscriptionId: subscriptionId },
                    });
                }
                break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated": {
                const sub = event.data.object;
                const customerId = sub.customer;
                // ✅ priceId pour distinguer Pro vs Pro+
                const priceId = sub.items?.data?.[0]?.price?.id;
                // ✅ mapping plan selon status + priceId
                let plan = "free";
                const isPaid = sub.status === "active" || sub.status === "trialing";
                if (isPaid) {
                    if (priceId === env_1.env.STRIPE_PRICE_PRO_PLUS)
                        plan = "pro_plus";
                    else if (priceId === env_1.env.STRIPE_PRICE_PRO)
                        plan = "pro";
                    else
                        plan = "pro"; // fallback si price inconnu mais abonnement actif
                }
                await db_1.prisma.user.updateMany({
                    where: { stripeCustomerId: customerId },
                    data: {
                        stripeStatus: sub.status,
                        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
                        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
                        plan,
                    },
                });
                break;
            }
            case "customer.subscription.deleted": {
                const sub = event.data.object;
                const customerId = sub.customer;
                await db_1.prisma.user.updateMany({
                    where: { stripeCustomerId: customerId },
                    data: {
                        stripeStatus: "canceled",
                        stripeSubscriptionId: null,
                        currentPeriodEnd: null,
                        cancelAtPeriodEnd: false,
                        plan: "free",
                    },
                });
                break;
            }
            case "invoice.payment_failed": {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                const subscriptionId = invoice.subscription;
                if (!customerId)
                    break;
                await db_1.prisma.user.updateMany({
                    where: { stripeCustomerId: customerId },
                    data: {
                        stripeStatus: "past_due",
                        stripeSubscriptionId: subscriptionId ?? null,
                        cancelAtPeriodEnd: false,
                        currentPeriodEnd: null,
                        plan: "free",
                    },
                });
                break;
            }
            default:
                break;
        }
        return res.json({ received: true });
    }
    catch (e) {
        console.error("WEBHOOK HANDLER ERROR:", e);
        return res.status(500).json({ error: "Webhook handler failed" });
    }
}
