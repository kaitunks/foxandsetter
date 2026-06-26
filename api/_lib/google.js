'use strict';
// Authenticated Google Calendar client from a service account.
// Set these in Vercel → Project → Settings → Environment Variables:
//   GOOGLE_CLIENT_EMAIL   the service account email (…@….iam.gserviceaccount.com)
//   GOOGLE_PRIVATE_KEY    the service account private key (keep the \n escapes)
//   GOOGLE_CALENDAR_ID    the calendar to read/write (e.g. your Gmail address)
// Returns null when not configured, so the site still runs pre-setup.
const { google } = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getCalendar() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) return null;
  const auth = new google.auth.JWT({ email, key, scopes: SCOPES });
  return google.calendar({ version: 'v3', auth });
}

const CALENDAR_ID = () => process.env.GOOGLE_CALENDAR_ID || 'primary';

module.exports = { getCalendar, CALENDAR_ID };
