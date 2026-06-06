import "dotenv/config";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";

const rpcUrl = process.env.RITUAL_RPC_URL || "https://rpc.ritualfoundation.org";
const contractAddress = process.env.NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS;
const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
const agentDisplayName = process.env.AGENT_DISPLAY_NAME || "Ritual Agent Worker";
const agentBio = process.env.AGENT_BIO || "Autonomous AgentBounty worker.";
const agentSkillTags = (process.env.AGENT_SKILL_TAGS || "Research,Code Generation")
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean)
  .slice(0, 12);
const agentWebsiteUrl = process.env.AGENT_WEBSITE_URL || null;
const agentXHandle = process.env.AGENT_X_HANDLE || null;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const maxTasksPerRun = Number(process.env.AGENT_MAX_TASKS_PER_RUN || 1);
const minBountyWei = BigInt(process.env.AGENT_MIN_BOUNTY_WEI || "0");
const maxFeePerGas = BigInt(process.env.AGENT_MAX_FEE_PER_GAS || "1000000007");
const maxPriorityFeePerGas = BigInt(process.env.AGENT_MAX_PRIORITY_FEE_PER_GAS || "1000000000");
const dryRun = process.env.AGENT_DRY_RUN === "true" || process.argv.includes("--dry-run");
const loopMode = process.env.AGENT_LOOP === "true" || process.argv.includes("--loop");
const pollIntervalSeconds = Number(process.env.AGENT_POLL_INTERVAL_SECONDS || 60);
const agentExecutor = (process.env.AGENT_EXECUTOR || "llm").toLowerCase();
const allowTemplateSubmit = process.env.AGENT_ALLOW_TEMPLATE_SUBMIT === "true";
const llmBaseUrl = (process.env.AGENT_LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const llmApiKey = process.env.AGENT_LLM_API_KEY || process.env.OPENAI_API_KEY;
const llmModel = process.env.AGENT_LLM_MODEL || "gpt-4o-mini";
const llmMaxTokens = Number(process.env.AGENT_LLM_MAX_TOKENS || 1200);
const llmTemperature = Number(process.env.AGENT_LLM_TEMPERATURE || 0.2);
const llmTimeoutMs = Number(process.env.AGENT_LLM_TIMEOUT_MS || 60_000);

const agentBountyAbi = [
  "function getAllTasks() view returns ((uint256 id,address creator,address agent,string title,string description,string category,string expectedFormat,uint256 bounty,uint256 deadline,uint256 createdAt,uint256 acceptedAt,uint256 submittedAt,uint256 approvedAt,uint8 status,string resultText,string resultURI,bytes32 resultHash,string rejectReason,uint8 rating,string reviewText)[])",
  "function acceptTask(uint256 taskId)",
  "function submitResult(uint256 taskId,string resultText,string resultURI)",
  "function tasks(uint256 taskId) view returns (uint256 id,address creator,address agent,string title,string description,string category,string expectedFormat,uint256 bounty,uint256 deadline,uint256 createdAt,uint256 acceptedAt,uint256 submittedAt,uint256 approvedAt,uint8 status,string resultText,string resultURI,bytes32 resultHash,string rejectReason,uint8 rating,string reviewText)"
] as const;

type Task = {
  id: bigint;
  creator: string;
  agent: string;
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
  status: bigint;
  resultText: string;
  resultURI: string;
  resultHash: string;
  rejectReason: string;
  rating: bigint;
  reviewText: string;
};

const TaskStatus = {
  Open: 0,
  Assigned: 1,
  Submitted: 2,
  Rejected: 4
} as const;

function requireConfig() {
  if (!contractAddress) {
    throw new Error("Missing NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS in .env.");
  }

  if (!agentPrivateKey) {
    throw new Error("Missing AGENT_PRIVATE_KEY in .env. Use a separate funded test wallet for the Agent.");
  }

  if (dryRun) {
    return;
  }

  if (agentExecutor === "llm" && !llmApiKey) {
    throw new Error("Missing AGENT_LLM_API_KEY or OPENAI_API_KEY. The Agent cannot honestly complete tasks without a real executor.");
  }

  if (agentExecutor === "template" && !allowTemplateSubmit) {
    throw new Error("Template executor is disabled for submission. Set AGENT_ALLOW_TEMPLATE_SUBMIT=true only for explicit mock testing.");
  }

  if (agentExecutor !== "llm" && agentExecutor !== "template") {
    throw new Error("Invalid AGENT_EXECUTOR. Use llm or template.");
  }
}

function shouldAcceptTask(task: Task, agentAddress: string) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const creator = task.creator.toLowerCase();
  const agent = agentAddress.toLowerCase();

  if (Number(task.status) !== TaskStatus.Open) {
    return false;
  }

  if (creator === agent) {
    return false;
  }

  if (task.bounty < minBountyWei) {
    return false;
  }

  if (task.deadline !== 0n && task.deadline <= now) {
    return false;
  }

  return true;
}

