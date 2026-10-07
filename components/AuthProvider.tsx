"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchAccountOrders, fetchMe, logout } from "@/lib/apiClient";
import { forgetAccountOrders, rememberOrders } from "@/lib/localOrders";
import type { SessionUser } from "@/lib/types";

/**
 * สถานะสมาชิกฝั่งเบราว์เซอร์
 * หน้าร้านเป็น static จึงไม่อ่าน cookie ตอน render — ถาม /api/auth/me หลังหน้าแสดงผลแล้ว
 * session จริงอยู่ใน cookie แบบ httpOnly ที่ server เป็นคนตรวจ
 */
interface AuthContext {
  /** false จนกว่าจะรู้ว่าล็อกอินอยู่หรือไม่ */
  ready: boolean;
  user: SessionUser | null;
  /** เรียกหลังล็อกอิน/สมัครสำเร็จ เพื่อโหลดผู้ใช้และประวัติคำสั่งซื้อ */
  refresh: () => Promise<SessionUser | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthContext | null>(null);

// cookie บอกใบ้ที่ server ตั้งตอนล็อกอิน (ไม่ใช่ token) — ผู้ที่ไม่ได้ล็อกอินไม่ต้องยิง request เลย
const hasHint = () => document.cookie.split("; ").includes("vx_signedin=1");

/** ดึงประวัติคำสั่งซื้อของบัญชีมาไว้ในคลังบนอุปกรณ์นี้ */
async function syncAccountOrders(): Promise<void> {
  const orders = await fetchAccountOrders();
  rememberOrders(
    orders.reverse().map((o) => ({
      orderNo: o.order_no,
      name: o.customer_name,
      email: o.customer_email,
      bookId: o.book?.id,
      title: o.book?.title_th,
      title_th: o.book?.title_th,
      title_en: o.book?.title_en,
      kind: o.book?.kind,
      cover: o.book?.cover,
      amount: o.amount,
      status: o.status,
      slip: Boolean(o.slip),
      purchasedAt: o.paid_at || o.created_at,
      account: true,
    }))
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
    setReady(true);
    if (me) void syncAccountOrders();
    return me;
  }, []);

  useEffect(() => {
    if (hasHint()) void refresh();
    else setReady(true);
  }, [refresh]);

  const signOut = useCallback(async () => {
    await logout().catch(() => {});
    forgetAccountOrders();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ ready, user, refresh, signOut }), [ready, user, refresh, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
