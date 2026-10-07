"use client";

import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import ProductArt from "@/components/ProductArt";
import { Arrow, Cart, Lock } from "@/components/Icons";
import { Button, LinkButton, Empty, Steps, Price } from "@/components/ui";
import { money, pick } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export function totalsOf(items: CartItem[]) {
  const total = items.reduce((s, p) => s + p.price, 0);
  const list = items.reduce((s, p) => s + Math.max(p.list_price || p.price, p.price), 0);
  return { total, list, discount: list - total };
}

export function SummaryLines({ items }: { items: CartItem[] }) {
  const { t, lang } = useLang();
  const { total, list, discount } = totalsOf(items);
  return (
    <dl className="co-lines">
      <div>
        <dt>{t("subtotal")} ({items.length})</dt>
        <dd>{money(list, lang)}</dd>
      </div>
      {discount > 0 && (
        <div>
          <dt>{t("discount")}</dt>
          <dd>− {money(discount, lang)}</dd>
        </div>
      )}
      <div className="total">
        <dt>{t("total")}</dt>
        <dd>{money(total, lang)}</dd>
      </div>
    </dl>
  );
}

export default function CartView() {
  const { t, lang } = useLang();
  const { ready, cart, removeFromCart, toggleSaved, isSaved, owned } = useStore();

  if (!ready) return <div className="wrap page-pad" aria-busy="true" />;

  const { total } = totalsOf(cart);

  return (
    <>
      <div className="wrap page-pad">
        <Steps active={0} />
        <header style={{ marginBottom: 32 }}>
          <h1 className="sec-title" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>{t("cartTitle")}</h1>
          {cart.length > 0 && (
            <p className="muted mono" style={{ marginTop: 8, fontSize: 13 }}>
              {cart.length} {t("cartItems")} · {t("digitalNote")}
            </p>
          )}
        </header>

        {cart.length === 0 ? (
          <Empty
            icon={<Cart />}
            title={t("cartEmptyTitle")}
            body={t("cartEmptyBody")}
            action={<LinkButton href="/products">{t("browseProducts")} <Arrow size={18} /></LinkButton>}
          />
        ) : (
          <div className="co-grid">
            <ul className="cart-list">
              {cart.map((p) => {
                const title = pick(p, "title", lang);
                return (
                  <li className="cart-item" key={p.id}>
                    <Link href={`/product/${p.id}`} className="thumb" tabIndex={-1} aria-hidden="true">
                      <ProductArt p={p} title={title} bare sizes="120px" />
                    </Link>
                    <div>
                      <p className="specline">
                        {t(`cat_${p.category}`)} · V{p.version} · {t(`lic_${p.license}`)}
                      </p>
                      <h2><Link href={`/product/${p.id}`}>{title}</Link></h2>
                      {p.creatorName && <p className="muted" style={{ fontSize: 14 }}>{t("by")} {p.creatorName}</p>}
                      {owned.has(p.id) && <p style={{ marginTop: 8 }}><span className="tag amber">{t("alreadyOwned")}</span></p>}
                      <div className="acts">
                        <Button variant="ghost" onClick={() => removeFromCart(p.id)} aria-label={`${t("remove")}: ${title}`}>
                          {t("remove")}
                        </Button>
                        {!isSaved(p.id) && (
                          <Button variant="ghost" onClick={() => { toggleSaved(p); removeFromCart(p.id); }}>
                            {t("moveToSaved")}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="right"><Price p={p} /></div>
                  </li>
                );
              })}
            </ul>

            <aside className="co-aside" aria-label={t("orderSummary")}>
              <h2>{t("orderSummary")}</h2>
              <SummaryLines items={cart} />
              <div style={{ marginTop: 20, display: "grid", gap: 8 }}>
                <LinkButton href="/checkout" block className="desk">
                  {t("checkout")} <Arrow size={18} />
                </LinkButton>
                <LinkButton href="/products" variant="ghost" block>{t("continueShopping")}</LinkButton>
              </div>
              <p className="co-note"><Lock size={16} /> {t("secureNote")}</p>
            </aside>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="sticky-buy two-col">
          <span className="price"><span className="muted" style={{ fontSize: 12 }}>{t("total")}</span><strong>{money(total, lang)}</strong></span>
          <LinkButton href="/checkout" block>{t("checkout")} <Arrow size={18} /></LinkButton>
        </div>
      )}
    </>
  );
}
