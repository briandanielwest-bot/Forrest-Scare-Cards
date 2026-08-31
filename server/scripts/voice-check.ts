/**
 * Voice rule check: `npx ts-node scripts/voice-check.ts`
 *
 * The house voice is enforced in three places (prompts that avoid the
 * cadence, sanitizeVoice for em-dashes, findVoiceTells plus a repair pass
 * for the rest), and the third one is a regex, which is the part that can
 * silently stop matching. Every case below is real text captured from a
 * live run, so a regression here means the tell is shipping again.
 *
 * Also scans the shipped copy and data for em-dashes, since those ride
 * into the agents' cached prompts and teach the cadence back to the model.
 */
import * as fs from "fs";
import * as path from "path";
import { findVoiceTells, sanitizeVoice } from "../src/agents/voice";

type Case = { text: string; maxSentences?: number; shouldFlag: boolean; note: string };

const CASES: Case[] = [
  // Captured offenders. Each of these shipped to a real plan before the rule existed.
  { text: "You want to read as the principal in the room, not the guy arranging the room. Right now every jacket hangs off your shoulders.", shouldFlag: true, note: "trailing antithesis in an intro" },
  { text: "You want to read like the senior guy stepping off the plane, not the one who booked his room. That's a shoulder problem, not a taste problem.", shouldFlag: true, note: "two antitheses in one intro" },
  { text: "Sam, you told me you want the out-of-town-visitor energy, and that comes from a tailor, not a logo.", shouldFlag: true, note: "antithesis in a sign-off" },
  { text: "It isn't a taste problem, it's a tailoring one.", shouldFlag: true, note: "isn't X, it's Y" },
  { text: "Book the fitting this week. Navy first, gray second. That's it.", shouldFlag: true, note: "punchy closing fragment" },
  { text: "Here's the deal, you need two suits and a pair of shoes.", shouldFlag: true, note: "banned opener" },
  { text: "One thing. Two things. Three things. Four things.", maxSentences: 3, shouldFlag: true, note: "over the sentence cap" },

  // Clean text that must not trip the detector.
  { text: "Sam, you're 6'1\" with shoulders and you've been dressing like you're apologizing for them. Book the Suitsupply fitting this week, navy first. Text me when the jacket comes off the hanger.", maxSentences: 3, shouldFlag: false, note: "good sign-off at the cap" },
  { text: "You want the room to read you as the guy running the deal. That starts with shoulders, because your suits hang off yours. $2,000, one shot, two months, landing before CERAWeek in March.", shouldFlag: false, note: "good intro" },
  { text: "Navy first, gray second, and no brown anywhere.", shouldFlag: false, note: "an ordered instruction, not a contrast" },
  { text: "Ask for the Trofeo wool. Their made-to-measure starts at $1,295 and runs about six weeks.", shouldFlag: false, note: "plain factual copy" },
];

// Files whose strings reach a user's screen or an agent's cached prompt.
const SCANNED = [
  "src/data/houstonStores.ts",
  "src/data/storeIntel.ts",
  "src/data/houstonKnowledge.ts",
  "src/agents/interviewer.ts",
  "src/agents/wardrobePlanner.ts",
  "src/agents/planQA.ts",
  "src/agents/photoAnalyst.ts",
  "src/agents/storeScout.ts",
  "src/agents/styleWeather.ts",
  "../app/src/data/starterStaples.ts",
  "../app/src/data/team.ts",
  "../app/src/data/kylaTips.ts",
  "../app/src/screens/WelcomeScreen.tsx",
  "../app/src/screens/PlanScreen.tsx",
  "../app/src/screens/StaplesScreen.tsx",
  "../app/src/screens/StoreDirectoryScreen.tsx",
];

let failures = 0;

console.log("Tell detector");
for (const c of CASES) {
  const tells = findVoiceTells(c.text, { maxSentences: c.maxSentences });
  const flagged = tells.length > 0;
  const ok = flagged === c.shouldFlag;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.note}${ok ? "" : ` (got: ${tells.join("; ") || "clean"})`}`);
}

console.log("\nEm-dash sanitizer");
const dashCase = "CONCISION IS A FEATURE — he reads this on a phone — standing in a store.";
const sanitized = sanitizeVoice(dashCase);
const sanitizerOk = !sanitized.includes("—") && sanitized.startsWith("CONCISION IS A FEATURE:");
if (!sanitizerOk) failures++;
console.log(`  ${sanitizerOk ? "PASS" : "FAIL"}  strips dashes, ALL-CAPS lead-in takes a colon`);

console.log("\nShipped copy and prompt data");
for (const rel of SCANNED) {
  const file = path.join(__dirname, "..", rel);
  if (!fs.existsSync(file)) continue;
  // Code comments don't reach a prompt or a screen, so they don't count.
  const live = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => {
      const t = l.trimStart();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*") && !t.startsWith("{/*");
    })
    .join("\n");
  const count = (live.match(/—/g) ?? []).length;
  if (count > 0) failures++;
  console.log(`  ${count === 0 ? "PASS" : `FAIL (${count})`}  ${rel}`);
}

console.log(failures === 0 ? "\nAll voice checks passed." : `\n${failures} voice check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
