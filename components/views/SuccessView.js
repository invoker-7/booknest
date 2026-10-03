"use client";

import { useEffect, useState } from "react";
import { SingleOrderComplete } from "@/components/views/CompleteView";
import { findLocalOrder, rememberOrder } from "@/lib/localOrders";

/**
 * หน้านี้เปิดได้ด้วยเลขคำสั่งซื้ออย่างเดียว server จึงส่งมาแค่อีเมลที่ปิดบังแล้ว
 * ปุ่มดาวน์โหลดจะแสดงเฉพาะเครื่องที่สั่งซื้อเอง (รู้อีเมลจาก localStorage)
 */
export default function SuccessView({ order, book }) {
  const [email, setEmail] = useState(undefined);

  useEffect(() => {
    const me = findLocalOrder(order.order_no);
    if (me) rememberOrder({ orderNo: order.order_no, status: order.status, bookId: book.id });
    setEmail(me?.email || "");
  }, [order.order_no, order.status, book.id]);

  if (email === undefined) return <div className="wrap page-pad" aria-busy="true" />;
  return <SingleOrderComplete order={order} book={book} localEmail={email} />;
}
