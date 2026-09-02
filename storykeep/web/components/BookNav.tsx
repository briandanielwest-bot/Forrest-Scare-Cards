"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Book } from "@/lib/api";

const TABS = [
  { slug: "talk", label: "Talk" },
  { slug: "manuscript", label: "The book" },
  { slug: "pictures", label: "Pictures", illustratedOnly: true },
  { slug: "finish", label: "Finish" },
] as const;

export function BookNav({ bookId, book }: { bookId: string; book: Book }) {
  const pathname = usePathname();
  const illustrated = book.genre === "kids" || book.genre === "keepsake";

  return (
    <div style={{ marginBottom: 26 }}>
      <Link href="/dashboard" className="faint" style={{ textDecoration: "none" }}>
        ← All books
      </Link>
      <div className="spread-between" style={{ marginTop: 6 }}>
        <h1 style={{ margin: 0, fontSize: "1.7rem" }}>{book.title}</h1>
        <nav className="row" style={{ gap: 8 }}>
          {TABS.filter((tab) => !("illustratedOnly" in tab && tab.illustratedOnly) || illustrated).map(
            (tab) => {
              const href = `/book/${bookId}/${tab.slug}`;
              const active = pathname === href;
              return (
                <Link
                  key={tab.slug}
                  href={href}
                  className={`btn ${active ? "" : "quiet"}`}
                  style={{ minHeight: 38, padding: "6px 14px", fontSize: "0.92rem" }}
                >
                  {tab.label}
                </Link>
              );
            },
          )}
        </nav>
      </div>
    </div>
  );
}
