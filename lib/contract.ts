import { Address, zeroAddress } from "viem";

const configuredAgentBountyAddress = process.env.NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS; // 优先读取项目专用变量，也兼容 README 和 Vercel 里使用的通用合约地址变量。

export const agentBountyAddress = (configuredAgentBountyAddress || zeroAddress) as Address;

export const isContractConfigured = agentBountyAddress !== zeroAddress;

export const ritualMaxFeePerGas = 1_000_000_007n;

export const ritualMaxPriorityFeePerGas = 1_000_000_000n;

export const ritualCreateTaskGas = 500_000n;

export const taskStatusLabels = ["Open", "Assigned", "Submitted", "Approved", "Rejected", "Cancelled"] as const;

export const categories = [
  "Research",
  "Smart Contract Review",
  "Meme Campaign",
  "X Article",
  "Protocol Analysis",
  "Wallet Analysis",
  "Product Design",
  "Code Generation",
  "Other"
] as const;

export type TaskRecord = {
  id: bigint;
  creator: Address;
  agent: Address;
  title: string;
  description: string;
  category: string;
  expectedFormat: string;
  bounty: bigint;
  deadline: bigint;
  createdAt: bigint;
  acceptedAt: bigint;
  submittedAt: bigint;
  approvedAt: bigint;
  status: number;
  resultText: string;
  resultURI: string;
  resultHash: `0x${string}`;
  rejectReason: string;
  rating: number;
  reviewText: string;
};

export const agentBountyAbi = [
  {
    type: "function",
    name: "createTask",
    stateMutability: "payable",
    inputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "category", type: "string" },
      { name: "expectedFormat", type: "string" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "acceptTask",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "submitResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "resultText", type: "string" },
      { name: "resultURI", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "approveTask",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "rejectTask",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "reason", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "cancelTask",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "rateAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "rating", type: "uint8" },
      { name: "reviewText", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "getAllTasks",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "agent", type: "address" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "category", type: "string" },
          { name: "expectedFormat", type: "string" },
          { name: "bounty", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "acceptedAt", type: "uint256" },
          { name: "submittedAt", type: "uint256" },
          { name: "approvedAt", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "resultText", type: "string" },
          { name: "resultURI", type: "string" },
          { name: "resultHash", type: "bytes32" },
          { name: "rejectReason", type: "string" },
          { name: "rating", type: "uint8" },
          { name: "reviewText", type: "string" }
        ]
      }
    ]
  }
] as const;

export function shortAddress(address?: string) {
  if (!address || address === zeroAddress) {
    return "Not assigned";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBounty(value: bigint) {
  const whole = Number(value) / 1e18;
  return `${whole.toLocaleString(undefined, { maximumFractionDigits: 4 })} RITUAL`;
}

export function formatDate(seconds: bigint) {
  if (seconds === 0n) {
    return "No deadline";
  }

  return new Date(Number(seconds) * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
