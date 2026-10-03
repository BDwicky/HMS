import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/booking/search.html",
        destination: "/booking/search",
      },
    ];
  },
};

export default nextConfig;
