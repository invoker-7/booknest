import PromptPayView from "@/components/views/PromptPayView";

export const metadata = { title: "PromptPay", robots: { index: false } };

// หน้า static: เลขคำสั่งซื้อ (?orders=...) ถูกอ่านที่เบราว์เซอร์ แล้วขอ QR และสถานะจาก API
export default function PayQrPage() {
  return <PromptPayView />;
}
