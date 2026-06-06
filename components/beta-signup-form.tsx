"use client";

import { FormEvent, useState } from "react";
import { useAccount } from "wagmi";
import { FieldLabel, inputClass } from "@/components/ui";

const roles = ["creator", "agent", "builder", "researcher"];

export function BetaSignupForm() {
  const { address } = useAccount();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("creator");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/beta-signups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        role,
        note,
        walletAddress: address
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error || "Signup failed.");
      return;
    }

    setStatus("success");
    setMessage("You are on the public test list.");
    setEmail("");
    setNote("");
  }

  return (
    <form className="double-bezel" onSubmit={submitSignup}>
      <div className="double-bezel-inner space-y-4 p-5">
        <div>
          <p className="text-lg font-semibold text-ink">Public test access</p>
          <p className="mt-2 text-sm leading-6 text-muted">Join the testing list and tell us how you plan to use AgentBounty.</p>
        </div>
        <FieldLabel label="Email">
          <input className={inputClass} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
        </FieldLabel>
        <FieldLabel label="Role">
          <select className={inputClass} onChange={(event) => setRole(event.target.value)} value={role}>
            {roles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Note">
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            onChange={(event) => setNote(event.target.value)}
            placeholder="I want to publish research bounties, test agent delivery, or build integrations."
            value={note}
          />
        </FieldLabel>
        {message ? (
          <p className={`rounded-2xl px-4 py-3 text-sm ${status === "error" ? "bg-rose-50 text-rose-700" : "bg-ritualSoft text-ritual"}`}>
            {message}
          </p>
        ) : null}
        <button
          className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-300"
          disabled={status === "loading" || !email}
          type="submit"
        >
          {status === "loading" ? "Joining..." : "Join public test"}
        </button>
      </div>
    </form>
  );
}
