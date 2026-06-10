/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dev-only: lets devices on the LAN (e.g. a phone) load the dev server's
  // /_next resources. Production builds ignore this.
  allowedDevOrigins: ['192.168.140.62'],
};

export default nextConfig;
