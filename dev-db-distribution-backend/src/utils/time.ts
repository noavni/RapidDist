export const hoursToMilliseconds = (hours: number) => hours * 60 * 60 * 1000;

export const minutesToMilliseconds = (minutes: number) => minutes * 60 * 1000;

export const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hoursToMilliseconds(hours));

export const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutesToMilliseconds(minutes));

export const datePathParts = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return { year, month, day };
};

export const formatTimestamp = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}`;
};

export const nowUtc = () => new Date();

export const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
