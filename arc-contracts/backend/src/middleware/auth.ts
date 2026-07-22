import type {FastifyReply, FastifyRequest} from "fastify";
import {verifyToken, type AuthTokenPayload} from "../auth/auth.service.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthTokenPayload;
  }
}

/** Requires `Authorization: Bearer <jwt>` from POST /auth/wallet. */
export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({error: "unauthorized"});
  }
  try {
    req.user = await verifyToken(header.slice(7));
  } catch {
    return reply.code(401).send({error: "unauthorized"});
  }
}
