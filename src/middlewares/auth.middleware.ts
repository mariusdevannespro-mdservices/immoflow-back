import { auth } from "express-oauth2-jwt-bearer"
import { env } from "../config/env"

export const checkJwt = auth({
  issuerBaseURL: env.AUTH0_DOMAIN,
  audience: env.AUTH0_AUDIENCE,
})
