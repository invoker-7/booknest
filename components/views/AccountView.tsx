"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { Arrow } from "@/components/Icons";
import { Button, LinkButton, StatusTag } from "@/components/ui";
import { fmtDate, money, pick } from "@/lib/format";

/** บัญชีของฉัน — ข้อมูลสมาชิก + ประวัติคำสั่งซื้อของบัญชี */
export default function AccountView() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { ready, user, refresh, signOut } = useAuth();
  const { orders } = useStore();
  const [leaving, setLeaving] = useState(false);
  const checked = useRef(false);

  // มาจาก Google OAuth หรือเปิดหน้าตรง ๆ: ถาม server อีกครั้งก่อนตัดสินว่าไม่ได้ล็อกอิน
  useEffect(() => {
    if (!ready || user || checked.current) return;
    checked.current = true;
    void refresh().then((me) => {
      if (!me) router.replace("/login?next=/account");
    });
  }, [ready, user, refresh, router]);

  if (!user) return <div className="wrap page-pad" aria-busy="true" />;

  const mine = orders.filter((o) => o.account).reverse();
  const paid = mine.filter((o) => o.status && o.status !== "PENDING");
  const spent = paid.reduce((sum, o) => sum + (o.amount ?? 0), 0);

  async function leave() {
    setLeaving(true);
    await signOut();
    router.replace("/");
  }

  return (
    <div className="wrap">
      <header className="phead">
        <ol className="crumbs">
          <li><Link href="/">VECTOR</Link></li>
          <li aria-current="page">{t("navAccount")}</li>
        </ol>
        <div className="phead-row">
          <div>
            <h1>{user.name || user.email}</h1>
            <p>{user.email}</p>
          </div>
          <Button variant="secondary" onClick={leave} loading={leaving} loadingText={t("loading")}>{t("logout")}</Button>
        </div>
      </header>

      <dl className="cp-stats acct-stats">
        <div><dt>{t("acctRole")}</dt><dd className="sm">{t(user.isAdmin ? "roleAdmin" : "roleCustomer")}</dd></div>
        <div><dt>{t("acctOrders")}</dt><dd>{mine.length}</dd></div>
        <div><dt>{t("acctOwned")}</dt><dd>{paid.length}</dd></div>
        <div><dt>{t("acctSpent")}</dt><dd>{money(spent, lang)}</dd></div>
      </dl>

      <div className="done-actions" style={{ marginTop: 24 }}>
        <LinkButton href="/library">{t("navLibrary")} <Arrow size={18} /></LinkButton>
        {user.isAdmin && <a className="btn secondary" href="/admin">{t("navAdmin")}</a>}
      </div>

      <section className="acct-history" aria-labelledby="acct-history">
        <div className="sec-head">
          <div className="sec-label mono"><span>01</span><span>{t("orderHistory")}</span></div>
          <div className="sec-row">
            <h2 className="sec-title" id="acct-history" style={{ fontSize: 26 }}>{t("orderHistory")}</h2>
          </div>
        </div>

        {mine.length === 0 ? (
          <p className="muted">{t("orderHistoryEmpty")}</p>
        ) : (
          <div className="tscroll">
            <table className="ltable">
              <thead>
                <tr>
                  <th scope="col">{t("colOrder")}</th>
                  <th scope="col">{t("colProduct")}</th>
                  <th scope="col">{t("colPurchased")}</th>
                  <th scope="col">{t("colStatus")}</th>
                  <th scope="col" className="num">{t("colAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((o) => (
                  <tr key={o.orderNo}>
                    <td className="mono">{o.orderNo}</td>
                    <td>
                      {o.bookId ? (
                        <Link href={`/product/${o.bookId}`} className="linkbtn">{pick(o, "title", lang) || o.title}</Link>
                      ) : (
                        pick(o, "title", lang) || o.title
                      )}
                    </td>
                    <td className="mono">{fmtDate(o.purchasedAt || o.savedAt, lang)}</td>
                    <td>{o.status ? <StatusTag status={o.status} /> : "—"}</td>
                    <td className="num">{money(o.amount, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
