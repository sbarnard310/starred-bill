#!/usr/bin/env python3
"""Booking reminders: the email members get the day before bookings open for a date at a restaurant.

Members ask for one on a restaurant's page ("Email me the day before", kept in `booking_reminders`) or, under Emails on
Your account, for every restaurant on their trips (each trip item's day, else the trip's first day, until it's marked
booked). The restaurants' booking windows come from the build (_site/data/booking.json, write_booking_data() in
build.py, from `bookingWindow` in each restaurant's file); the reminders from Supabase (booking_reminders_pending(), with
the secret key); the emails go out through Resend, one per member holding everything that opens tomorrow (in the
restaurant's own time zone, or later today when the run is late). Each one sent is recorded in `email_sent` (topic
'book:<restaurant>@<date>'), and a restaurant-page reminder is marked sent, so running it again never sends twice.
Standard library only, Python 3.9 compatible. Run every morning by .github/workflows/booking-reminders.yml; by hand:

  python3 build.py
  python3 scripts/booking_reminders.py --preview out/ --restaurant le-bernardin --day 2026-12-18   # a sample, nothing sent
  python3 scripts/booking_reminders.py --test-to you@example.com --restaurant le-bernardin --day 2026-12-18
  python3 scripts/booking_reminders.py --send                                                       # what the workflow runs

Settings come from the environment, as for scripts/star_alerts.py: SUPABASE_SERVICE_KEY and RESEND_API_KEY.
"""
import argparse
import hashlib
import html
import json
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover (Python 3.9 has it)
    ZoneInfo = None

sys.path.insert(0, str(Path(__file__).resolve().parent))
from star_alerts import ROOT, SITE, SUPABASE_URL, BATCH, call, already_sent, record_sent, send_batch  # noqa: E402

RUN_MAX = 50   # emails per run: Resend's free plan sends 100 a day, shared with sign-in and star emails
TRACK = "utm_source=booking-email&utm_medium=email&utm_campaign=reminder"
UK = "Europe/London"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
BW_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]


# ---------- When bookings open (bwOpens() in common.js works it out the same way: change both) ----------
def add_months(y, m, n):
    k = y * 12 + (m - 1) + n
    return k // 12, k % 12 + 1


def month_days(y, m):
    ny, nm = add_months(y, m, 1)
    return (date(ny, nm, 1) - timedelta(days=1)).day


def bw_opens(bw, day):
    """The day bookings open for `day` (a date), or None when it can't be worked out."""
    if bw.get("type") == "rolling" and bw.get("days"):
        return day - timedelta(days=bw["days"])
    if bw.get("type") == "rolling" and bw.get("months"):
        y, m = add_months(day.year, day.month, -bw["months"])
        return date(y, m, min(day.day, month_days(y, m)))
    if bw.get("type") != "monthly":
        return None
    y, m = add_months(day.year, day.month, -(bw.get("ahead") or 1))
    if bw.get("weekday"):
        wd = BW_DAYS.index(bw["weekday"])
        first = (date(y, m, 1).weekday() + 1) % 7  # Sunday = 0, as in JavaScript
        nth = bw.get("nth") or 1
        if nth > 0:
            on = 1 + (wd - first) % 7 + 7 * (nth - 1)
        else:
            last = month_days(y, m)
            on = last - (((date(y, m, last).weekday() + 1) % 7) - wd) % 7
    else:
        on = min(bw.get("day") or 1, month_days(y, m))
    o = date(y, m, on)
    if bw.get("workday"):
        while o.weekday() >= 5:
            o += timedelta(days=1)
    return o


def long_day(d, year=True):
    return f"{DAYS[d.weekday()]} {d.day} {MONTHS[d.month - 1]}" + (f" {d.year}" if year else "")


def clock(dt):
    h, m = dt.hour, dt.minute
    if not h and not m:
        return "midnight"
    return f"{h % 12 or 12}{'.%02d' % m if m else ''}{'am' if h < 12 else 'pm'}"


def zone_name(tz):
    return tz.split("/")[-1].replace("_", " ") + " time"


