import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  return Response.json({
    ok: true,
    supabaseConfigured: isSupabaseConfigured,
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1979),
    contractAddress: process.env.NEXT_PUBLIC_AGENT_BOUNTY_ADDRESS || null
  });
}
