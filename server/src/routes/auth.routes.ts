import { Router, type Request } from "express";
import axios from "axios";
import { MetaStore } from "../utils/meta-store.js";
import { findUserBySessionToken } from "../storage/user-store.js";

const router = Router();

const CALLBACK_PATH = "/api/auth/facebook/callback";
const INSTAGRAM_CALLBACK_PATH = "/api/auth/instagram/callback";
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
  return getCallbackUri(req, CALLBACK_PATH);
}

function getInstagramRedirectUri(req: Request) {
  if (process.env.INSTAGRAM_REDIRECT_URI)
    return process.env.INSTAGRAM_REDIRECT_URI;
  return getCallbackUri(req, INSTAGRAM_CALLBACK_PATH);
}

function getCallbackUri(req: Request, callbackPath: string) {
  if (process.env.META_REDIRECT_URI) {
    if (callbackPath === CALLBACK_PATH) return process.env.META_REDIRECT_URI;
  }

  if (process.env.PUBLIC_BACKEND_URL) {
    return `${process.env.PUBLIC_BACKEND_URL.replace(/\/$/, "")}${callbackPath}`;
  }

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");

  return `${protocol}://${host}${callbackPath}`;
}

function getInstagramAppCredentials() {
  return {
    appId:
      process.env.INSTAGRAM_APP_ID ||
      process.env.META_INSTAGRAM_APP_ID ||
      process.env.META_APP_ID,
    appSecret:
      process.env.INSTAGRAM_APP_SECRET ||
      process.env.META_INSTAGRAM_APP_SECRET ||
      process.env.META_APP_SECRET,
  };
}

