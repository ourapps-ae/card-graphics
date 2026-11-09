// What a playing card looks like, as data: the pure part of the card drawing, shared by every
// platform. A card code is a rank (2-9, T, J, Q, K, A) then a suit (c, d, h, s), such as "Ah" or "Td".
// null is a card face down.
export type CardCode = string;
export type BackStyle = "stripes" | "plain" | "art";
export type CornerStyle = "rounded" | "soft" | "square";
export type CardSettings = { backStyle: BackStyle; cornerStyle: CornerStyle; cardWidth: number };

export const DEFAULT_SETTINGS: CardSettings = { backStyle: "stripes", cornerStyle: "rounded", cardWidth: 56 };
export const BACK_STYLES: BackStyle[] = ["stripes", "plain", "art"];
export const CORNER_STYLES: CornerStyle[] = ["rounded", "soft", "square"];
export const CARD_ASPECT = 1.4;
export const RANKS = "23456789TJQKA";
export const SUITS = "cdhs";
export const SUIT_GLYPH: Record<string, string> = { c: "\u2663", d: "\u2666", h: "\u2665", s: "\u2660" };
export const COURT_NAME: Record<string, string> = { J: "jack", Q: "queen", K: "king" };
// The fraction of the card's width used as the corner radius.
export const CORNER_RADIUS: Record<CornerStyle, number> = { rounded: 0.08, soft: 0.14, square: 0.02 };

export type ParsedCard = { rank: string; suit: string; red: boolean };

export function parseCard(code: unknown): ParsedCard | null {
  if (typeof code !== "string" || code.length !== 2 || !RANKS.includes(code[0]) || !SUITS.includes(code[1])) return null;
  return { rank: code[0], suit: code[1], red: code[1] === "h" || code[1] === "d" };
}

// Every card of a 52 card pack, in rank then suit order.
export function allCards(): CardCode[] {
  return [...RANKS].flatMap((r) => [...SUITS].map((s) => r + s));
}

export function normaliseSettings(input: Partial<CardSettings> = {}): CardSettings {
  const out = { ...DEFAULT_SETTINGS, ...input };
  if (!BACK_STYLES.includes(out.backStyle)) throw new Error(`backStyle must be one of ${BACK_STYLES.join(", ")}`);
  if (!CORNER_STYLES.includes(out.cornerStyle)) throw new Error(`cornerStyle must be one of ${CORNER_STYLES.join(", ")}`);
  if (!Number.isFinite(out.cardWidth) || out.cardWidth < 8 || out.cardWidth > 600) throw new Error("cardWidth must be between 8 and 600");
  return out;
}

// Pip positions inside the central box as fractions of its width and height, for 2 to 10 (T).
// The lower half is printed upside down, as on a real card.
const COL = { l: 0.2, c: 0.5, r: 0.8 };
const ROWS4 = [0.13, 0.38, 0.62, 0.87];
const ROWS3 = [0.13, 0.5, 0.87];
const sides = (rows: number[]) => rows.flatMap((y) => [[COL.l, y], [COL.r, y]]);
export const PIPS: Record<string, number[][]> = {
  "2": [[COL.c, 0.13], [COL.c, 0.87]],
  "3": [[COL.c, 0.13], [COL.c, 0.5], [COL.c, 0.87]],
  "4": sides([0.13, 0.87]),
  "5": [...sides([0.13, 0.87]), [COL.c, 0.5]],
  "6": sides(ROWS3),
  "7": [...sides(ROWS3), [COL.c, 0.31]],
  "8": [...sides(ROWS3), [COL.c, 0.31], [COL.c, 0.69]],
  "9": [...sides(ROWS4), [COL.c, 0.5]],
  T: [...sides(ROWS4), [COL.c, 0.25], [COL.c, 0.75]],
};

// Size of a card of this width; sizes inside the card are in units of a tenth of its width.
export function cardMetrics(width: number, corner: CornerStyle = "rounded"): { width: number; height: number; unit: number; radius: number } {
  return { width, height: Math.round(width * CARD_ASPECT), unit: width / 10, radius: width * CORNER_RADIUS[corner] };
}

