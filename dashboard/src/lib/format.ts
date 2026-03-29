/** Format large numbers compactly: 37600000000 -> "37.6B" */
export function compact(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}

/** Format RUB currency: 37600000000 -> "37.6B RUB" */
export function rub(n: number): string {
  return compact(n) + " RUB";
}

/** Format percentage: 4.9 -> "4.9%" */
export function pct(n: number, decimals = 1): string {
  return n.toFixed(decimals) + "%";
}

/** Format milliseconds: 0.13 -> "0.13ms", 1283 -> "1,283ms" */
export function ms(n: number): string {
  if (n < 1) return n.toFixed(2) + "ms";
  if (n < 10) return n.toFixed(1) + "ms";
  return Math.round(n).toLocaleString() + "ms";
}

/** Format duration: 102 -> "102s" */
export function duration(seconds: number): string {
  if (seconds < 60) return seconds.toFixed(0) + "s";
  return (seconds / 60).toFixed(1) + "min";
}

/** Format a number with commas */
export function commas(n: number): string {
  return n.toLocaleString("en-US");
}
