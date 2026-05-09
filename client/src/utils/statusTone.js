export function statusTone(value = "") {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("approved") || normalized.includes("active") || normalized.includes("clear") || normalized.includes("completed") || normalized.includes("present") || normalized.includes("verified")) return "emerald";
  if (normalized.includes("pending") || normalized.includes("review") || normalized.includes("late") || normalized.includes("high") || normalized.includes("medium")) return "amber";
  if (normalized.includes("rejected") || normalized.includes("urgent") || normalized.includes("absent") || normalized.includes("angry")) return "rose";
  if (normalized.includes("blue") || normalized.includes("leave") || normalized.includes("remote")) return "blue";
  return "slate";
}
