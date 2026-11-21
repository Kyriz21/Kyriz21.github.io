# DiRi / LDR Playroom — Foundation Stage 1

A mobile-first, two-player room foundation for the DiRi LDR Playroom project. This package establishes the website shell, Firebase Anonymous Authentication, room creation/joining, a two-seat lobby, player presence, game selection, Ready/Start handshake, room lifecycle, reconnect handling, and Realtime Database Security Rules.

**This is the foundation stage, not the complete game release.** The eight game cards are already listed and can participate in the room-selection handshake. Their gameplay modules and the full Photobooth are connected in later stages after the room foundation passes a two-device test.

## What's implemented

- Static website; no build step or paid hosting required.
- Firebase JavaScript SDK loaded as browser ES modules from the Google CDN.
- Anonymous Authentication with browser-local persistence.
- Create a six-character room code with create-only database writes.
- Join an existing room with a two-player limit and transaction-protected guest slot.
- Host and guest identities, presence, and an online/offline indicator.
- Game selection from both players; both selections must match.
- Either player changing their choice resets both Ready flags.
- Both players must be Ready before the host can start the selected session.
- Host Leave closes the room; Guest Leave releases the guest slot.
- A 5-minute reconnect grace period before the host can release a disconnected guest slot.
- Room expiration after 24 hours without meaningful activity; opportunistic cleanup when the host returns.
- UID recovery follows the strict policy: a lost guest UID must rejoin after the host releases the old slot; a lost host UID requires a new room.
- Responsive DiRi pastel interface for desktop and mobile.
- Basic pure-function tests for room helpers.

## What is not implemented yet

- Actual game boards, quiz decks, word banks, scoring, timers, and game-specific rules.
- Game-specific private answer paths and their final Security Rules.
- Solo/Couple Photobooth, camera capture, WebRTC photo transfer, Manual Transfer, Shared Editor, and local gallery.
- Automated physical deletion at the exact 24-hour mark. Spark-only has no scheduled cleanup backend in this architecture.
- Strong server-side anti-cheat. Client-only casual game logic is not a trusted referee.

## Project structure

```text
ldr-playroom-foundation/
├── index.html
├── README.md
├── FIREBASE-SETUP.md
├── ROOM-FOUNDATION-TEST.md
├── SECURITY-NOTES.md
├── COPYRIGHT.md
├── CHANGELOG.md
├── firebase-database.rules.json
├── package.json
├── .gitignore
├── .nojekyll
├── assets/
│   └── favicon.svg
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── constants.js
│   ├── firebase.js
│   ├── room-utils.js
│   └── services/
│       ├── auth-service.js
│       ├── presence-service.js
│       ├── room-service.js
│       └── room-session.js
└── tests/
    └── room-utils.test.js
```

## Quick start

1. Keep the Firebase project `ldr-playroom-diri` and its existing Realtime Database.
2. Enable Anonymous Authentication.
3. Add the GitHub Pages domain `kyriz21.github.io` to Firebase Authentication → Settings → Authorized domains.
4. Publish the rules from `firebase-database.rules.json` to Realtime Database → Rules.
5. If old room records are still present, back up if needed and delete only the old `/rooms` node. Do not delete the Firebase project or database.
6. Upload the **contents** of this folder to the root of the existing GitHub repository `Kyriz21/ldr-playroom`, replacing the old files.
7. Configure GitHub Pages to deploy branch `main`, folder `/(root)`.
8. Open the GitHub Pages website over HTTPS and follow `ROOM-FOUNDATION-TEST.md` with two distinct browser identities.

See `FIREBASE-SETUP.md` for the complete checklist and `SECURITY-NOTES.md` for the limits of the free-tier architecture.

## Local tests

The helper tests use Node's built-in test runner and require no dependencies:

```bash
npm test
```

The browser app itself is static and does not require `npm install` or a bundling step.

## Free-tier architecture

- GitHub Pages serves the static frontend.
- Firebase Spark: Anonymous Authentication + Realtime Database only.
- IndexedDB is reserved for personal question libraries, private galleries, and local media in later stages.
- Image/audio/video binaries must not be stored in Realtime Database.
- No Cloud Storage, Cloud Functions, paid TURN, or billing upgrade is required for this foundation package.

© 2026 DiRi. All rights reserved.
