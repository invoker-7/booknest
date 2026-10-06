"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { Search, Close, Grid, List, Filter } from "@/components/Icons";
import { Button, ProductRow, ProductTile, Empty, PreviewBanner } from "@/components/ui";
import { CATEGORIES, PLATFORMS, PRICE_BANDS, SORTS, filterProducts, sortProducts } from "@/lib/catalog";
import type { Category, Platform, PriceBandId, Product, SortKey } from "@/lib/types";

interface Filters {
  cats: Category[];
  plats: Platform[];
  price: PriceBandId | "";
  rating: number;
}

type ViewMode = "grid" | "list";

const VIEW_KEY = "vx.view";

const EMPTY: Filters = { cats: [], plats: [], price: "", rating: 0 };
const RATINGS = [4.8, 4.5, 4];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** กลุ่มตัวกรอง — ใช้ทั้งใน sidebar (desktop) และ bottom sheet (มือถือ) */
interface FilterGroupsProps {
  f: Filters;
  setF: (next: Filters) => void;
  products: Product[];
  /** คำนำหน้า name ของ radio กันชนกันระหว่าง sidebar กับ bottom sheet */
  idp: string;
}

function FilterGroups({ f, setF, products, idp }: FilterGroupsProps) {
  const { t } = useLang();
  const count = (key: "category" | "platform", v: string) => products.filter((p) => p[key] === v).length;

  return (
    <>
      <fieldset className="fgroup">
        <legend>{t("fType")}</legend>
        {CATEGORIES.map((c) => (
          <label className="check" key={c}>
            <input
              type="checkbox"
              checked={f.cats.includes(c)}
              onChange={() => setF({ ...f, cats: toggle(f.cats, c) })}
            />
            <span>{t(`cat_${c}`)}</span>
            <span className="n">{count("category", c)}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="fgroup">
        <legend>{t("fPlatform")}</legend>
        {PLATFORMS.map((p) => (
          <label className="check" key={p}>
            <input
              type="checkbox"
              checked={f.plats.includes(p)}
              onChange={() => setF({ ...f, plats: toggle(f.plats, p) })}
            />
            <span>{t(`plat_${p}`)}</span>
            <span className="n">{count("platform", p)}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="fgroup">
        <legend>{t("fPrice")}</legend>
        <label className="check">
          <input type="radio" name={`${idp}-price`} checked={!f.price} onChange={() => setF({ ...f, price: "" })} />
          <span>{t("priceAny")}</span>
        </label>
        {PRICE_BANDS.map((b) => (
          <label className="check" key={b.id}>
            <input
              type="radio"
              name={`${idp}-price`}
              checked={f.price === b.id}
              onChange={() => setF({ ...f, price: b.id })}
            />
            <span>{t(`price_${b.id}`)}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="fgroup">
        <legend>{t("fRating")}</legend>
        <label className="check">
          <input type="radio" name={`${idp}-rating`} checked={!f.rating} onChange={() => setF({ ...f, rating: 0 })} />
          <span>{t("ratingAny")}</span>
        </label>
        {RATINGS.map((r) => (
          <label className="check" key={r}>
            <input
              type="radio"
              name={`${idp}-rating`}
              checked={f.rating === r}
              onChange={() => setF({ ...f, rating: r })}
            />
            <span>{r.toFixed(1)} {t("ratingUp")}</span>
          </label>
        ))}
      </fieldset>
    </>
  );
}

interface CatalogViewProps {
  products: Product[];
  live: boolean;
  /** ค่าเริ่มต้นจาก URL: /products?q=...&cat=... (อ่านที่ฝั่ง server) */
  initialQuery?: string;
  initialCategory?: string;
}

const filtersFor = (category: string): Filters => {
  const cat = CATEGORIES.find((c) => c === category);
  return { ...EMPTY, cats: cat ? [cat] : [] };
};

export default function CatalogView({ products, live, initialQuery = "", initialCategory = "" }: CatalogViewProps) {
  const { t } = useLang();
  const [q, setQ] = useState(initialQuery);
  const [f, setF] = useState<Filters>(() => filtersFor(initialCategory));
  const [sort, setSort] = useState<SortKey>("featured");
  const [view, setView] = useState<ViewMode>("grid");
  const [sheet, setSheet] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sheetClose = useRef<HTMLButtonElement>(null);

  // URL เปลี่ยนขณะอยู่หน้านี้ (เช่น ค้นหาจาก header) ให้ตัวกรองตามไปด้วย
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setQ(initialQuery);
    setF(filtersFor(initialCategory));
  }, [initialQuery, initialCategory]);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "grid" || v === "list") setView(v);
    } catch {}
  }, []);
  const chooseView = (v: ViewMode) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  };

  // กด / เพื่อไปที่ช่องค้นหา
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!sheet) return;
    document.body.classList.add("lock");
    sheetClose.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("lock");
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  const list = useMemo(
    () => sortProducts(filterProducts(products, { q, ...f }), sort),
    [products, q, f, sort]
  );

  const activeCount = f.cats.length + f.plats.length + (f.price ? 1 : 0) + (f.rating ? 1 : 0);
  const hasAny = activeCount > 0 || q.trim() !== "";
  const reset = () => { setF(EMPTY); setQ(""); };

  const chips = [
    ...f.cats.map((c) => ({ key: `c-${c}`, label: t(`cat_${c}`), off: () => setF({ ...f, cats: toggle(f.cats, c) }) })),
    ...f.plats.map((p) => ({ key: `p-${p}`, label: t(`plat_${p}`), off: () => setF({ ...f, plats: toggle(f.plats, p) }) })),
    ...(f.price ? [{ key: "price", label: t(`price_${f.price}` as const), off: () => setF({ ...f, price: "" }) }] : []),
    ...(f.rating ? [{ key: "rating", label: `${f.rating.toFixed(1)} ${t("ratingUp")}`, off: () => setF({ ...f, rating: 0 }) }] : []),
  ];

  // แท็บหมวดหมู่ด้านบน = ทางลัดเลือกหมวดเดียว
  const singleCat = f.cats.length === 1 ? f.cats[0] : f.cats.length === 0 ? "" : null;

  return (
    <>
      <PreviewBanner live={live} />
      <div className="wrap">
        <header className="phead" style={{ borderBottom: 0, paddingBottom: 0 }}>
          <ol className="crumbs">
            <li><Link href="/">VECTOR</Link></li>
            <li aria-current="page">{t("navProducts")}</li>
          </ol>
          <h1>{t("catalogTitle")}</h1>
          <p>{t("catalogSub")}</p>
        </header>

        <div className="cat-tabs" role="group" aria-label={t("fType")}>
          <button type="button" aria-pressed={singleCat === ""} onClick={() => setF({ ...f, cats: [] })}>
            {t("allCategories")}
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" aria-pressed={singleCat === c} onClick={() => setF({ ...f, cats: [c] })}>
              {t(`cat_${c}`)}
            </button>
          ))}
        </div>

        <div className="catalog">
          <aside className="filters" aria-label={t("filters")}>
            <FilterGroups f={f} setF={setF} products={products} idp="side" />
            {activeCount > 0 && (
              <button type="button" className="linkbtn" onClick={() => setF(EMPTY)}>{t("resetFilters")}</button>
            )}
          </aside>

          <section aria-label={t("catalogTitle")}>
            <div className="toolbar">
              <div className="search" role="search">
                <Search />
                <label htmlFor="cat-search" className="sr-only">{t("searchLabel")}</label>
                <input
                  id="cat-search"
                  ref={searchRef}
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("searchPh")}
                  autoComplete="off"
                />
                {q ? (
                  <button type="button" className="clear" onClick={() => { setQ(""); searchRef.current?.focus(); }} aria-label={t("searchClear")}>
                    <Close size={16} />
                  </button>
                ) : (
                  <kbd className="kbd" aria-hidden="true">/</kbd>
                )}
              </div>

              <button type="button" className="btn secondary filterbtn" onClick={() => setSheet(true)} aria-haspopup="dialog">
                <Filter size={18} /> {t("filters")}{activeCount > 0 && ` (${activeCount})`}
              </button>

              <div className="sortbox">
                <label htmlFor="cat-sort">{t("sortBy")}</label>
                <select id="cat-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  {SORTS.map((s) => <option key={s} value={s}>{t(`sort_${s}`)}</option>)}
                </select>
              </div>

              <div className="viewtoggle" role="group" aria-label="View">
                <button type="button" aria-pressed={view === "grid"} onClick={() => chooseView("grid")} aria-label={t("viewGrid")}>
                  <Grid size={18} />
                </button>
                <button type="button" aria-pressed={view === "list"} onClick={() => chooseView("list")} aria-label={t("viewList")}>
                  <List size={18} />
                </button>
              </div>
            </div>

            <div className="resultbar">
              <p aria-live="polite">
                {q.trim() && <>{t("resultsFor")} “<strong>{q.trim()}</strong>” — </>}
                <strong className="mono">{list.length}</strong> {t("results")}
              </p>
              {chips.length > 0 && (
                <div className="chips" aria-label={t("activeFilters")}>
                  {chips.map((c) => (
                    <button key={c.key} type="button" className="chip" onClick={c.off} aria-label={`${t("removeFilter")}: ${c.label}`}>
                      {c.label} <Close />
                    </button>
                  ))}
                  <button type="button" className="linkbtn" onClick={() => setF(EMPTY)}>{t("resetFilters")}</button>
                </div>
              )}
            </div>

            {list.length === 0 ? (
              <Empty
                icon={<Search />}
                title={t("noResultTitle")}
                body={t("noResultBody")}
                action={hasAny && <Button variant="secondary" onClick={reset}>{t("resetFilters")}</Button>}
              />
            ) : view === "grid" ? (
              <div className="ptiles compact">
                {list.map((p) => <ProductTile key={p.id} p={p} />)}
              </div>
            ) : (
              <div className="prows">
                {list.map((p, i) => <ProductRow key={p.id} p={p} index={i} />)}
              </div>
            )}
          </section>
        </div>
      </div>

      {sheet && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheet(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
            <div className="sheet-head">
              <h2 id="sheet-title">{t("filters")}</h2>
              <button type="button" className="iconbtn" ref={sheetClose} onClick={() => setSheet(false)} aria-label={t("navClose")}>
                <Close />
              </button>
            </div>
            <div className="sheet-body">
              <FilterGroups f={f} setF={setF} products={products} idp="sheet" />
            </div>
            <div className="sheet-foot">
              <Button variant="secondary" onClick={() => setF(EMPTY)} disabled={activeCount === 0}>
                {t("reset")}
              </Button>
              <Button onClick={() => setSheet(false)}>
                {t("showResults")} {list.length} {t("results")}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
