import type {FastifyInstance} from "fastify";
import {getUserByUsername, getUserByWallet} from "./users.service.js";
import {sendError} from "../auth/auth.controller.js";

export async function usersRoutes(app: FastifyInstance) {
  /** Resolve wallet → username + bulletPublicKey (public). Register before :username. */
  app.get<{Params: {wallet: string}}>(
    "/users/wallet/:wallet",
    async (req, reply) => {
      try {
        return await getUserByWallet(req.params.wallet);
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );

  /** Resolve @username → wallet + bulletPublicKey (public). */
  app.get<{Params: {username: string}}>("/users/:username", async (req, reply) => {
    try {
      return await getUserByUsername(req.params.username);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
