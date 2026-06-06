import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { cleanText, jsonError, normalizeAddress } from "@/lib/supabase/validation";

const validStatuses = ["Open", "Assigned", "Submitted", "Approved", "Rejected", "Cancelled"];

export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return jsonError("Supabase is not configured.", 503);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const creator = normalizeAddress(searchParams.get("creator"));
  const agent = normalizeAddress(searchParams.get("agent"));
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  const supabase = createSupabaseAdminClient();
  let query = supabase.from("task_snapshots").select("*").order("updated_at", { ascending: false }).limit(limit);

  if (status && validStatuses.includes(status)) {
    query = query.eq("status", status);
  }

  if (creator) {
    query = query.eq("creator_address", creator);
  }

  if (agent) {
    query = query.eq("agent_address", agent);
  }

  const { data, error } = await query;

  if (error) {
    return jsonError(error.message, 500);
  }

  return Response.json({ tasks: data });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return jsonError("Supabase is not configured.", 503);
  }

  const body = await request.json().catch(() => null);
  const creatorAddress = normalizeAddress(body?.creatorAddress);
  const agentAddress = normalizeAddress(body?.agentAddress);
  const contractAddress = normalizeAddress(body?.contractAddress);
  const status = cleanText(body?.status, 32);
  const title = cleanText(body?.title, 120);
  const category = cleanText(body?.category, 80) || "Other";
  const description = cleanText(body?.description, 2000);
  const expectedFormat = cleanText(body?.expectedFormat, 500);
  const resultText = cleanText(body?.resultText, 4000);
  const resultURI = cleanText(body?.resultURI, 500);
  const rejectReason = cleanText(body?.rejectReason, 500);
  const reviewText = cleanText(body?.reviewText, 1000);
  const resultHash = cleanText(body?.resultHash, 80) || null;
  const lastTxHash = cleanText(body?.lastTxHash, 80) || null;
  const contractTaskId = Number(body?.contractTaskId);
  const chainId = Number(body?.chainId || process.env.NEXT_PUBLIC_CHAIN_ID || 1979);
  const bountyWei = String(body?.bountyWei || "0");
  const rating = body?.rating === null || body?.rating === undefined || body?.rating === "" ? null : Number(body.rating);

  if (!creatorAddress || !contractAddress) {
    return jsonError("Creator and contract address are required.");
  }

  if (!Number.isFinite(contractTaskId) || contractTaskId <= 0) {
    return jsonError("A valid contract task id is required.");
  }

  if (!validStatuses.includes(status)) {
    return jsonError("Invalid task status.");
  }

  if (title.length < 3) {
    return jsonError("Task title is too short.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("task_snapshots")
    .upsert(
      {
        chain_id: chainId,
        contract_address: contractAddress,
        contract_task_id: contractTaskId,
        creator_address: creatorAddress,
        agent_address: agentAddress,
        title,
        category,
        description,
        expected_format: expectedFormat,
        status,
        bounty_wei: bountyWei,
        result_text: resultText,
        result_uri: resultURI,
        reject_reason: rejectReason,
        rating: Number.isFinite(rating) ? rating : null,
        review_text: reviewText,
        result_hash: resultHash,
        last_tx_hash: lastTxHash,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "chain_id,contract_address,contract_task_id"
      }
    )
    .select("*")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return Response.json({ task: data });
}
