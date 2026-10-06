/**
 * ข้อมูลแคตตาล็อกฝั่งหน้าเว็บ (ใช้ได้ทั้ง server และ client)
 *
 * ตาราง books ใน Supabase มีแค่ข้อมูลพื้นฐาน (ชื่อ ราคา kind file_size ...)
 * ไฟล์นี้เติม metadata ที่หน้าเว็บต้องใช้ เช่น หมวดหมู่ แพลตฟอร์ม เวอร์ชัน และไลเซนส์
 * โดยอ่านจากคอลัมน์จริงก่อนเสมอ ถ้าไม่มีจึงใช้ค่าตั้งต้นตามประเภทสินค้า
 *
 * SAMPLE_PRODUCTS ใช้เฉพาะตอนที่ฐานข้อมูลไม่มีสินค้า (หรือเชื่อมต่อไม่ได้)
 * เพื่อให้หน้าร้านยังดูและทดสอบ layout ได้ — สั่งซื้อจริงไม่ได้
 */

import type {
  BookRow,
  CatalogFilters,
  Category,
  Creator,
  CreatorProfile,
  License,
  Platform,
  PriceBandId,
  Product,
  SampleReview,
  SortKey,
} from "@/lib/types";
import type { TKey } from "@/lib/i18n";

/* ---------- หมวดหมู่ ---------- */
export const CATEGORIES: Category[] = [
  "notion",
  "uikit",
  "design",
  "devtool",
  "productivity",
  "template",
  "guide",
  "asset",
];

// kind เดิมในฐานข้อมูล -> หมวดหมู่ใหม่
const KIND_ALIAS: Record<string, Category> = { preset: "asset" };

export const PLATFORMS: Platform[] = ["notion", "figma", "code", "pdf", "adobe"];

const DEFAULTS: Record<Category, { platform: Platform; format: string; license: License }> = {
  notion:       { platform: "notion", format: "Notion template",   license: "personal" },
  uikit:        { platform: "figma",  format: ".fig + PDF",         license: "commercial" },
  design:       { platform: "figma",  format: "SVG · PNG · .fig",   license: "commercial" },
  devtool:      { platform: "code",   format: "ZIP · Source code",  license: "mit" },
  productivity: { platform: "notion", format: "Notion template",   license: "personal" },
  template:     { platform: "pdf",    format: "DOCX · PDF",         license: "personal" },
  guide:        { platform: "pdf",    format: "PDF",                license: "personal" },
  asset:        { platform: "adobe",  format: "ZIP",                license: "commercial" },
};

const isCategory = (k: string): k is Category => k in DEFAULTS;

export function categoryOf(p: { kind?: string | null } | null | undefined): Category {
  const kind = p?.kind || "";
  const k = KIND_ALIAS[kind] || kind;
  return isCategory(k) ? k : "guide";
}

