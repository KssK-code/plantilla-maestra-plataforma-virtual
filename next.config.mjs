/** @type {import('next').NextConfig} */
const nextConfig = {
  // Las validaciones corren en el build a propósito: un cliente que deriva de
  // esta plantilla debe enterarse de los errores al desplegar, no en producción.
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ['framer-motion', 'motion'],
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
};

export default nextConfig;
