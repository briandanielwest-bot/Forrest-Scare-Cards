/**
 * The Houston events a man actually has to dress for, as tappable
 * questions for Campbell.
 *
 * Campbell could always answer these; nobody knew to ask him. The card
 * had one placeholder question and a text box, which is a search box, and
 * a search box only helps a man who already knows what he wants. These
 * chips are the feature announcing itself.
 *
 * Ordered by what's next on the calendar rather than alphabetically, so
 * the first chip he sees in October is gala season and the first he sees
 * in February is the rodeo.
 */

export interface HoustonEvent {
  /** Chip label, short enough to read at a glance. */
  label: string;
  /** The question actually sent to Campbell. */
  question: string;
  /** Months (1-12) this is live or close enough to be worth planning. */
  months: number[];
}

export const HOUSTON_EVENTS: HoustonEvent[] = [
  {
    label: "🤠 Rodeo",
    question: "What do I wear to RodeoHouston at NRG? I don't own boots yet.",
    months: [1, 2, 3],
  },
  {
    label: "🛢 CERAWeek",
    question: "I have a CERAWeek reception downtown. What do I wear, and when do I need to order it?",
    months: [1, 2, 3],
  },
  {
    label: "🥂 Gala season",
    question: "Black-tie optional gala at the MFAH. What do I actually wear?",
    months: [9, 10, 11, 12],
  },
  {
    label: "🎄 Holiday party",
    question: "Office holiday party at a downtown hotel. How dressed up should I be?",
    months: [11, 12],
  },
  {
    label: "⚾ Astros game",
    question: "Astros game at Daikin Park with clients. What do I wear?",
    months: [4, 5, 6, 7, 8, 9, 10],
  },
  {
    label: "🏗 OTC",
    question: "OTC at NRG Park, I'm working the booth all day. What do I wear?",
    months: [3, 4, 5],
  },
  {
    label: "💍 Summer wedding",
    question: "Outdoor wedding in Houston in June. How do I not sweat through it?",
    months: [4, 5, 6, 7, 8],
  },
  {
    label: "💍 Fall wedding",
    question: "Houston wedding in November, cocktail attire on the invite. What do I wear?",
    months: [9, 10, 11],
  },
  {
    label: "🏀 Rockets",
    question: "Rockets game at Toyota Center, decent seats. What do I wear?",
    months: [10, 11, 12, 1, 2, 3, 4],
  },
  {
    label: "🎻 Symphony",
    question: "Opening night at Jones Hall. Is a suit enough or do I need a tux?",
    months: [9, 10, 11, 12, 1, 2, 3, 4, 5],
  },
  {
    label: "🍽 First date",
    question: "First date at a nice Montrose restaurant. What do I wear?",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    label: "💼 Job interview",
    question: "Interview at a downtown law firm next week. Suit or no suit?",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
];

/**
 * What's worth asking about right now, in-season first. Everything stays
 * reachable; the ordering just means the rodeo isn't the lead chip in July.
 */
export function eventsForNow(date = new Date()): HoustonEvent[] {
  const month = date.getMonth() + 1;
  const inSeason = HOUSTON_EVENTS.filter((e) => e.months.includes(month));
  const rest = HOUSTON_EVENTS.filter((e) => !e.months.includes(month));
  return [...inSeason, ...rest];
}
