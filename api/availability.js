'use strict';
// GET /api/availability?date=YYYY-MM-DD
// Returns every 15-min slot for that Eastern day, each flagged available
// or not (past times + anything busy on the Google Calendar are excluded).
// Works even before Google is configured — it just shows all future slots.
const { slotsForDate } = require('./_lib/booking');
const { getCalendar, CALENDAR_ID } = require('./_lib/google');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const date = (req.query && req.query.date) || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid or missing date (expected YYYY-MM-DD).' });
    }

    const [y, mo, d] = date.split('-').map(Number);
    const slots = slotsForDate(y, mo, d);
    const now = Date.now();

    let busy = [];
    const cal = getCalendar();
    if (cal && slots.length) {
      const calId = CALENDAR_ID();
      const fb = await cal.freebusy.query({
        requestBody: {
          timeMin: slots[0].start.toISOString(),
          timeMax: slots[slots.length - 1].end.toISOString(),
          items: [{ id: calId }],
        },
      });
      busy = (fb.data.calendars[calId] || {}).busy || [];
    }

    const out = slots.map(s => {
      const sMs = s.start.getTime();
      const eMs = s.end.getTime();
      const overlaps = busy.some(b =>
        sMs < new Date(b.end).getTime() && eMs > new Date(b.start).getTime());
      return { start: s.start.toISOString(), available: sMs >= now && !overlaps };
    });

    res.status(200).json({ date, tz: 'America/Toronto', configured: !!cal, slots: out });
  } catch (e) {
    console.error('availability error:', e);
    res.status(500).json({ error: 'Could not load availability.' });
  }
};
