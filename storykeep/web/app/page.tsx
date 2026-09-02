import Link from "next/link";

/**
 * The landing page.
 *
 * Written for one reader: someone who has been told for years that they should
 * write a book and has never started. Every line answers the objection that
 * stops them, which is not "I can't write" — it is "I don't have the time or
 * the patience".
 */
export default function Home() {
  return (
    <>
      <section className="narrow" style={{ padding: "72px 20px 56px", textAlign: "center" }}>
        <p className="pill">You talk. It becomes a book.</p>
        <h1 style={{ fontSize: "2.7rem", margin: "18px 0 16px" }}>
          You've always said your life would make a book.
        </h1>
        <p style={{ fontSize: "1.2rem", color: "var(--ink-soft)", marginBottom: 32 }}>
          Storykeep asks you questions and listens while you answer them out loud. It keeps
          every name, date and place straight, learns how you actually talk, and writes the
          pages in your voice — not in a machine's. Stop whenever you like. Everything is
          saved.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link href="/signin?mode=signup" className="btn big">
            Start your book
          </Link>
          <Link href="#how" className="btn big quiet">
            See how it works
          </Link>
        </div>
        <p className="faint" style={{ marginTop: 18 }}>
          Free to write. You only pay when you want the finished book.
        </p>
      </section>

      <section className="wrap" style={{ paddingBottom: 56 }}>
        <div className="grid three">
          <div className="card">
            <h3>A life, properly told</h3>
            <p className="muted">
              A biography or memoir, as long as you want it — sixty pages or four hundred.
              Built from real interviews, one sitting at a time.
            </p>
          </div>
          <div className="card">
            <h3>A children's book</h3>
            <p className="muted">
              A real picture book: twelve to sixteen spreads, written to be read out loud,
              with an illustration directed for every page.
            </p>
          </div>
          <div className="card">
            <h3>One small moment</h3>
            <p className="muted">
              A wedding, a kitchen, a dog, the last good summer. Short enough to finish in a
              sitting, and the kind of thing a family keeps.
            </p>
          </div>
        </div>
      </section>

      <section id="how" className="narrow" style={{ padding: "24px 20px 72px" }}>
        <h2>How it works</h2>
        <ol style={{ paddingLeft: 22, lineHeight: 1.9, fontSize: "1.06rem" }}>
          <li>
            <strong>Wren asks you a question.</strong> One at a time, out loud, like a person
            would. You press the microphone and answer. Type instead if you'd rather.
          </li>
          <li>
            <strong>Echo files what you said.</strong> Every name, date, place and exact phrase
            goes into your story ledger, so chapter fourteen remembers chapter two.
          </li>
          <li>
            <strong>Mirror learns your voice.</strong> How you actually talk, including the
            words you'd never use. The book is held to it.
          </li>
          <li>
            <strong>Atlas shapes the book</strong> and <strong>Quill writes the pages.</strong>{" "}
            Four more readers check the facts, the freshness, the private bits, and whether a
            stranger would keep reading.
          </li>
          <li>
            <strong>You get the book.</strong> A print-ready PDF, an e-book, a Word file — or a
            real hardcover in the post.
          </li>
        </ol>

        <div className="card" style={{ marginTop: 28 }}>
          <h3>You choose how much help you want</h3>
          <p className="muted" style={{ marginBottom: 8 }}>
            <strong>Ghostwriter</strong> — you talk, we write it all, you approve.
          </p>
          <p className="muted" style={{ marginBottom: 8 }}>
            <strong>Co-writer</strong> — we draft, you rewrite, we polish around your words
            without flattening them.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <strong>Coach</strong> — you write every word. We only ask, prompt and push back.
          </p>
        </div>

        <div className="row" style={{ marginTop: 32 }}>
          <Link href="/signin?mode=signup" className="btn big">
            Start your book
          </Link>
        </div>
      </section>
    </>
  );
}
