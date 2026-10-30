import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  allowedDevOrigins: ["192.168.1.9", "localhost"],
  async redirects() {
    return [
      {
        source: "/student/fee",
        destination: "/student/fees",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
