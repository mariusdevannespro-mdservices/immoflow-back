export {}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        auth0Sub: string
        email?: string | null
        plan: string
        stripeStatus?: string | null
        currentPeriodEnd?: Date | null
      }
    }
  }
}
