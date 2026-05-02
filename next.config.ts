import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/skills/*.md 파일을 Vercel deployment에 포함 (fs.readFileSync 작동 보장)
  outputFileTracingIncludes: {
    "/api/sori/**/*": ["./lib/skills/**/*"],
  },
};

export default nextConfig;
