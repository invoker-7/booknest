"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { listLocalOrders } from "@/lib/localOrders";

/**
 * สถานะฝั่งเบราว์เซอร์ของร้าน: ตะกร้า รายการที่บันทึก และคลังสินค้าที่ซื้อแล้ว
 * ทั้งหมดเก็บใน localStorage — ราคาจริงตรวจที่ server ทุกครั้งตอนสร้างคำสั่งซื้อ
 */
const Ctx = createContext(null);

const CART = "vx.cart";
const SAVED = "vx.saved";

function load(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/** เก็บเฉพาะฟิลด์ที่หน้าตะกร้าใช้ */
export function snapshot(p) {
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

export function StoreProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [saved, setSaved] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

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
    window.addEventListener("vx:storage", onStorage); // แท็บนี้
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("vx:storage", onStorage);
    };
  }, [sync]);

  const notify = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const updateCart = useCallback((fn) => {
    setCart((prev) => {
      const next = fn(prev);
      persist(CART, next);
      return next;
    });
  }, []);

  const addToCart = useCallback(
    (p) => updateCart((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, snapshot(p)])),
    [updateCart]
  );
  const removeFromCart = useCallback(
    (id) => updateCart((prev) => prev.filter((x) => x.id !== id)),
    [updateCart]
  );
  const removeManyFromCart = useCallback(
    (ids) => updateCart((prev) => prev.filter((x) => !ids.includes(x.id))),
    [updateCart]
  );

  const toggleSaved = useCallback((p) => {
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
    const m = new Map();
    for (const o of orders) {
      if (o.bookId && o.status && o.status !== "PENDING") m.set(o.bookId, o);
    }
    return m;
  }, [orders]);

  const value = {
    ready,
    cart,
    saved,
    orders,
    owned,
    addToCart,
    removeFromCart,
    removeManyFromCart,
    toggleSaved,
    inCart: (id) => cart.some((x) => x.id === id),
    isSaved: (id) => saved.some((x) => x.id === id),
    refresh: sync,
    toast,
    notify,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v;
}
