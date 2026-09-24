/**
 * ปกสินค้าวาดด้วย SVG ไม่ต้องโหลดรูปจากภายนอก
 * books.cover = ชุดปกเดิม (clean | design | mindset)
 * books.kind  = ประเภทสินค้า ใช้วาดปกแบบ layout (template | uikit | guide | preset)
 */

function Clean({ title }) {
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={title}>
      <rect width="120" height="160" fill="#31455A" />
      <circle cx="96" cy="70" r="10" fill="#F0C9A0" opacity=".9" />
      <path d="M0 112l30-34 22 24 20-26 48 44v40H0z" fill="#587187" />
      <path d="M0 132l26-26 24 20 26-22 44 34v22H0z" fill="#7D96A8" />
      <path d="M0 146l34-16 30 12 26-12 30 14v16H0z" fill="#A9BCC7" />
      <text x="60" y="34" textAnchor="middle" fill="#fff" fontFamily="Inter, sans-serif" fontSize="11.5" fontWeight="600">Clean Code</text>
      <text x="60" y="49" textAnchor="middle" fill="#fff" fontFamily="Inter, sans-serif" fontSize="11.5" fontWeight="600">Better Software</text>
    </svg>
  );
}

function Design({ title }) {
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={title}>
      <rect width="120" height="160" fill="#F6E2CE" />
      <circle cx="94" cy="30" r="22" fill="#E4703B" opacity=".18" />
      <path d="M14 122a30 30 0 0160 0z" fill="#E4703B" opacity=".55" />
      <circle cx="90" cy="118" r="16" fill="#6E8F76" opacity=".5" />
      <path d="M0 150h120v10H0z" fill="#E4703B" opacity=".3" />
      <text x="16" y="52" fill="#3A2B20" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700">Design</text>
      <text x="16" y="69" fill="#3A2B20" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700">Thinking</text>
      <text x="16" y="88" fill="#E4703B" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700">101</text>
    </svg>
  );
}

function Mindset({ title }) {
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={title}>
      <rect width="120" height="160" fill="#EAEFE6" />
      <path d="M60 24a44 44 0 0144 44H60z" fill="#E4703B" opacity=".6" />
      <path d="M60 68a44 44 0 01-44-44h44z" fill="#6E8F76" opacity=".55" />
      <circle cx="60" cy="68" r="7" fill="#F6E2CE" />
      <text x="60" y="108" textAnchor="middle" fill="#2E3A2C" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700">The Mindset</text>
      <text x="60" y="124" textAnchor="middle" fill="#2E3A2C" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700">Shift</text>
      <rect x="42" y="134" width="36" height="2.5" rx="1.2" fill="#E4703B" opacity=".7" />
    </svg>
  );
}

/* ---------- ปกแบบ layout ตามประเภทสินค้า (ไม่ต้องอัปโหลดรูป) ---------- */
const INK = "#1E3933", ORANGE = "#EF7442", SAGE = "#477866", LINE = "#D5E2D8";

function Template({ title }) {
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={title}>
      <rect width="120" height="160" fill="#F4F8F3" />
      <rect x="12" y="16" width="96" height="128" rx="4" fill="#fff" stroke={LINE} />
      <rect x="12" y="16" width="96" height="10" rx="4" fill={LINE} />
      <circle cx="18" cy="21" r="1.6" fill={ORANGE} /><circle cx="23" cy="21" r="1.6" fill="#F3B98F" /><circle cx="28" cy="21" r="1.6" fill={SAGE} />
      <rect x="20" y="36" width="50" height="6" rx="2" fill={INK} />
      <rect x="20" y="46" width="36" height="3" rx="1.5" fill={LINE} />
      <rect x="20" y="55" width="22" height="7" rx="2" fill={ORANGE} />
      <rect x="20" y="72" width="80" height="34" rx="3" fill="#E3F0E8" />
      <rect x="20" y="112" width="24" height="24" rx="3" fill="#F7E6DA" />
      <rect x="48" y="112" width="24" height="24" rx="3" fill="#E3F0E8" />
      <rect x="76" y="112" width="24" height="24" rx="3" fill="#F7E6DA" />
    </svg>
  );
}

