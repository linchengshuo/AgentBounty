import Link from "next/link";
import { Clock, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { formatBounty, formatDate, shortAddress, TaskRecord } from "@/lib/contract";
import { StatusBadge } from "@/components/ui";

export function TaskCard({ task }: { task: TaskRecord }) {
  return (
    <Link className="double-bezel block transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1" href={`/tasks/${task.id}`}>
      <article className="double-bezel-inner h-full p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ritual">{task.category || "Other"}</p>
            <h3 className="mt-3 line-clamp-2 text-xl font-semibold tracking-normal text-ink">{task.title}</h3>
          </div>
          <StatusBadge status={task.status} />
        </div>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">{task.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-xs text-muted">
          <span className="rounded-full bg-ritualSoft px-3 py-1 font-semibold text-ritual">{formatBounty(task.bounty)}</span>
          <span className="inline-flex items-center gap-1">
            <UserCircle size={15} />
            {shortAddress(task.creator)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={15} />
            {formatDate(task.deadline)}
          </span>
        </div>
      </article>
    </Link>
  );
}
