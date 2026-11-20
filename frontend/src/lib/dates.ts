export function localDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
export function niceDate(d: string, locale: "en" | "ru" = "en") {
  if (!d) return "";
  return new Date(d.slice(0, 10) + "T12:00:00Z").toLocaleDateString(
    locale === "ru" ? "ru-RU" : "en-US",
    { day: "numeric", month: "short", timeZone: "UTC" },
  );
}
export function hoursLeft(d: string) {
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 3600000));
}
