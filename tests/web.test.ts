import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { FakeElement, installFakeDocument } from "./fake-dom.ts";
import { CARD_ASPECT, CORNER_RADIUS, PIPS, RANKS, allCards, cardMetrics, centreBox, dealPlan, dealRounds, faceModel, flipState, normaliseSettings, parseCard } from "../implementation/web/card-model.ts";
import { cardClasses, cardEl, cardSlot, dealInto, dealStyle, flippingCard } from "../implementation/web/cards.ts";
import { build as buildFixtures, buildKotlin } from "./make-fixtures.ts";
import { hand } from "../examples/consumer.ts";

installFakeDocument();
const el = (x: unknown) => x as unknown as FakeElement;

test("codes parse: 52 valid cards, nothing else", () => {
  assert.equal(allCards().length, 52);
  assert.equal(new Set(allCards()).size, 52);
  for (const c of allCards()) assert.ok(parseCard(c), c);
  assert.deepEqual(parseCard("Ah"), { rank: "A", suit: "h", red: true });
  assert.deepEqual(parseCard("Ts"), { rank: "T", suit: "s", red: false });
  assert.equal(parseCard("Xh"), null);
  assert.equal(parseCard("A"), null);
  assert.equal(parseCard("10h"), null);
  assert.equal(parseCard(7), null);
  assert.throws(() => faceModel("1x"), /not a card/);
});

test("pip counts equal the rank, and the lower half is upside down", () => {
  for (const r of "23456789") assert.equal(PIPS[r].length, Number(r), r);
  assert.equal(PIPS.T.length, 10);
  for (const [r, pips] of Object.entries(PIPS)) for (const [x, y] of pips) assert.ok(x >= 0.2 && x <= 0.8 && y >= 0.13 && y <= 0.87, `${r} ${x},${y}`);
  const m = faceModel("7h");
  assert.equal(m.kind === "face" && m.centre.type === "pips" && m.centre.pips.filter((p) => p.flip).length, 2);
  const nine = faceModel("9c");
  assert.ok(nine.kind === "face" && nine.centre.type === "pips" && nine.centre.pips.every((p) => p.small));
  const two = faceModel("2c");
  assert.ok(two.kind === "face" && two.centre.type === "pips" && !two.centre.pips[0].small);
});

test("face models: colours, ranks in the player's language, aces, courts and backs", () => {
  const french = (r: string) => ({ J: "V", Q: "D", K: "R", A: "A", T: "10" } as Record<string, string>)[r] ?? r;
  const jack = faceModel("Jh", { rankLabel: french });
  assert.ok(jack.kind === "face" && jack.rankText === "V" && jack.red && jack.centre.type === "rank" && jack.centre.text === "V");
  const ten = faceModel("Ts", { rankLabel: french });
  assert.ok(ten.kind === "face" && ten.rankText === "10" && ten.ten && !ten.red);
  assert.ok(faceModel("5d", { rankLabel: () => "WRONG" }).kind === "face", "number ranks are not translated");
  assert.equal((faceModel("5d") as { rankText: string }).rankText, "5");
  const ace = faceModel("As");
  assert.ok(ace.kind === "face" && ace.centre.type === "ace" && ace.pip === "\u2660");
  const art = (name: string) => (name === "card-royal-queen.png" ? "./art/card-royal-queen.png" : name === "card-back-royal.png" ? "./art/card-back-royal.png" : null);
  const queen = faceModel("Qd", { theme: "royal", artFor: art });
  assert.ok(queen.kind === "face" && queen.centre.type === "court" && queen.centre.art === "./art/card-royal-queen.png");
  assert.ok(faceModel("Kd", { theme: "royal", artFor: art }).kind === "face" && (faceModel("Kd", { theme: "royal", artFor: art }) as any).centre.type === "rank", "no art for the king: drawn in code");
  assert.deepEqual(faceModel(null, { theme: "royal", artFor: art }), { kind: "back", art: "./art/card-back-royal.png" });
  assert.deepEqual(faceModel(null, { theme: "royal", artFor: art, backStyle: "stripes" }), { kind: "back", art: null });
  assert.deepEqual(faceModel(null), { kind: "back", art: null });
});