function UIKit({ title }) {
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={title}>
      <rect width="120" height="160" fill="#1E3933" />
      <g fill="none" stroke="#2F564B">{[20, 40, 60, 80, 100].map((x) => <path key={x} d={`M${x} 0v160`} />)}</g>
      <rect x="16" y="22" width="40" height="12" rx="6" fill={ORANGE} />
      <rect x="62" y="22" width="40" height="12" rx="6" fill="none" stroke="#9CC3B1" />
      <rect x="16" y="44" width="86" height="12" rx="3" fill="#2F564B" />
      <rect x="20" y="48.5" width="30" height="3" rx="1.5" fill="#9CC3B1" />
      <rect x="16" y="66" width="40" height="46" rx="4" fill="#F4F8F3" />
      <rect x="21" y="71" width="30" height="18" rx="2" fill="#E3F0E8" />
      <rect x="21" y="94" width="22" height="3" rx="1.5" fill={INK} />
      <rect x="21" y="101" width="14" height="3" rx="1.5" fill={ORANGE} />
      <rect x="62" y="66" width="40" height="20" rx="4" fill="#2F564B" />
      <circle cx="72" cy="76" r="5" fill="#9CC3B1" />
      <rect x="62" y="92" width="18" height="10" rx="5" fill={ORANGE} />
      <circle cx="75" cy="97" r="3.5" fill="#fff" />
      <rect x="16" y="122" width="86" height="4" rx="2" fill="#2F564B" />
      <rect x="16" y="122" width="54" height="4" rx="2" fill="#9CC3B1" />
    </svg>
  );
}

function Guide({ title }) {
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={title}>
      <rect width="120" height="160" fill="#FBF3EA" />
      <rect x="16" y="18" width="18" height="3" rx="1.5" fill={ORANGE} />
      <rect x="16" y="28" width="80" height="7" rx="2" fill={INK} />
      <rect x="16" y="39" width="56" height="7" rx="2" fill={INK} />
      {[58, 65, 72, 79, 86].map((y, i) => <rect key={y} x="16" y={y} width={i === 4 ? 50 : 88} height="3" rx="1.5" fill="#D9CBBB" />)}
      <rect x="16" y="98" width="88" height="34" rx="3" fill="#F3DCC6" />
      <path d="M22 126l14-14 10 8 14-16 18 22z" fill={ORANGE} opacity=".55" />
      <rect x="16" y="140" width="40" height="3" rx="1.5" fill="#D9CBBB" />
    </svg>
  );
}

function Preset({ title }) {
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={title}>
      <rect width="120" height="160" fill="#F4F8F3" />
      {[["#F3B98F", "#EF7442"], ["#9CC3B1", "#477866"], ["#E8D5B5", "#B08A55"], ["#C9D8DD", "#5C7E8A"]].map(([a, b], i) => (
        <g key={i}>
          <rect x={16 + (i % 2) * 46} y={18 + Math.floor(i / 2) * 50} width="42" height="42" rx="4" fill={a} />
          <path d={`M${16 + (i % 2) * 46} ${60 + Math.floor(i / 2) * 50}l42-42v38a4 4 0 01-4 4z`} fill={b} />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="16" y={124 + i * 8} width="88" height="2" rx="1" fill={LINE} />
          <circle cx={40 + i * 22} cy={125 + i * 8} r="3" fill={i === 1 ? ORANGE : INK} />
        </g>
      ))}
    </svg>
  );
}

const SETS = { clean: Clean, design: Design, mindset: Mindset };
const KINDS = { template: Template, uikit: UIKit, guide: Guide, preset: Preset };

/** ปกชุดเดิม (books.cover) มาก่อน ไม่งั้นวาด layout ตามประเภทสินค้า (books.kind) */
export default function Cover({ cover, kind, title }) {
  const C = SETS[cover] || KINDS[kind] || Template;
  return <C title={title} />;
}
