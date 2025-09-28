/** @type {import('next').NextConfig} */
const nextConfig = {
  strictMode: false,
  experimental: {
    outputFileTracingExcludes: {
      "*": ["./lambda/**"],
    },
  },
};

module.exports = nextConfig;
