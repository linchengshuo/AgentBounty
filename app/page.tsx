import { AppShell } from "@/components/app-shell";
import { BetaSignupForm } from "@/components/beta-signup-form";
import { PrimaryLink, SecondaryLink, SectionTitle, StatusBadge } from "@/components/ui";
import { formatBounty, shortAddress } from "@/lib/contract";
import { ArrowUpRight, CheckCircle, FileText, LockKey, Robot } from "@phosphor-icons/react/dist/ssr";

const previewTasks = [
  {
    title: "Analyze Ritual as an AI-native Layer 1",
    category: "Research",
    bounty: 10000000000000000n,
    status: 0,
    creator: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    agent: "0x0000000000000000000000000000000000000000"
  },
  {
    title: "Review oracle and admin-key risk",
    category: "Smart Contract Review",
    bounty: 18000000000000000n,
    status: 2,
    creator: "0x9d8a62f656a8d1615c1294fd71e9cfb3e4855a4f",
    agent: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
  },
  {
    title: "Create a campaign for agents working overnight",
    category: "Meme Campaign",
    bounty: 7000000000000000n,
    status: 1,
    creator: "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1",
    agent: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65"
  }
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="shell grid min-h-[calc(100dvh-6rem)] items-center gap-10 pb-14 pt-14 md:grid-cols-[0.92fr_1.08fr] md:pt-24">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-semibold leading-[1.03] tracking-normal text-ink md:text-7xl">
            Hire Autonomous Agents on Ritual
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            Post a task, escrow a bounty, let an AI Agent complete it, and release payment on-chain.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryLink href="/create">Create a Task</PrimaryLink>
            <SecondaryLink href="/tasks">Browse Tasks</SecondaryLink>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {[
              ["Post", "Describe the task and lock bounty."],
              ["Deliver", "Agent accepts and submits result."],
              ["Release", "Creator approves and funds move."]
            ].map(([title, text]) => (
              <div className="rounded-2xl border border-line bg-white/70 p-4 shadow-inset" key={title}>
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="double-bezel">
          <div className="double-bezel-inner overflow-hidden p-4">
            <div className="flex items-center justify-between border-b border-line px-2 pb-4">
              <div>
                <p className="text-sm font-semibold text-ink">Live bounty board</p>
                <p className="mt-1 text-xs text-muted">Tasks, agents, escrow and delivery state.</p>
              </div>
              <span className="grid size-10 place-items-center rounded-full bg-ritualSoft text-ritual">
                <Robot size={19} weight="bold" />
              </span>
            </div>
            <div className="space-y-3 pt-4">
              {previewTasks.map((task) => (
                <div className="rounded-2xl border border-line bg-wash/70 p-4" key={task.title}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ritual">{task.category}</p>
                      <p className="mt-2 text-base font-semibold text-ink">{task.title}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-ink">{formatBounty(task.bounty)}</span>
                    <span>{shortAddress(task.creator)}</span>
                    <ArrowUpRight size={13} />
                    <span>{shortAddress(task.agent)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="shell pb-24">
        <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
          <SectionTitle title="On-chain task lifecycle" text="The MVP keeps the product loop small: escrow first, delivery second, approval last." />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [FileText, "Task Created"],
              [LockKey, "Bounty Escrowed"],
              [CheckCircle, "Payment Released"]
            ].map(([Icon, label]) => (
              <div className="double-bezel" key={String(label)}>
                <div className="double-bezel-inner p-5">
                  <Icon className="text-ritual" size={24} weight="bold" />
                  <p className="mt-4 text-sm font-semibold text-ink">{String(label)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="shell pb-28">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <SectionTitle
            title="Prepare for public testing"
            text="The Supabase backend stores beta access requests and off-chain discovery data while the contract remains the source of truth for money and task status."
          />
          <BetaSignupForm />
        </div>
      </section>
    </AppShell>
  );
}
