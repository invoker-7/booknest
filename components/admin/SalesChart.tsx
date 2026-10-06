"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { fmtDate, money } from "@/lib/format";
import type { DailyPoint } from "@/lib/types";

const H = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 52 };

/** ขั้นแกน Y ที่อ่านง่าย: 1 / 2 / 5 × 10ⁿ */
function niceMax(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 4, step: 1 };
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  return { top: Math.ceil(max / step) * step, step };
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n));

/**
 * กราฟเส้นยอดขายรายวัน (ชุดข้อมูลเดียว แกนเดียว)
 * ชี้/แตะเพื่อดูค่าของแต่ละวัน ใช้ลูกศรซ้าย-ขวาได้เมื่อโฟกัส และมีตารางข้อมูลด้านล่าง
 */
export default function SalesChart({ data }: { data: DailyPoint[] }) {
  const { t, lang } = useLang();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = data.length;
  const { top, step } = niceMax(Math.max(...data.map((d) => d.sales), 0));
  const innerW = w - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.sales).toFixed(1)}`).join("");
  const area = n > 1 ? `${line}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : "";
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 90))));

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left - PAD.left) / innerW;
    setActive(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((i) => Math.min(n - 1, Math.max(0, (i ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1))));
  };

  const cur = active !== null ? data[active] : undefined;
  const shortDay = (day: string) => `${Number(day.slice(8))}/${Number(day.slice(5, 7))}`;

  return (
    <div className="chart" ref={box}>
      <svg
        width={w}
        height={H}
        role="img"
        aria-label={t("admSalesOverview")}
        tabIndex={0}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line className={v === 0 ? "chart-axis" : "chart-grid"} x1={PAD.left} x2={w - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="chart-tick" x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end">{compact(v)}</text>
          </g>
        ))}
        {data.map((d, i) =>
          (n - 1 - i) % every === 0 ? (
            <text key={d.day} className="chart-tick" x={x(i)} y={H - 8} textAnchor={i === n - 1 ? "end" : "middle"}>
              {shortDay(d.day)}
            </text>
          ) : null
        )}
        {area && <path className="chart-area" d={area} />}
        <path className="chart-line" d={line} />
        {cur && active !== null && (
          <>
            <line className="chart-cross" x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} />
            <circle className="chart-dot" cx={x(active)} cy={y(cur.sales)} r={5} />
          </>
        )}
      </svg>

      {cur && active !== null && (
        <div
          className="chart-tip"
          role="status"
          style={{ left: Math.min(Math.max(x(active), 84), w - 84), top: Math.max(y(cur.sales) - 12, 0) }}
        >
          <span className="mono">{fmtDate(cur.day, lang)}</span>
          <strong>{money(cur.sales, lang)}</strong>
          <span>{cur.orders} {t("admOrdersUnit")}</span>
        </div>
      )}

      <details className="chart-table">
        <summary>{t("admShowTable")}</summary>
        <div className="tscroll">
          <table className="ltable">
            <thead>
              <tr>
                <th scope="col">{t("admDate")}</th>
                <th scope="col" className="num">{t("admSales")}</th>
                <th scope="col" className="num">{t("admOrders")}</th>
              </tr>
            </thead>
            <tbody>
              {data.slice().reverse().map((d) => (
                <tr key={d.day}>
                  <td className="mono">{fmtDate(d.day, lang)}</td>
                  <td className="num">{money(d.sales, lang)}</td>
                  <td className="num">{d.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
