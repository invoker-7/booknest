/**
 * ขอลิงก์ดาวน์โหลดชั่วคราวแล้วเปิดไฟล์
 * server ตรวจเลขคำสั่งซื้อ + อีเมล + สถานะชำระเงินทุกครั้ง
 * คืน true เมื่อสำเร็จ
 */
export async function openDownload(orderNo, email) {
  // เปิดแท็บไว้ก่อน await เพื่อไม่ให้ popup blocker บล็อก
  const tab = window.open("", "_blank");
  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNo, email }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || "failed");
    if (tab) {
      tab.opener = null;
      tab.location.href = data.url;
    } else {
      window.location.href = data.url;
    }
    return true;
  } catch {
    tab?.close();
    return false;
  }
}
