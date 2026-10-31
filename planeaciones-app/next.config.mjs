/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  outputFileTracingRoot: process.cwd(),
  // Mantiene el paquete y su worker disponibles en las funciones de servidor.
  serverExternalPackages: ['pdfjs-dist'],
  reactCompiler: true,
};

export default nextConfig;
