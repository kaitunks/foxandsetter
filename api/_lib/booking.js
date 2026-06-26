'use strict';
// ──────────────────────────────────────────────────────────────
// Shared booking rules + Eastern-time helpers.
// ONE source of truth for: the 2-week window, the daily availability
// windows, 15-minute slots, and Eastern-time (America/Toronto) math.
// No external timezone library — uses the built-in Intl APIs, which
// handle EST/EDT (daylight saving) automatically.
// ──────────────────────────────────────────────────────────────

const TZ = 'America/Toronto';   // Eastern Time — auto-switches EST/EDT
const SLOT_MIN = 15;            // appointment length AND grid increment (minutes)
const MAX_DAYS_AHEAD = 14;      // rolling 2-week booking horizon

// Availability per weekday, in Eastern wall-clock minutes-from-midnight.
// 0 = Sunday … 6 = Saturday.  [open, close] — "close" is the latest END time.
const WINDOWS = {
  0: [7 * 60,        19 * 60],   // Sun  7:00 AM – 7:00 PM
  1: [17 * 60 + 45,  21 * 60],   // Mon  5:45 PM – 9:00 PM
  2: [17 * 60 + 45,  21 * 60],   // Tue  5:45 PM – 9:00 PM
  3: [17 * 60 + 45,  21 * 60],   // Wed  5:45 PM – 9:00 PM
  4: [17 * 60 + 45,  21 * 60],   // Thu  5:45 PM – 9:00 PM
  5: [17 * 60 + 45,  21 * 60],   // Fri  5:45 PM – 9:00 PM
  6: [7 * 60,        19 * 60],   // Sat  7:00 AM – 7:00 PM
};

// Eastern-local clock parts for an instant.
function tzParts(date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  if (p.hour === '24') p.hour = '00'; // some engines emit '24' at midnight
  return p;
}

// Offset (minutes) of America/Toronto from UTC at a given instant.
function tzOffsetMin(date) {
  const p = tzParts(date);
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUTC - date.getTime()) / 60000;
}

// Eastern wall-clock (y, mo[1-12], d, h, mi) → absolute Date (UTC instant).
function easternToInstant(y, mo, d, h, mi) {
  const naiveUTC = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset1 = tzOffsetMin(new Date(naiveUTC));
  let instant = new Date(naiveUTC - offset1 * 60000);
  const offset2 = tzOffsetMin(instant);        // correct around DST boundaries
  if (offset2 !== offset1) instant = new Date(naiveUTC - offset2 * 60000);
  return instant;
}

// Eastern calendar date {y, mo, d} for an instant.
function easternYMD(date) {
  const p = tzParts(date);
  return { y: +p.year, mo: +p.month, d: +p.day };
}

// Weekday (0=Sun..6=Sat) of an Eastern calendar date (noon avoids DST edges).
function easternWeekday(y, mo, d) {
  const noon = easternToInstant(y, mo, d, 12, 0);
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(noon);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
}

// Every candidate slot for an Eastern date (no past/busy filtering).
function slotsForDate(y, mo, d) {
  const win = WINDOWS[easternWeekday(y, mo, d)];
  if (!win) return [];
  const [open, close] = win;
  const out = [];
  for (let m = open; m + SLOT_MIN <= close; m += SLOT_MIN) {
    const start = easternToInstant(y, mo, d, Math.floor(m / 60), m % 60);
    out.push({ start, end: new Date(start.getTime() + SLOT_MIN * 60000) });
  }
  return out;
}

// Is this ISO start a legitimate, in-window, on-grid slot start?
// (Server-side guard so a crafted POST can't book outside the rules.)
function isAllowedStart(startISO) {
  const start = new Date(startISO);
  if (isNaN(start.getTime())) return false;
  const now = Date.now();
  if (start.getTime() < now) return false;
  if (start.getTime() > now + MAX_DAYS_AHEAD * 86400000) return false;
  const { y, mo, d } = easternYMD(start);
  return slotsForDate(y, mo, d).some(s => s.start.getTime() === start.getTime());
}

module.exports = { TZ, SLOT_MIN, MAX_DAYS_AHEAD, slotsForDate, isAllowedStart, easternYMD };