function getInstagramScopes() {
  return (
    process.env.INSTAGRAM_AUTH_SCOPES ||
    ["instagram_business_basic", "instagram_business_manage_insights"].join(",")
  );
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

function getBearerTokenFromReq(req: Request) {
  const header = req.get("authorization") || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return req.get("x-session-token") || undefined;
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
  userId?: string | undefined,
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

  const saveObj = {
    userAccessToken,
    pageAccessToken,
    facebookPageId,
    instagramAccountId,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  } as any;

  let config;
  if (userId) {
    config = MetaStore.saveForUser(userId, saveObj);
  } else {
    config = MetaStore.save(saveObj);
  }

  console.log("[meta-auth] meta config saved", {
    hasToken: true,
    hasPageToken: !!pageAccessToken,
    facebookPageId,
    instagramAccountId,
  });

  console.log("[meta-auth] connected pages stored for auth only", {
    accountWriteSkipped: true,
    reason:
      "Accounts are only written when the user explicitly adds a profile URL.",
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
  userId?: string | undefined,
) {
  const pages = await fetchMetaPages(userAccessToken);
  return await saveMetaPages(userAccessToken, pages, overrides, userId);
}

async function getSyncedMetaConfig(userId?: string | undefined) {
  if (userId) {
    return MetaStore.getForUser(userId);
  }

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

  const shouldRefreshFromSavedToken =
    !!config.userAccessToken &&
    (!config.facebookPageId ||
      !config.pageAccessToken ||
      !config.instagramAccountId);

  if (shouldRefreshFromSavedToken) {
    const savedUserAccessToken = config.userAccessToken;
    if (!savedUserAccessToken) return config;

    try {
      console.log(
        "[meta-auth] refreshing saved Meta config from current token",
        {
          hasFacebookPageId: !!config.facebookPageId,
          hasPageAccessToken: !!config.pageAccessToken,
          hasInstagramAccountId: !!config.instagramAccountId,
        },
      );
      config = await syncMetaConfig(savedUserAccessToken, {
        facebookPageId: config.facebookPageId,
        instagramAccountId: config.instagramAccountId,
        pageAccessToken: config.pageAccessToken,
      });
    } catch (error: any) {
      console.warn(
        "[meta-auth] saved Meta config refresh failed",
        error.response?.data || error.message,
      );
    }
  }

  return config;
}

function getMetaConfigDebugResponse(config = MetaStore.get()) {
  const isExpired =
    !!config.expiresAt && new Date(config.expiresAt).getTime() <= Date.now();
  const isInstagramExpired =
    !!config.instagramTokenExpiresAt &&
    new Date(config.instagramTokenExpiresAt).getTime() <= Date.now();

  return {
    userAccessToken: maskToken(config.userAccessToken),
    pageAccessToken: maskToken(config.pageAccessToken),
    instagramAccessToken: maskToken(config.instagramAccessToken),
    instagramAccountId: config.instagramAccountId,
    instagramUserId: config.instagramUserId,
    instagramUsername: config.instagramUsername,
    facebookPageId: config.facebookPageId,
    expiresAt: config.expiresAt,
    instagramTokenExpiresAt: config.instagramTokenExpiresAt,
    hasUserAccessToken: !!config.userAccessToken,
    hasPageAccessToken: !!config.pageAccessToken,
    hasInstagramAccessToken: !!config.instagramAccessToken,
    isExpired,
    isInstagramExpired,
  };
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

  // include our session token in state so callback can associate the Meta config with the user
  const token = getBearerTokenFromReq(req);
  if (token) authParams.set("state", token);

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

router.get("/instagram/login", (req, res) => {
  const { appId } = getInstagramAppCredentials();
  const redirectUri = getInstagramRedirectUri(req);

  if (!appId) {
    console.error(
      "[instagram-auth] login failed: Instagram app id is not configured",
    );
    return res
      .status(500)
      .json({ error: "INSTAGRAM_APP_ID is not configured" });
  }

  const authParams = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: getInstagramScopes(),
    enable_fb_login: "0",
    force_authentication: "1",
  });
  const token = getBearerTokenFromReq(req);
  if (token) authParams.set("state", token);

  const authUrl = `https://www.instagram.com/oauth/authorize?${authParams.toString()}`;
  console.log("[instagram-auth] redirecting to instagram oauth", {
    redirectUri,
    scopes: getInstagramScopes(),
  });

  res.redirect(authUrl);
});

router.get("/instagram/callback", async (req, res) => {
  const { appId, appSecret } = getInstagramAppCredentials();
  const redirectUri = getInstagramRedirectUri(req);
  const frontendUrl = getFrontendUrl();
  const { code } = req.query;

  if (!appId || !appSecret)
    return res.status(500).send("Instagram app credentials are not configured");
  if (!code || typeof code !== "string") {
    console.warn("[instagram-auth] callback rejected: no code provided");
    return res.status(400).send("No code provided");
  }

  try {
    console.log("[instagram-auth] exchanging code for short-lived token");
    const form = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const shortLivedRes = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      form.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const shortLivedToken = shortLivedRes.data.access_token;
    const instagramUserId = String(shortLivedRes.data.user_id || "");

    console.log("[instagram-auth] exchanging for long-lived token", {
      hasShortLivedToken: !!shortLivedToken,
      instagramUserId,
    });
    const longLivedRes = await axios.get(
      "https://graph.instagram.com/access_token",
      {
        params: {
          grant_type: "ig_exchange_token",
          client_secret: appSecret,
          access_token: shortLivedToken,
        },
      },
    );

    const instagramAccessToken =
      longLivedRes.data.access_token || shortLivedToken;
    const expiresInSeconds = Number(
      longLivedRes.data.expires_in || 60 * 24 * 60 * 60,
    );

    const profileRes = await axios.get(
      `https://graph.instagram.com/v23.0/${instagramUserId}`,
      {
        params: {
          fields: "id,username,name,profile_picture_url",
          access_token: instagramAccessToken,
        },
      },
    );

    const instagramUsername = profileRes.data.username || null;

    const state =
      typeof req.query.state === "string" ? req.query.state : undefined;
    const user = state ? findUserBySessionToken(state) : undefined;

    if (user) {
      MetaStore.saveForUser(user.id, {
        instagramAccessToken,
        instagramUserId,
        instagramAccountId: instagramUserId,
        instagramUsername,
        instagramTokenExpiresAt: new Date(
          Date.now() + expiresInSeconds * 1000,
        ).toISOString(),
      } as any);
      console.log("[instagram-auth] instagram config saved for user", {
        userId: user.id,
        instagramUserId,
        instagramUsername,
        expiresInSeconds,
      });
    } else {
      MetaStore.save({
        instagramAccessToken,
        instagramUserId,
        instagramAccountId: instagramUserId,
        instagramUsername,
        instagramTokenExpiresAt: new Date(
          Date.now() + expiresInSeconds * 1000,
        ).toISOString(),
      });
      console.log("[instagram-auth] instagram config saved (global)", {
        instagramUserId,
        instagramUsername,
        expiresInSeconds,
      });
    }

    res.send(`
      <html>
        <body style="font-family: system-ui, sans-serif; padding: 32px; line-height: 1.5;">
          <h2>Instagram Authentication Successful!</h2>
          <p>You can close this window and return to the dashboard.</p>
          <button onclick="window.location.href='${frontendUrl}/dashboard'" style="padding: 10px 16px; border: 0; border-radius: 6px; background: #e1306c; color: white; cursor: pointer;">Return to dashboard</button>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'META_AUTH_SUCCESS' }, '${frontendUrl}');
            }
            setTimeout(() => { window.close(); if (!window.closed) { window.location.href = '${frontendUrl}/dashboard'; } }, 800);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    const details = getMetaErrorDetails(error);
    console.error("[instagram-auth] oauth failed", {
      ...details,
      redirectUri,
      stage: "callback",
      raw: error.response?.data || error.message,
    });
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui, sans-serif; padding: 32px; line-height: 1.5;">
          <h2>Instagram authentication failed</h2>
          <p>${details.message}</p>
          <p><strong>Status:</strong> ${details.status || "unknown"}</p>
          <p><strong>Code:</strong> ${details.code || "unknown"}</p>
          <p><strong>Redirect URI used:</strong> ${redirectUri}</p>
          <p>Make sure this exact Redirect URI is configured in Instagram API with Instagram Login.</p>
        </body>
      </html>
    `);
  }
});

router.get("/facebook/callback", async (req, res) => {
  const APP_ID = process.env.META_APP_ID;
  const APP_SECRET = process.env.META_APP_SECRET;
  const redirectUri = getRedirectUri(req);

  const { code } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
    console.log(
      "[meta-auth] callback received code; exchanging for short-lived token",
    );
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

    // associate with user if state provided
    const state =
      typeof req.query.state === "string" ? req.query.state : undefined;
    const user = state ? findUserBySessionToken(state) : undefined;

    console.log("[meta-auth] fetching connected pages");
    await syncMetaConfig(longLivedToken, {}, user?.id);
    const frontendUrl = getFrontendUrl();

    res.send(`
      <html>
        <body style="font-family: system-ui, sans-serif; padding: 32px; line-height: 1.5;">
          <h2>Authentication Successful!</h2>
          <p>You can close this window and return to the dashboard.</p>
          <button onclick="window.location.href='${frontendUrl}/dashboard'" style="padding: 10px 16px; border: 0; border-radius: 6px; background: #1877f2; color: white; cursor: pointer;">Return to dashboard</button>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'META_AUTH_SUCCESS' }, '${frontendUrl}');
            }
            setTimeout(() => { window.close(); if (!window.closed) { window.location.href = '${frontendUrl}/dashboard'; } }, 800);
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
  const {
    token,
    facebookPageId,
    instagramAccountId,
    pageAccessToken,
    sessionToken,
  } = req.body as {
    token?: string;
    facebookPageId?: string;
    instagramAccountId?: string;
    pageAccessToken?: string;
    sessionToken?: string;
  };
  if (!token || typeof token !== "string")
    return res.status(400).json({ error: "Token is required" });

  try {
    console.log("[meta-auth] syncing meta config from provided token");
    const user = sessionToken
      ? findUserBySessionToken(sessionToken)
      : undefined;
    const config = await syncMetaConfig(
      token,
      { facebookPageId, instagramAccountId, pageAccessToken },
      user?.id,
    );
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
    res
      .status(400)
      .json({
        error:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to sync Meta token",
      });
  }
});

router.get("/facebook/status", async (req, res) => {
  const token = getBearerTokenFromReq(req);
  const user = token ? findUserBySessionToken(token) : undefined;
  const config = await getSyncedMetaConfig(user?.id);

  const isExpired =
    !!config.expiresAt && new Date(config.expiresAt).getTime() <= Date.now();
  const isInstagramExpired =
    !!config.instagramTokenExpiresAt &&
    new Date(config.instagramTokenExpiresAt).getTime() <= Date.now();
  const connected =
    (!!config.userAccessToken && !isExpired) ||
    (!!config.instagramAccessToken && !isInstagramExpired);
  const hasFacebook = connected && !!config.facebookPageId;
  const hasInstagram =
    (!!config.instagramAccessToken &&
      !!config.instagramUserId &&
      !isInstagramExpired) ||
    (!!config.userAccessToken &&
      !!config.facebookPageId &&
      !!config.instagramAccountId &&
      !isExpired);

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
    isInstagramExpired,
    instagramUsername: config.instagramUsername,
  });
});

router.get("/facebook/config", async (req, res) => {
  const token = getBearerTokenFromReq(req);
  const user = token ? findUserBySessionToken(token) : undefined;
  const syncedConfig = await getSyncedMetaConfig(user?.id);
  const config = getMetaConfigDebugResponse(syncedConfig);

  console.log("[meta-auth] config requested", config);
  res.json(config);
});

async function handleFacebookResync(
  req: Request,
  res: Parameters<Parameters<typeof router.get>[1]>[1],
) {
  const token = getBearerTokenFromReq(req);
  const user = token ? findUserBySessionToken(token) : undefined;

  const config = user ? MetaStore.getForUser(user.id) : MetaStore.get();

  if (!config.userAccessToken) {
    return res
      .status(401)
      .json({ error: "Meta authentication is not connected." });
  }

  try {
    const syncedConfig = await syncMetaConfig(
      config.userAccessToken,
      {},
      user?.id,
    );
    const response = getMetaConfigDebugResponse(syncedConfig);
    console.log("[meta-auth] manual resync completed", response);
    res.json(response);
  } catch (error: any) {
    console.error(
      "[meta-auth] manual resync failed",
      error.response?.data || error.message,
    );
    res
      .status(400)
      .json({
        error:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to resync Meta config",
      });
  }
}

router.get("/facebook/resync", async (req, res) => {
  await handleFacebookResync(req, res as any);
});

router.post("/facebook/resync", async (req, res) => {
  await handleFacebookResync(req, res as any);
});

router.get("/facebook/pages", async (req, res) => {
  const token = getBearerTokenFromReq(req);
  const user = token ? findUserBySessionToken(token) : undefined;
  const config = await getSyncedMetaConfig(user?.id);

  if (!config.userAccessToken)
    return res
      .status(401)
      .json({ error: "Meta authentication is not connected." });

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
    console.error(
      "[meta-auth] pages debug fetch failed",
      error.response?.data || error.message,
    );
    res
      .status(400)
      .json({
        error:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch Meta pages",
      });
  }
});

export default router;
