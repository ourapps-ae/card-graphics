// Draws cards into a page: faces, backs and empty slots from the model in card-model.ts, with deal
// and flip animations. Colours come from the theme's CSS variables (cards.css).
import { cardMetrics, centreBox, dealPlan, faceModel, normaliseSettings } from "./card-model.ts";
import type { CardCode, CardSettings, DealStep, FaceModel } from "./card-model.ts";

type Child = Node | string | null | undefined | false;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, style: Record<string, string> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  Object.assign(node.style, style);
  for (const c of children) if (c) node.append(c);
  return node;
}

export type CardOptions = {
  settings?: Partial<CardSettings>;
  /** width in pixels; defaults to the settings' cardWidth */
  width?: number;
  theme?: string;
  /** picture lookup for court faces and the back; null when the application ships none */
  artFor?: (name: string) => string | null;
  /** a rank in the player's language */
  rankLabel?: (rank: string) => string;
  dim?: boolean;
  tappable?: boolean;
  onClick?: () => void;
};

// The class names of a card, in one place so a test can see what a model becomes.
export function cardClasses(model: FaceModel, o: { dim?: boolean; tappable?: boolean; backStyle?: string } = {}): string {
  const extra = `${o.dim ? " dim" : ""}${o.tappable ? " tappable glow" : ""}`;
  if (model.kind === "back") return `card back${model.art ? " art" : o.backStyle === "plain" ? " plain" : ""}${extra}`;
  return `card face${model.red ? " red" : ""}${extra}`;
}

// A playing card: null is face down. Height is 1.4 times the width and sizes inside follow it (em).
export function cardEl(code: CardCode | null, o: CardOptions = {}): HTMLElement {
  const settings = normaliseSettings(o.settings);
  const width = o.width ?? settings.cardWidth;
  const m = cardMetrics(width, settings.cornerStyle);
  const model = faceModel(code, { theme: o.theme, artFor: o.artFor, rankLabel: o.rankLabel, backStyle: settings.backStyle });
  const style: Record<string, string> = { width: `${m.width}px`, height: `${m.height}px`, fontSize: `${m.unit}px`, borderRadius: `${m.radius}px` };
  const cls = cardClasses(model, { dim: o.dim, tappable: o.tappable, backStyle: settings.backStyle });
  let node: HTMLElement;
  if (model.kind === "back") {
    if (model.art) style.backgroundImage = `url(${model.art})`;
    node = el("div", cls, style);
  } else {
    const index = (corner: "tl" | "br") => el("span", `index ${corner}`, {}, el("span", model.ten ? "rank ten" : "rank", {}, model.rankText), el("span", "pip", {}, model.pip));
    const c = model.centre;
    const box = el("div", c.type === "court" ? "box court" : "box", {});
    if (c.type === "court") box.append(el("div", "court", { backgroundImage: `url(${c.art})` }));
    else if (c.type === "ace") box.append(el("span", "p ace", {}, c.pip));
    else if (c.type === "pips") for (const p of c.pips) box.append(el("span", `p${p.flip ? " flip" : ""}${p.small ? " small" : ""}`, { left: `${p.x * 100}%`, top: `${p.y * 100}%` }, model.pip));
    else box.append(el("span", "p ace", {}, c.text));
    node = el("div", cls, style, index("tl"), index("br"), box);
  }
  if (o.onClick) node.addEventListener("click", o.onClick);
  return node;
}

// An empty place for a card, such as a board slot.
export function cardSlot(width: number, corner: CardSettings["cornerStyle"] = "rounded"): HTMLElement {
  const m = cardMetrics(width, corner);
  return el("div", "card slot", { width: `${m.width}px`, height: `${m.height}px`, borderRadius: `${m.radius}px` });
}

// Animation helpers: the page sets `animation-delay` from a plan so a hand deals one card at a time.
export function dealStyle(step: DealStep): Record<string, string> {
  return { animationDelay: `${step.delayMs}ms`, animationDuration: `${step.durationMs}ms` };
}

// Marks a card as arriving from the deck. `from` is the offset (px) the card starts from, relative to
// where it lands, such as the deck's position minus the seat's.
export function dealInto(node: HTMLElement, step: DealStep, from: { dx: number; dy: number }): HTMLElement {
  node.classList.add("dealing");
  node.style.setProperty("--deal-dx", `${from.dx}px`);
  node.style.setProperty("--deal-dy", `${from.dy}px`);
  Object.assign(node.style, dealStyle(step));
  return node;
}

// A card that turns over: shows `from` (usually null, face down), and `flip()` turns it to `to`.
// Returns the element and the flip trigger; the swap happens at the half-turn.
export function flippingCard(from: CardCode | null, to: CardCode | null, o: CardOptions & { durationMs?: number } = {}): { element: HTMLElement; flip: () => void } {
  const wrap = el("div", "card-flip", { width: `${o.width ?? normaliseSettings(o.settings).cardWidth}px` });
  const duration = o.durationMs ?? 400;
  wrap.style.setProperty("--flip-ms", `${duration}ms`);
  let current = cardEl(from, o);
  wrap.append(current);
  const flip = () => {
    wrap.classList.add("flipping");
    setTimeout(() => {
      const next = cardEl(to, o);
      wrap.replaceChild(next, current);
      current = next;
    }, duration / 2);
    setTimeout(() => wrap.classList.remove("flipping"), duration);
  };
  return { element: wrap, flip };
}

export { dealPlan };