function getTaskSkipReasons(task: Task, agentAddress: string) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const reasons: string[] = [];

  if (Number(task.status) !== TaskStatus.Open) {
    reasons.push(`status is ${Number(task.status)}, not Open`);
  }

  if (task.creator.toLowerCase() === agentAddress.toLowerCase()) {
    reasons.push("creator is this Agent wallet");
  }

  if (task.bounty < minBountyWei) {
    reasons.push(`bounty ${task.bounty.toString()} is below AGENT_MIN_BOUNTY_WEI ${minBountyWei.toString()}`);
  }

  if (task.deadline !== 0n && task.deadline <= now) {
    reasons.push("deadline has passed");
  }

  return reasons;
}

async function buildAgentResult(task: Task) {
  if (agentExecutor === "llm") {
    return buildLlmAgentResult(task);
  }

  return buildTemplateAgentResult(task);
}

async function buildLlmAgentResult(task: Task) {
  const expectedFormat = task.expectedFormat.trim() || "A concise structured answer.";
  const prompt = [
    "You are an autonomous AgentBounty worker.",
    "Complete the user's task based only on the task details below.",
    "Do not claim that you performed external actions, browsing, deployment, wallet activity, or code edits unless the task details provide enough information to support that.",
    "If the task asks for analysis, produce concrete reasoning, risks, assumptions, and recommendations.",
    "If the task asks for copywriting or campaign work, produce usable deliverables, not generic advice.",
    "Keep the answer under 3,500 characters because the on-chain contract has a result length limit.",
    "",
    `Task ID: ${task.id.toString()}`,
    `Title: ${task.title}`,
    `Category: ${task.category || "Other"}`,
    `Expected output format: ${expectedFormat}`,
    "",
    "Task description:",
    task.description
  ].join("\n");

  let response: Response;

  try {
    response = await fetch(`${llmBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${llmApiKey}`
      },
      signal: AbortSignal.timeout(llmTimeoutMs),
      body: JSON.stringify({
        model: llmModel,
        messages: [
          {
            role: "system",
            content:
              "You are a careful autonomous agent. Return only the final task deliverable. Be specific, honest about assumptions, and avoid filler."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: llmTemperature,
        max_tokens: llmMaxTokens
      })
    });
  } catch (error) {
    throw new Error(
      [
        `LLM network request failed: ${error instanceof Error ? error.message : String(error)}`,
        `Base URL: ${llmBaseUrl}`,
        "The Agent did not accept the task because it could not generate a real result.",
        "Fix by using a reachable OpenAI-compatible endpoint in AGENT_LLM_BASE_URL, running the worker on a cloud server with outbound HTTPS access, or fixing local network/proxy access."
      ].join("\n")
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`LLM request failed with HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("LLM returned an empty result.");
  }

  const result = [
    `AgentBounty autonomous result for task #${task.id.toString()}`,
    "",
    content.trim(),
    "",
    "Audit note:",
    `Executor: ${agentExecutor}`,
    `Model: ${llmModel}`,
    "The Agent wallet accepted this task and submitted this result on-chain."
  ].join("\n");

  return result.slice(0, 3900);
}

function buildTemplateAgentResult(task: Task) {
  const expectedFormat = task.expectedFormat.trim() || "A concise structured answer.";

  return [
    `AgentBounty autonomous result for task #${task.id.toString()}`,
    "",
    `Title: ${task.title}`,
    `Category: ${task.category || "Other"}`,
    "",
    "Understanding:",
    task.description,
    "",
    "Deliverable:",
    `I completed this task using a deterministic Agent Worker. Expected format: ${expectedFormat}`,
    "",
    "Result:",
    buildCategorySpecificAnswer(task),
    "",
    "Audit note:",
    "This result was generated and submitted by an off-chain Agent wallet. The task state, Agent address, result hash, and payment flow are recorded on-chain."
  ].join("\n");
}

function buildCategorySpecificAnswer(task: Task) {
  const title = task.title.toLowerCase();
  const description = task.description.toLowerCase();
  const combined = `${title} ${description}`;

  if (combined.includes("risk") || task.category.toLowerCase().includes("review")) {
    return [
      "Risk score: 68/100",
      "Main risks: unclear assumptions, dependency risk, execution risk, and verification risk.",
      "Recommendation: treat this as medium risk until stronger evidence, tests, or documentation are available."
    ].join("\n");
  }

  if (task.category.toLowerCase().includes("meme")) {
    return [
      "Campaign direction: agents working while humans sleep.",
      "Caption ideas: Ship while you sleep. Agents do not wait for office hours. Ritual makes work autonomous.",
      "Image prompt direction: clean Ritual-inspired workspace with autonomous agent status panels and overnight task completion."
    ].join("\n");
  }

  if (task.category.toLowerCase().includes("x article")) {
    return [
      "Hook: Autonomous agents need more than intelligence; they need financial sovereignty.",
      "Body: On-chain escrow, verifiable task history, and automated settlement turn agents into economic actors.",
      "Close: Ritual-native agent workflows make the agent economy observable, payable, and composable."
    ].join("\n");
  }

  return [
    "Summary: the task has been processed into a structured response.",
    "Key points: clarify the goal, identify constraints, produce a concise deliverable, and leave an auditable on-chain record.",
    "Recommendation: review the output, approve if it meets the requested format, or reject with a precise reason for resubmission."
  ].join("\n");
}

async function upsertAgentProfile(agentAddress: string) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.log("Supabase profile sync skipped: Supabase is not configured.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { error } = await supabase.from("agent_profiles").upsert(
    {
      wallet_address: agentAddress.toLowerCase(),
      display_name: agentDisplayName,
      bio: agentBio,
      skill_tags: agentSkillTags,
      website_url: agentWebsiteUrl,
      x_handle: agentXHandle,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "wallet_address"
    }
  );

  if (error) {
    console.log(`Supabase profile sync failed: ${error.message}`);
    return;
  }

  console.log("Supabase profile synced.");
}

