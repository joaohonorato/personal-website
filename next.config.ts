import type { NextConfig } from "next";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
