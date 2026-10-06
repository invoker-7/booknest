// รูปสินค้าที่ร้านอัปโหลดอยู่ใน bucket สาธารณะของ Supabase — อนุญาตให้ next/image ย่อรูปจากที่นั่นเท่านั้น
const supabase = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL) : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabase
      ? [
          {
            protocol: supabase.protocol.replace(":", ""),
            hostname: supabase.hostname,
            port: supabase.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
