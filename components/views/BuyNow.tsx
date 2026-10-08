"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useStore } from "@/components/StoreProvider";
import type { Product } from "@/lib/types";

/** ลิงก์เดิม /checkout/:id — ใส่สินค้าลงตะกร้าแล้วไปหน้าชำระเงิน (ต้องล็อกอินก่อน) */
export default function BuyNow({ product }: { product: Product }) {
  const router = useRouter();
  const { ready, addToCart } = useStore();
  const { ready: authReady, user } = useAuth();

  useEffect(() => {
    if (!ready || !authReady) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/checkout/${product.id}`)}`);
      return;
    }
    addToCart(product);
    router.replace("/checkout");
  }, [ready, authReady, user, addToCart, product, router]);

  return <div className="wrap page-pad" aria-busy="true" />;
}
