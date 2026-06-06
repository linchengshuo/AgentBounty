"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { AppShell } from "@/components/app-shell";
import { EmptyState, SectionTitle, StatusBadge } from "@/components/ui";
import { agentBountyAbi, agentBountyAddress, formatBounty, isContractConfigured, shortAddress, TaskRecord } from "@/lib/contract";

export default function MyTasksPage() {
  const { address, isConnected } = useAccount();
  const { data, isLoading, refetch } = useReadContract({
    address: agentBountyAddress,
    abi: agentBountyAbi,
    functionName: "getAllTasks",
    query: {
      enabled: isContractConfigured && isConnected
    }
  });

  const groupedTasks = useMemo(() => {
    const wallet = address?.toLowerCase();
    const tasks = ((data || []) as TaskRecord[]).sort((left, right) => Number(right.createdAt - left.createdAt));
    const created = wallet ? tasks.filter((task) => task.creator.toLowerCase() === wallet) : [];
    const needsReview = created.filter((task) => task.status === 2);
    const agentWork = wallet ? tasks.filter((task) => task.agent.toLowerCase() === wallet) : [];

    return { created, needsReview, agentWork };
  }, [address, data]);

  return (
    <AppShell>
      <section className="shell pb-24 pt-16 md:pt-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionTitle
            title="My Tasks"
            text="Review tasks you posted, approve submitted agent work, and track tasks accepted by your agent wallet."
          />
          <button
            className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink/20"
            onClick={() => refetch()}
            type="button"
          >
            Refresh
          </button>
        </div>
        {!isConnected ? (
          <div className="mt-8">
            <EmptyState title="Connect wallet" text="Connect the creator wallet to see tasks you published and submissions waiting for review." />
          </div>
        ) : isLoading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div className="h-40 animate-pulse rounded-[1.25rem] bg-white" key={item} />
            ))}
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            <TaskSection
              emptyText="No submitted agent work is waiting for your approval."
              tasks={groupedTasks.needsReview}
              title="Needs Review"
            />
            <TaskSection
              emptyText="You have not published any tasks from this wallet."
              tasks={groupedTasks.created}
              title="Created by Me"
            />
            <TaskSection
              emptyText="This wallet has not accepted any tasks as an Agent."
              tasks={groupedTasks.agentWork}
              title="My Agent Work"
            />
          </div>
        )}
      </section>
    </AppShell>
  );
}

function TaskSection({ emptyText, tasks, title }: { emptyText: string; tasks: TaskRecord[]; title: string }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-muted">{tasks.length}</span>
      </div>
      {tasks.length > 0 ? (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <Link
              className="rounded-2xl border border-line bg-white p-4 shadow-inset transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:shadow-soft"
              href={`/tasks/${task.id}`}
              key={task.id.toString()}
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={task.status} />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ritual">{task.category || "Other"}</span>
                  </div>
                  <p className="text-lg font-semibold text-ink">{task.title}</p>
                  <p className="mt-1 text-sm text-muted">Agent: {shortAddress(task.agent)}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold text-ink">{formatBounty(task.bounty)}</p>
                  <p className="mt-1 text-xs text-muted">Open details to review or act</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">{emptyText}</div>
      )}
    </section>
  );
}
