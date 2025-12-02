/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  
  // Experimental features for better ESM support
  experimental: {
    esmExternals: 'loose'
  },
  
  // Webpack configuration for Agora SDK
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        events: false,
      };
    }
    return config;
  },
  
  // Transpile Agora packages
  transpilePackages: ['agora-rtc-sdk-ng', 'agora-rtc-react'],
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Rewrite Better Auth API routes to backend
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/:path*`,
      },
    ];
  },
  
  // Headers for WebSocket and WebRTC support
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, display-capture=*',
          },
          // Only set COEP in production - it blocks Agora telemetry in development
          ...(isDev ? [] : [{
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          }]),
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // Content Security Policy to allow Agora SDK telemetry
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "connect-src 'self' https: wss: ws: *.agora.io *.sd-rtn.com statscollector-1.agora.io",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              "style-src 'self' 'unsafe-inline'",
              "media-src 'self' blob: data: *.agora.io",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

export default nextConfig
