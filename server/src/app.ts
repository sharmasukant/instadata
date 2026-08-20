import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import axios from "axios";
import accountsRoutes from "./routes/accounts.routes.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();

app.set("trust proxy", true);
app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://instadataapp.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean) as string[];
const localDevOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        localDevOriginPattern.test(origin)
      ) {
        return callback(null, true);
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use((req, res, next) => {
  const startedAt = Date.now();
  console.log(`[api] -> ${req.method} ${req.originalUrl}`, {
    origin: req.get("origin") || "none",
    queryKeys: Object.keys(req.query),
  });

  res.on("finish", () => {
    console.log(
      `[api] <- ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`,
    );
  });

  next();
});
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "instadata-api" });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/image-proxy", async (req, res) => {
  const imageUrl = typeof req.query.url === "string" ? req.query.url : "";

  const sendFallbackImage = () => {
    const fallbackSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
        <rect width="96" height="96" rx="48" fill="#1f2937"/>
        <circle cx="48" cy="36" r="16" fill="#9ca3af"/>
        <path d="M20 84c4-18 16-28 28-28s24 10 28 28" fill="#9ca3af"/>
      </svg>
    `.trim();

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(fallbackSvg);
  };

  try {
    const parsedUrl = new URL(imageUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return sendFallbackImage();
    }

    console.log("[image-proxy] fetching image", { host: parsedUrl.host });
    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
    });

    const contentType = response.headers["content-type"];
    if (typeof contentType === "string" && !contentType.startsWith("image/")) {
      console.warn("[image-proxy] upstream did not return image content", {
        url: imageUrl,
        contentType,
      });
      return sendFallbackImage();
    }

    res.setHeader(
      "Content-Type",
      typeof contentType === "string" ? contentType : "image/jpeg",
    );
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.warn("[image-proxy] failed; returning fallback image", {
      url: imageUrl || "missing",
      message:
        error instanceof Error ? error.message : "Unknown image proxy error",
    });
    sendFallbackImage();
  }
});

// API routes
app.use("/api", accountsRoutes);
app.use("/api/auth", authRouter);
app.use("/api/auth", userRouter);

// Error handler
app.use(errorHandler);

export default app;
