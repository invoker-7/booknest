/**
 * ภาพตัวอย่างสินค้าแบบแบบร่างเชิงเทคนิค (SVG ล้วน ไม่ต้องโหลดรูป)
 * วาดตามหมวดหมู่สินค้า — แสดงโครงสร้างของไฟล์ ไม่ใช่ภาพหน้าจอจริง
 */

import type { Category } from "@/lib/types";

type Tone = "light" | "dark";

interface Palette {
  bg: string;
  grid: string;
  line: string;
  soft: string;
  fill: string;
  text: string;
}

type DrawProps = { c: Palette };

const TONES: Record<Tone, Palette> = {
  light: { bg: "#E9E8E3", grid: "#D6D5CF", line: "#1F3A68", soft: "#8A9BB8", fill: "#FFFFFF", text: "#4A5058" },
  dark: { bg: "#13243F", grid: "#1E3354", line: "#E8ECF3", soft: "#6F84A6", fill: "#1A2E4E", text: "#A9B6CB" },
};

// หมวดไหนใช้พื้นเข้ม เพื่อให้แคตตาล็อกมีจังหวะ ไม่ซ้ำกันทั้งแถว
const DARK = new Set<Category>(["uikit", "devtool", "asset"]);

// เส้นกริดทั้งหมดรวมเป็น path เดียว (คำนวณครั้งเดียว) — ลดจำนวน element ต่อภาพจาก ~33 เหลือ 1
const GRID_PATH = (() => {
  const w = 400, h = 300, step = 20;
  let d = "";
  for (let x = step; x < w; x += step) d += `M${x} 0V${h}`;
  for (let y = step; y < h; y += step) d += `M0 ${y}H${w}`;
  return d;
})();

function GridBg({ c }: DrawProps) {
  return <path d={GRID_PATH} stroke={c.grid} strokeWidth="1" fill="none" />;
}

function Ticks({ c }: DrawProps) {
  // เครื่องหมายมุมแบบแบบร่าง
  const s = { stroke: c.line, strokeWidth: 1.5, fill: "none" };
  return (
    <g {...s}>
      <path d="M16 30V16h14" />
      <path d="M370 16h14v14" />
      <path d="M384 270v14h-14" />
      <path d="M30 284H16v-14" />
    </g>
  );
}

function Notion({ c }: DrawProps) {
  return (
    <g stroke={c.line} strokeWidth="1.5" fill="none">
      <rect x="80" y="70" width="240" height="160" fill={c.fill} />
      <path d="M80 98h240M80 126h240M80 154h240M80 182h240M80 210h240M150 70v160M230 70v160" stroke={c.soft} strokeWidth="1" />
      <path d="M80 98h240" />
      <rect x="90" y="80" width="40" height="8" fill={c.line} stroke="none" />
      <rect x="160" y="108" width="50" height="8" fill={c.soft} stroke="none" />
      <rect x="240" y="136" width="56" height="8" fill={c.soft} stroke="none" />
      <rect x="160" y="164" width="34" height="8" fill={c.soft} stroke="none" />
      <circle cx="96" cy="112" r="4" /><circle cx="96" cy="140" r="4" /><circle cx="96" cy="168" r="4" fill={c.line} />
      <path d="M320 112h30v80h-30" strokeDasharray="4 4" />
      <path d="M344 186l6 6 6-6" />
    </g>
  );
}

