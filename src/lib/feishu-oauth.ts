/**
 * 飞书 OAuth 2.0 辅助函数
 * 处理用户授权登录流程（与 feishu.ts 的 tenant_access_token 不同）
 */

const FEISHU_BASE_URL = "https://open.feishu.cn";

const APP_ID = () => process.env.FEISHU_APP_ID ?? "";
const APP_SECRET = () => process.env.FEISHU_APP_SECRET ?? "";

/** 构造飞书授权登录 URL */
export function getFeishuAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    app_id: APP_ID(),
    redirect_uri: redirectUri,
    state,
  });
  return `${FEISHU_BASE_URL}/open-apis/authen/v1/authorize?${params.toString()}`;
}

/** 获取 app_access_token（用于 OAuth 鉴权） */
async function getAppAccessToken(): Promise<string> {
  const res = await fetch(
    `${FEISHU_BASE_URL}/open-apis/auth/v3/app_access_token/internal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: APP_ID(),
        app_secret: APP_SECRET(),
      }),
    }
  );

  const data = (await res.json()) as {
    code: number;
    msg?: string;
    app_access_token?: string;
  };

  if (data.code !== 0 || !data.app_access_token) {
    throw new Error(`获取 app_access_token 失败: code=${data.code}, msg=${data.msg ?? "unknown"}`);
  }

  return data.app_access_token;
}

/** code 换 user_access_token */
export async function exchangeCodeForUserToken(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expires: number;
}> {
  const appToken = await getAppAccessToken();

  const res = await fetch(
    `${FEISHU_BASE_URL}/open-apis/authen/v1/oidc/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appToken}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
      }),
    }
  );

  const raw = await res.json();

  const data = raw as {
    code: number;
    msg?: string;
    data?: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  };

  if (data.code !== 0 || !data.data) {
    throw new Error(`飞书 OAuth token 交换失败: code=${data.code}, msg=${data.msg ?? "unknown"}, raw=${JSON.stringify(raw)}`);
  }

  return {
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    expires: data.data.expires_in,
  };
}

/** 获取飞书用户信息 */
export async function getFeishuUserInfo(userAccessToken: string): Promise<{
  openId: string;
  name: string;
  avatarUrl: string;
  email: string;
  mobile: string;
}> {
  const res = await fetch(`${FEISHU_BASE_URL}/open-apis/authen/v1/user_info`, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });

  const data = (await res.json()) as {
    code: number;
    msg?: string;
    data?: {
      open_id: string;
      name: string;
      avatar_url: string;
      email: string;
      mobile: string;
    };
  };

  if (data.code !== 0 || !data.data) {
    throw new Error(`飞书用户信息获取失败: code=${data.code}, msg=${data.msg ?? "unknown"}`);
  }

  return {
    openId: data.data.open_id,
    name: data.data.name,
    avatarUrl: data.data.avatar_url,
    email: data.data.email,
    mobile: data.data.mobile,
  };
}
