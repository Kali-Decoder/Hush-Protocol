import {prisma} from "../db/prisma.js";

export type NoteDirection = "received" | "sent";

export async function createNote(params: {
  senderUserId: string;
  recipientUsername?: string;
  recipientId?: string;
  commitment: string;
  encryptedPayload: string;
  depositTxHash?: string;
  amount?: string;
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
  let recipientUsername: string | undefined;
  if (!recipientId && params.recipientUsername) {
    const username = params.recipientUsername
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    const recipient = await prisma.user.findUnique({where: {username}});
    if (!recipient) {
      throw Object.assign(new Error("recipient_not_found"), {statusCode: 404});
    }
    recipientId = recipient.id;
    recipientUsername = recipient.username;
  } else if (recipientId) {
    const recipient = await prisma.user.findUnique({where: {id: recipientId}});
    recipientUsername = recipient?.username;
  }
  if (!recipientId) {
    throw Object.assign(new Error("recipient_required"), {statusCode: 400});
  }

  const depositTxHash = normalizeTxHash(params.depositTxHash);
  const amount = normalizeAmount(params.amount);

  const note = await prisma.note.create({
    data: {
      recipientId,
      senderId: params.senderUserId,
      commitment,
      encryptedPayload,
      depositTxHash: depositTxHash ?? null,
      amount: amount ?? null,
      recipientUsername: recipientUsername ?? null,
    },
  });

  return serializeNote(note);
}

/** Inbox list — all received notes (used by Inbox UI). */
export async function listNotesForUser(userId: string) {
  const notes = await prisma.note.findMany({
    where: {recipientId: userId},
    orderBy: {createdAt: "desc"},
  });
  return notes.map(serializeNote);
}

/** Paginated history for account profile. */
export async function listNoteHistory(params: {
  userId: string;
  direction: NoteDirection;
  page: number;
  pageSize: number;
}) {
  const page = Math.max(1, params.page);
  const pageSize = Math.min(50, Math.max(1, params.pageSize));
  const where =
    params.direction === "sent"
      ? {senderId: params.userId}
      : {recipientId: params.userId};

  const [total, notes] = await Promise.all([
    prisma.note.count({where}),
    prisma.note.findMany({
      where,
      orderBy: {createdAt: "desc"},
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        sender: {select: {username: true, wallet: true}},
        recipient: {select: {username: true, wallet: true}},
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: notes.map((n) =>
      serializeHistoryNote(n, params.direction)
    ),
    page,
    pageSize,
    total,
    totalPages,
    direction: params.direction,
  };
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
  senderId?: string | null;
  commitment: string;
  encryptedPayload: string;
  claimed: boolean;
  claimTxHash: string | null;
  depositTxHash?: string | null;
  amount?: string | null;
  recipientUsername?: string | null;
  createdAt: Date;
}) {
  return {
    id: note.id,
    recipientId: note.recipientId,
    senderId: note.senderId ?? undefined,
    commitment: note.commitment,
    encryptedPayload: note.encryptedPayload,
    claimed: note.claimed,
    claimTxHash: note.claimTxHash ?? undefined,
    depositTxHash: note.depositTxHash ?? undefined,
    amount: note.amount ?? undefined,
    recipientUsername: note.recipientUsername ?? undefined,
    createdAt: note.createdAt,
  };
}

function serializeHistoryNote(
  note: {
    id: string;
    recipientId: string;
    senderId: string | null;
    commitment: string;
    claimed: boolean;
    claimTxHash: string | null;
    depositTxHash: string | null;
    amount: string | null;
    recipientUsername: string | null;
    createdAt: Date;
    sender: {username: string; wallet: string} | null;
    recipient: {username: string; wallet: string};
  },
  direction: NoteDirection
) {
  const fromUsername = note.sender?.username;
  const toUsername =
    note.recipientUsername ?? note.recipient.username;

  return {
    id: note.id,
    direction,
    commitment: note.commitment,
    claimed: note.claimed,
    claimTxHash: note.claimTxHash ?? undefined,
    depositTxHash: note.depositTxHash ?? undefined,
    amount: note.amount ?? undefined,
    createdAt: note.createdAt,
    fromUsername,
    toUsername,
    fromWallet: note.sender?.wallet,
    toWallet: note.recipient.wallet,
    /** @deprecated prefer fromUsername / toUsername */
    counterpartyUsername:
      direction === "sent" ? toUsername : fromUsername,
    counterpartyWallet:
      direction === "sent" ? note.recipient.wallet : note.sender?.wallet,
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

function normalizeAmount(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(t)) return undefined;
  return t;
}
