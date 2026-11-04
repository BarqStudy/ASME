import Link from "next/link";
export default function NotFound() {
  return (
    <main className="wrap section">
      <span className="eyebrow">404</span>
      <h1>
        هذه الصفحة غير موجودة
        <br />
        Page not found
      </h1>
      <Link className="button primary" href="/">
        الرئيسية · Home
      </Link>
    </main>
  );
}
