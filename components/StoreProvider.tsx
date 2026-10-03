"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { listLocalOrders, STORAGE_EVENT } from "@/lib/localOrders";
import type { CartItem, LocalOrder, Product } from "@/lib/types";

/**
 * สถานะฝั่งเบราว์เซอร์ของร้าน: ตะกร้า รายการที่บันทึก และคลังสินค้าที่ซื้อแล้ว
 * ทั้งหมดเก็บใน localStorage — ราคาจริงตรวจที่ server ทุกครั้งตอนสร้างคำสั่งซื้อ
 */
/** สินค้าเต็มรูปแบบ หรือข้อมูลย่อที่เก็บไว้ในตะกร้าแล้ว */
type Cartable = Product | CartItem;

interface StoreContext {
  /** false จนกว่าจะอ่าน localStorage เสร็จ (กัน hydration ไม่ตรงกัน) */
  ready: boolean;
  cart: CartItem[];
  saved: CartItem[];
  orders: LocalOrder[];
  /** bookId -> คำสั่งซื้อที่ชำระเงินแล้วบนอุปกรณ์นี้ */
  owned: Map<string, LocalOrder>;
  addToCart: (p: Cartable) => void;
  removeFromCart: (id: string) => void;
  removeManyFromCart: (ids: string[]) => void;
  toggleSaved: (p: Cartable) => void;
  inCart: (id: string) => boolean;
  isSaved: (id: string) => boolean;
  refresh: () => void;
  notify: (message: string) => void;
}

const Ctx = createContext<StoreContext | null>(null);

// ข้อความ toast แยก context ออกมา เพื่อไม่ให้ทุก component ที่ใช้ตะกร้า render ใหม่ทุกครั้งที่ toast ขึ้น/หาย
const ToastCtx = createContext<string | null>(null);

const CART = "vx.cart";
const SAVED = "vx.saved";

function load(key: string): CartItem[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? (v as CartItem[]) : [];
  } catch {
    return [];
  }
}

function persist(key: string, value: CartItem[]): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/** เก็บเฉพาะฟิลด์ที่หน้าตะกร้าใช้ */
export function snapshot(p: Cartable): CartItem {
  return {
    id: p.id,
    title_th: p.title_th,
    title_en: p.title_en,
    price: p.price,
    list_price: p.list_price,
    kind: p.kind,
    category: p.category,
    version: p.version,
    license: p.license,
    format: p.format,
    productNo: p.productNo,
    creatorName: p.creatorName,
    sample: Boolean(p.sample),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saved, setSaved] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sync = useCallback(() => {
    const local = listLocalOrders();
    // สินค้าที่ชำระเงินแล้วไม่ควรค้างอยู่ในตะกร้า (กันซื้อซ้ำ)
    const paid = new Set(local.filter((o) => o.bookId && o.status && o.status !== "PENDING").map((o) => o.bookId));
    const stored = load(CART);
    const kept = stored.filter((x) => !paid.has(x.id));
    if (kept.length !== stored.length) persist(CART, kept);
    setCart(kept);
    setSaved(load(SAVED));
    setOrders(local);
  }, []);

  useEffect(() => {
    sync();
    setReady(true);
    const onStorage = () => sync();
    window.addEventListener("storage", onStorage); // แท็บอื่น
    window.addEventListener(STORAGE_EVENT, onStorage); // แท็บนี้
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(STORAGE_EVENT, onStorage);
    };
  }, [sync]);

  const notify = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const updateCart = useCallback((fn: (prev: CartItem[]) => CartItem[]) => {
    setCart((prev) => {
      const next = fn(prev);
      persist(CART, next);
      return next;
    });
  }, []);

  const addToCart = useCallback(
    (p: Cartable) => updateCart((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, snapshot(p)])),
    [updateCart]
  );
  const removeFromCart = useCallback(
    (id: string) => updateCart((prev) => prev.filter((x) => x.id !== id)),
    [updateCart]
  );
  const removeManyFromCart = useCallback(
    (ids: string[]) => updateCart((prev) => prev.filter((x) => !ids.includes(x.id))),
    [updateCart]
  );

  const toggleSaved = useCallback((p: Cartable) => {
    setSaved((prev) => {
      const next = prev.some((x) => x.id === p.id)
        ? prev.filter((x) => x.id !== p.id)
        : [...prev, snapshot(p)];
      persist(SAVED, next);
      return next;
    });
  }, []);

  // สินค้าที่เป็นเจ้าของแล้ว (ชำระเงินแล้วบนอุปกรณ์นี้)
  const owned = useMemo(() => {
    const m = new Map<string, LocalOrder>();
    for (const o of orders) {
      if (o.bookId && o.status && o.status !== "PENDING") m.set(o.bookId, o);
    }
    return m;
  }, [orders]);

  const value = useMemo<StoreContext>(
    () => ({
      ready,
      cart,
      saved,
      orders,
      owned,
      addToCart,
      removeFromCart,
      removeManyFromCart,
      toggleSaved,
      inCart: (id: string) => cart.some((x) => x.id === id),
      isSaved: (id: string) => saved.some((x) => x.id === id),
      refresh: sync,
      notify,
    }),
    [ready, cart, saved, orders, owned, addToCart, removeFromCart, removeManyFromCart, toggleSaved, sync, notify]
  );

  return (
    <Ctx.Provider value={value}>
      <ToastCtx.Provider value={toast}>{children}</ToastCtx.Provider>
    </Ctx.Provider>
  );
}

export function useStore(): StoreContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v;
}

/** ข้อความ toast ปัจจุบัน (null เมื่อไม่มี) */
export function useToast(): string | null {
  return useContext(ToastCtx);
}
