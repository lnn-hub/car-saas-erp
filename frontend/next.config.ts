import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Холбоос бүрийг тусад нь урьдчилан ачаалах (partial prefetch) шаардлагагүй. Энэ нь dev горимд
  // root layout-ын metadata дээр "URL data in generateMetadata()" гэх анхааруулга гаргадаг байсан.
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
