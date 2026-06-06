import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS;

  if (!contractAddress) {
    throw new Error("Missing NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS in .env.");
  }

  const agentBounty = await ethers.getContractAt("AgentBounty", contractAddress);
  const taskCount = await agentBounty.taskCount();

  console.log(`AgentBounty: ${contractAddress}`);
  console.log(`Task count: ${taskCount.toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
