import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Desarrollo y producción no deben compartir chunks: cuando ambos
  // procesos apuntan a `.next`, una compilación en caliente puede dejar al
  // servidor cargando un runtime que referencia archivos ya reemplazados.
  distDir: process.env.NEXT_DIST_DIR ?? (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
};

export default nextConfig;
