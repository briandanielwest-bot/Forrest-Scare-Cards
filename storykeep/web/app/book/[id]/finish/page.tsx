"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api, ApiError, type Book } from "@/lib/api";
import { BookNav } from "@/components/BookNav";

interface FrontMatter {
  titlePage: { title: string; subtitle: string; byline: string };
  dedication: string;
  epigraph: string;
  authorNote: string;
  backCover: string;
}

interface Price {
  amount: number;
  label: string;
  blurb: string;
}

function FinishPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const [book, setBook] = useState<Book | null>(null);
  const [frontMatter, setFrontMatter] = useState<FrontMatter | null>(null);
  const [prices, setPrices] = useState<Record<string, Price> | null>(null);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [orders, setOrders] = useState<{ kind: string; status: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [bookData, priceData, orderData] = await Promise.all([
      api.get<{ book: Book }>(`/api/books/${id}`),
      api.get<{ prices: Record<string, Price>; paymentsEnabled: boolean }>(
        `/api/books/${id}/orders/prices`,
      ),
      api.get<{ orders: { kind: string; status: string }[] }>(`/api/books/${id}/orders`),
    ]);
    setBook(bookData.book);
    setPrices(priceData.prices);
    setPaymentsEnabled(priceData.paymentsEnabled);
    setOrders(orderData.orders);
  }, [id]);

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof ApiError ? err.message : "Couldn't open this book."),
    );
  }, [load]);

  const unlocked = !paymentsEnabled || orders.some((o) => o.kind === "export" && o.status === "paid");

  async function makeFrontMatter() {
    setBusy("front");
    setError(null);
    try {
      const data = await api.post<{ frontMatter: FrontMatter }>(
        `/api/books/${id}/export/front-matter`,
        {},
      );
      setFrontMatter(data.frontMatter);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cass couldn't set the front matter.");
    } finally {
      setBusy(null);
    }
  }

  async function buy(kind: "export" | "print" | "animation") {
    setBusy(kind);
    setError(null);
    try {
      const data = await api.post<{ url?: string; free?: boolean }>(
        `/api/books/${id}/orders/checkout`,
        { kind },
      );
      if (data.url) window.location.href = data.url;
      else await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start that order.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="wrap" style={{ padding: "32px 20px 80px" }}>
      {book ? <BookNav bookId={id} book={book} /> : null}
      {error ? <div className="notice error">{error}</div> : null}
      {params.get("paid") === "1" ? (
        <div className="notice ok">
          Payment received — thank you. Your downloads are below.
        </div>
      ) : null}

      <div className="card">
        <h2>The front of the book</h2>
        <p className="muted">
          Cass sets the title page, the dedication and the back cover from your own words. It
          will never invent a dedication — if you haven't said who the book is for, that page
          is simply left out.
        </p>
        <button className="btn" onClick={makeFrontMatter} disabled={busy !== null}>
          {busy === "front" ? "Setting it…" : frontMatter ? "Do it again" : "Set the front matter"}
        </button>

        {frontMatter ? (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontFamily: "var(--serif)", fontSize: "1.5rem", margin: 0 }}>
              {frontMatter.titlePage.title}
            </p>
            {frontMatter.titlePage.subtitle ? (
              <p className="muted" style={{ fontStyle: "italic", margin: "4px 0" }}>
                {frontMatter.titlePage.subtitle}
              </p>
            ) : null}
            <p className="muted">{frontMatter.titlePage.byline}</p>
            {frontMatter.dedication ? (
              <p style={{ fontStyle: "italic" }}>{frontMatter.dedication}</p>
            ) : null}
            {frontMatter.backCover ? (
              <>
                <h3 style={{ marginTop: 18 }}>Back cover</h3>
                <p className="muted">{frontMatter.backCover}</p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2>See it as a book</h2>
        <p className="muted">
          A real typeset preview — proper trim size, margins, page numbers. Free, always.
        </p>
        <a
          className="btn"
          href={api.downloadUrl(`/api/books/${id}/export/preview.pdf`)}
          target="_blank"
          rel="noreferrer"
        >
          Open the preview
        </a>
      </div>

      <div className="card">
        <h2>Take it away</h2>
        {unlocked ? (
          <>
            <p className="muted">Yours. Download it as often as you like.</p>
            <div className="row">
              {(["pdf", "epub", "docx"] as const).map((format) => (
                <a
                  key={format}
                  className="btn quiet"
                  href={api.downloadUrl(`/api/books/${id}/export/${format}`)}
                >
                  {format === "pdf"
                    ? "Print-ready PDF"
                    : format === "epub"
                      ? "E-book (EPUB)"
                      : "Word document"}
                </a>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="muted">{prices?.export.blurb}</p>
            <button className="btn big" onClick={() => buy("export")} disabled={busy !== null}>
              {busy === "export"
                ? "One moment…"
                : `${prices?.export.label} — ${money(prices?.export.amount)}`}
            </button>
          </>
        )}
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>{prices?.print.label ?? "A printed hardcover"}</h3>
          <p className="muted">{prices?.print.blurb}</p>
          <button className="btn quiet" onClick={() => buy("print")} disabled={busy !== null}>
            {orders.some((o) => o.kind === "print" && o.status === "paid")
              ? "Ordered"
              : `Order one — ${money(prices?.print.amount)}`}
          </button>
        </div>
        <div className="card">
          <h3>{prices?.animation.label ?? "Animate it"}</h3>
          <p className="muted">{prices?.animation.blurb}</p>
          <button className="btn quiet" onClick={() => buy("animation")} disabled={busy !== null}>
            {orders.some((o) => o.kind === "animation" && o.status === "paid")
              ? "Ordered — we'll be in touch"
              : `Ask about it — ${money(prices?.animation.amount)}`}
          </button>
          <p className="hint">
            A person handles this one. We'll email you within two working days to talk about
            the voice and the pacing before anything is made.
          </p>
        </div>
      </div>
    </div>
  );
}

function money(cents?: number): string {
  if (cents === undefined) return "";
  return `$${(cents / 100).toFixed(0)}`;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 56 }}>Loading…</div>}>
      <FinishPage />
    </Suspense>
  );
}
