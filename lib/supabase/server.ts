import { createClient } from "@supabase/supabase-js";

// 这些环境变量只在服务端 API 路由里读取，不能暴露 service role key 给浏览器。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 统一判断 Supabase 是否已经配置，API 路由会用它返回清楚错误。
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

// 创建服务端 Supabase 客户端；service role 会绕过 RLS，所以只能在服务端使用。
export function createSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
