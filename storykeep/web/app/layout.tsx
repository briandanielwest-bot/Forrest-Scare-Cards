import type { Metadata } from "next";
import "./globals.css";
import { Masthead } from "@/components/Masthead";

export const metadata: Metadata = {
  title: "Storykeep — you talk, it becomes a book",
  description:
    "Storykeep interviews you, listens, and writes your book: a memoir, a children's book, or a keepsake about one small moment. Start and stop whenever you like.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Masthead />
        <main>{children}</main>
      </body>
    </html>
  );
}
