const s = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const Back = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} strokeWidth={2} {...p}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const Search = (p) => (
  <svg width="17" height="17" viewBox="0 0 24 24" {...s} strokeWidth={2} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.2-3.2" />
  </svg>
);

export const Home = (p) => (
  <svg width="21" height="21" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
  </svg>
);

export const Orders = (p) => (
  <svg width="21" height="21" viewBox="0 0 24 24" {...s} {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </svg>
);

export const Track = (p) => (
  <svg width="21" height="21" viewBox="0 0 24 24" {...s} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.4-3.4" />
    <path d="M11 8v3.2l2 1.4" />
  </svg>
);

export const Info = (p) => (
  <svg width="21" height="21" viewBox="0 0 24 24" {...s} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 7.8v.4" />
  </svg>
);

export const Check = (p) => (
  <svg width="12" height="12" viewBox="0 0 24 24" {...s} strokeWidth={3.2} {...p}>
    <path d="M4 12.5l5.5 5.5L20 6.5" />
  </svg>
);

export const BigCheck = (p) => (
  <svg width="34" height="34" viewBox="0 0 24 24" {...s} strokeWidth={2.4} {...p}>
    <path d="M4 12.5l5.5 5.5L20 6.5" />
  </svg>
);

export const Dot = (p) => (
  <svg width="7" height="7" viewBox="0 0 8 8" {...p}>
    <circle cx="4" cy="4" r="3" fill="currentColor" />
  </svg>
);

export const Star = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
  </svg>
);

export const Card = (p) => (
  <svg width="17" height="17" viewBox="0 0 24 24" {...s} strokeWidth={2} {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
    <path d="M2.5 10h19" />
  </svg>
);

export const Download = (p) => (
  <svg width="17" height="17" viewBox="0 0 24 24" {...s} strokeWidth={2} {...p}>
    <path d="M12 3.5v11" />
    <path d="M8 11l4 4 4-4" />
    <path d="M4.5 19.5h15" />
  </svg>
);

export const Mail = (p) => (
  <svg width="32" height="32" viewBox="0 0 24 24" {...s} {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

export const Arrow = (p) => (
  <svg width="17" height="17" viewBox="0 0 24 24" {...s} strokeWidth={2} {...p}>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

export const Logo = ({ size = 22, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 54 54" aria-hidden="true" {...p}>
    <rect x="4" y="9" width="21" height="36" rx="5" fill="var(--orange)" />
    <rect x="28" y="9" width="21" height="36" rx="5" fill="var(--orange)" opacity=".5" />
  </svg>
);
