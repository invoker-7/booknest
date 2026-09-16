/**
 * ปกหนังสือวาดด้วย SVG ไม่ต้องโหลดรูปจากภายนอก
 * ฟิลด์ books.cover ในฐานข้อมูลเป็นตัวเลือกชุดปก: clean | design | mindset
 */

function Clean({ title }) {
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={title}>
      <rect width="120" height="160" fill="#31455A" />
      <circle cx="86" cy="36" r="13" fill="#F0C9A0" opacity=".9" />
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

function Fallback({ title }) {
  const initial = (title || "?").trim().charAt(0).toUpperCase();
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={title}>
      <rect width="120" height="160" fill="#F6E2CE" />
      <circle cx="60" cy="70" r="30" fill="#E4703B" opacity=".25" />
      <text x="60" y="82" textAnchor="middle" fill="#8A5230" fontFamily="Inter, sans-serif" fontSize="30" fontWeight="700">{initial}</text>
    </svg>
  );
}

const SETS = { clean: Clean, design: Design, mindset: Mindset };

export default function Cover({ cover, title }) {
  const C = SETS[cover] || Fallback;
  return <C title={title} />;
}
