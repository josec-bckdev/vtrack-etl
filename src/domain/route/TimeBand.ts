export type TimeBand = "AM" | "PM";

export interface BandWindow {
  startHour: number;
  endHour: number;
}

export interface DateRange {
  start: Date;
  stop: Date;
}

// Business rule: Colombia is UTC-5, no DST.
// These hours are expressed in UTC.
export const BAND_WINDOWS: Record<TimeBand, BandWindow> = {
  AM: { startHour: 10, endHour: 15 }, // 5am-10am COT
  PM: { startHour: 20, endHour: 22 }, // 3pm-5pm COT
};

export function buildDateRangeForBand(date: Date, band: TimeBand): DateRange {
  const window = BAND_WINDOWS[band];

  const start = new Date(date);
  start.setUTCHours(window.startHour, 0, 0, 0);

  const stop = new Date(date);
  stop.setUTCHours(window.endHour, 0, 0, 0);

  return { start, stop };
}