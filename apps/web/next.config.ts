import path from "node:path";

import type { NextConfig } from "next";

// Umami host (analytics beacon + script) — allowed in CSP only when configured.
const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC || "https://cloud.umami.is/script.js";
let umamiOrigin = "";
try {
  umamiOrigin = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ? new URL(umamiSrc).origin : "";
} catch {
  umamiOrigin = "";
}

// Next's App Router relies on inline bootstrap scripts; without per-request
// nonces 'unsafe-inline' is required for script-src. style-src needs it too
// (Tailwind/next inject inline styles). Cashfree SDK loads + framed at checkout.
// Dev needs 'unsafe-eval' (webpack eval-source-map / HMR); production never
// evals, so it stays out of the shipped policy.
const devEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval} https://sdk.cashfree.com${umamiOrigin ? ` ${umamiOrigin}` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self'${umamiOrigin ? ` ${umamiOrigin}` : ""}`,
  "frame-src 'self' https://sdk.cashfree.com https://payments.cashfree.com https://payments-test.cashfree.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
