-- Bullet indexer schema (PostgreSQL)
-- Never stores secrets or ZK proofs.

CREATE TABLE IF NOT EXISTS deposits (
  id              BIGSERIAL PRIMARY KEY,
  commitment      TEXT NOT NULL UNIQUE,
  leaf_index      INTEGER NOT NULL UNIQUE,
  token           TEXT NOT NULL,
  amount          NUMERIC(78, 0) NOT NULL,
  block_number    BIGINT NOT NULL,
  block_hash      TEXT NOT NULL,
  tx_hash         TEXT NOT NULL,
  log_index       INTEGER NOT NULL,
  finalized       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS deposits_block_idx ON deposits (block_number);
CREATE INDEX IF NOT EXISTS deposits_finalized_idx ON deposits (finalized, leaf_index);

CREATE TABLE IF NOT EXISTS merkle_roots (
  id              BIGSERIAL PRIMARY KEY,
  root            TEXT NOT NULL UNIQUE,
  leaf_count      INTEGER NOT NULL,
  block_number    BIGINT,
  posted          BOOLEAN NOT NULL DEFAULT FALSE,
  posted_tx_hash  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_state (
  id                    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_processed_block  BIGINT NOT NULL DEFAULT 0,
  last_root             TEXT,
  tree_depth            INTEGER NOT NULL DEFAULT 20,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sync_state (id, last_processed_block, tree_depth)
VALUES (1, 0, 20)
ON CONFLICT (id) DO NOTHING;
