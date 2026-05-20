/**
 * 飞书多维表格 API Service 层
 * 负责处理 App Access Token 获取/刷新缓存，以及所有飞书 API 调用
 */

const FEISHU_BASE_URL = "https://open.feishu.cn";

// App Access Token 缓存
let tokenCache: { token: string; expiresAt: number } | null = null;

interface TokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

/** 获取 tenant_access_token（带缓存） */
async function getTenantAccessToken(): Promise<string> {
  // 缓存未过期则直接返回
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("缺少飞书环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET");
  }

  const res = await fetch(`${FEISHU_BASE_URL}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  const data: TokenResponse = await res.json();

  if (data.code !== 0) {
    throw new Error(`获取飞书 Token 失败: ${data.msg}`);
  }

  // 提前 5 分钟过期，避免边界问题
  tokenCache = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire - 300) * 1000,
  };

  return tokenCache.token;
}

/** 带鉴权的飞书 API 请求 */
async function feishuRequest(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = await getTenantAccessToken();
  const res = await fetch(`${FEISHU_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res.json();
}

// ==================== 多维表格 API ====================

const BASE_TOKEN = () => process.env.FEISHU_BASE_APP_TOKEN ?? "";

/** 读取多维表格记录列表 */
export async function listRecords(tableId: string, filter?: string): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({ page_size: "100" });
  if (filter) params.set("filter", filter);

  const data = await feishuRequest(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records?${params}`
  ) as { code: number; data: { items: Record<string, unknown>[]; total: number; has_more: boolean } };

  if (data.code !== 0) return [];
  return data.data?.items ?? [];
}

/** 读取单条记录 */
export async function getRecord(tableId: string, recordId: string): Promise<Record<string, unknown> | null> {
  const data = await feishuRequest(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records/${recordId}`
  ) as { code: number; data: { record: Record<string, unknown> } };

  if (data.code !== 0) return null;
  return data.data?.record ?? null;
}

/** 创建记录 */
export async function createRecord(
  tableId: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const data = await feishuRequest(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records`,
    {
      method: "POST",
      body: JSON.stringify({ fields }),
    }
  ) as { code: number; data: { record: Record<string, unknown> } };

  if (data.code !== 0) return null;
  return data.data?.record ?? null;
}

/** 更新记录 */
export async function updateRecord(
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const data = await feishuRequest(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      body: JSON.stringify({ fields }),
    }
  ) as { code: number; data: { record: Record<string, unknown> } };

  if (data.code !== 0) return null;
  return data.data?.record ?? null;
}

/** 删除记录 */
export async function deleteRecord(tableId: string, recordId: string): Promise<boolean> {
  const data = await feishuRequest(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records/${recordId}`,
    { method: "DELETE" }
  ) as { code: number };

  return data.code === 0;
}

/** 查找满足条件的首条记录（通过 filter） */
export async function findRecord(
  tableId: string,
  filter: string
): Promise<{ recordId: string; fields: Record<string, unknown> } | null> {
  const records = await listRecords(tableId, filter);
  if (records.length === 0) return null;

  const record = records[0];
  const recordId = String(record.record_id ?? "");
  if (!recordId) return null;
  return {
    recordId,
    fields: record.fields as Record<string, unknown>,
  };
}

// ==================== 内存缓存（系统状态专用） ====================

let systemStatusCache: { data: Record<string, unknown>; expiresAt: number } | null = null;
const SYSTEM_CACHE_TTL = 3000; // 3 秒缓存，避免 5 秒轮询每次都请求飞书

/** 获取系统状态（带缓存） */
export async function getSystemStatus(tableId: string) {
  if (systemStatusCache && Date.now() < systemStatusCache.expiresAt) {
    return systemStatusCache.data;
  }

  const records = await listRecords(tableId);
  if (records.length === 0) return null;

  const fields = records[0].fields as Record<string, unknown>;
  systemStatusCache = {
    data: fields,
    expiresAt: Date.now() + SYSTEM_CACHE_TTL,
  };

  return fields;
}

/** 清除 Token 缓存（调试用） */
export function clearTokenCache() {
  tokenCache = null;
}
