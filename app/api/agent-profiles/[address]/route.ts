import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { cleanText, jsonError, normalizeAddress } from "@/lib/supabase/validation";

type RouteContext = {
  params: Promise<{
    address: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured) {
    return jsonError("Supabase is not configured.", 503);
  }

  const params = await context.params;
  const walletAddress = normalizeAddress(params.address);

  if (!walletAddress) {
    return jsonError("Invalid wallet address.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("agent_profiles").select("*").eq("wallet_address", walletAddress).maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  return Response.json({ profile: data });
}

export async function PUT(request: Request, context: RouteContext) {
  if (!isSupabaseConfigured) {
    return jsonError("Supabase is not configured.", 503);
  }

  const params = await context.params;
  const walletAddress = normalizeAddress(params.address);
  const body = await request.json().catch(() => null);

  if (!walletAddress) {
    return jsonError("Invalid wallet address.");
  }

  const displayName = cleanText(body?.displayName, 80);
  const bio = cleanText(body?.bio, 500);
  const websiteUrl = cleanText(body?.websiteUrl, 200) || null;
  const xHandle = cleanText(body?.xHandle, 80) || null;
  const skillTags = Array.isArray(body?.skillTags)
    ? body.skillTags.map((tag: unknown) => cleanText(tag, 32)).filter(Boolean).slice(0, 12)
    : [];

  if (displayName.length < 2) {
    return jsonError("Display name must be at least 2 characters.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_profiles")
    .upsert(
      {
        wallet_address: walletAddress,
        display_name: displayName,
        bio,
        skill_tags: skillTags,
        website_url: websiteUrl,
        x_handle: xHandle,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "wallet_address"
      }
    )
    .select("*")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return Response.json({ profile: data });
}
