import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served from the same Vercel domain as the frontend, under /admin
  basePath: "/admin",
};

export default nextConfig;
