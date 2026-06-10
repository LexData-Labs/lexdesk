/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dev-only: lets devices on the LAN (e.g. a phone) load the dev server's
  // /_next resources. Production builds ignore this.
  allowedDevOrigins: ['192.168.140.62'],
  async headers() {
    return [
      {
        // The face model (23 MB) + wasm runtimes must hit the browser HTTP
        // cache on repeat visits (Next serves public/ uncached by default).
        // If a model file is ever swapped, rename it — the URL is immutable.
        source: '/models/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
