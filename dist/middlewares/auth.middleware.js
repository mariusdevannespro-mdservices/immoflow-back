"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkJwt = void 0;
const express_oauth2_jwt_bearer_1 = require("express-oauth2-jwt-bearer");
const env_1 = require("../config/env");
exports.checkJwt = (0, express_oauth2_jwt_bearer_1.auth)({
    issuerBaseURL: env_1.env.AUTH0_DOMAIN,
    audience: env_1.env.AUTH0_AUDIENCE,
});
