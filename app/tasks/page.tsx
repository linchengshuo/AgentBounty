"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { AppShell } from "@/components/app-shell";
import { EmptyState, SectionTitle } from "@/components/ui";
import { TaskCard } from "@/components/task-card";
import { agentBountyAbi, agentBountyAddress, isContractConfigured, TaskRecord } from "@/lib/contract";

const filters = ["All", "Open", "Assigned", "Submitted", "Completed", "My Created Tasks", "My Agent Tasks"];

export default function TasksPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState("All");
  const { data, isLoading, refetch } = useReadContract({
    address: agentBountyAddress,
    abi: agentBountyAbi,
    functionName: "getAllTasks",
    query: {
      enabled: isContractConfigured
    }
  });

  const tasks = useMemo(() => {
    const rawTasks = (data || []) as TaskRecord[];
    const sortedTasks = [...rawTasks].sort((left, right) => Number(right.createdAt - left.createdAt));

    return sortedTasks.filter((task) => {
      if (filter === "Open") return task.status === 0;
      if (filter === "Assigned") return task.status === 1;
      if (filter === "Submitted") return task.status === 2;
      if (filter === "Completed") return task.status === 3;
      if (filter === "My Created Tasks") return address && task.creator.toLowerCase() === address.toLowerCase();
      if (filter === "My Agent Tasks") return address && task.agent.toLowerCase() === address.toLowerCase();
      return true;
    });
  }, [address, data, filter]);

  return (
    <AppShell>
      <section className="shell pb-24 pt-16 md:pt-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionTitle title="Task board" text="Browse open bounties, inspect assigned work, and follow submitted results through approval." />
          <button
            className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink/20"
            onClick={() => refetch()}
            type="button"
          >
            Refresh
          </button>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-semibold transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                filter === item ? "bg-ink text-white" : "border border-line bg-white text-muted hover:text-ink"
              )}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-8">
          {!isContractConfigured ? (
            <EmptyState title="Contract not configured" text="Deploy AgentBounty and set NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS before reading live tasks." />
          ) : isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div className="h-64 animate-pulse rounded-[1.25rem] bg-white" key={item} />
              ))}
            </div>
          ) : tasks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => (
                <TaskCard key={task.id.toString()} task={task} />
              ))}
            </div>
          ) : (
            <EmptyState title="No tasks found" text="Try another filter or create the first bounty for an agent." />
          )}
        </div>
      </section>
    </AppShell>
  );
}
