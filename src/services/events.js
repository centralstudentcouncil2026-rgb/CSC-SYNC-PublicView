const DAY_MS = 24 * 60 * 60 * 1000;

function dateFromIso(value) {
  return new Date(`${value}T00:00:00Z`);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = dateFromIso(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function daysBetween(first, second) {
  return Math.round((dateFromIso(second) - dateFromIso(first)) / DAY_MS);
}

function baseStartDate(event) {
  return event.startsAt.slice(0, 10);
}

function baseEndDate(event) {
  return event.endsAt.slice(0, 10);
}

function eventSpanDays(event) {
  return Math.max(0, daysBetween(baseStartDate(event), baseEndDate(event)));
}

function repeatUntilDate(event) {
  return event.frequency === "none" ? baseStartDate(event) : event.repeatUntil || baseStartDate(event);
}

function anchorOccursOn(event, date) {
  const startDate = baseStartDate(event);
  if (date < startDate) return false;
  if (date > repeatUntilDate(event)) return false;
  if (event.frequency === "none") return date === startDate;

  const diff = daysBetween(startDate, date);
  if (event.frequency === "daily") return diff >= 0;
  if (event.frequency === "weekly") return diff % 7 === 0;
  if (event.frequency === "monthly") return date.slice(8, 10) === startDate.slice(8, 10);
  if (event.frequency === "yearly") return date.slice(5, 10) === startDate.slice(5, 10);
  return date === startDate;
}

function occurrenceDateTime(event, date, field) {
  return `${date}T${event[field].slice(11, 19)}+08:00`;
}

function multiDayOccurrenceDateTime(event, date, offset, spanDays, field) {
  if (field === "startsAt") {
    return offset === 0 ? occurrenceDateTime(event, date, "startsAt") : `${date}T00:00:00+08:00`;
  }
  return offset === spanDays ? occurrenceDateTime(event, date, "endsAt") : `${date}T23:59:59+08:00`;
}

export function eventOccurrencesBetween(startDate, endDate, sourceEvents = []) {
  const occurrences = [];
  const seen = new Set();
  sourceEvents.forEach((event) => {
    if (event.status === "cancelled") return;
    const spanDays = eventSpanDays(event);
    const firstAnchorDate = addDays(startDate, -spanDays);
    for (let anchorDate = firstAnchorDate; anchorDate <= endDate; anchorDate = addDays(anchorDate, 1)) {
      if (!anchorOccursOn(event, anchorDate)) continue;
      const occurrenceFullStartsAt = occurrenceDateTime(event, anchorDate, "startsAt");
      const occurrenceFullEndsAt = occurrenceDateTime(event, addDays(anchorDate, spanDays), "endsAt");
      for (let offset = 0; offset <= spanDays; offset += 1) {
        const date = addDays(anchorDate, offset);
        if (date < startDate || date > endDate) continue;
        const startsAt = multiDayOccurrenceDateTime(event, date, offset, spanDays, "startsAt");
        const endsAt = multiDayOccurrenceDateTime(event, date, offset, spanDays, "endsAt");
        const key = `${event.id}:${anchorDate}:${date}`;
        const duplicateScheduleKey = [
          event.ownerAccountId,
          event.title.trim().toLowerCase(),
          startsAt.slice(11, 19),
          endsAt.slice(11, 19),
          date,
        ].join("|");
        if (seen.has(key)) continue;
        if (seen.has(duplicateScheduleKey)) continue;
        seen.add(key);
        seen.add(duplicateScheduleKey);
        occurrences.push({
          ...event,
          baseStartsAt: event.startsAt,
          baseEndsAt: event.endsAt,
          occurrenceFullStartsAt,
          occurrenceFullEndsAt,
          occurrenceAnchorDate: anchorDate,
          occurrenceDate: date,
          startsAt,
          endsAt,
        });
      }
    }
  });
  return occurrences;
}

