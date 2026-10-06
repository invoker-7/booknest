import { requestDownloadUrl } from "@/lib/apiClient";

/**
 * ขอลิงก์ดาวน์โหลดชั่วคราวแล้วเปิดไฟล์
 * server ตรวจเลขคำสั่งซื้อ + อีเมล + สถานะชำระเงินทุกครั้ง
 * คืน true เมื่อสำเร็จ
 */
export async function openDownload(orderNo: string, email: string | undefined): Promise<boolean> {
  if (!email) return false;
  // เปิดแท็บไว้ก่อน await เพื่อไม่ให้ popup blocker บล็อก
  const tab = window.open("", "_blank");
  const url = await requestDownloadUrl(orderNo, email);
  if (!url) {
    tab?.close();
    return false;
  }
  if (tab) {
    tab.opener = null;
    tab.location.href = url;
  } else {
    window.location.href = url;
  }
  return true;
}
