# Bullet Indexer

Watches `BulletPool` deposits, maintains the canonical Poseidon Merkle tree,
posts roots to `MerkleRootManager`, and serves membership witnesses.

**Never** stores secrets. **Never** generates ZK proofs.

```
Deposit event
    → ingest (pending)
    → wait CONFIRMATIONS
    → insert leaf (in leafIndex order)
    → compute root
    → postRoot()
    → GET /witness/:commitment
```

## Layout

```
indexer/src/
├── watcher/EventWatcher.ts
├── merkle/PoseidonTree.ts
├── blockchain/RootPoster.ts
├── db/          schema + repositories
├── api/routes.ts
├── services/SyncService.ts
├── config/
├── types/
└── main.ts
```

## Setup

```bash
cd arc-contracts
pnpm sdk:build
pnpm --dir indexer install --ignore-workspace
cp indexer/.env.example indexer/.env
# fill BULLET_POOL_ADDRESS, MERKLE_ROOT_MANAGER_ADDRESS, RELAYER_PRIVATE_KEY, DATABASE_URL
```

Postgres:

```bash
createdb bullet_indexer   # or use Docker
pnpm --dir indexer db:migrate
```

Run:

```bash
pnpm --dir indexer dev
# API: http://127.0.0.1:4010
```

## Env

| Var | Meaning |
|-----|---------|
| `RPC_URL` | EVM JSON-RPC |
| `BULLET_POOL_ADDRESS` | Pool with Deposit events |
| `MERKLE_ROOT_MANAGER_ADDRESS` | Root poster target |
| `RELAYER_PRIVATE_KEY` | Must **own** MerkleRootManager |
| `DATABASE_URL` | Postgres |
| `CONFIRMATIONS` | Blocks before finalizing a leaf (default 8) |
| `SKIP_POST_ROOT=1` | Build tree + API without posting |

Load addresses from a deploy file:

```bash
# after pnpm deploy:all --network localhost
export BULLET_POOL_ADDRESS=$(jq -r .contracts.BulletPool deployments/localhost.json)
export MERKLE_ROOT_MANAGER_ADDRESS=$(jq -r .contracts.MerkleRootManager deployments/localhost.json)
```

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | status, lastBlock, latestRoot |
| GET | `/root` | latest root + leafCount |
| GET | `/witness/:commitment` | siblings + pathIndices (no secret) |
| GET | `/deposit/:commitment` | deposit metadata |
| GET | `/stats` | leaves, roots, latestRoot |

## Recovery

On restart the indexer:

1. Loads finalized deposits from Postgres in `leaf_index` order
2. Rebuilds the in-memory Poseidon tree
3. Re-posts the latest root if needed
4. Continues from `sync_state.last_processed_block`

Never rebuilds from zero unless the DB is empty.
