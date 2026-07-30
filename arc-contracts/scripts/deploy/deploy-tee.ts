/**
 * Deploy TEE-related contracts:
 *   TeeAttestationVerifier -> InstructionSender
 *
 * Usage:
 *   pnpm deploy:tee                   # coston2 (default)
 *   pnpm deploy:tee:flare             # flare mainnet
 *   pnpm hardhat run scripts/deploy/deploy-tee.ts --network coston2
 */
import hre from "hardhat";
import {saveDeployment, loadDeployment, type DeploymentFile} from "../lib/deployments";
import {chainId, getDeployer, networkName} from "../lib/env";

async function main() {
  const deployer = await getDeployer();
  const network = networkName();
  const cid = await chainId();

  console.log(`Network:  ${network} (chainId ${cid})`);
  console.log(`Deployer: ${deployer.address}`);

  console.log("\n[1/2] Deploying TeeAttestationVerifier...");
  const Verifier = await hre.ethers.getContractFactory("TeeAttestationVerifier");
  const verifier = await Verifier.deploy(deployer.address);
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log(`  TeeAttestationVerifier: ${verifierAddr}`);

  console.log("\n[2/2] Deploying InstructionSender...");
  const teeExtensionRegistry = process.env.TEE_EXTENSION_REGISTRY;
  const teeMachineRegistry = process.env.TEE_MACHINE_REGISTRY;
  if (!teeExtensionRegistry || !teeMachineRegistry) {
    console.warn("  SKIPPED: TEE_EXTENSION_REGISTRY and TEE_MACHINE_REGISTRY must be set in .env");
    console.warn("  Reference Coston2 addresses:");
    console.warn("    TeeExtensionRegistry: 0x3d478d43426081BD5854be9C7c5c183bfe76C981");
    console.warn("    TeeMachineRegistry:   0x5918Cd58e5caf755b8584649Aa24077822F87613");
  }
  const Sender = await hre.ethers.getContractFactory("InstructionSender");
  const sender = await Sender.deploy(
    teeExtensionRegistry || "0x3d478d43426081BD5854be9C7c5c183bfe76C981",
    teeMachineRegistry || "0x5918Cd58e5caf755b8584649Aa24077822F87613"
  );
  await sender.waitForDeployment();
  const senderAddr = await sender.getAddress();
  console.log(`  InstructionSender:      ${senderAddr}`);

  const existing = loadDeployment(network);
  const deployment: DeploymentFile = {
    network,
    chainId: cid,
    deployer: deployer.address,
    contracts: {
      ...existing?.contracts,
      TeeAttestationVerifier: verifierAddr,
      InstructionSender: senderAddr,
    },
    tokens: existing?.tokens ?? [],
    updatedAt: new Date().toISOString(),
  };

  const file = saveDeployment(deployment);
  console.log(`\nWrote ${file}`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
