# Bullet Backend (hackathon)

Minimal API for wallet auth, username resolution, and encrypted notes.

Does **not** prove ZK, maintain Merkle trees, or talk to the chain.
Those stay in SDK / indexer / contracts.

## APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/wallet` | no | Register / login via personal_sign |
| GET | `/auth/message` | no | Preview the message to sign |
| GET | `/users/wallet/:wallet` | no | Resolve wallet → username + bulletPublicKey |
| GET | `/users/:username` | no | Resolve `@name` → wallet + bulletPublicKey |
| POST | `/notes` | yes | Store encrypted note for a recipient |
| GET | `/notes` | yes | Inbox for the authenticated user |
| PATCH | `/notes/:id/claim` | yes | Mark note claimed after withdraw |

## Setup

```bash
cd arc-contracts/backend
pnpm install --ignore-workspace
cp .env.example .env
pnpm db:generate
pnpm db:push
pnpm dev
# → http://127.0.0.1:4020
```

## Auth flow (frontend)

```ts
const username = "alice";
const bulletPublicKey = "0x" + "..."; // 32-byte hex
const wallet = address;

const { message } = await fetch(
  `/auth/message?wallet=${wallet}&username=${username}&bulletPublicKey=${bulletPublicKey}`
).then((r) => r.json());

const signature = await walletClient.signMessage({ message });

const { token, user } = await fetch("/auth/wallet", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ wallet, username, bulletPublicKey, signature }),
}).then((r) => r.json());

// later
fetch("/notes", { headers: { Authorization: `Bearer ${token}` } });
```

## Create a note (after deposit)

```http
POST /notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientUsername": "bob",
  "commitment": "0x…",
  "encryptedPayload": "<base64 or hex sealed box from SDK>"
}
```

Encryption is done **client-side** with the recipient's `bulletPublicKey`.
The backend only stores the ciphertext.
