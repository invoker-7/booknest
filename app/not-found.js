import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <p>404</p>
      <Link className="btn small" href="/" style={{ width: "auto", display: "inline-flex" }}>
        Digital Finder
      </Link>
    </div>
  );
}
