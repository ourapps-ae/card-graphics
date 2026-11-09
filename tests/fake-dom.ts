// A very small stand-in for the browser page: elements with classes, styles, attributes, events and children.
class FakeStyle {
  [key: string]: unknown;
  vars: Record<string, string> = {};
  setProperty(name: string, value: string) { this.vars[name] = value; }
}
export class FakeElement {
  tagName: string;
  children: (FakeElement | string)[] = [];
  attrs: Record<string, string> = {};
  className = "";
  style = new FakeStyle() as FakeStyle & Record<string, string>;
  listeners: Record<string, (() => void)[]> = {};
  constructor(tagName: string) { this.tagName = tagName; }
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
  append(...nodes: (FakeElement | string)[]) { this.children.push(...nodes); }
  replaceChild(next: FakeElement, old: FakeElement) { this.children = this.children.map((c) => (c === old ? next : c)); }
  addEventListener(type: string, fn: () => void) { (this.listeners[type] ??= []).push(fn); }
  click() { for (const fn of this.listeners.click ?? []) fn(); }
  get classList() {
    const self = this;
    return {
      add: (c: string) => { if (!self.classes().includes(c)) self.className = [...self.classes(), c].join(" "); },
      remove: (c: string) => { self.className = self.classes().filter((x) => x !== c).join(" "); },
      contains: (c: string) => self.classes().includes(c),
    };
  }
  classes(): string[] { return this.className.split(/\s+/).filter(Boolean); }
  get text(): string { return this.children.map((c) => (typeof c === "string" ? c : c.text)).join(""); }
  find(predicate: (e: FakeElement) => boolean): FakeElement[] {
    const out: FakeElement[] = [];
    for (const c of this.children) if (typeof c !== "string") { if (predicate(c)) out.push(c); out.push(...c.find(predicate)); }
    return out;
  }
  byClass(name: string): FakeElement[] { return this.find((e) => e.classes().includes(name)); }
}
export function installFakeDocument() {
  (globalThis as any).document = { createElement: (tag: string) => new FakeElement(tag) };
}
