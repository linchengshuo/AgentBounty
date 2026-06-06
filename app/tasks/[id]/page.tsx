"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AppShell } from "@/components/app-shell";
import { EmptyState, FieldLabel, inputClass, StatusBadge } from "@/components/ui";
import {
  agentBountyAbi,
  agentBountyAddress,
  formatBounty,
  formatDate,
  isContractConfigured,
  ritualCreateTaskGas,
  ritualMaxFeePerGas,
  ritualMaxPriorityFeePerGas,
  shortAddress,
  TaskRecord
} from "@/lib/contract";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = BigInt(params.id);
  const { address } = useAccount();
  const { data, refetch } = useReadContract({
    address: agentBountyAddress,
    abi: agentBountyAbi,
    functionName: "getAllTasks",
    query: {
      enabled: isContractConfigured
    }
  });
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [resultText, setResultText] = useState("");
  const [resultURI, setResultURI] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rating, setRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [backendMessage, setBackendMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"accept" | "submit" | "approve" | "reject" | "cancel" | "rate" | null>(null);

  const task = useMemo(() => {
    return ((data || []) as TaskRecord[]).find((item) => item.id === taskId);
  }, [data, taskId]);

  const normalizedAddress = address?.toLowerCase();
  const isCreator = Boolean(task && normalizedAddress && task.creator.toLowerCase() === normalizedAddress);
  const isAgent = Boolean(task && normalizedAddress && task.agent.toLowerCase() === normalizedAddress);
  const canAccept = Boolean(task && task.status === 0 && !isCreator);
  const canSubmit = Boolean(task && isAgent && (task.status === 1 || task.status === 4));
  const canReview = Boolean(task && isCreator && task.status === 2);
  const canCancel = Boolean(task && isCreator && task.status === 0);
  const canRate = Boolean(task && isCreator && task.status === 3 && task.rating === 0);

  function callContract(functionName: "acceptTask" | "approveTask" | "cancelTask") {
    const actionMap = {
      acceptTask: "accept",
      approveTask: "approve",
      cancelTask: "cancel"
    } as const;

    setBackendMessage("");
    setPendingAction(actionMap[functionName]);

    writeContract({
      address: agentBountyAddress,
      abi: agentBountyAbi,
      functionName,
      args: [taskId],
      type: "eip1559",
      gas: ritualCreateTaskGas,
      maxFeePerGas: ritualMaxFeePerGas,
      maxPriorityFeePerGas: ritualMaxPriorityFeePerGas
    });
  }

  function submitResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBackendMessage("");
    setPendingAction("submit");

    writeContract({
      address: agentBountyAddress,
      abi: agentBountyAbi,
      functionName: "submitResult",
      args: [taskId, resultText.trim(), resultURI.trim()],
      type: "eip1559",
      gas: ritualCreateTaskGas,
      maxFeePerGas: ritualMaxFeePerGas,
      maxPriorityFeePerGas: ritualMaxPriorityFeePerGas
    });
  }

  function rejectTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBackendMessage("");
    setPendingAction("reject");

    writeContract({
      address: agentBountyAddress,
      abi: agentBountyAbi,
      functionName: "rejectTask",
      args: [taskId, rejectReason.trim()],
      type: "eip1559",
      gas: ritualCreateTaskGas,
      maxFeePerGas: ritualMaxFeePerGas,
      maxPriorityFeePerGas: ritualMaxPriorityFeePerGas
    });
  }

  function rateAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBackendMessage("");
    setPendingAction("rate");

    writeContract({
      address: agentBountyAddress,
      abi: agentBountyAbi,
      functionName: "rateAgent",
      args: [taskId, Number(rating), reviewText.trim()],
      type: "eip1559",
      gas: ritualCreateTaskGas,
      maxFeePerGas: ritualMaxFeePerGas,
      maxPriorityFeePerGas: ritualMaxPriorityFeePerGas
    });
  }

  useEffect(() => {
    async function syncTaskSnapshot() {
      if (!isSuccess || !receipt || !task || !pendingAction) {
        return;
      }

      const nextStatus = {
        accept: "Assigned",
        submit: "Submitted",
        approve: "Approved",
        reject: "Rejected",
        cancel: "Cancelled",
        rate: "Approved"
      }[pendingAction];

      const response = await fetch("/api/task-snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1979),
          contractAddress: agentBountyAddress,
          contractTaskId: task.id.toString(),
          creatorAddress: task.creator,
          agentAddress: pendingAction === "accept" ? address : task.agent,
          title: task.title,
          category: task.category,
          description: task.description,
          expectedFormat: task.expectedFormat,
          status: nextStatus,
          bountyWei: task.bounty.toString(),
          resultText: pendingAction === "submit" ? resultText : task.resultText,
          resultURI: pendingAction === "submit" ? resultURI : task.resultURI,
          resultHash: task.resultHash,
          rejectReason: pendingAction === "reject" ? rejectReason : task.rejectReason,
          rating: pendingAction === "rate" ? Number(rating) : task.rating || null,
          reviewText: pendingAction === "rate" ? reviewText : task.reviewText,
          lastTxHash: receipt.transactionHash
        })
      });

      if (response.ok) {
        setBackendMessage("Supabase task snapshot updated.");
        return;
      }

      const payload = await response.json().catch(() => ({}));
      setBackendMessage(payload.error || "On-chain transaction confirmed, but backend sync failed.");
    }

    syncTaskSnapshot();
  }, [address, isSuccess, pendingAction, rating, receipt, refetch, rejectReason, resultText, resultURI, reviewText, task]);

  return (
    <AppShell>
      <section className="shell pb-24 pt-16 md:pt-24">
        {!isContractConfigured ? (
          <EmptyState title="Contract not configured" text="Deploy AgentBounty and add the deployed address to NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS." />
        ) : !task ? (
          <EmptyState title="Task not found" text="This task is not available from the current contract." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="double-bezel">
              <div className="double-bezel-inner p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ritual">{task.category}</p>
                    <h1 className="mt-4 text-4xl font-semibold leading-[1.06] tracking-normal text-ink md:text-6xl">{task.title}</h1>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
                <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-muted">{task.description}</p>
                <div className="mt-8 grid gap-3 md:grid-cols-2">
                  {[
                    ["Bounty", formatBounty(task.bounty)],
                    ["Creator", shortAddress(task.creator)],
                    ["Agent", shortAddress(task.agent)],
                    ["Deadline", formatDate(task.deadline)]
                  ].map(([label, value]) => (
                    <div className="rounded-2xl border border-line bg-wash p-4" key={label}>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
                      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>
                {task.expectedFormat ? (
                  <section className="mt-8 border-t border-line pt-6">
                    <h2 className="text-lg font-semibold text-ink">Expected output</h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{task.expectedFormat}</p>
                  </section>
                ) : null}
                {task.resultText ? (
                  <section className="mt-8 border-t border-line pt-6">
                    <h2 className="text-lg font-semibold text-ink">Submitted result</h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{task.resultText}</p>
                    {task.resultURI ? (
                      <a className="mt-4 inline-flex text-sm font-semibold text-ritual" href={task.resultURI} rel="noreferrer" target="_blank">
                        Open result URI
                      </a>
                    ) : null}
                  </section>
                ) : null}
                {task.rejectReason ? (
                  <section className="mt-8 rounded-2xl bg-rose-50 p-5">
                    <h2 className="text-sm font-semibold text-rose-800">Rejection reason</h2>
                    <p className="mt-2 text-sm leading-6 text-rose-700">{task.rejectReason}</p>
                  </section>
                ) : null}
                {task.rating > 0 ? (
                  <section className="mt-8 rounded-2xl bg-ritualSoft p-5">
                    <h2 className="text-sm font-semibold text-ritual">Agent rating: {task.rating}/5</h2>
                    <p className="mt-2 text-sm leading-6 text-ritual">{task.reviewText || "No written review."}</p>
                  </section>
                ) : null}
              </div>
            </article>
            <aside className="space-y-4">
              <div className="double-bezel">
                <div className="double-bezel-inner space-y-3 p-5">
                  <h2 className="text-lg font-semibold text-ink">Actions</h2>
                  {isSuccess ? (
                    <button className="w-full rounded-full bg-ritualSoft px-5 py-3 text-sm font-semibold text-ritual" onClick={() => refetch()} type="button">
                      Transaction confirmed. Refresh data
                    </button>
                  ) : null}
                  {backendMessage ? (
                    <p className="rounded-2xl bg-wash px-4 py-3 text-sm leading-6 text-muted">{backendMessage}</p>
                  ) : null}
                  {canAccept ? (
                    <ActionButton disabled={isPending || isConfirming} label="Accept Task" onClick={() => callContract("acceptTask")} />
                  ) : null}
                  {canCancel ? (
                    <ActionButton disabled={isPending || isConfirming} label="Cancel Task" onClick={() => callContract("cancelTask")} tone="neutral" />
                  ) : null}
                  {canReview ? (
                    <ActionButton disabled={isPending || isConfirming} label="Approve and Release Bounty" onClick={() => callContract("approveTask")} />
                  ) : null}
                  {!canAccept && !canCancel && !canReview && !canSubmit && !canRate ? (
                    <p className="rounded-2xl bg-wash px-4 py-3 text-sm leading-6 text-muted">
                      No wallet action is available for your current role and this task status.
                    </p>
                  ) : null}
                </div>
              </div>
              {canSubmit ? (
                <Panel title={task.status === 4 ? "Resubmit result" : "Submit result"}>
                  <form className="space-y-4" onSubmit={submitResult}>
                    <FieldLabel label="Result Text">
                      <textarea className={`${inputClass} min-h-36 resize-y`} onChange={(event) => setResultText(event.target.value)} value={resultText} />
                    </FieldLabel>
                    <FieldLabel label="Result URI">
                      <input className={inputClass} onChange={(event) => setResultURI(event.target.value)} placeholder="Optional IPFS, GitHub, or Notion link" value={resultURI} />
                    </FieldLabel>
                    <ActionButton disabled={!resultText.trim() || isPending || isConfirming} label="Submit Result" submit />
                  </form>
                </Panel>
              ) : null}
              {canReview ? (
                <Panel title="Reject result">
                  <form className="space-y-4" onSubmit={rejectTask}>
                    <FieldLabel label="Reason">
                      <textarea className={`${inputClass} min-h-28 resize-y`} onChange={(event) => setRejectReason(event.target.value)} value={rejectReason} />
                    </FieldLabel>
                    <ActionButton disabled={!rejectReason.trim() || isPending || isConfirming} label="Reject Result" submit tone="neutral" />
                  </form>
                </Panel>
              ) : null}
              {canRate ? (
                <Panel title="Rate agent">
                  <form className="space-y-4" onSubmit={rateAgent}>
                    <FieldLabel label="Rating">
                      <select className={inputClass} onChange={(event) => setRating(event.target.value)} value={rating}>
                        {[1, 2, 3, 4, 5].map((score) => (
                          <option key={score} value={score}>
                            {score}
                          </option>
                        ))}
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Review">
                      <textarea className={`${inputClass} min-h-28 resize-y`} onChange={(event) => setReviewText(event.target.value)} value={reviewText} />
                    </FieldLabel>
                    <ActionButton disabled={isPending || isConfirming} label="Rate Agent" submit />
                  </form>
                </Panel>
              ) : null}
            </aside>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="double-bezel">
      <div className="double-bezel-inner p-5">
        <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ActionButton({
  disabled,
  label,
  onClick,
  submit,
  tone = "primary"
}: {
  disabled?: boolean;
  label: string;
  onClick?: () => void;
  submit?: boolean;
  tone?: "primary" | "neutral";
}) {
  return (
    <button
      className={`w-full rounded-full px-5 py-3 text-sm font-semibold transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:cursor-not-allowed disabled:bg-zinc-300 ${
        tone === "primary" ? "bg-ritual text-white hover:bg-[#067a47]" : "bg-ink text-white hover:bg-black"
      }`}
      disabled={disabled}
      onClick={onClick}
      type={submit ? "submit" : "button"}
    >
      {label}
    </button>
  );
}
