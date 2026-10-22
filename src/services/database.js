export function mapEvent(row, occurrence = {}, series = {}, revision = null) {
  return {
    id: row.id,
    seriesId: series.id || "",
    occurrenceId: occurrence.id || "",
    ownerAccountId: row.owner_account_id,
    creatorAccountId: row.creator_account_id,
    title: row.title || "",
    category: row.category || "",
    otherCategoryDetail: row.other_category_detail || "",
    venue: row.venue || "",
    startsAt: localScheduleTimestamp(occurrence.starts_at || row.starts_at),
    endsAt: localScheduleTimestamp(occurrence.ends_at || row.ends_at),
    frequency: series.frequency || row.frequency || "none",
    repeatUntil: series.repeat_until || row.repeat_until || "",
    expectedAttendees: row.expected_attendees || "",
    visibility: row.visibility || "internal",
    publicDescription: row.public_description || "",
    purpose: row.purpose || "",
    status: row.status || "pending",
    version: row.version || 1,
    hasPendingRevision: row.has_pending_revision === true || Boolean(revision),
    pendingRevision: null,
  };
}

function localScheduleTimestamp(value) {
  return value ? `${manilaDate(value)}T${manilaTime(value)}+08:00` : "";
}

function manilaDate(value = "") {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function manilaTime(value = "") {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.hour}:${byType.minute}:${byType.second}`;
}

