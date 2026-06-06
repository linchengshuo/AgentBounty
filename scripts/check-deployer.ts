import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("Missing deployer account. Set PRIVATE_KEY in .env first.");
  }

  const address = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(address);

  console.log(`Deployer address: ${address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} RITUAL`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
