import { Router } from "express"
import { checkJwt } from "../../middlewares/auth.middleware"
import { prisma } from "../../db"
import { stripe } from "../../stripe"
import { env } from "../../config/env"

const router = Router()

const auth0Domain = env.AUTH0_DOMAIN.replace(/\/$/, "")

router.get("/me", checkJwt, async (req, res) => {
  try {
    const sub = req.auth?.payload.sub
    if (!sub) return res.status(401).json({ error: "No auth0 sub" })

    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) return res.status(401).json({ error: "No bearer token" })

    const userinfoRes = await fetch(`${auth0Domain}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!userinfoRes.ok) {
      const txt = await userinfoRes.text()
      return res.status(401).json({ error: "userinfo failed", details: txt })
    }
    const userinfo = await userinfoRes.json()
    const email = userinfo.email as string | undefined

    const user = await prisma.user.upsert({
      where: { auth0Sub: sub },
      update: { email: email ?? undefined },
      create: { auth0Sub: sub, email: email ?? null },
    })

    res.json(user)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.post("/me/start-free", checkJwt, async (req, res) => {
  try {
    const sub = req.auth?.payload.sub
    if (!sub) return res.status(401).json({ error: "No auth0 sub" })

    const user = await prisma.user.upsert({
      where: { auth0Sub: sub },
      update: { hasStartedFree: true },
      create: { auth0Sub: sub, hasStartedFree: true },
    })

    return res.json(user)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Internal server error" })
  }
})

router.patch("/me/avatar", checkJwt, async (req, res) => {
  try {
    const sub = req.auth?.payload.sub
    if (!sub) return res.status(401).json({ error: "No sub" })

    const { avatarKey } = req.body as { avatarKey?: string }
    const allowed = ["home", "building", "key", "chart", "map", "hammer"]

    if (!avatarKey || !allowed.includes(avatarKey)) {
      return res.status(400).json({ error: "Invalid avatarKey" })
    }

    const user = await prisma.user.update({
      where: { auth0Sub: sub },
      data: { avatarKey },
    })

    return res.json(user)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Internal server error" })
  }
})

/* ✅ NEW: theme save */
router.patch("/me/theme", checkJwt, async (req, res) => {
  try {
    const sub = req.auth?.payload.sub
    if (!sub) return res.status(401).json({ error: "No sub" })

    const { theme } = req.body as { theme?: "light" | "dark" }
    if (theme !== "light" && theme !== "dark") {
      return res.status(400).json({ error: "Invalid theme" })
    }

    const user = await prisma.user.update({
      where: { auth0Sub: sub },
      data: { theme },
    })

    return res.json(user)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Internal server error" })
  }
})

router.delete("/me", checkJwt, async (req, res) => {
  try {
    const sub = req.auth?.payload.sub
    if (!sub) return res.status(401).json({ error: "No auth0 sub" })

    const user = await prisma.user.findUnique({ where: { auth0Sub: sub } })
    if (!user) return res.status(404).json({ error: "User not found" })

    // 🔥 Annule l’abonnement si existe
    if (user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId)
      } catch (e) {
        console.warn("Stripe subscription delete failed:", e)
      }
    }

    // 🔥 Supprime le customer Stripe
    if (user.stripeCustomerId) {
      try {
        await stripe.customers.del(user.stripeCustomerId)
      } catch (e) {
        console.warn("Stripe customer delete failed:", e)
      }
    }

    // 🔥 Supprime en base
    await prisma.user.delete({ where: { id: user.id } })

    return res.json({ deleted: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Delete failed" })
  }
})

export default router
