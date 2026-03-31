import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Distributed Rate Limiting (Upstash Redis) ──
// Shared across all serverless instances. Survives deploys.
// Falls back to in-memory if Redis is unavailable.

const redisConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = redisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// One limiter per route tier — sliding window, 1 minute
const limiters = redis
  ? {
      chat: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(15, "60 s"), prefix: "rl:chat" }),
      checkout: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "60 s"), prefix: "rl:checkout" }),
      referral: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "60 s"), prefix: "rl:referral" }),
      byok: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "60 s"), prefix: "rl:byok" }),
      authed: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(200, "60 s"), prefix: "rl:authed" }),
      api: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "60 s"), prefix: "rl:api" }),
    }
  : null;

function getLimiter(path) {
  if (path === "/api/chat") return limiters?.chat;
  if (path === "/api/stripe/checkout") return limiters?.checkout;
  if (path === "/api/referrals/claim") return limiters?.referral;
  if (path.startsWith("/api/byok")) return limiters?.byok;
  if (path.startsWith("/api/")) return limiters?.api;
  return null;
}

// ── In-memory fallback (used when Redis is not configured) ──
const rateLimitMap = new Map();
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function getFallbackLimit(path) {
  if (path === "/api/chat") return { window: 60_000, max: 15 };
  if (path === "/api/stripe/checkout") return { window: 60_000, max: 5 };
  if (path === "/api/referrals/claim") return { window: 60_000, max: 3 };
  if (path.startsWith("/api/byok")) return { window: 60_000, max: 5 };
  if (path.startsWith("/api/")) return { window: 60_000, max: 60 };
  return null;
}

function checkFallbackLimit(key, limit) {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    for (const [k, v] of rateLimitMap) {
      if (now - v.windowStart > limit.window * 2) rateLimitMap.delete(k);
    }
  }
  let entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > limit.window) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(key, entry);
  }
  entry.count++;
  return entry.count <= limit.max;
}

// ── Security Headers ──
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://sdk.scdn.co https://www.youtube.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://*.scdn.co https://*.googleusercontent.com https://*.supabase.co https://img.youtube.com https://i.ytimg.com https://is1-ssl.mzstatic.com https://coverartarchive.org data:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://www.googleapis.com https://itunes.apple.com https://musicbrainz.org https://coverartarchive.org https://is1-ssl.mzstatic.com https://i.ytimg.com https://img.youtube.com https://api.spotify.com wss://dealer.spotify.com https://status.claude.com",
  "frame-src 'self' https://www.youtube.com https://sdk.scdn.co",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
  "Content-Security-Policy": CSP,
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Rate limiting (API routes only)
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    // Authenticated users get a higher ceiling keyed by token hash (not IP)
    const authHeader = request.headers.get("authorization");
    const isAuthed = authHeader?.startsWith("Bearer ") && authHeader.length > 20;
    const rateLimitKey = isAuthed ? `u:${authHeader.slice(-16)}` : ip;

    let blocked = false;

    // Try Redis first, fall back to in-memory
    const limiter = isAuthed ? limiters?.authed : getLimiter(pathname);
    if (limiter) {
      try {
        const { success } = await limiter.limit(rateLimitKey);
        blocked = !success;
      } catch {
        // Redis failed — fall back to in-memory
        const fallback = isAuthed ? { window: 60_000, max: 200 } : getFallbackLimit(pathname);
        if (fallback) blocked = !checkFallbackLimit(`${rateLimitKey}:${pathname}`, fallback);
      }
    } else {
      // No Redis configured — use in-memory
      const fallback = isAuthed ? { window: 60_000, max: 200 } : getFallbackLimit(pathname);
      if (fallback) blocked = !checkFallbackLimit(`${rateLimitKey}:${pathname}`, fallback);
    }

    if (blocked) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60", ...SECURITY_HEADERS } }
      );
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all API routes and pages, skip static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)).*)",
  ],
};
