export function adjacentMonth(date, step) {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + step, 1)).toISOString().slice(0, 10);
}