def opening(bw, day, now):
    """When bookings for `day` open, as (local date, local datetime or None, whether a reminder is due now)."""
    on = bw_opens(bw, day)
    if not on or ZoneInfo is None:
        return on, None, False
    tz = ZoneInfo(bw["tz"])
    local_now = now.astimezone(tz)
    at = None
    if bw.get("time"):
        h, m = map(int, bw["time"].split(":"))
        at = datetime(on.year, on.month, on.day, h, m, tzinfo=tz)
    today = local_now.date()
    # The day before (local time), or the day itself when a run was missed and the opening time hasn't come yet.
    due = on - timedelta(days=1) == today or (on == today and at is not None and local_now < at - timedelta(hours=1))
    return on, at, due


def when_text(bw, on, at, now):
    """ "tomorrow, Thursday 1 April, at 7am New York time (12pm UK time)" """
    local_today = now.astimezone(ZoneInfo(bw["tz"])).date()
    rel = "tomorrow" if on - local_today == timedelta(days=1) else "today" if on == local_today else "on"
    s = (f"{rel}, {long_day(on, year=False)}" if rel != "on" else f"on {long_day(on)}")
    if at:
        s += f", at {clock(at)} {zone_name(bw['tz'])}"
        if bw["tz"] != UK:
            uk = at.astimezone(ZoneInfo(UK))
            s += f" ({clock(uk)}{' on ' + long_day(uk.date(), year=False) if uk.date() != on else ''} UK time)"
    return s


# ---------- The email ----------
def link(path):
    base, _, frag = path.partition("#")
    return SITE + base + ("&" if "?" in base else "?") + TRACK + ("#" + frag if frag else "")


def booking_label(url):
    for host, name in (("exploretock", "Tock"), ("resy.com", "Resy"), ("opentable", "OpenTable"), ("sevenrooms", "SevenRooms"),
                       ("tablecheck", "TableCheck"), ("covermanager", "CoverManager"), ("ikyu", "Ikyu"), ("zenchef", "Zenchef")):
        if host in url:
            return "Book on " + name
    return "Go to its booking page"


