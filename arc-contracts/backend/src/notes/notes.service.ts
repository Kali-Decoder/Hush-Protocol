import {prisma} from "../db/prisma.js";

export async function createNote(params: {
  senderUserId: string;
  recipientUsername?: string;
  recipientId?: string;
  commitment: string;
  encryptedPayload: string;
}) {
  const commitment = normalizeCommitment(params.commitment);
  const encryptedPayload = params.encryptedPayload?.trim();
  if (!commitment) {
    throw Object.assign(new Error("invalid_commitment"), {statusCode: 400});
  }
  if (!encryptedPayload) {
    throw Object.assign(new Error("invalid_encrypted_payload"), {statusCode: 400});
  }

  let recipientId = params.recipientId?.trim();
  if (!recipientId && params.recipientUsername) {
    const username = params.recipientUsername.trim().toLowerCase().replace(/^@/, "");
    const recipient = await prisma.user.findUnique({where: {username}});
    if (!recipient) {
      throw Object.assign(new Error("recipient_not_found"), {statusCode: 404});
    }
    recipientId = recipient.id;
  }
  if (!recipientId) {
    throw Object.assign(new Error("recipient_required"), {statusCode: 400});
  }

  const note = await prisma.note.create({
    data: {
      recipientId,
      commitment,
      encryptedPayload,
    },
  });

  return {
    id: note.id,
    recipientId: note.recipientId,
    commitment: note.commitment,
    encryptedPayload: note.encryptedPayload,
    claimed: note.claimed,
    createdAt: note.createdAt,
  };
}

export async function listNotesForUser(userId: string) {
  const notes = await prisma.note.findMany({
    where: {recipientId: userId},
    orderBy: {createdAt: "desc"},
  });
  return notes.map((n) => ({
    id: n.id,
    recipientId: n.recipientId,
    commitment: n.commitment,
    encryptedPayload: n.encryptedPayload,
    claimed: n.claimed,
    createdAt: n.createdAt,
  }));
}

export async function markClaimed(noteId: string, userId: string) {
  const note = await prisma.note.findUnique({where: {id: noteId}});
  if (!note) {
    throw Object.assign(new Error("not_found"), {statusCode: 404});
  }
  if (note.recipientId !== userId) {
    throw Object.assign(new Error("forbidden"), {statusCode: 403});
  }
  if (note.claimed) {
    return {
      id: note.id,
      claimed: true,
      commitment: note.commitment,
    };
  }
  const updated = await prisma.note.update({
    where: {id: noteId},
    data: {claimed: true},
  });
  return {
    id: updated.id,
    claimed: updated.claimed,
    commitment: updated.commitment,
  };
}

function normalizeCommitment(raw: string | undefined): string {
  if (!raw) return "";
  const c = raw.trim().toLowerCase();
  const hex = c.startsWith("0x") ? c : `0x${c}`;
  return /^0x[0-9a-f]{64}$/.test(hex) ? hex : "";
}
