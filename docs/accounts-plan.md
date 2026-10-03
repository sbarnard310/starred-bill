# Plan: free user accounts

Built 3 October 2026: accounts, wishlist syncing, "been there" with stats and milestones, the account page and the privacy notice. Decisions: Supabase; email link + Google; signed-out wishlist stays on the device; "been there" is a tick plus an optional date. Still to do: alerts and the other extras below.

## The idea

Visitors can create a free account to keep their **wishlist** on every device and tick off restaurants they've **been to**. Signed-out visitors can still use the wishlist; it stays on that device only, with a prompt to sign up and keep it everywhere. Signing up copies their existing list into the account.

## Recommended approach

- **Supabase** (free up to 50,000 active users a month) stores accounts and lists. The site itself stays on GitHub Pages.
- Sign in by **email link** (no passwords) and **Continue with Google**. Add **Sign in with Apple** later, when making a phone app (Apple's developer account costs $99 a year).
- Each person can only see and change their own lists.
- A short **privacy page** is needed once emails are stored (UK data law). No cookie banner needed.

## Decisions still to make

1. Supabase (recommended) or Firebase?
2. Email link + Google to start, Apple later?
3. Signed-out wishlist: keep saving on the device with a sign-up prompt (recommended), or don't save it at all?
4. "Been there": just a tick, or tick + date + your own score and notes?
5. Which extra features go in the first version (see below)?

## Your setup steps (about 30–45 minutes; Claude will give exact clicks)

1. Create a free account at supabase.com and a new project. Send Claude the project's web address and its public "anon" key (it's meant to be public, like the Maps key).
2. In Google Cloud, set up the Google sign-in consent screen and login credentials, then paste them into Supabase.
3. Create a free account at resend.com (3,000 emails a month) so sign-in emails come from starredbill.com. Add the 3 DNS records it gives you at Namecheap.

## What Claude builds

- Sign-in window, account menu in the header, wishlist syncing across devices
- "Been there" ticks, a filter for them, and progress lines (e.g. "12 of 84 in London")
- Account page: wishlist, places been, download my data, delete my account
- Privacy page
- Tested in all languages and on phones

## Extra feature ideas, in suggested order

1. **Make "Been there" rewarding**: stars collected total, milestones (first three-star, every three-star in London), a personal map of places you've been, estimated spend, and shareable Instagram-sized cards, including a "My year in stars" summary.
2. **Alerts**: email or phone notification when a wishlisted restaurant gains or loses a star, changes price or closes; reminders before hard-to-book restaurants release their tables; "new city added".
3. **Several named lists** (e.g. "Paris trip"), shareable by link.
4. **"Report a price"** from signed-in users, approved by you in Pages CMS before it goes live.
5. Personal score and notes per visit; your default currency and language follow you to any device.
6. Later: newsletter (opt-in only), "most wished-for" lists, following friends, booking links that earn a fee.

**Suggested first version:** accounts + wishlist + "Been there" + stars-collected stats with a share card + alerts for wishlisted restaurants. About two working sessions.
