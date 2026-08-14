/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mantiene el paquete y su worker disponibles en las funciones de servidor.
  serverExternalPackages: ['pdfjs-dist'],
  reactCompiler: true,
};

export default nextConfig;
