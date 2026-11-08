
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.4"],

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${
          process.env.BACKEND_URL || "http://backend:8080"
        }/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
