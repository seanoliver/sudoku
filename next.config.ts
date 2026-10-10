import type { NextConfig } from "next";

// `BUILD_TARGET=ios` builds a static export for the Capacitor app; the default build is the Vercel site.
const ios = process.env.BUILD_TARGET === "ios";

const config: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BUILD_TARGET: ios ? "ios" : "web" },
  ...(ios ? { output: "export" as const } : {
    async headers() {
      return [{ source: "/sw.js", headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ] }];
    },
  }),
};
export default config;
