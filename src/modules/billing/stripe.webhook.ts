// src/modules/billing/stripe.webhook.ts
import { Request, Response } from "express"
import { stripe } from "../../stripe"
import { env } from "../../config/env"
import { prisma } from "../../db"

type Plan = "free" | "pro" | "pro_plus"

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"]
  if (!sig) return res.status(400).send("Missing Stripe-Signature")

  let event: any
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    console.log("STRIPE WEBHOOK:", event.type, event.id)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any
        const customerId = session.customer as string | undefined
        const subscriptionId = session.subscription as string | undefined

        if (customerId && subscriptionId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { stripeSubscriptionId: subscriptionId },
          })
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any
        const customerId = sub.customer as string

        // ✅ priceId pour distinguer Pro vs Pro+
        const priceId: string | undefined = sub.items?.data?.[0]?.price?.id

        // ✅ mapping plan selon status + priceId
        let plan: Plan = "free"
        const isPaid = sub.status === "active" || sub.status === "trialing"

        if (isPaid) {
          if (priceId === env.STRIPE_PRICE_PRO_PLUS) plan = "pro_plus"
          else if (priceId === env.STRIPE_PRICE_PRO) plan = "pro"
          else plan = "pro" // fallback si price inconnu mais abonnement actif
        }

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeStatus: sub.status,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
            plan,
          },
        })
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any
        const customerId = sub.customer as string

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeStatus: "canceled",
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            plan: "free",
          },
        })
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any

        const customerId = invoice.customer as string | undefined
        const subscriptionId = invoice.subscription as string | undefined

        if (!customerId) break

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeStatus: "past_due",
            stripeSubscriptionId: subscriptionId ?? null,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
            plan: "free",
          },
        })

        break
      }

      default:
        break
    }

    return res.json({ received: true })
  } catch (e) {
    console.error("WEBHOOK HANDLER ERROR:", e)
    return res.status(500).json({ error: "Webhook handler failed" })
  }
}
