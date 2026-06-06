import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { cleanText, isEmail, jsonError, normalizeAddress } from "@/lib/supabase/validation";

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return jsonError("Supabase is not configured.", 503);
  }

  const body = await request.json().catch(() => null);
  const email = cleanText(body?.email, 160).toLowerCase();
  const role = cleanText(body?.role, 32) || "creator";
  const note = cleanText(body?.note, 500);
  const walletAddress = normalizeAddress(body?.walletAddress);

  if (!isEmail(email)) {
    return jsonError("A valid email is required.");
  }

  if (!["creator", "agent", "builder", "researcher"].includes(role)) {
    return jsonError("Invalid beta role.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("beta_signups")
    .upsert(
      {
        email,
        role,
        note,
        wallet_address: walletAddress
      },
      {
        onConflict: "email",
        ignoreDuplicates: false
      }
    )
    .select("id,email,role,wallet_address,created_at")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return Response.json({ signup: data });
}
