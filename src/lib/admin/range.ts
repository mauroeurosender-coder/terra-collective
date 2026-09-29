import type { Range, RangeKey } from "./types";

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Parse ?range=7d|30d|90d|today|custom&from=YYYY-MM-DD&to=YYYY-MM-DD into a window + the equal-length previous window. */
export function parseRange(sp: { range?: string; from?: string; to?: string }, now = new Date()): Range {
  const key = (["today", "7d", "30d", "90d", "custom"].includes(sp.range ?? "") ? sp.range : "30d") as RangeKey;
  const today = startOfDay(now);
  let from: Date;
  let to = new Date(today.getTime() + DAY); // exclusive end: tomorrow 00:00

  if (key === "today") from = today;
  else if (key === "custom" && sp.from && sp.to && !Number.isNaN(Date.parse(sp.from)) && !Number.isNaN(Date.parse(sp.to))) {
    from = startOfDay(new Date(sp.from));
    to = new Date(startOfDay(new Date(sp.to)).getTime() + DAY);
    if (to <= from) to = new Date(from.getTime() + DAY);
  } else {
    const days = key === "7d" ? 7 : key === "90d" ? 90 : 30;
    from = new Date(to.getTime() - days * DAY);
  }
  const len = to.getTime() - from.getTime();
  return {
    key,
    from,
    to,
    prevFrom: new Date(from.getTime() - len),
    prevTo: from,
    bucket: len <= DAY ? "hour" : "day",
  };
}

/** Empty buckets for the chart so days/hours without sales still show as zero. */
export function buckets(r: Range) {
  const out: Date[] = [];
  const step = r.bucket === "hour" ? 3_600_000 : DAY;
  for (let t = r.from.getTime(); t < r.to.getTime(); t += step) out.push(new Date(t));
  return out;
}

export const bucketKey = (d: Date, bucket: "hour" | "day") =>
  bucket === "hour"
    ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
    : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
