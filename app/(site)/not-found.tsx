import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="empty" style={{ minHeight: "60vh", display: "grid", placeContent: "center" }}>
      <h1 className="big" style={{ margin: 0 }}>404 / ∅</h1>
      页面不存在。
      <div style={{ marginTop: 18 }}>
        <Link href="/">← 返回索引</Link>
      </div>
    </main>
  );
}
