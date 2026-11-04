"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="wrap section">
      <h1>تعذر تحميل المنصة · Unable to load</h1>
      <p>
        حاول مجددًا أو تواصل مع إدارة النادي. Please try again or contact the
        club.
      </p>
      <button className="button primary" onClick={reset}>
        إعادة المحاولة · Retry
      </button>
    </main>
  );
}