test("settings are checked and sizes follow the width", () => {
  assert.deepEqual(normaliseSettings(), { backStyle: "stripes", cornerStyle: "rounded", cardWidth: 56 });
  assert.equal(normaliseSettings({ cardWidth: 80 }).cardWidth, 80);
  assert.throws(() => normaliseSettings({ backStyle: "dots" as never }), /backStyle/);
  assert.throws(() => normaliseSettings({ cornerStyle: "round" as never }), /cornerStyle/);
  assert.throws(() => normaliseSettings({ cardWidth: 2 }), /cardWidth/);
  assert.throws(() => normaliseSettings({ cardWidth: NaN }), /cardWidth/);
  assert.deepEqual(cardMetrics(100), { width: 100, height: 140, unit: 10, radius: 8 });
  assert.equal(cardMetrics(56).height, 78);
  assert.ok(Math.abs(cardMetrics(100, "soft").radius - 14) < 1e-9);
  assert.ok(CORNER_RADIUS.square < CORNER_RADIUS.rounded && CORNER_RADIUS.rounded < CORNER_RADIUS.soft);
  assert.equal(CARD_ASPECT, 1.4);
  assert.deepEqual(centreBox(100, false), { left: 0.2, top: 0.2, width: 0.6, height: 0.6 });
  assert.equal(centreBox(100, true).width, 0.72);
  assert.equal(RANKS.length, 13);
});

test("dealing: one card at a time, three a second", () => {
  const plan = dealPlan(4);
  assert.deepEqual(plan.map((s) => s.delayMs), [0, 340, 680, 1020]);
  assert.ok(plan.every((s) => s.durationMs === 350));
  assert.equal(plan[3].endMs, 1370);
  assert.deepEqual(dealPlan(0), []);
  assert.deepEqual(dealPlan(-3), []);
  assert.deepEqual(dealPlan(2, { dealMs: 100, gapMs: 50, startMs: 1000 }).map((s) => [s.delayMs, s.endMs]), [[1000, 1100], [1050, 1150]]);
  const rounds = dealRounds([3, 5, 1], 2);
  assert.deepEqual(rounds.map((s) => s.seat), [3, 5, 1, 3, 5, 1]);
  assert.equal(rounds[5].delayMs, 5 * 340);
  assert.deepEqual(dealRounds([], 2), []);
});

test("flipping: narrows to an edge, then shows the other side widening", () => {
  assert.deepEqual(flipState(0), { showing: "from", scaleX: 1 });
  assert.equal(flipState(0.25).showing, "from");
  assert.ok(flipState(0.25).scaleX > 0 && flipState(0.25).scaleX < 1);
  assert.ok(Math.abs(flipState(0.5).scaleX) < 1e-12);
  assert.equal(flipState(0.75).showing, "to");
  assert.ok(Math.abs(flipState(0.75).scaleX - flipState(0.25).scaleX) < 1e-12, "mirror image about the half turn");
  assert.deepEqual(flipState(1), { showing: "to", scaleX: 1 });
  assert.deepEqual(flipState(7), flipState(1));
  assert.deepEqual(flipState(-2), flipState(0));
});

test("a face is built with two indexes and a centre box of pips", () => {
  const c = el(cardEl("7h", { width: 100 }));
  assert.deepEqual(c.classes(), ["card", "face", "red"]);
  assert.equal(c.style.width, "100px");
  assert.equal(c.style.height, "140px");
  assert.equal(c.style.fontSize, "10px");
  assert.equal(c.style.borderRadius, "8px");
  assert.equal(c.byClass("index").length, 2);
  assert.equal(c.byClass("p").length, 7);
  assert.equal(c.byClass("flip").length, 2);
  assert.equal(c.byClass("rank")[0].text, "7");
  assert.equal(c.byClass("pip")[0].text, "\u2665");
  assert.equal(el(cardEl("As")).byClass("ace")[0].text, "\u2660");
  assert.equal(el(cardEl("Ts")).byClass("ten").length, 2);
  const king = el(cardEl("Kc", { rankLabel: (r) => (r === "K" ? "R" : r) }));
  assert.equal(king.byClass("rank")[0].text, "R");
  assert.equal(king.byClass("ace")[0].text, "R", "a court card without art shows its letter large");
});

test("a back follows the back style and court art, and settings set size and corners", () => {
  assert.deepEqual(el(cardEl(null)).classes(), ["card", "back"]);
  assert.deepEqual(el(cardEl(null, { settings: { backStyle: "plain" } })).classes(), ["card", "back", "plain"]);
  assert.deepEqual(el(cardEl(null, { theme: "royal", artFor: (n) => `./art/${n}` })).classes(), ["card", "back"], "art is used only when backStyle is art");
  assert.deepEqual(el(cardEl(null, { settings: { backStyle: "art" } })).classes(), ["card", "back"], "backStyle art without pictures falls back to stripes");
  const art = el(cardEl(null, { settings: { backStyle: "art" }, theme: "royal", artFor: (n) => `./art/${n}` }));
  assert.deepEqual(art.classes(), ["card", "back", "art"]);
  assert.equal(art.style.backgroundImage, "url(./art/card-back-royal.png)");
  assert.deepEqual(el(cardEl(null, { settings: { backStyle: "stripes" }, theme: "royal", artFor: (n) => `./art/${n}` })).classes(), ["card", "back"]);
  const court = el(cardEl("Jd", { settings: {}, theme: "royal", artFor: (n) => (n.includes("jack") ? "./art/j.png" : null) }));
  assert.equal(court.byClass("court").length, 2, "box court and its picture");
  assert.equal(court.byClass("court")[1].style.backgroundImage, "url(./art/j.png)");
  const sized = el(cardEl("2c", { settings: { cardWidth: 70, cornerStyle: "soft" } }));
  assert.equal(sized.style.width, "70px");
  assert.equal(sized.style.borderRadius, `${70 * 0.14}px`);
  assert.equal(el(cardEl("2c", { width: 30 })).style.width, "30px");
  assert.deepEqual(el(cardEl("2c", { dim: true, tappable: true })).classes(), ["card", "face", "dim", "tappable", "glow"]);
  assert.equal(cardClasses({ kind: "back", art: null }, { backStyle: "plain" }), "card back plain");
});

