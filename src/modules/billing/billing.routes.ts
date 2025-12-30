// src/modules/billing/billing.routes.ts
import { Router } from "express"
import crypto from "crypto"
import { checkJwt } from "../../middlewares/auth.middleware"
import { prisma } from "../../db"
import { stripe } from "../../stripe"
import { env } from "../../config/env"

const router = Router()

/**
 * POST /api/billing/checkout
 * body: { priceId: "price_..." }
 * return: { url }
 */
router.post("/checkout", checkJwt, async (req, res) => {
  try {
    const sub = req.auth?.payload.sub
    if (!sub) return res.status(401).json({ error: "No auth0 sub" })

    const { priceId } = req.body as { priceId?: string }
    if (!priceId) return res.status(400).json({ error: "Missing priceId" })

    const user = await prisma.user.findUnique({ where: { auth0Sub: sub } })
    if (!user) return res.status(404).json({ error: "User not found (call /api/me first)" })

    // ✅ si lifetime, pas besoin de checkout
    if (user.proPlusLifetime) {
      return res.status(400).json({ error: "User already has lifetime access" })
    }

    // Stripe customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { auth0Sub: sub, userId: user.id },
      })

      customerId = customer.id

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.FRONT_URL}/post-checkout`,
      cancel_url: `${env.FRONT_URL}/pricing?canceled=1`,
    })

    return res.json({ url: session.url })
  } catch (e: any) {
    console.error("STRIPE CHECKOUT ERROR:", e?.message)
    return res.status(e?.statusCode || 500).json({
      error: "Stripe checkout failed",
      message: e?.message ?? "Unknown error",
    })
  }
})

/**
 * POST /api/billing/portal
 * return: { url }
 */
router.post("/portal", checkJwt, async (req, res) => {
  try {
    const sub = req.auth?.payload.sub
    if (!sub) return res.status(401).json({ error: "No auth0 sub" })

    const user = await prisma.user.findUnique({ where: { auth0Sub: sub } })
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: "No stripeCustomerId" })
    }

    // ✅ si lifetime, le portal n'a pas trop de sens
    if (user.proPlusLifetime) {
      return res.status(400).json({ error: "User has lifetime access (no portal needed)" })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.FRONT_URL}/post-auth`,
    })

    return res.json({ url: portalSession.url })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Internal server error" })
  }
})

router.post("/cancel", checkJwt, async (req, res) => {
  try {
    const sub = req.auth?.payload.sub
    if (!sub) return res.status(401).json({ error: "No auth0 sub" })

    const user = await prisma.user.findUnique({ where: { auth0Sub: sub } })
    if (!user?.stripeSubscriptionId) {
      return res.status(400).json({ error: "No subscription to cancel" })
    }

    // ✅ si lifetime, on pourrait carrément cancel direct mais on laisse ton flow
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Cancel failed" })
  }
})

/**
 * ✅ NEW: POST /api/billing/redeem
 * body: { code: "XXXX-...." }
 * effet: plan pro_plus + lifetime
 */
router.post("/redeem", checkJwt, async (req, res) => {
  try {
    const sub = req.auth?.payload.sub
    if (!sub) return res.status(401).json({ error: "No auth0 sub" })

    const { code } = req.body as { code?: string }
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing code" })
    }

    const user = await prisma.user.findUnique({ where: { auth0Sub: sub } })
    if (!user) return res.status(404).json({ error: "User not found (call /api/me first)" })

    if (user.proPlusLifetime) {
      return res.status(400).json({ error: "Already lifetime" })
    }

    // hash constant (pas de trim bizarre côté serveur : le front doit envoyer propre)
    const codeHash = crypto.createHash("sha256").update(code).digest("hex")

    // transaction : vérif clé dispo + lock logique
    const result = await prisma.$transaction(async (tx) => {
      const key = await tx.licenseKey.findUnique({ where: { codeHash } })
      if (!key || !key.isActive) {
        return { ok: false as const, error: "Invalid code" }
      }
      if (key.redeemedAt) {
        return { ok: false as const, error: "Code already used" }
      }

      // ✅ marque la clé utilisée
      await tx.licenseKey.update({
        where: { id: key.id },
        data: {
          redeemedAt: new Date(),
          redeemedById: user.id,
          isActive: false,
        },
      })

      // ✅ upgrade user
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          plan: "pro_plus",
          proPlusLifetime: true,
          // on met un status explicite (pratique côté front)
          stripeStatus: "lifetime",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
      })

      return { ok: true as const, user: updatedUser }
    })

    if (!result.ok) {
      return res.status(400).json({ error: result.error })
    }

    // ✅ optionnel : si le mec avait déjà un abo Stripe, on le cancel pour éviter de facturer
    if (user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId)
      } catch (e) {
        console.warn("Stripe subscription cancel after redeem failed:", e)
      }
    }

    return res.json({ ok: true, user: result.user })
  } catch (e: any) {
    console.error("REDEEM ERROR:", e?.message)
    return res.status(500).json({ error: "Redeem failed" })
  }
})

/**
 * GET /api/billing/summary
 * return: billing infos réelles Stripe
 */
router.get("/summary", checkJwt, async (req, res) => {
  try {
    const sub = req.auth?.payload.sub
    if (!sub) return res.status(401).json({ error: "No auth0 sub" })

    const user = await prisma.user.findUnique({ where: { auth0Sub: sub } })
    if (!user) return res.status(404).json({ error: "User not found" })

    // ✅ lifetime => summary simple (pas de Stripe)
    if (user.proPlusLifetime) {
      return res.json({
        plan: "pro_plus",
        stripeStatus: "lifetime",
        currentPeriodEnd: null,
        price: null,
        interval: null,
        paymentMethod: null,
        invoices: [],
      })
    }

    // pas d’abonnement
    if (!user.stripeCustomerId) {
      return res.json({
        plan: user.plan ?? "free",
        stripeStatus: null,
        currentPeriodEnd: null,
        price: null,
        interval: null,
        paymentMethod: null,
        invoices: [],
      })
    }

    // invoices
    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 10,
    })

    // subscription
    let subscription: any = null
    if (user.stripeSubscriptionId) {
      subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
        expand: ["default_payment_method", "items.data.price"],
      })
    }

    // payment method
    let paymentMethod = null
    const pm = subscription?.default_payment_method
    if (pm && typeof pm === "object" && pm.card) {
      paymentMethod = {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
        name: pm.billing_details?.name ?? null,
      }
    }

    const priceObj = subscription?.items?.data?.[0]?.price
    const price = priceObj?.unit_amount != null ? priceObj.unit_amount / 100 : null
    const interval = priceObj?.recurring?.interval ?? null

    return res.json({
      plan: user.plan ?? "free",
      stripeStatus: subscription?.status ?? user.stripeStatus ?? null,
      currentPeriodEnd: subscription?.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : user.currentPeriodEnd,
      price,
      interval,
      paymentMethod,
      invoices: invoices.data.map((i) => ({
        id: i.number ?? i.id,
        date: i.created ? new Date(i.created * 1000) : null,
        amount: i.amount_paid != null ? i.amount_paid / 100 : null,
        status: i.status,
        hostedInvoiceUrl: i.hosted_invoice_url ?? null,
        invoicePdf: i.invoice_pdf ?? null,
      })),
    })
  } catch (e: any) {
    console.error("BILLING SUMMARY ERROR:", e?.message)
    return res.status(500).json({ error: "Billing summary failed" })
  }
})

export default router
