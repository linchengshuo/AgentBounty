"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { WagmiProvider } from "wagmi";
import { defineChain, http } from "viem";
import { WalletConnectionRecorder } from "@/components/wallet-connection-recorder";

const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1979);
const configuredRpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.ritualfoundation.org";

const ritualChain = defineChain({
  id: configuredChainId,
  name: "Ritual Testnet",
  nativeCurrency: {
    name: "RITUAL",
    symbol: "RITUAL",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [configuredRpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url: "https://explorer.ritualfoundation.org"
    }
  },
  testnet: true
});

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "agentbounty-local-demo";

const queryClient = new QueryClient();

const wagmiConfig = getDefaultConfig({
  appName: "AgentBounty",
  projectId: walletConnectProjectId,
  chains: [ritualChain],
  transports: {
    [ritualChain.id]: http(configuredRpcUrl)
  },
  ssr: false
});

export function Providers({ children }: PropsWithChildren) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (walletConnectProjectId === "agentbounty-local-demo") {
      console.warn("Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID for WalletConnect production use.");
    }

    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {mounted ? <WalletConnectionRecorder /> : null}
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
