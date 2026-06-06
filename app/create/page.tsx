"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { encodeFunctionData, parseEther, parseEventLogs, toHex } from "viem";
import { useAccount, useChainId, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { AppShell } from "@/components/app-shell";
import { FieldLabel, inputClass, SectionTitle } from "@/components/ui";
import {
  agentBountyAbi,
  agentBountyAddress,
  categories,
  isContractConfigured,
  ritualCreateTaskGas
} from "@/lib/contract";

export default function CreateTaskPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { sendTransactionAsync } = useSendTransaction();
  const [mounted, setMounted] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [writeError, setWriteError] = useState<Error | null>(null);
  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const snapshotSaved = useRef(false);
  const [error, setError] = useState("");
  const [backendMessage, setBackendMessage] = useState("");
  const [debugTransaction, setDebugTransaction] = useState<Record<string, string> | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "Research",
    description: "",
    expectedFormat: "",
    deadline: "",
    bountyAmount: "0.01"
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const canSubmit = useMemo(() => {
    if (!mounted) {
      return false;
    }

    return (
      isConnected &&
      isContractConfigured &&
      chainId === Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1979) &&
      form.title.trim().length >= 3 &&
      form.description.trim().length >= 20 &&
      Number(form.bountyAmount) > 0
    );
  }, [chainId, form, isConnected, mounted]);

  const submitChecks = [
    {
      label: "Wallet connected",
      passed: mounted && isConnected
    },
    {
      label: "Ritual Testnet selected",
      passed: mounted && chainId === Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1979)
    },
    {
      label: "Contract address configured",
      passed: isContractConfigured
    },
    {
      label: "Title has at least 3 characters",
      passed: form.title.trim().length >= 3
    },
    {
      label: "Description has at least 20 characters",
      passed: form.description.trim().length >= 20
    },
    {
      label: "Bounty is greater than 0",
      passed: Number(form.bountyAmount) > 0
    }
  ];

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWriteError(null);
    setBackendMessage("");
    snapshotSaved.current = false;

    if (!canSubmit) {
      setError("Please connect wallet, configure contract address, and complete required fields.");
      return;
    }

    if (!address) {
      setError("Browser wallet provider is missing.");
      return;
    }

    const deadlineSeconds = form.deadline ? BigInt(Math.floor(new Date(form.deadline).getTime() / 1000)) : 0n;
    const data = encodeFunctionData({
      abi: agentBountyAbi,
      functionName: "createTask",
      args: [form.title.trim(), form.description.trim(), form.category, form.expectedFormat.trim(), deadlineSeconds]
    });

    try {
      const value = parseEther(form.bountyAmount);
      const transaction = {
        to: agentBountyAddress,
        data,
        value,
        gas: ritualCreateTaskGas
      };

      setDebugTransaction({
        from: address,
        to: agentBountyAddress,
        chainId: toHex(Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1979)),
        mode: "walletAuto",
        gas: toHex(ritualCreateTaskGas),
        value: toHex(value),
        data
      });
      setIsPending(true);
      const transactionHash = await sendTransactionAsync(transaction);

      setHash(transactionHash as `0x${string}`);
    } catch (caughtError) {
      setWriteError(caughtError instanceof Error ? caughtError : new Error("Wallet rejected or failed to send transaction."));
    } finally {
      setIsPending(false);
    }
  }

  useEffect(() => {
    async function saveTaskSnapshot() {
      if (!receipt || !address || snapshotSaved.current) {
        return;
      }

      const logs = parseEventLogs({
        abi: agentBountyAbi,
        logs: receipt.logs,
        eventName: "TaskCreated"
      });

      const createdLog = logs[0] as unknown as { args?: { taskId?: bigint; bounty?: bigint } };
      const contractTaskId = createdLog.args?.taskId;

      if (!contractTaskId) {
        return;
      }

      snapshotSaved.current = true;

      const response = await fetch("/api/task-snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1979),
          contractAddress: agentBountyAddress,
          contractTaskId: contractTaskId.toString(),
          creatorAddress: address,
          title: form.title,
          category: form.category,
          description: form.description,
          expectedFormat: form.expectedFormat,
          status: "Open",
          bountyWei: parseEther(form.bountyAmount).toString(),
          lastTxHash: receipt.transactionHash
        })
      });

      if (response.ok) {
        setBackendMessage("Task snapshot saved to Supabase.");
        return;
      }

      const payload = await response.json().catch(() => ({}));
      setBackendMessage(payload.error || "Task was created on-chain, but Supabase snapshot was not saved.");
    }

    if (isSuccess) {
      saveTaskSnapshot();
    }
  }, [address, form.bountyAmount, form.category, form.description, form.expectedFormat, form.title, isSuccess, receipt]);

  return (
    <AppShell>
      <section className="shell pb-24 pt-16 md:pt-24">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <SectionTitle
            title="Create a bounty for an agent"
            text="Your bounty is sent with the transaction and held by the smart contract until you approve the delivered result."
          />
          <div className="double-bezel">
            <form className="double-bezel-inner space-y-5 p-5 md:p-7" onSubmit={submitTask}>
              <FieldLabel label="Task Title">
                <input
                  className={inputClass}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="Analyze Ritual as an AI-native Layer 1"
                  value={form.title}
                />
              </FieldLabel>
              <div className="grid gap-5 md:grid-cols-2">
                <FieldLabel label="Category">
                  <select className={inputClass} onChange={(event) => updateField("category", event.target.value)} value={form.category}>
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </FieldLabel>
                <FieldLabel label="Bounty Amount">
                  <input
                    className={inputClass}
                    min="0"
                    onChange={(event) => updateField("bountyAmount", event.target.value)}
                    step="0.001"
                    type="number"
                    value={form.bountyAmount}
                  />
                </FieldLabel>
              </div>
              <FieldLabel label="Description">
                <textarea
                  className={`${inputClass} min-h-40 resize-y`}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Write a short research report explaining Ritual's core narrative, agent economy potential, and risks."
                  value={form.description}
                />
              </FieldLabel>
              <FieldLabel label="Expected Output Format">
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  onChange={(event) => updateField("expectedFormat", event.target.value)}
                  placeholder="A structured report with risk score, main risks, and final recommendation."
                  value={form.expectedFormat}
                />
              </FieldLabel>
              <FieldLabel label="Deadline">
                <input
                  className={inputClass}
                  onChange={(event) => updateField("deadline", event.target.value)}
                  type="datetime-local"
                  value={form.deadline}
                />
              </FieldLabel>
              {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
              {writeError ? (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  {writeError.message}
                </p>
              ) : null}
              {debugTransaction ? (
                <details className="rounded-2xl border border-line bg-white p-4 text-xs text-muted">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">Transaction debug</summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(debugTransaction, null, 2)}
                  </pre>
                </details>
              ) : null}
              <div className="grid gap-2 rounded-2xl border border-line bg-wash p-4">
                {submitChecks.map((check) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={check.label}>
                    <span className={check.passed ? "text-ink" : "text-muted"}>{check.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${check.passed ? "bg-ritualSoft text-ritual" : "bg-white text-muted"}`}>
                      {check.passed ? "Ready" : "Required"}
                    </span>
                  </div>
                ))}
              </div>
              {!isContractConfigured ? (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Contract address is not configured. Deploy the contract and set NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS.
                </p>
              ) : null}
              {isSuccess ? (
                <p className="rounded-2xl bg-ritualSoft px-4 py-3 text-sm font-semibold text-ritual">Task transaction confirmed.</p>
              ) : null}
              {backendMessage ? (
                <p className="rounded-2xl bg-wash px-4 py-3 text-sm text-muted">{backendMessage}</p>
              ) : null}
              <button
                className="w-full rounded-full bg-ritual px-6 py-4 text-sm font-semibold text-white transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#067a47] disabled:cursor-not-allowed disabled:bg-zinc-300"
                disabled={!canSubmit || isPending || isConfirming}
                type="submit"
              >
                {isPending || isConfirming ? "Confirming Task..." : "Create Task"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