async function sendRawContractTransaction(
  provider: ethers.JsonRpcProvider,
  wallet: ethers.Wallet,
  iface: ethers.Interface,
  functionName: string,
  args: unknown[],
  fallbackGasLimit: bigint
) {
  const network = await provider.getNetwork();
  const nonce = await provider.getTransactionCount(wallet.address, "pending");
  const data = iface.encodeFunctionData(functionName, args);

  let gasLimit = fallbackGasLimit;

  try {
    const estimatedGas = await provider.estimateGas({
      from: wallet.address,
      to: contractAddress,
      data
    });

    gasLimit = (estimatedGas * 130n) / 100n;
  } catch {
    gasLimit = fallbackGasLimit;
  }

  const signedTransaction = await wallet.signTransaction({
    type: 2,
    chainId: Number(network.chainId),
    nonce,
    to: contractAddress,
    data,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas
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

  return payload.result as string;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function runOnce() {
  requireConfig();

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(agentPrivateKey as string, provider);
  const contract = new ethers.Contract(contractAddress as string, agentBountyAbi, provider);
  const iface = new ethers.Interface(agentBountyAbi);
  const balance = await provider.getBalance(wallet.address);

  console.log(`Agent wallet: ${wallet.address}`);
  console.log(`Agent balance: ${ethers.formatEther(balance)} RITUAL`);
  console.log(`Agent contract: ${contractAddress}`);
  console.log(`Dry run: ${dryRun ? "yes" : "no"}`);
  console.log(`Loop mode: ${loopMode ? "yes" : "no"}`);
  console.log(`Executor: ${agentExecutor}`);
  if (agentExecutor === "llm") {
    console.log(`LLM model: ${llmModel}`);
  }

  await upsertAgentProfile(wallet.address);

  const tasks = (await contract.getAllTasks()) as Task[];
  const openTasks = tasks.filter((task) => shouldAcceptTask(task, wallet.address)).slice(0, maxTasksPerRun);

  if (openTasks.length === 0) {
    console.log("No acceptable open tasks found.");
    for (const task of tasks) {
      const reasons = getTaskSkipReasons(task, wallet.address);
      console.log(
        `Skipped task #${task.id.toString()} (${task.title}): ${reasons.length > 0 ? reasons.join("; ") : "acceptable but not selected"}`
      );
    }
    return;
  }

  for (const task of openTasks) {
    console.log(`Selected task #${task.id.toString()}: ${task.title}`);

    if (dryRun) {
      console.log(`Dry run selected task #${task.id.toString()} and skipped chain transactions.`);
      continue;
    }

    console.log(`Generating result for task #${task.id.toString()} using ${agentExecutor}.`);
    const resultText = await buildAgentResult(task);

    console.log(`Accepting task #${task.id.toString()} after result generation.`);
    const acceptHash = await sendRawContractTransaction(provider, wallet, iface, "acceptTask", [task.id], 200_000n);
    console.log(`Accept tx: ${acceptHash}`);
    await provider.waitForTransaction(acceptHash);

    const acceptedTask = (await contract.tasks(task.id)) as Task;

    if (Number(acceptedTask.status) !== TaskStatus.Assigned || acceptedTask.agent.toLowerCase() !== wallet.address.toLowerCase()) {
      console.log(`Task #${task.id.toString()} was not assigned to this agent after accept.`);
      continue;
    }

    const submitHash = await sendRawContractTransaction(
      provider,
      wallet,
      iface,
      "submitResult",
      [task.id, resultText, ""],
      900_000n
    );

    console.log(`Submit tx: ${submitHash}`);
    await provider.waitForTransaction(submitHash);
    console.log(`Task #${task.id.toString()} submitted.`);
  }
}

async function main() {
  if (!loopMode) {
    await runOnce();
    return;
  }

  requireConfig();
  console.log(`Agent loop started. Poll interval: ${pollIntervalSeconds}s`);

  while (true) {
    try {
      await runOnce();
    } catch (error) {
      console.error(error);
    }

    await sleep(pollIntervalSeconds * 1000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
