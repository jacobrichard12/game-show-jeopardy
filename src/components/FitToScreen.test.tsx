import { render } from "@testing-library/react";
import FitToScreen from "./FitToScreen";

// jsdom has no layout engine, so fake just enough of one: the fit box is
// BOX_W x BOX_H, and the content behaves like text of a fixed area, so its
// height at a given layout width is AREA / width (narrower = taller).
const BOX_W = 1000;
const BOX_H = 500;
let area = 0;

const isOuter = (el: HTMLElement) => el.classList.contains("relative");
const isInner = (el: HTMLElement) => el.classList.contains("absolute");

const originals = {
  clientWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth"),
  clientHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight"),
  offsetHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight"),
};

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return isOuter(this) ? BOX_W : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return isOuter(this) ? BOX_H : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return isInner(this) ? area / parseFloat(this.style.width) : 0;
    },
  });
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterAll(() => {
  (Object.keys(originals) as (keyof typeof originals)[]).forEach((key) => {
    const descriptor = originals[key];
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
  });
  delete (window as Partial<Window>).matchMedia;
});

const fitted = (contentArea: number) => {
  area = contentArea;
  const { container } = render(
    <FitToScreen>
      <p>content</p>
    </FitToScreen>
  );
  const inner = container.querySelector(".absolute") as HTMLElement;
  const [, top, scale] = inner.style.transform.match(/translate\(0(?:px)?, ([\d.]+)px\) scale\(([\d.]+)\)/)!;
  return { scale: Number(scale), top: Number(top), width: parseFloat(inner.style.width) };
};

describe("FitToScreen", () => {
  it("shrinks tall content to exactly fill the height, laid out wider", () => {
    // Scaled height = area * s^2 / W, so the fit is s = sqrt(H * W / area).
    const { scale, width } = fitted(1_000_000);
    expect(scale).toBeCloseTo(Math.sqrt((BOX_H * BOX_W) / 1_000_000), 2);
    // Laid out at W / s, then scaled back down to the box width.
    expect(width * scale).toBeCloseTo(BOX_W, 0);
  });

  it("enlarges short content up to the max, centered vertically", () => {
    const { scale, top } = fitted(100_000);
    expect(scale).toBe(1.6);
    const scaledHeight = (100_000 * 1.6 * 1.6) / BOX_W;
    expect(top).toBeCloseTo((BOX_H - scaledHeight) / 2, 0);
  });

  it("stops at the minimum scale for content that can't fit", () => {
    const { scale, top } = fitted(100_000_000);
    expect(scale).toBe(0.35);
    expect(top).toBe(0);
  });
});