/** 2026-09-14 -> "2026.09" */
export function stamp(value: string | number | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** URL รูปสินค้าที่ร้านอัปโหลด — null เมื่อยังไม่มี (คอลัมน์ cover รุ่นเก่าเก็บชื่อชุดปก ไม่ใช่ URL) */
export const imageOf = (p: { cover?: string | null }): string | null =>
  p.cover && /^https?:\/\//.test(p.cover) ? p.cover : null;

/** เติม metadata ให้สินค้าหนึ่งชิ้น — ค่าในฐานข้อมูลมาก่อนเสมอ */
export function enrich(p: BookRow, index = 0): Product {
  const category = categoryOf(p);
  const d = DEFAULTS[category];
  const no = typeof p.sort === "number" && p.sort > 0 ? p.sort : index + 1;
  return {
    ...p,
    category,
    platform: p.platform || d.platform,
    format: p.format || (category === "guide" && p.pages ? `PDF · ${p.pages} pp.` : d.format),
    license: p.license || d.license,
    version: p.version || "1.0",
    updated: p.updated || p.created_at || null,
    productNo: String(no).padStart(3, "0"),
    creatorId: p.shop?.id || p.shop_id || null,
    creatorName: p.shop?.name || null,
    rating: Number(p.rating) || 0,
    reviews: Number(p.reviews) || 0,
  };
}

export function discountOf(p: { price: number; list_price?: number | null }): number {
  if (!p.list_price || p.list_price <= p.price) return 0;
  return Math.round((1 - p.price / p.list_price) * 100);
}

/* ---------- ค้นหา / กรอง / เรียง ---------- */
export const PRICE_BANDS: { id: PriceBandId; test: (n: number) => boolean }[] = [
  { id: "u200", test: (n) => n < 200 },
  { id: "200-400", test: (n) => n >= 200 && n <= 400 },
  { id: "o400", test: (n) => n > 400 },
];

export const SORTS: SortKey[] = ["featured", "newest", "priceAsc", "priceDesc", "rating"];

export function filterProducts(
  list: Product[],
  { q = "", cats = [], plats = [], price = "", rating = 0 }: CatalogFilters
): Product[] {
  const query = q.trim().toLowerCase();
  const band = PRICE_BANDS.find((b) => b.id === price);
  return list.filter((p) => {
    if (cats.length && !cats.includes(p.category)) return false;
    if (plats.length && !plats.includes(p.platform)) return false;
    if (band && !band.test(p.price)) return false;
    if (rating && p.rating < rating) return false;
    if (!query) return true;
    return [p.title_th, p.title_en, p.short_th, p.short_en, p.creatorName, p.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

export function sortProducts(list: Product[], sort: SortKey): Product[] {
  const out = list.slice();
  const time = (p: Product) => new Date(p.updated || 0).getTime();
  if (sort === "newest") out.sort((a, b) => time(b) - time(a));
  else if (sort === "priceAsc") out.sort((a, b) => a.price - b.price);
  else if (sort === "priceDesc") out.sort((a, b) => b.price - a.price);
  else if (sort === "rating") out.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  return out;
}

/** สินค้าที่เกี่ยวข้อง: หมวดเดียวกันก่อน แล้วร้านเดียวกัน แล้วที่เหลือ */
export function relatedTo(product: Product, list: Product[], n = 3): Product[] {
  const others = list.filter((p) => p.id !== product.id);
  const score = (p: Product) =>
    (p.category === product.category ? 2 : 0) +
    (p.creatorId && p.creatorId === product.creatorId ? 1 : 0);
  return others.sort((a, b) => score(b) - score(a)).slice(0, n);
}

/* ---------- ครีเอเตอร์ ---------- */
/** รวมครีเอเตอร์จากสินค้า (ใช้ shop ที่ join มา) พร้อมสถิติ */
export function creatorsFrom(products: Product[], extra: CreatorProfile[] = []): Creator[] {
  const map = new Map<string, CreatorProfile & { products: Product[] }>();
  for (const c of extra) map.set(c.id, { ...c, products: [] });
  for (const p of products) {
    if (!p.creatorId) continue;
    if (!map.has(p.creatorId)) {
      map.set(p.creatorId, { id: p.creatorId, name: p.creatorName || p.creatorId, products: [] });
    }
    map.get(p.creatorId)?.products.push(p);
  }
  return [...map.values()]
    .filter((c) => c.products.length > 0)
    .map((c) => {
      const reviews = c.products.reduce((s, p) => s + p.reviews, 0);
      const weighted = c.products.reduce((s, p) => s + p.rating * p.reviews, 0);
      return {
        ...c,
        productCount: c.products.length,
        reviews,
        rating: reviews ? Math.round((weighted / reviews) * 10) / 10 : 0,
      };
    });
}

/* =========================================================
   ข้อมูลตัวอย่าง — แสดงเมื่อฐานข้อมูลยังไม่มีสินค้าเท่านั้น
   ========================================================= */
export const SAMPLE_CREATORS: CreatorProfile[] = [
  {
    id: "halyard-systems",
    name: "Halyard Systems",
    since: 2021,
    location: "Bangkok, TH",
    followers: 4820,
    spec_th: "ระบบ Notion · Productivity",
    spec_en: "Notion systems · Productivity",
    bio_th:
      "ทีมสองคนที่ออกแบบระบบจัดการงานให้สตูดิโอและทีมผลิตภัณฑ์ขนาดเล็ก เน้นโครงสร้างที่ดูแลได้จริงมากกว่าหน้าตาที่สวยอย่างเดียว",
    bio_en:
      "A two-person team building operating systems for small studios and product teams. Structure you can maintain beats a pretty dashboard.",
  },
  {
    id: "meridian-ui",
    name: "Meridian UI",
    since: 2019,
    location: "Chiang Mai, TH",
    followers: 12940,
    spec_th: "UI Kit · Design system",
    spec_en: "UI kits · Design systems",
    bio_th:
      "สตูดิโอออกแบบอินเทอร์เฟซที่ทำ design system ให้แอปด้านการเงินและสาธารณสุข ทุกคอมโพเนนต์ผ่านการตรวจ contrast และ keyboard",
    bio_en:
      "An interface studio that builds design systems for finance and healthcare apps. Every component is checked for contrast and keyboard use.",
  },
  {
    id: "northline-dev",
    name: "Northline Dev",
    since: 2022,
    location: "Remote",
    followers: 3110,
    spec_th: "เครื่องมือนักพัฒนา · Boilerplate",
    spec_en: "Developer tools · Boilerplates",
    bio_th:
      "วิศวกรซอฟต์แวร์ที่รวบรวมโค้ดตั้งต้นและสคริปต์ที่ใช้จริงในงานลูกค้า มีเทสต์และเอกสารประกอบครบทุกชุด",
    bio_en:
      "Software engineers packaging the starters and scripts they use on client work. Every kit ships with tests and documentation.",
  },
  {
    id: "field-manual",
    name: "Field Manual Press",
    since: 2020,
    location: "Bangkok, TH",
    followers: 7650,
    spec_th: "คู่มือเชิงเทคนิค · เทมเพลตเอกสาร",
    spec_en: "Technical guides · Document templates",
    bio_th:
      "สำนักพิมพ์อิสระที่ทำคู่มือภาคปฏิบัติสำหรับคนทำงานสายเทคนิค เขียนให้อ่านจบได้ในบ่ายเดียวและใช้ได้ทันที",
    bio_en:
      "An independent press publishing practical manuals for technical people. Written to be finished in an afternoon and used the next morning.",
  },
];

const shop = (id: string) => {
  const c = SAMPLE_CREATORS.find((x) => x.id === id);
  return { id, name: c?.name ?? id };
};

export const SAMPLE_PRODUCTS: BookRow[] = [
  {
    id: "mission-control-os",
    kind: "notion",
    shop: shop("halyard-systems"),
    title_th: "Mission Control OS", title_en: "Mission Control OS",
    short_th: "ระบบ Notion สำหรับวางแผนโปรเจกต์ ติดตามงาน และทบทวนรายสัปดาห์",
    short_en: "A Notion system for planning projects, tracking work and weekly reviews.",
    long_th:
      "ระบบจัดการงานที่เชื่อมเป้าหมาย โปรเจกต์ และงานรายวันเข้าด้วยกัน มีมุมมองรายสัปดาห์ บันทึกการตัดสินใจ และแดชบอร์ดสถานะที่อัปเดตจากฐานข้อมูลอัตโนมัติ ตั้งค่าได้ในสิบนาที",
    long_en:
      "One system that connects goals, projects and daily tasks. Includes a weekly view, a decision log, and status pages that roll up from your databases automatically. Set up in ten minutes.",
    author_th: "Halyard Systems", author_en: "Halyard Systems",
    price: 390, list_price: 490, rating: 4.9, reviews: 312, pages: 0,
    file_size: "1.2 MB", version: "2.4", updated: "2026-09-12", license: "personal",
    sort: 1, created_at: "2025-02-01",
  },
  {
    id: "meridian-design-system",
    kind: "uikit",
    shop: shop("meridian-ui"),
    title_th: "Meridian Design System", title_en: "Meridian Design System",
    short_th: "UI Kit สำหรับ Figma กว่า 420 คอมโพเนนต์ พร้อม token และโหมดมืด",
    short_en: "A Figma UI kit with 420+ components, tokens and dark mode.",
    long_th:
      "ระบบออกแบบสำหรับแอปที่มีข้อมูลหนาแน่น ครอบคลุมตาราง ฟอร์ม กราฟ และ navigation ใช้ variables และ auto layout ทุกชิ้น ผ่านการตรวจ contrast ระดับ WCAG AA",
    long_en:
      "A design system for data-dense applications: tables, forms, charts and navigation. Built on variables and auto layout throughout, with every pairing checked to WCAG AA.",
    author_th: "Meridian UI", author_en: "Meridian UI",
    price: 1290, list_price: 1590, rating: 4.8, reviews: 486, pages: 0,
    file_size: "64 MB", version: "3.1", updated: "2026-08-28", license: "commercial",
    sort: 2, created_at: "2024-06-10",
  },
  {
    id: "launchpad-starter",
    kind: "devtool",
    shop: shop("northline-dev"),
    title_th: "Launchpad Next.js Starter", title_en: "Launchpad Next.js Starter",
    short_th: "โค้ดตั้งต้นสำหรับ SaaS: auth, billing, อีเมล และเทสต์พร้อมใช้",
    short_en: "A SaaS starter with auth, billing, email and tests already wired.",
    long_th:
      "โปรเจกต์ Next.js ที่ตั้งค่าไว้ครบตั้งแต่ระบบล็อกอิน การเก็บเงินรายเดือน อีเมลแจ้งเตือน ไปจนถึง CI และเทสต์ end-to-end พร้อมเอกสารอธิบายทุกการตัดสินใจ",
    long_en:
      "A Next.js project with sign-in, subscription billing, transactional email, CI and end-to-end tests already configured — plus notes explaining every decision.",
    author_th: "Northline Dev", author_en: "Northline Dev",
    price: 890, list_price: 890, rating: 4.7, reviews: 158, pages: 0,
    file_size: "3.8 MB", version: "1.6", updated: "2026-09-20", license: "mit",
    sort: 3, created_at: "2025-11-04",
  },
  {
    id: "technical-writing-manual",
    kind: "guide",
    shop: shop("field-manual"),
    title_th: "คู่มือเขียนเอกสารเทคนิค", title_en: "The Technical Writing Manual",
    short_th: "เขียน spec, RFC และ README ที่ทีมอ่านแล้วตัดสินใจได้จริง",
    short_en: "Write specs, RFCs and READMEs your team can actually decide from.",
    long_th:
      "คู่มือภาคปฏิบัติว่าด้วยการเขียนเอกสารที่คนอ่านจริง ตั้งแต่โครงสร้าง RFC การเขียนสรุปผู้บริหาร ไปจนถึงการทบทวนเอกสารของเพื่อนร่วมทีม มีตัวอย่างก่อนและหลังแก้ทุกบท",
    long_en:
      "A practical manual on writing documents people read: RFC structure, executive summaries, and reviewing a teammate's draft. Every chapter has a before-and-after example.",
    author_th: "Field Manual Press", author_en: "Field Manual Press",
    price: 290, list_price: 350, rating: 4.8, reviews: 227, pages: 184,
    file_size: "6.4 MB", version: "2.0", updated: "2026-07-03", license: "personal",
    sort: 4, created_at: "2024-03-15",
  },
  {
    id: "orbit-icon-set",
    kind: "design",
    shop: shop("meridian-ui"),
    title_th: "Orbit Icon Set", title_en: "Orbit Icon Set",
    short_th: "ไอคอนเส้น 1,200 ชิ้นบนกริด 24px ปรับน้ำหนักเส้นได้",
    short_en: "1,200 line icons on a 24px grid with adjustable stroke.",
    long_th:
      "ชุดไอคอนสำหรับอินเทอร์เฟซเชิงเทคนิค วาดบนกริดเดียวกันทั้งหมด มีให้ทั้ง SVG, ไลบรารี Figma และ icon font พร้อมชื่อที่ค้นหาได้",
    long_en:
      "Icons for technical interfaces, all drawn on one grid. Delivered as SVG, a Figma library and an icon font, with searchable names.",
    author_th: "Meridian UI", author_en: "Meridian UI",
    price: 450, list_price: 590, rating: 4.9, reviews: 541, pages: 0,
    file_size: "22 MB", version: "4.0", updated: "2026-09-02", license: "commercial",
    sort: 5, created_at: "2023-10-01",
  },
  {
    id: "weekly-review-kit",
    kind: "productivity",
    shop: shop("halyard-systems"),
    title_th: "ชุดทบทวนรายสัปดาห์", title_en: "Weekly Review Kit",
    short_th: "เทมเพลตทบทวนงาน 30 นาทีต่อสัปดาห์ พร้อมคำถามนำ",
    short_en: "A 30-minute weekly review with guided prompts.",
    long_th:
      "กระบวนการทบทวนงานรายสัปดาห์ที่สั้นพอจะทำได้จริง มีคำถามนำ ตัวติดตามนิสัย และสรุปรายเดือนอัตโนมัติ ใช้ได้ทั้ง Notion และพิมพ์ออกมา",
    long_en:
      "A weekly review short enough to keep doing: guided prompts, a habit tracker and an automatic monthly summary. Works in Notion or printed.",
    author_th: "Halyard Systems", author_en: "Halyard Systems",
    price: 149, list_price: 199, rating: 4.6, reviews: 189, pages: 0,
    file_size: "0.8 MB", version: "1.3", updated: "2026-05-18", license: "personal",
    sort: 6, created_at: "2025-08-21",
  },
  {
    id: "incident-report-templates",
    kind: "template",
    shop: shop("field-manual"),
    title_th: "เทมเพลตรายงานเหตุขัดข้อง", title_en: "Incident Report Templates",
    short_th: "เทมเพลต postmortem, runbook และสรุปเหตุการณ์ 12 แบบ",
    short_en: "12 templates for postmortems, runbooks and incident summaries.",
    long_th:
      "ชุดเอกสารสำหรับทีมที่ดูแลระบบ ตั้งแต่บันทึกระหว่างเกิดเหตุ รายงาน postmortem แบบไม่กล่าวโทษ ไปจนถึง runbook ที่ส่งต่อให้คนเข้าเวรได้",
    long_en:
      "Documents for teams that run systems: live incident logs, blameless postmortems, and runbooks you can hand to whoever is on call.",
    author_th: "Field Manual Press", author_en: "Field Manual Press",
    price: 240, list_price: 240, rating: 4.5, reviews: 74, pages: 46,
    file_size: "2.1 MB", version: "1.1", updated: "2026-04-09", license: "commercial",
    sort: 7, created_at: "2025-04-02",
  },
  {
    id: "terrain-texture-pack",
    kind: "asset",
    shop: shop("meridian-ui"),
    title_th: "Terrain Texture Pack", title_en: "Terrain Texture Pack",
    short_th: "พื้นผิวภูมิประเทศความละเอียดสูง 80 ภาพ สำหรับงานพรีเซนต์",
    short_en: "80 high-resolution terrain textures for presentations.",
    long_th:
      "ภาพพื้นผิวจากข้อมูลภูมิประเทศจริง ปรับโทนให้ใช้เป็นพื้นหลังสไลด์ เว็บไซต์ และงานพิมพ์ได้ ไฟล์ TIFF 8K และ JPG สำหรับเว็บ",
    long_en:
      "Textures derived from real elevation data, toned for slides, websites and print. 8K TIFF masters plus web-ready JPG.",
    author_th: "Meridian UI", author_en: "Meridian UI",
    price: 320, list_price: 420, rating: 4.4, reviews: 61, pages: 0,
    file_size: "1.4 GB", version: "1.0", updated: "2026-02-14", license: "commercial",
    sort: 8, created_at: "2026-02-14",
  },
  {
    id: "api-review-checklist",
    kind: "devtool",
    shop: shop("northline-dev"),
    title_th: "API Review Checklist", title_en: "API Review Checklist",
    short_th: "เช็กลิสต์ 140 ข้อสำหรับรีวิว REST API ก่อนขึ้นโปรดักชัน",
    short_en: "A 140-point checklist for reviewing REST APIs before production.",
    long_th:
      "รายการตรวจที่ครอบคลุมความปลอดภัย การจัดการเวอร์ชัน การแบ่งหน้า และ error format พร้อมไฟล์ lint rule สำหรับ Spectral ที่ใช้ตรวจอัตโนมัติใน CI",
    long_en:
      "Covers security, versioning, pagination and error formats — plus Spectral lint rules so CI checks most of it for you.",
    author_th: "Northline Dev", author_en: "Northline Dev",
    price: 190, list_price: 190, rating: 4.7, reviews: 96, pages: 38,
    file_size: "0.6 MB", version: "2.2", updated: "2026-08-11", license: "personal",
    sort: 9, created_at: "2025-01-12",
  },
];

/* ---------- เนื้อหาตามประเภทสินค้า ---------- */
export const INCLUDED: Record<Category, TKey[]> = {
  notion: ["incNotion1", "incNotion2", "incNotion3", "incCommon1"],
  productivity: ["incNotion1", "incProd2", "incProd3", "incCommon1"],
  uikit: ["incKit1", "incKit2", "incKit3", "incCommon1"],
  design: ["incDesign1", "incDesign2", "incDesign3", "incCommon1"],
  devtool: ["incDev1", "incDev2", "incDev3", "incCommon1"],
  template: ["incTpl1", "incTpl2", "incCommon1"],
  guide: ["incGuide1", "incGuide2", "incCommon1"],
  asset: ["incAsset1", "incAsset2", "incCommon1"],
};

export const FAQ = ["faqDelivery", "faqRedownload", "faqLicense", "faqUpdates", "faqPayment"] as const;

/** รีวิวตัวอย่าง แสดงเฉพาะสินค้าตัวอย่าง (ไม่ใส่ในสินค้าจริงจากฐานข้อมูล) */
export const SAMPLE_REVIEWS: SampleReview[] = [
  {
    name: "Pim S.", role_th: "Product manager", role_en: "Product manager", rating: 5, date: "2026-09-14",
    th: "โครงสร้างชัดเจนมาก ใช้กับทีมห้าคนได้ทันทีโดยไม่ต้องปรับเยอะ",
    en: "The structure is clear. My team of five was using it the same afternoon.",
  },
  {
    name: "Daniel K.", role_th: "Engineer", role_en: "Engineer", rating: 5, date: "2026-08-30",
    th: "เอกสารประกอบดีกว่าที่คาด อธิบายเหตุผลของแต่ละส่วนไว้ครบ",
    en: "Better documentation than expected — it explains why each part exists.",
  },
  {
    name: "Nok T.", role_th: "Designer", role_en: "Designer", rating: 4, date: "2026-07-22",
    th: "คุ้มราคา อยากให้มีตัวอย่างการใช้งานมากกว่านี้อีกนิด",
    en: "Worth the price. I'd like a few more worked examples.",
  },
];