function Productivity({ c }: DrawProps) {
  return (
    <g stroke={c.line} strokeWidth="1.5" fill="none">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <rect x={72 + i * 38} y="80" width="30" height="120" fill={c.fill} />
          <rect x={72 + i * 38} y={200 - [60, 90, 40, 100, 70, 30, 80][i]} width="30" height={[60, 90, 40, 100, 70, 30, 80][i]} fill={i === 3 ? c.line : c.soft} stroke="none" opacity={i === 3 ? 1 : 0.55} />
        </g>
      ))}
      <path d="M72 220h258" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M${87 + i * 38} 220v6`} />)}
    </g>
  );
}

function UIKit({ c }: DrawProps) {
  return (
    <g stroke={c.line} strokeWidth="1.5" fill="none">
      <rect x="70" y="64" width="110" height="28" fill={c.line} stroke="none" />
      <rect x="190" y="64" width="110" height="28" />
      <rect x="70" y="108" width="230" height="30" fill={c.fill} />
      <path d="M82 123h80" stroke={c.soft} />
      <rect x="70" y="154" width="110" height="80" fill={c.fill} />
      <path d="M70 196h110" stroke={c.soft} />
      <path d="M82 210h60M82 222h40" stroke={c.soft} />
      <rect x="190" y="154" width="110" height="36" fill={c.fill} />
      <rect x="190" y="200" width="50" height="22" rx="11" />
      <circle cx="229" cy="211" r="7" fill={c.line} />
      <rect x="250" y="200" width="50" height="22" />
      <path d="M316 64v170" strokeDasharray="3 5" stroke={c.soft} />
      <path d="M312 64h8M312 234h8" />
      <text x="326" y="153" fill={c.text} stroke="none" fontSize="10">170</text>
    </g>
  );
}

function Design({ c }: DrawProps) {
  return (
    <g stroke={c.line} strokeWidth="1.5" fill="none">
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((k) => (
          <rect key={`${r}${k}`} x={80 + k * 62} y={60 + r * 62} width="54" height="54" fill={c.fill} stroke={c.soft} strokeWidth="1" />
        ))
      )}
      <circle cx="107" cy="87" r="16" />
      <path d="M161 75l12 24h-24z" />
      <rect x="219" y="73" width="28" height="28" />
      <path d="M281 87h28M295 73v28" />
      <path d="M93 149h28v-14l14 14-14 14v-14" transform="translate(0 0)" />
      <circle cx="169" cy="149" r="14" /><path d="M169 135v28M155 149h28" stroke={c.soft} />
      <path d="M220 160l13-24 13 24" /><path d="M225 152h16" />
      <rect x="281" y="135" width="28" height="20" /><path d="M285 159h20" />
      <circle cx="107" cy="211" r="5" fill={c.line} />
      <path d="M150 211h38M169 192v38" strokeDasharray="2 3" />
      <rect x="221" y="197" width="26" height="26" rx="6" />
      <path d="M283 199l24 24M307 199l-24 24" />
    </g>
  );
}

function DevTool({ c }: DrawProps) {
  const rows = [
    [0, 90, 1], [1, 140, 0], [1, 120, 0], [2, 80, 0], [2, 150, 1], [1, 60, 0], [0, 40, 1], [0, 110, 0],
  ];
  return (
    <g stroke={c.line} strokeWidth="1.5" fill="none">
      <rect x="70" y="56" width="260" height="188" fill={c.fill} />
      <path d="M70 80h260" />
      <circle cx="84" cy="68" r="3.5" /><circle cx="96" cy="68" r="3.5" /><circle cx="108" cy="68" r="3.5" />
      {rows.map(([ind, w, hi], i) => (
        <g key={i} stroke="none">
          <text x="82" y={104 + i * 17} fill={c.soft} fontSize="9">{String(i + 1).padStart(2, "0")}</text>
          <rect x={104 + ind * 16} y={97 + i * 17} width={w} height="6" fill={hi ? c.line : c.soft} opacity={hi ? 1 : 0.6} />
        </g>
      ))}
      <path d="M104 238h8" strokeWidth="2" />
    </g>
  );
}

function Template({ c }: DrawProps) {
  return (
    <g stroke={c.line} strokeWidth="1.5" fill="none">
      <rect x="124" y="52" width="152" height="200" fill={c.fill} transform="translate(12 -6)" stroke={c.soft} />
      <rect x="124" y="52" width="152" height="200" fill={c.fill} />
      <rect x="138" y="68" width="60" height="8" fill={c.line} stroke="none" />
      <path d="M138 88h124" />
      {[104, 116, 128, 140].map((y, i) => <path key={y} d={`M138 ${y}h${i === 3 ? 80 : 124}`} stroke={c.soft} />)}
      <rect x="138" y="156" width="124" height="44" stroke={c.soft} />
      <path d="M138 171h124M138 186h124M180 156v44M222 156v44" stroke={c.soft} strokeWidth="1" />
      <path d="M138 222h50" />
      <path d="M212 230c8-12 14 8 22-4s10 6 16 0" />
    </g>
  );
}

function Guide({ c }: DrawProps) {
  return (
    <g stroke={c.line} strokeWidth="1.5" fill="none">
      <path d="M200 70c-30-12-74-12-110 0v160c36-12 80-12 110 0z" fill={c.fill} />
      <path d="M200 70c30-12 74-12 110 0v160c-36-12-80-12-110 0z" fill={c.fill} />
      <path d="M200 70v160" />
      <rect x="106" y="90" width="44" height="7" fill={c.line} stroke="none" />
      {[108, 120, 132, 144, 156].map((y) => <path key={y} d={`M106 ${y}h78`} stroke={c.soft} />)}
      <path d="M216 96h76v56h-76z" stroke={c.soft} />
      <path d="M222 146l18-22 14 12 14-18 18 28" />
      {[170, 182, 194].map((y) => <path key={y} d={`M216 ${y}h76`} stroke={c.soft} />)}
      <circle cx="128" cy="192" r="14" /><path d="M128 178v14l10 8" />
    </g>
  );
}

function Asset({ c }: DrawProps) {
  return (
    <g stroke={c.line} fill="none">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path
          key={i}
          strokeWidth={i === 3 ? 1.8 : 1}
          stroke={i === 3 ? c.line : c.soft}
          d={`M60 ${200 - i * 18} C 120 ${160 - i * 22}, 170 ${230 - i * 16}, 230 ${170 - i * 18} S 320 ${150 - i * 14}, 340 ${176 - i * 20}`}
        />
      ))}
      <circle cx="232" cy="116" r="5" fill={c.line} stroke="none" />
      <path d="M232 116l40-40h44" strokeWidth="1.2" />
      <text x="276" y="70" fill={c.text} stroke="none" fontSize="10">ELEV 1,240</text>
    </g>
  );
}

const DRAW: Record<Category, (props: DrawProps) => JSX.Element> = {
  notion: Notion,
  productivity: Productivity,
  uikit: UIKit,
  design: Design,
  devtool: DevTool,
  template: Template,
  guide: Guide,
  asset: Asset,
};

/**
 * <Plate category="uikit" no="002" label="UI KIT" title="..." />
 * bare = ไม่แสดงข้อความกำกับ (ใช้กับ thumbnail ขนาดเล็ก)
 */
interface PlateProps {
  category?: Category;
  /** เลขสินค้า เช่น "002" */
  no?: string;
  label?: string;
  /** ข้อความสำหรับ screen reader — เว้นว่างเมื่อภาพเป็นแค่ของประดับข้างชื่อสินค้า */
  title?: string;
  bare?: boolean;
  tone?: Tone;
}

export default function Plate({ category = "guide", no, label, title, bare = false, tone }: PlateProps) {
  const c = TONES[tone || (DARK.has(category) ? "dark" : "light")];
  const Draw = DRAW[category] || Guide;
  return (
    <svg
      className="plate"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <rect width="400" height="300" fill={c.bg} />
      <GridBg c={c} />
      <Ticks c={c} />
      <Draw c={c} />
      {!bare && (
        <g fontSize="11" fill={c.text} letterSpacing=".06em">
          {no && <text x="38" y="27">PRODUCT / {no}</text>}
          {label && <text x="38" y="281">{label.toUpperCase()}</text>}
        </g>
      )}
    </svg>
  );
}

/** ภาพประกอบ hero: เส้นทางโคจรและเวกเตอร์ แบบแบบร่างวิศวกรรม */
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="40 60 580 450" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <g stroke="#5D78A6" strokeWidth="1.2">
        <ellipse cx="330" cy="290" rx="250" ry="110" transform="rotate(-18 330 290)" />
        <ellipse cx="330" cy="290" rx="170" ry="70" transform="rotate(-18 330 290)" strokeDasharray="4 6" />
      </g>
      <circle cx="330" cy="290" r="54" stroke="#C9D4E6" strokeWidth="1.5" />
      <circle cx="330" cy="290" r="4" fill="#C9D4E6" />
      <path d="M330 290L548 168" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M520 166l28 2-12 25" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="548" cy="168" r="7" fill="#B3261E" />
      <path d="M330 290h230M330 290V80" stroke="#5D78A6" strokeDasharray="2 4" />
      <path d="M392 290a62 62 0 00-8-31" stroke="#C9D4E6" strokeWidth="1.2" />
      <g fontSize="11" fill="#9FB0CC" letterSpacing=".08em">
        <text x="404" y="276">θ 29.2°</text>
        <text x="560" y="160">V₁</text>
        <text x="342" y="92">Y</text>
        <text x="566" y="304">X</text>
        <text x="40" y="496">REF / VX-01 · TRAJECTORY STUDY</text>
      </g>
    </svg>
  );
}
