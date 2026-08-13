# Curbitas Outreach Tool

A **human-in-the-loop** system for promoting [curbitas.com](https://curbitas.com)
across Brooklyn & Manhattan communities — Buy Nothing groups, local subreddits,
Nextdoor, newsletters, blogs, and community orgs — **without getting your
accounts banned or your brand blacklisted.**

## Why it works this way (read this first)

The instinct is to build a bot that auto-posts your link everywhere. Don't.

- **Facebook, Reddit, Nextdoor, and Craigslist** all detect and ban automated
  posting. You'd burn accounts faster than you build reach.
- **Buy Nothing groups forbid promotion entirely.** They're gift-economy
  communities run by volunteer admins. A promo post — automated or not — gets
  deleted and can get *curbitas* a bad name among exactly the people you want.
- **On-topic spam is still spam.** What actually works is a real person showing
  up, being useful, and mentioning the tool where the rules allow it.

So this tool automates the *tedious* parts — finding targets, remembering each
one's rules, drafting tailored copy, and tracking follow-ups — and leaves the
*posting* to you, done the right way through each channel.

## What's here

| File | What it is |
|------|------------|
| `targets.sample.json` | Seed database of NYC communities with their promo rules, the compliant way in, and fit notes. Copy to `targets.json` and edit. |
| `templates.md` | One message template per channel type. Personalize before sending. |
| `index.html` / `outreach.css` / `outreach.js` | The tracker page — filter targets, set status, and generate a rule-appropriate draft per target. |

## Use it

1. Open `index.html` in a browser (or visit it once deployed).
2. Copy `targets.sample.json` → `targets.json` and add your real targets.
   The page loads `targets.json` if present.
3. For each target: read the **How** line, hit **Draft**, personalize, and
   post/send it yourself through the linked channel.
4. Move the status dropdown as you go. Progress saves in your browser
   (`localStorage`); use **Export progress** to back it up or move machines.

## The `promo_policy` traffic light

- 🟢 **allowed** — links welcome, promote directly.
- 🟡 **mods_approve** — ask a moderator first, every time.
- 🔵 **submit_form** — has an official tip/submission form. This is the invited
  front door — use it.
- 🔴 **no_promo** — do **not** post your link. Participate as a genuine member;
  the value is goodwill, not a post.

## Extending it

- **More targets:** add entries to `targets.json` following the `_schema` block.
- **Discovery:** to auto-find candidates, a scraper/search step could pre-fill
  entries — kept as a separate, opt-in step so nothing posts on its own.
- **Partnerships:** the highest-leverage plays (e.g. Stooping NYC) are
  collaborations, not posts. The `partnership_pitch` template is for those.
