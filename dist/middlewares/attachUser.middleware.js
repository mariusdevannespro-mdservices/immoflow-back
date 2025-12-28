"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachUser = attachUser;
const db_1 = require("../db");
async function attachUser(req, res, next) {
    try {
        const sub = req.auth?.payload?.sub;
        if (!sub)
            return res.status(401).json({ error: "No auth0 sub" });
        // Option 1: si ton token contient déjà email
        let email = req.auth?.payload?.email ?? null;
        // Option 2 (comme ton /me): fallback sur userinfo si email absent
        if (!email) {
            const authHeader = req.headers.authorization;
            const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
            if (token) {
                const userinfoRes = await fetch(`https://dev-vzwpa5080qxfvmho.us.auth0.com/userinfo`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (userinfoRes.ok) {
                    const userinfo = await userinfoRes.json();
                    email = userinfo.email ?? null;
                }
            }
        }
        const user = await db_1.prisma.user.upsert({
            where: { auth0Sub: sub },
            update: { email: email ?? undefined },
            create: { auth0Sub: sub, email },
            select: {
                id: true,
                auth0Sub: true,
                email: true,
                plan: true,
                stripeStatus: true,
                currentPeriodEnd: true,
            },
        });
        req.user = {
            id: user.id,
            auth0Sub: user.auth0Sub,
            email: user.email,
            plan: user.plan,
            stripeStatus: user.stripeStatus,
            currentPeriodEnd: user.currentPeriodEnd,
        };
        next();
    }
    catch (e) {
        next(e);
    }
}
