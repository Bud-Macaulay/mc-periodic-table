export type RGB = { r: number; g: number; b: number };
type BaseColorMap = Record<string, string>;

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export type ColorInput = string;

export type ColorTransform =
  | { type: "mix"; color: ColorInput; amount: number }
  | { type: "alpha"; value: number }
  | { type: "lighten"; amount: number }
  | { type: "darken"; amount: number };

export type StateStyle = {
  base?: string;
  baseByAtomic?: BaseColorMap;
  transforms?: Record<number, ColorTransform[]>;
};
