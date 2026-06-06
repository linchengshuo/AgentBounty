import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RITUAL_RPC_URL || "https://rpc.ritualfoundation.org";

  if (!contractAddress) {
    throw new Error("Missing NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS in .env.");
  }

  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in .env.");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const nonce = await provider.getTransactionCount(wallet.address, "pending");
  const network = await provider.getNetwork();
  const iface = new ethers.Interface([
    "function createTask(string title,string description,string category,string expectedFormat,uint256 deadline)"
  ]);
  const data = iface.encodeFunctionData("createTask", [
    "Script test task",
    "This task was created from a raw legacy transaction to test Ritual.",
    "Research",
    "Return a short confirmation message.",
    0
  ]);

  const signedTransaction = await wallet.signTransaction({
    type: 2,
    chainId: Number(network.chainId),
    nonce,
    to: contractAddress,
    data,
    value: ethers.parseEther("0.0001"),
    gasLimit: 2_500_000,
    maxFeePerGas: 1_000_000_007,
    maxPriorityFeePerGas: 1_000_000_000
  });

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendRawTransaction",
      params: [signedTransaction]
    })
  });

  const payload = await response.json();

  if (payload.error) {
    throw new Error(JSON.stringify(payload.error));
  }

  console.log(`Wallet: ${wallet.address}`);
  console.log(`Transaction hash: ${payload.result}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