test("taps, slots, dealing and flipping on the page", async () => {
  let taps = 0;
  el(cardEl("Ah", { onClick: () => taps++ })).click();
  assert.equal(taps, 1);
  const slot = el(cardSlot(40));
  assert.deepEqual([slot.classes().join(" "), slot.style.width, slot.style.height], ["card slot", "40px", "56px"]);
  assert.deepEqual(dealStyle({ index: 1, delayMs: 340, durationMs: 350, endMs: 690 }), { animationDelay: "340ms", animationDuration: "350ms" });
  const dealing = el(dealInto(cardEl("2c") , { index: 2, delayMs: 680, durationMs: 350, endMs: 1030 }, { dx: -120, dy: -40 }));
  assert.ok(dealing.classList.contains("dealing"));
  assert.equal(dealing.style.vars["--deal-dx"], "-120px");
  assert.equal(dealing.style.animationDelay, "680ms");
  const { element, flip } = flippingCard(null, "Qs", { width: 50, durationMs: 40 });
  const wrap = el(element);
  assert.ok(wrap.byClass("back").length === 1 && wrap.byClass("face").length === 0);
  flip();
  assert.ok(wrap.classList.contains("flipping"));
  await new Promise((r) => setTimeout(r, 70));
  assert.ok(wrap.byClass("face").length === 1 && wrap.byClass("back").length === 0, "the face replaces the back at the half turn");
  assert.ok(!wrap.classList.contains("flipping"));
  assert.equal(wrap.style.vars["--flip-ms"], "40ms");
});

test("the stylesheet reads only theme variables", () => {
  const css = readFileSync(new URL("../implementation/web/cards.css", import.meta.url), "utf8");
  const used = new Set([...css.matchAll(/var\((--[a-z-]+)/g)].map((m) => m[1]));
  for (const name of used) if (!name.startsWith("--deal-") && name !== "--flip-ms") assert.ok(["--paper", "--paper-accent", "--on-primary", "--primary"].includes(name), name);
  assert.ok(used.has("--paper") && used.has("--paper-accent"));
});

test("the native fixtures are the TypeScript model", () => {
  assert.equal(readFileSync(new URL("fixtures/cards.json", import.meta.url), "utf8"), buildFixtures());
  assert.equal(readFileSync(new URL("android/Expected.kt", import.meta.url), "utf8"), buildKotlin());
});

test("a consumer draws a hand with French ranks and empty slots", () => {
  const nodes = hand(["Jh", "Ad", null], 2).map(el);
  assert.equal(nodes.length, 5);
  assert.equal(nodes[0].byClass("rank")[0].text, "V");
  assert.equal(nodes[4].classes().includes("slot"), true);
});

test("the OpenRPC interface describes card codes, settings and the exported functions", async () => {
  const doc = JSON.parse(readFileSync(new URL("../interfaces/card-graphics.json", import.meta.url), "utf8"));
  assert.equal(doc.openrpc, "1.3.2");
  assert.deepEqual([doc.info.title, doc.info.version], ["ae/card-graphics", "1.0.0"]);
  const { CardCode, CardSettings, PipLayout, FaceModel } = doc.components.schemas;
  const code = new RegExp(CardCode.pattern);
  for (const c of allCards()) assert.match(c, code);
  for (const bad of ["Xh", "A", "Ahh", "1c"]) assert.doesNotMatch(bad, code);
  assert.deepEqual(CardSettings.required, Object.keys(normaliseSettings()));
  assert.deepEqual(PipLayout.propertyNames.enum, Object.keys(PIPS));
  const face = faceModel("Ah");
  const back = faceModel(null);
  assert.deepEqual(FaceModel.oneOf.map((s: { required: string[] }) => s.required.sort()), [Object.keys(back).sort(), Object.keys(face).sort()]);
  const web: Record<string, unknown> = { ...(await import("../implementation/web/card-model.ts")), ...(await import("../implementation/web/cards.ts")) };
  for (const method of doc.methods) assert.equal(typeof web[method.name], "function", method.name);
});
