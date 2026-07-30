# Hush · contracts

Solidity + ZK stack for Hush Protocol on **Flare Coston2 Testnet** (EVM). Off-chain Poseidon Merkle tree, on-chain Groth16 withdraw proofs.

This package is the active protocol implementation.

---

## Network

| Setting | Value |
|---------|--------|
| Name | Flare Coston2 Testnet |
| Chain ID | `114` |
| Currency | USDC |
| RPC | `https://coston2-api.flare.network/ext/C/rpc` |
| Explorer | [coston2-explorer.flare.network](https://coston2-explorer.flare.network) |

Hardhat network name: `coston2`.

---

## Quick start

```bash
pnpm install --ignore-workspace
cp .env.example .env   # fill PRIVATE_KEY (funded Coston2 key)
pnpm compile
pnpm test
```

---

## Deploy (Flare Coston2)

Requires `PRIVATE_KEY` in `.env` (funded on Coston2 via [faucet](https://faucet.flare.network/coston2)). Scripts default to `--network coston2`.

```bash
pnpm deploy
pnpm status
```

Writes `deployments/coston2.json`.

| Contract | Address |
|----------|---------|
| BulletPool | `0x69cA45fA698A77Ccff0Be64319ae6e9B94C74774` |
| MerkleRootManager | `0xa200Ccf20131D2c8dd8E1e2EEa4Ff843f3e9F895` |
| WithdrawVerifier | `0xafef8386eBEd79B4E26b1D1B6FE81F0820fc0EF4` |
| MockUSDC | `0xEC94237573f4239e1eFb277C19d68203e70B491a` |

### Individual deploy scripts

```bash
pnpm deploy:all          # full stack (verifier + root manager + pool + token)
pnpm deploy:token        # MockUSDC only
pnpm add:token           # register existing ERC-20 on pool
pnpm remove:token        # unregister
pnpm mint:token          # mint MockUSDC
pnpm deploy:tee          # InstructionSender + TeeAttestationVerifier
```

---

## Verify

```bash
pnpm verify:all          # runs via hardhat-verify on Coston2 explorer
```

---

## ZK Circuit

```bash
pnpm zk:install && pnpm zk:build     # Circom → zkey → WithdrawVerifier.sol
```

---

## SDK

```bash
pnpm sdk:install && pnpm sdk:build && pnpm sdk:test
```

---

## Indexer

```bash
pnpm indexer:install
cp indexer/.env.example indexer/.env
# fill DATABASE_URL + RELAYER_PRIVATE_KEY + CONTRACT_ADDRESSES
pnpm indexer:migrate
pnpm indexer:dev           # :4010
```

---

## Backend

```bash
pnpm backend:install
# fill MONGODB_URI in backend/.env
pnpm backend:db
pnpm backend:dev           # :4020
```

---

## Operations

```bash
pnpm status                # deployment addresses + on-chain status
pnpm post:root             # post Merkle root (relayer)
pnpm pool:pause            # pause deposits/withdrawals
pnpm pool:unpause          # unpause
pnpm smoke                 # smoke test
pnpm coverage              # test coverage
```

---

## Contract addresses (Coston2)

Current deployment (2026-07-22):

| Contract | Address |
|----------|---------|
| TeeAttestationVerifier | `0xb3f4EF8BBaE1Bc154efE2517f7F9F1e0c3847292` |
| InstructionSender | `0xF6BfF6d7d872836D73C68A0B5e8BF3be452A2CDc` |

See `deployments/coston2.json` for the full record.

---

## TEE Extension

```bash
cd tee/hush-tee
cp .env.example .env
./scripts/full-setup.sh
```

See [tee/hush-tee/](/arc-contracts/tee/hush-tee/) for details.
