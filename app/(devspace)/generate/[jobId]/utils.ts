export function formatDateTime(iso: string | null | undefined) {
  if (!iso) {
    return "Unknown";
  }

  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCommitMessage(message: string | null | undefined) {
  if (!message) {
    return "No commit message";
  }

  return message.length > 80 ? `${message.slice(0, 77)}…` : message;
}

export function formatDateRange(start: string | null, end: string | null) {
  if (!start || !end) {
    return "No date range";
  }

  const startDate = formatDateTime(start);
  const endDate = formatDateTime(end);

  return `${startDate} → ${endDate}`;
}

export function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "warning";
    case "processing":
      return "primary";
    case "completed":
      return "success";
    case "failed":
      return "danger";
    default:
      return "default";
  }
}

export function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "pending":
      return "flat";
    case "processing":
      return "solid";
    case "completed":
      return "solid";
    case "failed":
      return "solid";
    default:
      return "flat";
  }
}
