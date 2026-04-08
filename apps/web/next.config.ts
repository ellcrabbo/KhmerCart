import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@khmercart/core", "@khmercart/db", "@khmercart/ui"]
};

export default nextConfig;
