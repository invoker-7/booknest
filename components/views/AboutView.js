"use client";

import { useLang } from "@/components/LangProvider";
import { LangToggle } from "@/components/Shell";
import { Logo } from "@/components/Icons";

export default function AboutView() {
  const { t, theme, setTheme } = useLang();
  const themes = [
    ["auto", "themeAuto"],
    ["light", "themeLight"],
    ["dark", "themeDark"],
  ];

  return (
    <div className="pad">
      <div className="card" style={{ display: "flex", gap: 13, alignItems: "center" }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: 14, background: "var(--peach)",
            display: "grid", placeItems: "center", flex: "none",
          }}
        >
          <Logo size={24} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>BookNest</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Good Books, Better You</div>
        </div>
      </div>

      <div className="card">
        <h3>{t("about")}</h3>
        <p className="sub" style={{ margin: 0, lineHeight: 1.7 }}>{t("aboutBody")}</p>
      </div>

      <div className="card">
        <h3>{t("limits")}</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.8 }}>
          <li>{t("limit1")}</li>
          <li>{t("limit2")}</li>
          <li>{t("limit3")}</li>
          <li>{t("limit4")}</li>
        </ul>
      </div>

      <div className="card">
        <h3>{t("language")} · {t("theme")}</h3>
        <div
          style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 12, paddingBottom: 12,
          }}
        >
          <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{t("language")}</span>
          <LangToggle />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{t("theme")}</span>
          <div className="filters" style={{ margin: 0 }}>
            {themes.map(([k, label]) => (
              <button key={k} onClick={() => setTheme(k)} aria-pressed={theme === k}>
                {t(label)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="spacer" />
    </div>
  );
}
