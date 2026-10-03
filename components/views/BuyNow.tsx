"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/components/StoreProvider";
import type { Product } from "@/lib/types";

/** ลิงก์เดิม /checkout/:id — ใส่สินค้าลงตะกร้าแล้วไปหน้าชำระเงิน */
export default function BuyNow({ product }: { product: Product }) {
  const router = useRouter();
  const { ready, addToCart } = useStore();

  useEffect(() => {
    if (!ready) return;
    addToCart(product);
    router.replace("/checkout");
  }, [ready, addToCart, product, router]);

  return <div className="wrap page-pad" aria-busy="true" />;
}
