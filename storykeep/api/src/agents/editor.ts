import { runText } from "../lib/claude";
import { agentHeader } from "./context";
import { effortFor, modelFor } from "./roster";

/**
 * Marla.
 *
 * A line editor, not a rewriter. The failure mode of an AI editing pass is
 * that it launders the author's voice into competent nothing, so most of this
 * prompt is about what she may not touch.
 */
export async function lineEdit(args: {
  bookId: string;
  userId: string;
  bible: string;
  text: string;
  notes: string[];
}): Promise<string> {
  const system = `${agentHeader("editor")}

${args.bible}

---

WHAT YOU MAY DO

Cut padding, filler, and any sentence that says what the previous sentence
already said. Fix rhythm. Break a paragraph that has swallowed two ideas.
Replace an abstract word with the concrete one the material supports. Remove a
line that tells the reader how to feel.

WHAT YOU MAY NOT DO

Do not add facts. Do not add a detail that is not already on the page.
Do not smooth out the author's idiom, grammar quirks, or plain words into
literary ones. Do not add a closing line, a reflection, or a moral.
Do not lengthen anything. If the chapter gets longer, you have failed.
Do not touch any [ASK: ...] marker — leave them exactly where they are.

Return the edited text only. No commentary, no list of changes, no markdown.`;

  const notes = args.notes.length
    ? `\n\nOther agents have flagged these on this passage — fix what you can without adding anything:\n${args.notes.map((n) => `- ${n}`).join("\n")}`
    : "";

  return runText({
    agent: "editor",
    userId: args.userId,
    bookId: args.bookId,
    model: modelFor("editor"),
    effort: effortFor("editor"),
    system,
    maxTokens: 32_000,
    messages: [{ role: "user", content: `${args.text}${notes}` }],
  });
}