export type Pip = { x: number; y: number; flip: boolean; small: boolean };
export type FaceModel =
  | { kind: "back"; art: string | null }
  | {
      kind: "face"; red: boolean; rank: string; rankText: string; pip: string; ten: boolean;
      /** what fills the central box */
      centre: { type: "court"; art: string } | { type: "ace"; pip: string } | { type: "pips"; pips: Pip[] } | { type: "rank"; text: string };
    };

// How to draw a card. `artFor(name)` returns a picture reference for court and back artwork when the
// application ships any (`card-back-<theme>.png`, `card-<theme>-jack.png`), else null; `rankLabel`
// prints a rank in the player's language (J is V in French). Both come from the application.
export function faceModel(code: CardCode | null, o: { theme?: string; artFor?: (name: string) => string | null; rankLabel?: (rank: string) => string; backStyle?: BackStyle } = {}): FaceModel {
  const artFor = o.artFor ?? (() => null);
  const theme = o.theme ?? "default";
  const card = code === null ? null : parseCard(code);
  if (code !== null && !card) throw new Error(`not a card: ${String(code)}`);
  if (!card) return { kind: "back", art: o.backStyle === "art" || o.backStyle === undefined ? artFor(`card-back-${theme}.png`) : null };
  const label = o.rankLabel ?? ((r: string) => r);
  const rankText = "TJQKA".includes(card.rank) ? label(card.rank) : card.rank;
  const pip = SUIT_GLYPH[card.suit];
  const court = COURT_NAME[card.rank] ? artFor(`card-${theme}-${COURT_NAME[card.rank]}.png`) : null;
  let centre: Extract<FaceModel, { kind: "face" }>["centre"];
  if (court) centre = { type: "court", art: court };
  else if (card.rank === "A") centre = { type: "ace", pip };
  else if (PIPS[card.rank]) centre = { type: "pips", pips: PIPS[card.rank].map(([x, y]) => ({ x, y, flip: y > 0.5, small: card.rank === "9" || card.rank === "T" })) };
  else centre = { type: "rank", text: rankText };
  return { kind: "face", red: card.red, rank: card.rank, rankText, pip, ten: card.rank === "T", centre };
}

// The face for a card under the width of the central box: court pictures get a larger box than pips.
export function centreBox(width: number, hasCourt: boolean): { left: number; top: number; width: number; height: number } {
  return hasCourt ? { left: 0.14, top: 0.14, width: 0.72, height: 0.72 } : { left: 0.2, top: 0.2, width: 0.6, height: 0.6 };
}

// Dealing: each card leaves the deck `gapMs` after the one before and takes `durationMs` to arrive.
// Three cards a second is what `dealMs` 350 and `gapMs` 340 give.
export type DealStep = { index: number; delayMs: number; durationMs: number; endMs: number };
export function dealPlan(count: number, o: { dealMs?: number; gapMs?: number; startMs?: number } = {}): DealStep[] {
  const dealMs = o.dealMs ?? 350, gapMs = o.gapMs ?? 340, startMs = o.startMs ?? 0;
  return Array.from({ length: Math.max(0, count) }, (_, i) => ({ index: i, delayMs: startMs + i * gapMs, durationMs: dealMs, endMs: startMs + i * gapMs + dealMs }));
}

// Dealing round the table: `rounds` times through the seats in order, starting after the dealer.
// Returns, for each card, the seat it goes to and when.
export function dealRounds(seats: number[], rounds: number, o: { dealMs?: number; gapMs?: number; startMs?: number } = {}): (DealStep & { seat: number })[] {
  const order = Array.from({ length: Math.max(0, rounds) }, () => seats).flat();
  return dealPlan(order.length, o).map((s) => ({ ...s, seat: order[s.index] }));
}

// Turning a card over: progress 0 to 1. The card narrows to an edge, then shows its other side widening.
export function flipState(progress: number): { showing: "from" | "to"; scaleX: number } {
  const p = Math.min(1, Math.max(0, progress));
  return p < 0.5 ? { showing: "from", scaleX: Math.cos(p * Math.PI) } : { showing: "to", scaleX: -Math.cos(p * Math.PI) };
}
