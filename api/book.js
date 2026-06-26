'use strict';
// POST /api/book  { start, name, email, phone?, notes? }
// Validates against the booking rules, re-checks the slot is free, then
// creates a 15-minute event on the Google Calendar.
const { SLOT_MIN, isAllowedStart } = require('./_lib/booking');
const { getCalendar, CALENDAR_ID } = require('./_lib/google');

function readJson(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch { return Promise.resolve({}); }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const body = await readJson(req);
    const start = String(body.start || '').trim();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const notes = String(body.notes || '').trim();

    if (!name || !email || !start) {
      return res.status(400).json({ error: 'Please add your name, email, and pick a time.' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!isAllowedStart(start)) {
      return res.status(400).json({ error: 'That time isn’t available — please choose another.' });
    }

    const cal = getCalendar();
    if (!cal) {
      return res.status(503).json({ error: 'Booking isn’t connected yet. Please email contact@foxandsetter.com.' });
    }

    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + SLOT_MIN * 60000);
    const calId = CALENDAR_ID();

    // Re-check the slot is still free (guards against a double-book race).
    const fb = await cal.freebusy.query({
      requestBody: { timeMin: startDate.toISOString(), timeMax: endDate.toISOString(), items: [{ id: calId }] },
    });
    if (((fb.data.calendars[calId] || {}).busy || []).length) {
      return res.status(409).json({ error: 'Sorry — that time was just booked. Please pick another.' });
    }

    const base = {
      summary: `Consult — ${name}`,
      description:
        `Booked via foxandsetter.com\n\n` +
        `Name: ${name}\nEmail: ${email}\nPhone: ${phone || '—'}\n\nNotes:\n${notes || '—'}`,
      start: { dateTime: startDate.toISOString(), timeZone: 'America/Toronto' },
      end: { dateTime: endDate.toISOString(), timeZone: 'America/Toronto' },
      reminders: { useDefault: true },
    };

    try {
      // On Google Workspace (with delegation) this invites the booker so they
      // receive a calendar invite + confirmation email.
      await cal.events.insert({
        calendarId: calId,
        sendUpdates: 'all',
        requestBody: { ...base, attendees: [{ email, displayName: name }] },
      });
    } catch (err) {
      const msg = String((err && err.message) || '');
      // Personal Gmail / service accounts can't add attendees — fall back to a
      // plain event (booker details are captured in the description).
      if (/Delegation|attendee/i.test(msg)) {
        await cal.events.insert({ calendarId: calId, requestBody: base });
      } else {
        throw err;
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('book error:', e);
    res.status(500).json({ error: 'Something went wrong booking that. Please try again or email us.' });
  }
};
