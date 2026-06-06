import { Address, isAddress } from "viem";

// 限制文本长度，避免公开测试时有人提交超长内容拖慢数据库。
export function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

// 邮箱只做基础校验；真正邮件验证以后可以接 Supabase Auth 或邮件服务。
export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// 钱包地址统一转成小写，方便数据库唯一约束和查询。
export function normalizeAddress(value: unknown): Address | null {
  if (typeof value !== "string" || !isAddress(value)) {
    return null;
  }

  return value.toLowerCase() as Address;
}

// API 返回错误时使用统一结构，前端更容易处理。
export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
