import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import Shell from "@/components/Shell";

export const metadata = {
  title: "Digital Finder — Digital tools, better work.",
  description:
    "ร้านสินค้าดิจิทัลสาธิต: เลือกสินค้า สั่งซื้อ จำลองการชำระเงิน และรับลิงก์ดาวน์โหลดทางอีเมล (DEMO ONLY)",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#E4703B",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LangProvider>
          <Shell>{children}</Shell>
        </LangProvider>
      </body>
    </html>
  );
}
