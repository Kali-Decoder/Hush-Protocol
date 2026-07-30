/**
 * Verify WithdrawVerifier, MerkleRootManager, and BulletPool on Flare Coston2.
 *
 * Reads addresses + constructor args from deployments/coston2.json.
 * MerkleRootManager owner defaults to the recorded deployer (RELAYER_ADDRESS
 * override via env if a different owner was used at deploy time).
 *
 * Usage:
 *   pnpm verify:all
 */
import hre from "hardhat";
import {loadDeployment} from "../lib/deployments";
import {optionalEnv, parseAddress} from "../lib/env";

async function verify(
  label: string,
  address: string,
  constructorArguments: unknown[] = [],
  contract?: string
) {
  console.log(`\n→ Verifying ${label} @ ${address}`);
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments,
      ...(contract ? {contract} : {}),
    });
    console.log(`  ✓ ${label}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already verified/i.test(msg)) {
      console.log(`  ✓ ${label} (already verified)`);
      return;
    }
    console.error(`  ✗ ${label}: ${msg}`);
    throw err;
  }
}

async function main() {
  const network = hre.network.name;
  const dep = loadDeployment(network);
  if (!dep?.contracts.WithdrawVerifier || !dep.contracts.MerkleRootManager || !dep.contracts.BulletPool) {
    throw new Error(`deployments/${network}.json missing required contract addresses`);
  }

  const deployer = parseAddress("deployer", dep.deployer);
  const verifier = parseAddress("WithdrawVerifier", dep.contracts.WithdrawVerifier);
  const rootManager = parseAddress("MerkleRootManager", dep.contracts.MerkleRootManager);
  const pool = parseAddress("BulletPool", dep.contracts.BulletPool);

  const rootOwner = parseAddress(
    "RELAYER_ADDRESS",
    optionalEnv("RELAYER_ADDRESS", deployer)!
  );

  console.log(`Network:  ${network}`);
  console.log(`Deployer: ${deployer}`);
  console.log(`Root owner (MerkleRootManager): ${rootOwner}`);

  await verify("WithdrawVerifier", verifier, []);
  await verify("MerkleRootManager", rootManager, [rootOwner]);
  await verify("BulletPool", pool, [deployer, verifier, rootManager]);

  console.log("\nDone.");
  console.log(`Explorer: https://coston2-explorer.flare.network/address/${pool}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
