# Booking widget — Google Calendar setup

The booking widget on the site (`#book`) talks to two serverless functions:

- `GET /api/availability?date=YYYY-MM-DD` — lists 15-min slots and greys out
  anything already busy on your calendar.
- `POST /api/book` — creates the 15-min event on your calendar.

**The rules are baked in** (`api/_lib/booking.js`):

| Setting | Value |
| --- | --- |
| Time zone | Eastern (America/Toronto, auto EST/EDT) |
| Booking window | rolling 2 weeks (next 14 days) |
| Slot length / grid | 15 minutes |
| Mon–Fri | 5:45 PM – 9:00 PM |
| Sat–Sun | 7:00 AM – 7:00 PM |

To change any of these later, edit `WINDOWS` / `MAX_DAYS_AHEAD` / `SLOT_MIN`
at the top of `api/_lib/booking.js`.

---

## One-time Google setup (~10 min)

You'll create a **service account** (a robot Google identity) and share your
calendar with it. This works with a normal Gmail calendar — no Google Workspace
required.

### 1. Create a Google Cloud project + service account
1. Go to <https://console.cloud.google.com/> and create a project (e.g. "Fox & Setter Booking").
2. Enable the **Google Calendar API**: APIs & Services → Library → search
   "Google Calendar API" → **Enable**.
3. APIs & Services → **Credentials** → **Create credentials** → **Service account**.
   Name it (e.g. "booking-bot"), click through, **Done**.
4. Click the new service account → **Keys** → **Add key** → **Create new key** →
   **JSON**. A `.json` file downloads — keep it safe. Inside it you'll find
   `client_email` and `private_key`.

### 2. Share your calendar with the service account
1. Open <https://calendar.google.com/> → hover your calendar → ⋮ →
   **Settings and sharing**.
2. Under **Share with specific people**, add the service account's
   `client_email` (looks like `booking-bot@your-project.iam.gserviceaccount.com`).
3. Set its permission to **Make changes to events**.
4. Scroll to **Integrate calendar** and copy the **Calendar ID** (for your
   primary calendar this is usually just your Gmail address).

### 3. Add the credentials to Vercel
In Vercel → your project → **Settings → Environment Variables**, add three
(for **Production**, and Preview if you want):

| Name | Value |
| --- | --- |
| `GOOGLE_CLIENT_EMAIL` | the `client_email` from the JSON |
| `GOOGLE_PRIVATE_KEY` | the `private_key` from the JSON (see note below) |
| `GOOGLE_CALENDAR_ID` | the Calendar ID from step 2 |

**`GOOGLE_PRIVATE_KEY` note:** copy the whole value including
`-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. If you paste it
as a single line, keep the literal `\n` sequences — the code converts `\n` back
into real newlines. (Pasting the multi-line value directly works too.)

### 4. Redeploy
Vercel → Deployments → redeploy the latest (or just push any commit). Done.

---

## How it behaves

- **Before** the env vars are set: the widget still shows available times, but
  submitting says *"Booking isn't connected yet — please email…"*. Nothing breaks.
- **After** setup: picking a slot and confirming creates the event on your
  calendar, and the visitor sees a confirmation. Busy times are auto-hidden, and
  a last-second double-booking is rejected with a friendly message.

## Booker confirmation emails
- On **Google Workspace**, the code invites the booker as an attendee, so they
  get a Google Calendar invite automatically.
- On a **personal Gmail** calendar, Google doesn't let a service account invite
  attendees, so the event is created with the booker's details in the
  description (no automatic email to them). If you want automatic confirmation
  emails to the booker on a personal Gmail, ask and I'll add an email step
  (e.g. via Resend) or switch to OAuth.

## Test locally (optional)
`npm i`, then `npx vercel dev` and open the printed URL. Create a `.env.local`
with the three vars above to exercise real bookings.
