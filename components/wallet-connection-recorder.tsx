"use client";

import { useEffect, useRef } from "react";
import { useAccount, useChainId } from "wagmi";

export function WalletConnectionRecorder() {
  const { address, connector, isConnected } = useAccount();
  const chainId = useChainId();
  const lastRecordedKey = useRef("");

  useEffect(() => {
    async function recordConnection() {
      if (!isConnected || !address) {
        return;
      }

      const recordKey = `${address.toLowerCase()}:${chainId}:${connector?.name || ""}`;

      if (lastRecordedKey.current === recordKey) {
        return;
      }

      lastRecordedKey.current = recordKey;

      await fetch("/api/wallet-connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          walletAddress: address,
          chainId,
          connectorName: connector?.name || "unknown"
        })
      }).catch(() => {
        lastRecordedKey.current = "";
      });
    }

    recordConnection();
  }, [address, chainId, connector?.name, isConnected]);

  return null;
}
