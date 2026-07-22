import type {FastifyInstance} from "fastify";
import {getUserByUsername} from "./users.service.js";
import {sendError} from "../auth/auth.controller.js";

export async function usersRoutes(app: FastifyInstance) {
  /** Resolve @username → wallet + bulletPublicKey (public). */
  app.get<{Params: {username: string}}>("/users/:username", async (req, reply) => {
    try {
      return await getUserByUsername(req.params.username);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
