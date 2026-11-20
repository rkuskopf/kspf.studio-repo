import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  outputFileTracingRoot: fileURLToPath(new URL("..", import.meta.url)),
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: false },
      { source: "/index.html", destination: "/", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://app.storyblok.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
