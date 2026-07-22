import type {FastifyInstance} from "fastify";
import {requireAuth} from "../middleware/auth.js";
import {sendError} from "../auth/auth.controller.js";
import {createNote, listNotesForUser, markClaimed} from "./notes.service.js";

export async function notesRoutes(app: FastifyInstance) {
  /** Create an encrypted note for a recipient (auth required). */
  app.post<{
    Body: {
      recipientUsername?: string;
      recipientId?: string;
      commitment: string;
      encryptedPayload: string;
    };
  }>("/notes", {preHandler: requireAuth}, async (req, reply) => {
    try {
      if (!req.user) return reply.code(401).send({error: "unauthorized"});
      return await createNote({
        senderUserId: req.user.sub,
        recipientUsername: req.body?.recipientUsername,
        recipientId: req.body?.recipientId,
        commitment: req.body?.commitment,
        encryptedPayload: req.body?.encryptedPayload,
      });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /** Inbox: notes addressed to the authenticated user. */
  app.get("/notes", {preHandler: requireAuth}, async (req, reply) => {
    try {
      if (!req.user) return reply.code(401).send({error: "unauthorized"});
      return await listNotesForUser(req.user.sub);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /** Mark note claimed after successful on-chain withdraw. */
  app.patch<{Params: {id: string}}>(
    "/notes/:id/claim",
    {preHandler: requireAuth},
    async (req, reply) => {
      try {
        if (!req.user) return reply.code(401).send({error: "unauthorized"});
        return await markClaimed(req.params.id, req.user.sub);
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );
}
