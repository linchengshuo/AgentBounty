import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { cleanText, jsonError, normalizeAddress } from "@/lib/supabase/validation";

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return jsonError("Supabase is not configured.", 503);
  }

  const body = await request.json().catch(() => null);
  const walletAddress = normalizeAddress(body?.walletAddress);
  const connectorName = cleanText(body?.connectorName, 80);
  const chainId = Number(body?.chainId || 0) || null;
  const userAgent = cleanText(request.headers.get("user-agent"), 500);

  if (!walletAddress) {
    return jsonError("A valid wallet address is required.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wallet_connections")
    .insert({
      wallet_address: walletAddress,
      chain_id: chainId,
      connector_name: connectorName,
      user_agent: userAgent
    })
    .select("id,wallet_address,chain_id,connector_name,connected_at")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return Response.json({ connection: data });
}
