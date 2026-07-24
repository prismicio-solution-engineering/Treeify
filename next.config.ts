import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The visualization tool reads a generated artifact (artifacts/repoTree.json)
  // and the Content API at runtime — no image domains or rewrites are needed.
};

export default nextConfig;
