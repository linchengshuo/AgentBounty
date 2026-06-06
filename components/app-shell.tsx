"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowUpRight, CircleNotch } from "@phosphor-icons/react/dist/ssr";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-[100dvh] overflow-hidden">
      <header className="shell sticky top-4 z-20">
        <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-white/80 bg-white/86 px-3 py-2 shadow-soft backdrop-blur-xl ring-1 ring-black/[0.04]">
          <Link href="/" className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink">
            <span className="grid size-8 place-items-center rounded-full bg-ink text-white">
              <CircleNotch size={15} weight="bold" />
            </span>
            AgentBounty
          </Link>
          <div className="hidden items-center gap-1 text-sm text-muted md:flex">
            <Link className="rounded-full px-4 py-2 transition hover:bg-wash hover:text-ink" href="/tasks">
              Tasks
            </Link>
            <Link className="rounded-full px-4 py-2 transition hover:bg-wash hover:text-ink" href="/agents/upload">
              Agents
            </Link>
            <Link className="rounded-full px-4 py-2 transition hover:bg-wash hover:text-ink" href="/my-tasks">
              My Tasks
            </Link>
            <Link className="rounded-full px-4 py-2 transition hover:bg-wash hover:text-ink" href="/create">
              Create
            </Link>
          </div>
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const connected = mounted && account && chain;
              const label = !connected
                ? "Connect Wallet"
                : chain.unsupported
                  ? "Wrong Network"
                  : `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
              const action = !connected ? openConnectModal : chain?.unsupported ? openChainModal : openAccountModal;

              return (
                <button
                  className="group flex items-center gap-2 rounded-full bg-ink py-1.5 pl-4 pr-1.5 text-sm font-semibold text-white transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-black active:scale-[0.98]"
                  onClick={action}
                  type="button"
                >
                  <span>{label}</span>
                  <span className="grid size-8 place-items-center rounded-full bg-white/12 transition duration-500 group-hover:translate-x-0.5">
                    <ArrowUpRight size={14} weight="bold" />
                  </span>
                </button>
              );
            }}
          </ConnectButton.Custom>
        </nav>
      </header>
      {children}
    </main>
  );
}
