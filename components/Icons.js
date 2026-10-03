/** ไอคอนเส้น 1.5px บนกริด 24 — ใช้ currentColor ทั้งหมด */
function I({ children, size = 20, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Search = (p) => <I {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></I>;
export const Cart = (p) => <I {...p}><path d="M3 4h2.5l2.2 11h10.6L20.5 7H7" /><circle cx="9" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" /></I>;
export const Menu = (p) => <I {...p}><path d="M3 7h18M3 12h18M3 17h18" /></I>;
export const Close = (p) => <I {...p}><path d="M5 5l14 14M19 5L5 19" /></I>;
export const Arrow = (p) => <I {...p}><path d="M4 12h15M13 6l6 6-6 6" /></I>;
export const ArrowLeft = (p) => <I {...p}><path d="M20 12H5M11 6l-6 6 6 6" /></I>;
export const ArrowUpRight = (p) => <I {...p}><path d="M7 17L17 7M8 7h9v9" /></I>;
export const Chevron = (p) => <I {...p}><path d="M6 9l6 6 6-6" /></I>;
export const Check = (p) => <I {...p}><path d="M4.5 12.5l5 5 10-11" /></I>;
export const Plus = (p) => <I {...p}><path d="M12 4v16M4 12h16" /></I>;
export const Minus = (p) => <I {...p}><path d="M4 12h16" /></I>;
export const Download = (p) => <I {...p}><path d="M12 3v12M6.5 10l5.5 5.5 5.5-5.5M4 20h16" /></I>;
export const Bookmark = ({ filled, ...p }) => (
  <I {...p}><path d="M6 3h12v18l-6-4.5L6 21z" fill={filled ? "currentColor" : "none"} /></I>
);
export const Grid = (p) => <I {...p}><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></I>;
export const List = (p) => <I {...p}><path d="M4 6h16M4 12h16M4 18h16" /></I>;
export const Filter = (p) => <I {...p}><path d="M3 6h18M6 12h12M10 18h4" /></I>;
export const Home = (p) => <I {...p}><path d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z" /></I>;
export const Box = (p) => <I {...p}><path d="M4 7.5L12 3.5l8 4v9l-8 4-8-4zM4 7.5l8 4 8-4M12 11.5v9" /></I>;
export const Archive = (p) => <I {...p}><path d="M3 4h18v4H3zM5 8v12h14V8M9.5 12h5" /></I>;
export const Library = (p) => <I {...p}><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-.8 2.8 15.6-3.6.8z" /></I>;
export const Star = ({ filled = true, ...p }) => (
  <I {...p} strokeWidth="1.3"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z" fill={filled ? "currentColor" : "none"} /></I>
);
export const Alert = (p) => <I {...p}><path d="M12 3.5L22 20H2zM12 10v4.5M12 17v.5" /></I>;
export const Info = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></I>;
export const Mail = (p) => <I {...p}><path d="M3 5.5h18v13H3zM3 6l9 7 9-7" /></I>;
export const Lock = (p) => <I {...p}><path d="M5 11h14v10H5zM8 11V7.5a4 4 0 018 0V11" /></I>;
export const Print = (p) => <I {...p}><path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6z" /></I>;
export const Trash = (p) => <I {...p}><path d="M4 6h16M9 6V3.5h6V6M6 6l1 15h10l1-15" /></I>;
export const Globe = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z" /></I>;
export const Spinner = ({ size = 16 }) => (
  <svg className="spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/** เครื่องหมาย VECTOR: ลูกศรเวกเตอร์ในกรอบสี่เหลี่ยม */
export function Mark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 18L17 7M10 7h7v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}
