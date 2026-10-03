import { redirect } from "next/navigation";

// "คำสั่งซื้อในเครื่องนี้" ย้ายไปรวมอยู่ในคลังของฉัน
export default function OrdersPage() {
  redirect("/library");
}
