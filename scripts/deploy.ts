import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("Missing deployer account. Set PRIVATE_KEY in .env with a funded Ritual testnet wallet.");
  }

  const deployerAddress = await deployer.getAddress();
  const AgentBounty = await ethers.getContractFactory("AgentBounty");
  const agentBounty = await AgentBounty.deploy();
  await agentBounty.waitForDeployment();

  console.log(`Deployer: ${deployerAddress}`);
  console.log(`AgentBounty deployed to: ${await agentBounty.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
