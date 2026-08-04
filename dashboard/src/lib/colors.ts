export const BRUTAL = {
  black: "#0a0a0a",
  white: "#f5f5f0",
  red: "#ff3333",
  yellow: "#ffcc00",
  green: "#00cc66",
  blue: "#3366ff",
  gray: "#666666",
  darkGray: "#1a1a1a",
  lightGray: "#e0e0d8",
} as const;

/** Delay severity: green (good) -> yellow (warning) -> red (bad) */
export function delayColor(pct: number): string {
  if (pct < 3) return BRUTAL.green;
  if (pct < 5) return BRUTAL.yellow;
  if (pct < 7) return "#ff9933";
  return BRUTAL.red;
}

/** Revenue intensity: light -> dark */
export function revenueColor(normalized: number): string {
  const v = Math.round(255 - normalized * 200);
  return `rgb(${v}, ${v}, ${Math.round(v * 0.9)})`;
}

/** Interpolate between two hex colors */
export function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const ca = parse(a);
  const cb = parse(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Heat ramp with monotonically increasing lightness (dark -> red -> yellow),
 *  readable under red-green color blindness where green->yellow->red is not.
 *  Brightest cell = worst value, which is also where the eye lands first. */
export function heatmapColor(value: number, min: number, max: number): string {
  const t = max === min ? 0 : (value - min) / (max - min);
  if (t < 0.5) return lerpColor("#26201e", BRUTAL.red, t * 2);
  return lerpColor(BRUTAL.red, BRUTAL.yellow, (t - 0.5) * 2);
}

/** CSS gradient matching heatmapColor, for legends */
export const HEAT_GRADIENT = `linear-gradient(to right, #26201e, ${BRUTAL.red}, ${BRUTAL.yellow})`;