def compose(member, items, now):
    """One member's email: every restaurant whose bookings for their date open next."""
    blocks_h, blocks_t = [], []
    for it in items:
        w, day, on, at = it["w"], it["day"], it["on"], it["at"]
        when = when_text(w["bw"], on, at, now)
        whose = f"your table on {long_day(day)}" + (f" (your trip “{it['trip']}”)" if it.get("trip") else "")
        page = link(w["href"])
        btn = (f'<p style="margin:12px 0 0;"><a href="{html.escape(w["book"])}" style="display:inline-block;background:#1E6142;color:#FFFFFF;text-decoration:none;'
               f'font-weight:bold;font-size:15px;padding:11px 22px;border-radius:999px;">{html.escape(booking_label(w["book"]))}</a></p>') if w.get("book") else ""
        blocks_h.append(
            '<div style="margin:22px 0 0;padding:16px 18px;border:1px solid #D5E0D6;border-radius:10px;">'
            f'<a href="{html.escape(page)}" style="font-family:Georgia,serif;font-size:20px;color:#12261C;text-decoration:none;">{html.escape(w["name"])}</a>'
            f'<span style="font-size:14px;color:#5A6E62;"> · {html.escape(w["where"])}</span>'
            f'<p style="margin:8px 0 0;font-size:16px;line-height:1.5;color:#12261C;">Bookings for {html.escape(whose)} open <strong>{html.escape(when)}</strong>.</p>'
            f'<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#5A6E62;">{html.escape(w["text"])} '
            f'<a href="{html.escape(page)}" style="color:#1E6142;">What it costs</a></p>{btn}</div>')
        blocks_t.append(f"\n{w['name']} ({w['where']})\nBookings for {whose} open {when}.\n{w['text']}\n"
                        + (f"{booking_label(w['book'])}: {w['book']}\n" if w.get("book") else "") + f"What it costs: {page}\n")
    first = items[0]
    gap = (first["on"] - now.astimezone(ZoneInfo(first["w"]["bw"]["tz"])).date()).days
    rel = "tomorrow" if gap == 1 else "today" if gap == 0 else "on " + long_day(first["on"], year=False)
    subject = (f"Bookings for {first['w']['name']} open {rel}" if len(items) == 1 else f"Bookings open {rel} at {len(items)} restaurants on your list")
    h1 = subject
    intro = ("The best tables go within minutes of opening, so have your card and party size ready, and be signed in to the booking site beforehand."
             if len(items) == 1 else "Have your card and party size ready, and be signed in to each booking site beforehand: the best tables go within minutes.")
    unsub = f'{SITE}/unsubscribe/?t={member["token"]}&what=booking'
    manage = f"{SITE}/account/#reminders"
    footer_h = ("You're getting this because you asked for booking reminders on your Starred Bill account. Opening times come from each "
                "restaurant's own website or booking page and can change, so check there too. "
                f'<a href="{html.escape(manage)}" style="color:#5A6E62;">Your reminders</a> · '
                f'<a href="{html.escape(unsub)}" style="color:#5A6E62;">Stop booking reminders</a>')
    page = f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F6F1;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #D5E0D6;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#10362A;padding:18px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:14px;"><img src="https://starredbill.com/img/email/receipt-mark.png" width="27" height="40" alt="" style="display:block;border:0;"></td>
                <td style="vertical-align:middle;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#F5F0E4;">The Starred Bill</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 26px;color:#12261C;">
            <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;line-height:1.2;color:#12261C;">{html.escape(h1)}</h1>
            <p style="margin:0;font-size:16px;line-height:1.5;color:#3E5247;">{html.escape(intro)}</p>
            {"".join(blocks_h)}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px 24px;border-top:1px solid #D5E0D6;font-size:12px;line-height:1.5;color:#5A6E62;">
            {footer_h}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>"""
    text = (f"{h1}\n\n{intro}\n" + "".join(blocks_t)
            + "\n--\nYou're getting this because you asked for booking reminders on your Starred Bill account. Opening times come from each "
              "restaurant's own website or booking page and can change, so check there too.\n"
              f"Your reminders: {manage}\nStop booking reminders: {unsub}\n")
    return {"to": [member["email"]], "subject": subject, "html": page, "text": text,
            "headers": {"List-Unsubscribe": f"<{unsub}>, <mailto:hello@starredbill.com?subject=Unsubscribe>"}}


def topic(rid, day):
    return f"book:{rid}@{day.isoformat()}"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--send", action="store_true", help="email the members whose reminders are due (needs both keys)")
    ap.add_argument("--preview", help="write a sample email to this folder as HTML and text, sending nothing")
    ap.add_argument("--test-to", help="send the sample email to this one address (needs RESEND_API_KEY)")
    ap.add_argument("--restaurant", default="le-bernardin", help="the sample's restaurant (its file name)")
    ap.add_argument("--day", help="the sample's dining date, e.g. 2026-12-18 (default: the first date whose bookings open tomorrow)")
    ap.add_argument("--max", type=int, default=RUN_MAX, help=f"most emails this run (default {RUN_MAX})")
    args = ap.parse_args()

    data_file = ROOT / "_site" / "data" / "booking.json"
    if not data_file.exists():
        sys.exit("Run python3 build.py first: the booking windows come from _site/data/booking.json.")
    windows = json.loads(data_file.read_text("utf-8"))
    now = datetime.now(timezone.utc)

    if args.preview or args.test_to:
        w = windows.get(args.restaurant)
        if not w or w["bw"].get("type") not in ("rolling", "monthly"):
            sys.exit(f"{args.restaurant} has no booking window we can work dates out from.")
        if args.day:
            day = date.fromisoformat(args.day)
        else:  # the first dining date whose bookings open tomorrow, so the sample reads as the real thing
            days = [now.date() + timedelta(days=i) for i in range(1, 800)]
            tomorrow = now.astimezone(ZoneInfo(w["bw"]["tz"])).date() + timedelta(days=1)
            day = (next((d for d in days if opening(w["bw"], d, now)[0] == tomorrow), None)
                   or next(d for d in days if (opening(w["bw"], d, now)[0] or date.min) > now.date()))
        on, at, _ = opening(w["bw"], day, now)
        member = {"email": args.test_to or "member@example.com", "token": "00000000-0000-0000-0000-000000000000"}
        mail = compose(member, [{"w": w, "day": day, "on": on, "at": at, "trip": "Sample trip" if not args.day else ""}], now)
        if args.preview:
            out = Path(args.preview)
            out.mkdir(parents=True, exist_ok=True)
            (out / "booking-email.html").write_text(f"<!doctype html><meta charset=utf-8><title>{html.escape(mail['subject'])}</title>"
                                                    f"<p style='font:14px Arial;margin:12px'><b>Subject:</b> {html.escape(mail['subject'])}</p>" + mail["html"], "utf-8")
            (out / "booking-email.txt").write_text("Subject: " + mail["subject"] + "\n\n" + mail["text"], "utf-8")
            print(f"Sample written to {out}/booking-email.html (subject: {mail['subject']})")
        if args.test_to:
            rk = os.environ.get("RESEND_API_KEY")
            if not rk:
                sys.exit("RESEND_API_KEY isn't set up.")
            mail["subject"] = "[Test] " + mail["subject"]
            send_batch(rk, [mail], "test-" + hashlib.sha1((mail["subject"] + str(time.time())).encode()).hexdigest())
            print(f"Sample sent to {args.test_to}.")
        return

    sk, rk = os.environ.get("SUPABASE_SERVICE_KEY"), os.environ.get("RESEND_API_KEY")
    if not sk or not rk:
        print("Booking reminders aren't set up yet: add SUPABASE_SERVICE_KEY and RESEND_API_KEY as GitHub secrets. Nothing sent.")
        return
    rows = call(f"{SUPABASE_URL}/rest/v1/rpc/booking_reminders_pending", sk, "POST", {}) or []
    due = {}
    for x in rows:
        w = windows.get(x["restaurant"])
        if not w or not x.get("visit_on"):
            continue
        day = date.fromisoformat(x["visit_on"])
        on, at, is_due = opening(w["bw"], day, now)
        if not is_due:
            continue
        m = due.setdefault(x["user_id"], {"member": x, "items": {}, "reminders": set()})
        key = (x["restaurant"], day)
        m["items"].setdefault(key, {"w": w, "day": day, "on": on, "at": at, "trip": x.get("trip") or "", "id": x["restaurant"]})
        if x["source"] == "reminder":
            m["reminders"].add(key)
    sent = already_sent(sk, sorted({topic(r, d) for m in due.values() for r, d in m["items"]})) if due else set()
    todo = []
    for uid, m in due.items():
        items = [it for (r, d), it in sorted(m["items"].items(), key=lambda kv: (kv[1]["at"] or datetime.max.replace(tzinfo=timezone.utc), kv[0][0]))
                 if (uid, topic(r, d)) not in sent]
        if items:
            todo.append((uid, m, items, compose(m["member"], items, now)))
    print(f"{len(rows)} reminders waiting; {len(todo)} member(s) have bookings opening next.")
    if not args.send:
        for _, _, _, mail in todo[:5]:
            print(f"  would send: {mail['subject']}")
        print("Pass --send to send them.")
        return
    left, todo = todo[args.max:], todo[:args.max]
    for i in range(0, len(todo), BATCH):
        part = todo[i:i + BATCH]
        idem = hashlib.sha1("|".join(uid + ":" + ",".join(topic(it["id"], it["day"]) for it in items) for uid, _, items, _ in part).encode()).hexdigest()
        send_batch(rk, [mail for _, _, _, mail in part], idem)
        record_sent(sk, [{"user_id": uid, "topic": topic(it["id"], it["day"])} for uid, _, items, _ in part for it in items])
        for uid, m, items, _ in part:
            for it in items:
                if (it["id"], it["day"]) in m["reminders"]:
                    call(f"{SUPABASE_URL}/rest/v1/booking_reminders?user_id=eq.{uid}&restaurant=eq.{it['id']}&visit_on=eq.{it['day'].isoformat()}",
                         sk, "PATCH", {"sent_at": now.isoformat()}, {"Prefer": "return=minimal"})
        print(f"  sent {len(part)}")
    print(f"Sent {len(todo)} booking reminder(s)." + (f" {len(left)} more are due: run the workflow again by hand later today." if left else ""))


if __name__ == "__main__":
    main()
