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

  return serializeNote(note);
}

export async function listNotesForUser(userId: string) {
  const notes = await prisma.note.findMany({
    where: {recipientId: userId},
    orderBy: {createdAt: "desc"},
  });
  return notes.map(serializeNote);
}

export async function markClaimed(
  noteId: string,
  userId: string,
  claimTxHash?: string
) {
  const note = await prisma.note.findUnique({where: {id: noteId}});
  if (!note) {
    throw Object.assign(new Error("not_found"), {statusCode: 404});
  }
  if (note.recipientId !== userId) {
    throw Object.assign(new Error("forbidden"), {statusCode: 403});
  }

  const txHash = normalizeTxHash(claimTxHash);

  if (note.claimed) {
    // Backfill explorer hash if an older claim had none.
    if (txHash && !note.claimTxHash) {
      const updated = await prisma.note.update({
        where: {id: noteId},
        data: {claimTxHash: txHash},
      });
      return serializeClaim(updated);
    }
    return serializeClaim(note);
  }

  const updated = await prisma.note.update({
    where: {id: noteId},
    data: {
      claimed: true,
      ...(txHash ? {claimTxHash: txHash} : {}),
    },
  });
  return serializeClaim(updated);
}

function serializeNote(note: {
  id: string;
  recipientId: string;
  commitment: string;
  encryptedPayload: string;
  claimed: boolean;
  claimTxHash: string | null;
  createdAt: Date;
}) {
  return {
    id: note.id,
    recipientId: note.recipientId,
    commitment: note.commitment,
    encryptedPayload: note.encryptedPayload,
    claimed: note.claimed,
    claimTxHash: note.claimTxHash ?? undefined,
    createdAt: note.createdAt,
  };
}

function serializeClaim(note: {
  id: string;
  claimed: boolean;
  commitment: string;
  claimTxHash: string | null;
}) {
  return {
    id: note.id,
    claimed: note.claimed,
    commitment: note.commitment,
    claimTxHash: note.claimTxHash ?? undefined,
  };
}

function normalizeCommitment(raw: string | undefined): string {
  if (!raw) return "";
  const c = raw.trim().toLowerCase();
  const hex = c.startsWith("0x") ? c : `0x${c}`;
  return /^0x[0-9a-f]{64}$/.test(hex) ? hex : "";
}

function normalizeTxHash(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const c = raw.trim().toLowerCase();
  const hex = c.startsWith("0x") ? c : `0x${c}`;
  return /^0x[0-9a-f]{64}$/.test(hex) ? hex : undefined;
}
