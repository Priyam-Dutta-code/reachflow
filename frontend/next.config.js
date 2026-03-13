const path = require("path");

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const connectSrc = ["'self'", apiUrl, supabaseUrl, "https://*.supabase.co", "wss://*.supabase.co"].join(" ");
const csp = [
  "default-src 'self'",
  `connect-src ${connectSrc}`,
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "script-src 'self' 'unsafe-inline' https://sdk.cashfree.com",
  "frame-src 'self' https://sdk.cashfree.com https://payments.cashfree.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
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
        ],
      },
    ];
  },
};

module.exports = nextConfig;
