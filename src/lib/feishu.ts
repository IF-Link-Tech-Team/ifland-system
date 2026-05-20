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

/** searchRecords 筛选条件 */
export interface SearchCondition {
  field_name: string;
  operator: string;
  value: string[];
}

/** searchRecords 筛选结构 */
export interface SearchFilter {
  conjunction: "and" | "or";
  conditions: SearchCondition[];
}

/** 使用 search API 查询记录（推荐，替代 listRecords），自动分页拉取全部 */
export async function searchRecords(
  tableId: string,
  filter?: SearchFilter,
  pageSize = 500
): Promise<Record<string, unknown>[]> {
  const allItems: Record<string, unknown>[] = [];
  let pageToken: string | undefined;

  do {
    const body: Record<string, unknown> = {
      page_size: Math.min(pageSize, 500),
    };
    if (filter) body.filter = filter;
    if (pageToken) body.page_token = pageToken;

    const data = (await feishuRequest(
      `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records/search`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    )) as {
      code: number;
      data?: {
        items: Record<string, unknown>[];
        total?: number;
        has_more?: boolean;
        page_token?: string;
      };
    };

    if (data.code !== 0) break;

    const items = data.data?.items ?? [];
    allItems.push(...items);

    const hasMore = data.data?.has_more ?? false;
    pageToken = hasMore ? data.data?.page_token : undefined;
  } while (pageToken);

  return allItems;
}

/**
 * [历史接口] 读取多维表格记录列表
 * 已废弃，请使用 searchRecords。保留此函数以兼容旧调用，内部已转发到 searchRecords。
 */
export async function listRecords(
  tableId: string,
  filterFormula?: string
): Promise<Record<string, unknown>[]> {
  if (!filterFormula) {
    return searchRecords(tableId);
  }
  // 将旧版 formula 字符串转换为 search filter（最佳 effort）
  // 例如: CurrentValue.[Builder号]="111" → {conjunction:"and",conditions:[{field_name:"Builder号",operator:"is",value:["111"]}]}
  const match = filterFormula.match(/CurrentValue\.\[([^\]]+)\]="([^"]+)"/);
  if (match) {
    const [, fieldName, value] = match;
    return searchRecords(tableId, {
      conjunction: "and",
      conditions: [{ field_name: fieldName, operator: "is", value: [value] }],
    });
  }
  // 无法解析的 formula，回退到无筛选列表
  return searchRecords(tableId);
}

/** 读取单条记录 */
export async function getRecord(tableId: string, recordId: string): Promise<Record<string, unknown> | null> {
  const data = (await feishuRequest(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records/${recordId}`
  )) as { code: number; data: { record: Record<string, unknown> } };

  if (data.code !== 0) return null;
  return data.data?.record ?? null;
}

/** 创建记录 */
export async function createRecord(
  tableId: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const data = (await feishuRequest(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records`,
    {
      method: "POST",
      body: JSON.stringify({ fields }),
    }
  )) as { code: number; data: { record: Record<string, unknown> } };

  if (data.code !== 0) return null;
  return data.data?.record ?? null;
}

/** 更新记录 */
export async function updateRecord(
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const data = (await feishuRequest(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      body: JSON.stringify({ fields }),
    }
  )) as { code: number; data: { record: Record<string, unknown> } };

  if (data.code !== 0) return null;
  return data.data?.record ?? null;
}

/** 批量更新记录（同一份 patch 应用到多个 record_id） */
export async function batchUpdateRecords(
  tableId: string,
  recordIdList: string[],
  patch: Record<string, unknown>
): Promise<boolean> {
  if (recordIdList.length === 0) return true;
  const data = (await feishuRequest(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records/batch_update`,
    {
      method: "POST",
      body: JSON.stringify({ record_id_list: recordIdList, records: recordIdList.map(() => ({ fields: patch })) }),
    }
  )) as { code: number };

  return data.code === 0;
}

/** 删除记录 */
export async function deleteRecord(tableId: string, recordId: string): Promise<boolean> {
  const data = (await feishuRequest(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN()}/tables/${tableId}/records/${recordId}`,
    { method: "DELETE" }
  )) as { code: number };

  return data.code === 0;
}

/** 查找满足条件的首条记录（通过 search API） */
export async function findRecord(
  tableId: string,
  filterFormula: string
): Promise<{ recordId: string; fields: Record<string, unknown> } | null> {
  // 将旧版 formula 字符串转换为 search filter
  const match = filterFormula.match(/CurrentValue\.\[([^\]]+)\]="([^"]+)"/);
  let records: Record<string, unknown>[];

  if (match) {
    const [, fieldName, value] = match;
    records = await searchRecords(tableId, {
      conjunction: "and",
      conditions: [{ field_name: fieldName, operator: "is", value: [value] }],
    });
  } else {
    records = await searchRecords(tableId);
  }

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

  const records = await searchRecords(tableId);
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
