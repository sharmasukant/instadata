import { Router, type Request } from "express";
import axios from "axios";
import { MetaStore } from "../utils/meta-store.js";
import {
  generateId,
  readAccounts,
  writeAccounts,
} from "../storage/json-store.js";
import type { StoredAccount } from "../types/analytics.types.js";

const router = Router();

const CALLBACK_PATH = "/api/auth/facebook/callback";
const PAGE_FIELDS = [
  "id",
  "name",
  "username",
  "about",
  "fan_count",
  "followers_count",
  "picture.type(large)",
  "verification_status",
  "access_token",
  "tasks",
  "instagram_business_account{id,username,name,profile_picture_url}",
  "connected_instagram_account{id,username}",
].join(",");

function sanitizePageForLog(page: any) {
  if (!page) return page;
  const { access_token, ...safePage } = page;
  return {
    ...safePage,
    hasAccessToken: !!access_token,
  };
}

function getInstagramAccount(page: any) {
  return (
    page?.instagram_business_account ||
    page?.connected_instagram_account ||
    null
  );
}

function getRedirectUri(req: Request) {
  if (process.env.META_REDIRECT_URI) {
    return process.env.META_REDIRECT_URI;
  }

  if (process.env.PUBLIC_BACKEND_URL) {
    return `${process.env.PUBLIC_BACKEND_URL.replace(/\/$/, "")}${CALLBACK_PATH}`;
  }

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");

  return `${protocol}://${host}${CALLBACK_PATH}`;
}

function getMetaErrorDetails(error: any) {
  const metaError = error.response?.data?.error;
  return {
    message: metaError?.message || error.message || "Unknown Meta OAuth error",
    type: metaError?.type,
    code: metaError?.code,
    subcode: metaError?.error_subcode,
    traceId: metaError?.fbtrace_id,
    status: error.response?.status,
  };
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/$/,
    "",
  );
}

