# Booking — GoHighLevel calendar embed

The booking section (`#book` in `index.html`) is an **embedded GoHighLevel (GHL)
calendar** inside a styled card. GHL fully manages booking, confirmations,
reminders, the CRM record, and the two-way Google Calendar sync. There is **no
custom backend** — the earlier `/api` functions + `package.json` were removed, so
this is a clean static site again.

## Where the booking rules live
Not in code — they're set on the **calendar in GoHighLevel** (Calendars →
your calendar → settings):

| Requirement | GHL setting |
| --- | --- |
| 15-min appointments | Slot Duration = 15 min; Slot Interval = 15 min |
| Eastern time | Calendar **Timezone** = America/Toronto |
| 2 weeks out | Availability → date/booking window → "Allow booking for **14** rolling days into the future" |
| Mon–Fri 5:45 PM–9:00 PM | Availability = **Custom** → Mon–Fri 17:45–21:00 |
| Sat/Sun 7:00 AM–7:00 PM | Custom → Sat & Sun 07:00–19:00 |
| Writes to Google Calendar | Settings → Calendars → connect Google; enable conflict-check + add bookings to that Google calendar |
| Brand match | Calendar Style/Look → primary color `#C2A04A` (gold) |
| Confirmations / reminders | Turn on the calendar's confirmation + reminder notifications |

To change availability later, edit the calendar in GHL — no code change needed.

## The embed in code
- `index.html` → `#book` section → `<iframe class="bk-embed" src="…">`.
- The `src` is the calendar's booking URL from **GHL → Calendars → your calendar
  → ⋮ → Embed Code**. Paste that URL into the iframe `src`
  (currently a `{{GHL_EMBED}}` placeholder until the real one is added).
- `https://link.msgsndr.com/js/form_embed.js` (loaded near the bottom of the page)
  auto-resizes the iframe to its content — don't set a fixed iframe height.

## If the GHL look ever feels too off-brand
Fallback is a "bespoke UI → GHL API" hybrid: rebuild the custom calendar UI and
point it at GHL's calendar API (`free-slots` + `appointments`). Ask and it can be
wired up.
