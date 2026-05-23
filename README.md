# Bookie 📚

Your pookie for links.

## What is it?

You scroll. You see something cool — a blog post, a YouTube video, a tweet.
You bookmark it.

Three days later you have 47 bookmarks and no idea what any of them were about.

**Bookie reads the link for you and writes a short summary** — title, a few lines explaining what it's about, tags, and a thumbnail. So when you come back later, you actually remember why you saved it.

It also lets you write your own little note on each one, like "send this to mom" or "for the weekend project."

## What it does

- 📥 Paste a link → get a summary in seconds
- 🤖 Works on articles, YouTube videos, tweets, Reddit posts, and most websites
- 📝 Add your own notes to anything you save
- 🔍 Search and filter by topic
- 📲 Share a link from any app on your phone → Bookie catches it
- 🌙 Light and dark mode (because eyes)
- 💾 Everything stays on your phone. No account, no cloud, no tracking

## How to use it

1. Open the app
2. Tap the big **+** button
3. Paste a link (or many — up to 10 at once)
4. Watch the summaries roll in
5. Tap any card later to read it again, write a note, or open the original

That's it.

### Sharing from other apps

You're reading something in Chrome / Twitter / Reddit / wherever. Tap the **share** button in that app, pick **Bookie** from the list, and the link will be waiting for you when Bookie opens.

### Deleting

Long-press any bookmark on the home screen → confirm. Or open it and tap "delete bookmark" at the bottom.

## Status

Currently in development. Not on the Play Store yet — getting there soon.

If you got a test build from me directly, thanks for trying it! Let me know what breaks 🙏

---

## For developers

This is the React Native frontend. The backend (which actually does the AI summarising) lives in [`../bookie.ai`](../bookie.ai).

**Stack:** Expo SDK 56 · React Native 0.85 · expo-router · expo-sqlite · expo-share-intent · Sentry

**Run locally:**

```bash
npm install --legacy-peer-deps
npm run android        # or `ios`, `web`
```

The backend must be running on port 8080. Backend URL is configurable in [src/lib/config.ts](src/lib/config.ts) (Android emulator uses `10.0.2.2`, iOS sim uses `localhost`, physical device needs your LAN IP).

**Build for Play Store:**

```bash
npm install -g eas-cli
eas login
eas build --profile production --platform android
eas submit --profile production --platform android
```

See [eas.json](eas.json) for the three profiles (development, preview, production).

**Custom artwork** lives in [scripts/](scripts/) as SVGs. After editing, run `npm run build:icons` to rasterize.

**Crash reporting** is no-op unless `EXPO_PUBLIC_SENTRY_DSN` is set.

**Project layout:**

```
src/
  app/                  routes (file-based)
    index.tsx           home — list, search, filter
    add.tsx             paste links, stream summaries
    bookmark/[id].tsx   detail + your notes
  components/           reusable bits
  lib/
    api.ts              talks to backend (NDJSON streaming)
    db.ts               local SQLite store
    sentry.ts           crash reporting
```