function maskToken(token: string | null) {
  if (!token) return null;
  if (token.length <= 12) return `${token.slice(0, 4)}...`;
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

async function fetchMetaPages(userAccessToken: string) {
  const pagesRes = await axios.get(
    "https://graph.facebook.com/v19.0/me/accounts",
    {
      params: {
        access_token: userAccessToken,
        fields: PAGE_FIELDS,
      },
    },
  );

  const pages = pagesRes.data.data || [];
  console.log("[meta-auth] me/accounts raw response", {
    pageCount: pages.length,
    pages: pages.map(sanitizePageForLog),
  });

  return Promise.all(
    pages.map(async (page: any) => {
      try {
        const pageRes = await axios.get(
          `https://graph.facebook.com/v19.0/${page.id}`,
          {
            params: {
              access_token: page.access_token || userAccessToken,
              fields: PAGE_FIELDS,
            },
          },
        );
        console.log(
          "[meta-auth] page detail raw response",
          sanitizePageForLog(pageRes.data),
        );
        return { ...page, ...pageRes.data };
      } catch (error: any) {
        console.warn("[meta-auth] page detail fetch failed", {
          pageId: page.id,
          error: error.response?.data || error.message,
        });
        return page;
      }
    }),
  );
}

async function saveMetaPages(
  userAccessToken: string,
  pages: any[],
  overrides: {
    facebookPageId?: string | null;
    instagramAccountId?: string | null;
    pageAccessToken?: string | null;
  } = {},
) {
  const pageWithIg = pages.find((page: any) => getInstagramAccount(page));
  const selectedPage =
    pages.find((page: any) => page.id === overrides.facebookPageId) ||
    pageWithIg ||
    pages[0] ||
    null;
  const instagramAccount =
    getInstagramAccount(selectedPage) || getInstagramAccount(pageWithIg);
  const facebookPageId = overrides.facebookPageId || selectedPage?.id || null;
  const instagramAccountId =
    overrides.instagramAccountId || instagramAccount?.id || null;
  const pageAccessToken =
    overrides.pageAccessToken || selectedPage?.access_token || null;

  console.log("[meta-auth] connected pages resolved", {
    pageCount: pages.length,
    hasInstagramAccount: !!instagramAccountId,
    selectedPageId: facebookPageId,
    selectedInstagramAccountId: instagramAccountId,
    selectedInstagramUsername: instagramAccount?.username || null,
    usedManualFacebookPageId: !!overrides.facebookPageId,
    usedManualInstagramAccountId: !!overrides.instagramAccountId,
  });

  const config = MetaStore.save({
    userAccessToken,
    pageAccessToken,
    facebookPageId,
    instagramAccountId,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  });

  console.log("[meta-auth] meta config saved", {
    hasToken: true,
    hasPageToken: !!pageAccessToken,
    facebookPageId,
    instagramAccountId,
  });

  const savedAccounts = (
    await Promise.all(
      pages.map((page) => Promise.resolve(upsertFacebookPageAccount(page))),
    )
  ).filter(Boolean);
  console.log("[meta-auth] connected facebook pages saved to accounts list", {
    savedCount: savedAccounts.length,
    usernames: savedAccounts.map((account: any) => account.username),
  });

  return config;
}

async function syncMetaConfig(
  userAccessToken: string,
  overrides: {
    facebookPageId?: string | null;
    instagramAccountId?: string | null;
    pageAccessToken?: string | null;
  } = {},
) {
  const pages = await fetchMetaPages(userAccessToken);
  return await saveMetaPages(userAccessToken, pages, overrides);
}

async function getSyncedMetaConfig() {
  let config = MetaStore.get();

  const envToken = process.env.META_USER_ACCESS_TOKEN;
  const envInstagramAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  const envFacebookPageId = process.env.META_FACEBOOK_PAGE_ID;
  const envPageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (
    envToken &&
    (envToken !== config.userAccessToken ||
      envInstagramAccountId !== config.instagramAccountId ||
      envFacebookPageId !== config.facebookPageId ||
      envPageAccessToken !== config.pageAccessToken)
  ) {
    try {
      console.log(
        "[meta-auth] syncing meta config from META_USER_ACCESS_TOKEN",
      );
      config = await syncMetaConfig(envToken, {
        facebookPageId: envFacebookPageId,
        instagramAccountId: envInstagramAccountId,
        pageAccessToken: envPageAccessToken,
      });
    } catch (error: any) {
      console.warn(
        "[meta-auth] META_USER_ACCESS_TOKEN sync failed",
        error.response?.data || error.message,
      );
    }
  }

  return config;
}

function getMetaConfigDebugResponse() {
  const config = MetaStore.get();
  const isExpired =
    !!config.expiresAt && new Date(config.expiresAt).getTime() <= Date.now();

  return {
    userAccessToken: maskToken(config.userAccessToken),
    pageAccessToken: maskToken(config.pageAccessToken),
    instagramAccountId: config.instagramAccountId,
    facebookPageId: config.facebookPageId,
    expiresAt: config.expiresAt,
    hasUserAccessToken: !!config.userAccessToken,
    hasPageAccessToken: !!config.pageAccessToken,
    isExpired,
  };
}

function upsertFacebookPageAccount(page: any): StoredAccount | null {
  if (!page?.id) return null;

  const accounts = readAccounts();
  const now = new Date().toISOString();
  const username = page.username || page.id;
  const existingIndex = accounts.findIndex(
    (account) =>
      account.platform === "facebook" && account.username === username,
  );
  const existing = existingIndex >= 0 ? accounts[existingIndex] : null;

  const account: StoredAccount = {
    id: existing?.id || generateId(),
    profileUrl: `https://www.facebook.com/${username}`,
    platform: "facebook",
    username,
    analytics: {
      platform: "facebook",
      username,
      displayName: page.name || username,
      profileImage:
        page.picture?.data?.url || existing?.analytics.profileImage || "",
      bio: page.about || existing?.analytics.bio || "",
      verified: page.verification_status === "blue_verified",
      followers:
        page.followers_count ||
        page.fan_count ||
        existing?.analytics.followers ||
        0,
      following: 0,
      posts: existing?.analytics.posts || 0,
      averageLikes: existing?.analytics.averageLikes || 0,
      averageComments: existing?.analytics.averageComments || 0,
      engagementRate: existing?.analytics.engagementRate || 0,
      monthlyViews: existing?.analytics.monthlyViews || 0,
      monthlyReach: existing?.analytics.monthlyReach || 0,
      estimatedRevenue: existing?.analytics.estimatedRevenue || {
        min: 0,
        max: 0,
      },
      country: existing?.analytics.country || "Global",
      category: existing?.analytics.category || "Page",
      lastUpdated: now,
    },
    favorite: existing?.favorite || false,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }

  writeAccounts(accounts);
  return account;
}

router.get("/facebook/login", (req, res) => {
  const APP_ID = process.env.META_APP_ID;
  const LOGIN_CONFIG_ID = process.env.META_LOGIN_CONFIG_ID;
  const redirectUri = getRedirectUri(req);
  if (!APP_ID) {
    console.error("[meta-auth] login failed: META_APP_ID is not configured");
    return res.status(500).json({ error: "META_APP_ID is not configured" });
  }
  const scopes =
    process.env.META_AUTH_SCOPES ||
    ["pages_show_list", "pages_read_engagement"].join(",");

  const authParams = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: redirectUri,
    response_type: "code",
  });

  if (LOGIN_CONFIG_ID) {
    authParams.set("config_id", LOGIN_CONFIG_ID);
    authParams.set("override_default_response_type", "true");
  } else {
    authParams.set("scope", scopes);
  }

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${authParams.toString()}`;
  console.log("[meta-auth] redirecting to facebook oauth", {
    redirectUri,
    loginMode: LOGIN_CONFIG_ID ? "facebook_login_for_business" : "scope",
    scopes: LOGIN_CONFIG_ID ? undefined : scopes,
    hasLoginConfigId: !!LOGIN_CONFIG_ID,
  });

  res.redirect(authUrl);
});

router.get("/facebook/callback", async (req, res) => {
  const APP_ID = process.env.META_APP_ID;
  const APP_SECRET = process.env.META_APP_SECRET;
  const redirectUri = getRedirectUri(req);

  const { code } = req.query;
  if (!code) {
    console.warn("[meta-auth] callback rejected: no code provided");
    return res.status(400).send("No code provided");
  }

  try {
    console.log(
      "[meta-auth] callback received code; exchanging for short-lived token",
    );
    // 1. Exchange code for short-lived access token
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v19.0/oauth/access_token",
      {
        params: {
          client_id: APP_ID,
          redirect_uri: redirectUri,
          client_secret: APP_SECRET,
          code,
        },
      },
    );

    const shortLivedToken = tokenRes.data.access_token;
    console.log("[meta-auth] received short-lived token");

    // 2. Exchange for long-lived token
    console.log("[meta-auth] exchanging for long-lived token");
    const longLivedRes = await axios.get(
      "https://graph.facebook.com/v19.0/oauth/access_token",
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: APP_ID,
          client_secret: APP_SECRET,
          fb_exchange_token: shortLivedToken,
        },
      },
    );

    const longLivedToken = longLivedRes.data.access_token;
    console.log("[meta-auth] received long-lived token");

    // 3. Get User Pages to find linked Instagram Account
    console.log("[meta-auth] fetching connected pages");
    await syncMetaConfig(longLivedToken);
    const frontendUrl = getFrontendUrl();

    res.send(`
      <html>
        <body style="font-family: system-ui, sans-serif; padding: 32px; line-height: 1.5;">
          <h2>Authentication Successful!</h2>
          <p>You can close this window and return to the dashboard.</p>
          <button onclick="window.location.href='${frontendUrl}/dashboard'" style="padding: 10px 16px; border: 0; border-radius: 6px; background: #1877f2; color: white; cursor: pointer;">
            Return to dashboard
          </button>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'META_AUTH_SUCCESS' }, '${frontendUrl}');
            }
            setTimeout(() => {
              window.close();
              if (!window.closed) {
                window.location.href = '${frontendUrl}/dashboard';
              }
            }, 800);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    const details = getMetaErrorDetails(error);
    console.error("[meta-auth] oauth failed", {
      ...details,
      redirectUri,
      stage: "callback",
    });
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui, sans-serif; padding: 32px; line-height: 1.5;">
          <h2>Authentication failed</h2>
          <p>${details.message}</p>
          <p><strong>Status:</strong> ${details.status || "unknown"}</p>
          <p><strong>Code:</strong> ${details.code || "unknown"}</p>
          <p><strong>Redirect URI used:</strong> ${redirectUri}</p>
          <p>Make sure this exact Redirect URI is added in Meta's Valid OAuth Redirect URIs.</p>
        </body>
      </html>
    `);
  }
});

router.post("/facebook/token", async (req, res) => {
  const { token, facebookPageId, instagramAccountId, pageAccessToken } =
    req.body as {
      token?: string;
      facebookPageId?: string;
      instagramAccountId?: string;
      pageAccessToken?: string;
    };
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    console.log("[meta-auth] syncing meta config from provided token");
    const config = await syncMetaConfig(token, {
      facebookPageId,
      instagramAccountId,
      pageAccessToken,
    });
    res.json({
      connected: !!config.userAccessToken,
      hasPageToken: !!config.pageAccessToken,
      hasInstagram: !!config.instagramAccountId,
      hasFacebook: !!config.facebookPageId,
      facebookPageId: config.facebookPageId,
      instagramAccountId: config.instagramAccountId,
    });
  } catch (error: any) {
    console.error(
      "[meta-auth] token sync failed",
      error.response?.data || error.message,
    );
    res.status(400).json({
      error:
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to sync Meta token",
    });
  }
});

router.get("/facebook/status", async (req, res) => {
  const config = await getSyncedMetaConfig();

  const isExpired =
    !!config.expiresAt && new Date(config.expiresAt).getTime() <= Date.now();
  const connected = !!config.userAccessToken && !isExpired;
  const hasFacebook = connected && !!config.facebookPageId;
  const hasInstagram = hasFacebook && !!config.instagramAccountId;

  console.log("[meta-auth] status requested", {
    connected,
    hasPageToken: connected && !!config.pageAccessToken,
    hasInstagram,
    hasFacebook,
    isExpired,
  });
  res.json({
    connected,
    hasInstagram,
    hasFacebook,
    isExpired,
  });
});

router.get("/facebook/config", async (req, res) => {
  await getSyncedMetaConfig();
  const config = getMetaConfigDebugResponse();

  console.log("[meta-auth] config requested", config);
  res.json(config);
});

router.get("/facebook/pages", async (req, res) => {
  const config = await getSyncedMetaConfig();

  if (!config.userAccessToken) {
    return res.status(401).json({ error: "Meta authentication is not connected." });
  }

  try {
    const pages = await fetchMetaPages(config.userAccessToken);
    const safePages = pages.map((page: any) => {
      const instagramAccount = getInstagramAccount(page);

      return {
        id: page.id,
        name: page.name,
        username: page.username || null,
        tasks: page.tasks || [],
        hasPageAccessToken: !!page.access_token,
        instagramBusinessAccount: page.instagram_business_account || null,
        connectedInstagramAccount: page.connected_instagram_account || null,
        resolvedInstagramAccountId: instagramAccount?.id || null,
        resolvedInstagramUsername: instagramAccount?.username || null,
      };
    });

    res.json({
      selectedFacebookPageId: config.facebookPageId,
      selectedInstagramAccountId: config.instagramAccountId,
      pageCount: safePages.length,
      pages: safePages,
    });
  } catch (error: any) {
    console.error("[meta-auth] pages debug fetch failed", error.response?.data || error.message);
    res.status(400).json({
      error: error.response?.data?.error?.message || error.message || "Failed to fetch Meta pages",
    });
  }
});

export default router;
