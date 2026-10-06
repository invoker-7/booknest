"use client";

import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { LangToggle } from "@/components/Shell";
import { TextLink } from "@/components/ui";
import { FAQ } from "@/lib/catalog";

const LIMITS = ["limit2", "limit3"] as const;

export default function AboutView() {
  const { t } = useLang();
  return (
    <div className="wrap">
      <header className="phead">
        <ol className="crumbs">
          <li><Link href="/">VECTOR</Link></li>
          <li aria-current="page">{t("about")}</li>
        </ol>
        <h1>{t("aboutTitle")}</h1>
        <p>{t("aboutBody")}</p>
      </header>

      <section className="doc" style={{ borderTop: 0, paddingTop: 48 }} aria-labelledby="about-limits">
        <div className="doc-label">
          <b>01 — Notes</b>
          <h2 id="about-limits">{t("limits")}</h2>
        </div>
        <div className="doc-body">
          <ol className="about-list">
            {LIMITS.map((key) => <li key={key}>{t(key)}</li>)}
          </ol>
        </div>
      </section>

      <section className="doc" aria-labelledby="about-faq">
        <div className="doc-label">
          <b>02 — FAQ</b>
          <h2 id="about-faq">{t("faq")}</h2>
        </div>
        <div className="doc-body">
          <div className="faq">
            {FAQ.map((k) => (
              <details key={k}>
                <summary>{t(`${k}Q`)} <span className="pm" aria-hidden="true" /></summary>
                <p>{t(`${k}A`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="doc" aria-labelledby="about-lang">
        <div className="doc-label">
          <b>03 — Settings</b>
          <h2 id="about-lang">{t("language")}</h2>
        </div>
        <div className="doc-body">
          <LangToggle />
          <div style={{ marginTop: 24 }}><TextLink href="/products">{t("heroCta")}</TextLink></div>
        </div>
      </section>
    </div>
  );
}
