import clsx from "clsx";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

export function SectionTitle({ title, text }: { title: string; text?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl font-semibold tracking-normal text-ink md:text-5xl">{title}</h2>
      {text ? <p className="mt-4 text-base leading-7 text-muted">{text}</p> : null}
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      className="group inline-flex items-center gap-3 rounded-full bg-ritual py-1.5 pl-5 pr-1.5 text-sm font-semibold text-white transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#067a47] active:scale-[0.98]"
      href={href}
    >
      <span>{children}</span>
      <span className="grid size-9 place-items-center rounded-full bg-white/18 transition duration-500 group-hover:translate-x-0.5">
        <ArrowUpRight size={15} weight="bold" />
      </span>
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      className="inline-flex items-center rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-ink/20 hover:shadow-soft active:scale-[0.98]"
      href={href}
    >
      {children}
    </Link>
  );
}

export function StatusBadge({ status }: { status: number }) {
  const labels = ["Open", "Assigned", "Submitted", "Approved", "Rejected", "Cancelled"];
  const styles = [
    "bg-ritualSoft text-ritual",
    "bg-sky-50 text-sky-700",
    "bg-amber-50 text-amber-700",
    "bg-ink text-white",
    "bg-rose-50 text-rose-700",
    "bg-zinc-100 text-zinc-500"
  ];

  return (
    <span className={clsx("inline-flex rounded-full px-3 py-1 text-xs font-semibold", styles[status] || styles[0])}>
      {labels[status] || "Open"}
    </span>
  );
}

export function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "focus-ring w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink shadow-inset placeholder:text-muted/55";

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="double-bezel">
      <div className="double-bezel-inner px-6 py-12 text-center">
        <p className="text-lg font-semibold text-ink">{title}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{text}</p>
      </div>
    </div>
  );
}
