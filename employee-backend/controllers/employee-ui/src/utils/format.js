export function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString();
}

export function formatTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function humanizeTaskStatus(status) {
  if (status === "inprogress") return "In Progress";
  if (status === "completed") return "Completed";
  return "To Do";
}
