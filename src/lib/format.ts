export function fmt(n: number): string {
  return "$" + Math.round(n || 0).toLocaleString("en-US");
}
export function pct(n: number): string {
  return Math.round((n || 0) * 100) + "%";
}
