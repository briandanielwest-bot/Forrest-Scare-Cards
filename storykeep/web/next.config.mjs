/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Illustrations are served straight from the render provider's CDN rather
    // than copied into our own storage. Add a host here when the provider changes.
    remotePatterns: [{ protocol: "https", hostname: "**.replicate.delivery" }],
  },
};
export default nextConfig;
