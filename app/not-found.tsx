import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty" style={{ minHeight: "60vh", display: "grid", placeContent: "center" }}>
      <div className="big">404 / ∅</div>
      页面不存在。
      <div style={{ marginTop: 18 }}>
        <Link href="/">← 返回索引</Link>
      </div>
    </div>
  );
}
