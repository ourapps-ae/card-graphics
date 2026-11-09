// A consumer that needs no game: a hand of cards dealt face up with a French rank label.
import { cardEl, cardSlot } from "../implementation/web/cards.ts";

const FRENCH: Record<string, string> = { J: "V", Q: "D", K: "R", A: "A", T: "10" };

export function hand(codes: (string | null)[], slots = 0): HTMLElement[] {
  const cards = codes.map((c) => cardEl(c, { width: 56, rankLabel: (r) => FRENCH[r] ?? r }));
  return [...cards, ...Array.from({ length: slots }, () => cardSlot(56))];
}
