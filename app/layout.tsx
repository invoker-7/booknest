import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import { StoreProvider } from "@/components/StoreProvider";
import { AuthProvider } from "@/components/AuthProvider";
import Shell from "@/components/Shell";
import { hasArticles } from "@/lib/articles";

// ฟอนต์ถูกดาวน์โหลดตอน build และเสิร์ฟจากโดเมนเดียวกัน (ไม่มี request ไป Google ตอนใช้งาน)
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  // ไม่มี 700: ตัวหนาสุดที่ใช้คือ 600 — ลดไฟล์ฟอนต์ที่ต้องโหลดล่วงหน้าทุกหน้า
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});
const thai = IBM_Plex_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600"],
  variable: "--font-thai",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
  // ใช้กับป้ายเล็ก ๆ เท่านั้น ไม่ต้องแย่งคิวโหลดกับฟอนต์เนื้อหา
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "VECTOR — Digital resources for people who build.",
    template: "%s · VECTOR",
  },
  description:
    "Templates, systems and tools engineered for real work. Notion systems, UI kits, developer tools and technical guides.",
  applicationName: "VECTOR",
  appleWebApp: { capable: true, title: "VECTOR", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F4F3EF",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // เมนู "คลังบทความ" แสดงเมื่อมีบทความที่เผยแพร่แล้ว
  const hasArchive = await hasArticles();
  return (
    <html lang="th" className={`${sans.variable} ${thai.variable} ${mono.variable}`}>
      <body>
        <LangProvider>
          <StoreProvider>
            <AuthProvider>
              <Shell hasArchive={hasArchive}>{children}</Shell>
            </AuthProvider>
          </StoreProvider>
        </LangProvider>
      </body>
    </html>
  );
}
