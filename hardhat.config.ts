import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const privateKey = process.env.PRIVATE_KEY;
const ritualRpcUrl = process.env.RITUAL_RPC_URL || "https://rpc.ritualfoundation.org";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    ritual: {
      url: ritualRpcUrl,
      accounts: privateKey ? [privateKey] : []
    }
  }
};

export default config;
