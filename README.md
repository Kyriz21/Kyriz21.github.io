# DiRi / LDR Playroom — Fresh Firebase Project Setup

A mobile-first static web app for two-player LDR rooms. Hosted on GitHub Pages and powered by Firebase Authentication (Anonymous) + Realtime Database.

## Important: this package is not connected yet

The `js/firebase.js` file intentionally contains placeholders. Create a **new Firebase project**, register a new Web App, create a Realtime Database, and enable Anonymous Authentication. Then replace every `PASTE_...` placeholder in `js/firebase.js` before uploading this project to GitHub. Do not publish with placeholders left in place.

## What is included

- Responsive landing page, room modal, room lobby, and game-preview screen.
- Layout adapts to phones, small phones, tablets, and desktop.
- Firebase anonymous authentication.
- Create room with a six-character code.
- Join room by code, with a two-player limit.
- Realtime player list and online/offline presence.
- Host can close the room; guest can leave the room.
- DiRi identity and copyright attribution.

**Important:** The eight game cards are currently previews. The real-time room foundation is the first stage. Game rules and turn synchronization will be added one game at a time after the room flow is verified.

## Firebase setup

Follow [`FIREBASE-SETUP-NEW-PROJECT.md`](FIREBASE-SETUP-NEW-PROJECT.md) for the full click-by-click process, including deleting the old Firebase project and creating a new one.

Required Firebase products:

1. New Firebase project (use a new Project ID; deleted Project IDs cannot be reused).
2. Web App nickname: `LDR Playroom Web`.
3. Realtime Database, region Singapore (`asia-southeast1`), initially Locked mode.
4. Authentication → Sign-in method → Anonymous enabled.
5. Realtime Database Rules: publish the full contents of `firebase-database.rules.json`.
6. Replace all placeholders in `js/firebase.js` with values from the new Web App config and Realtime Database URL.

This app uses Firebase modular SDK modules from `gstatic` and does not need npm or a build step. The `databaseURL` is copied from the Realtime Database Data page and added manually to the config. `measurementId` is optional and not used.

## Upload to GitHub

Upload the **contents** of this folder to the root of the existing `ldr-playroom` repository, replacing the old files:

```text
ldr-playroom/
├── index.html
├── README.md
├── COPYRIGHT.md
├── FIREBASE-SETUP-NEW-PROJECT.md
├── firebase-database.rules.json
├── .nojekyll
├── assets/
│   └── favicon.svg
├── css/
│   └── styles.css
└── js/
    ├── app.js
    └── firebase.js
```

Do not upload the outer `ldr-playroom-restart` folder itself. `index.html` must be at the repository root. Keep the existing GitHub repository and GitHub Pages; Firebase project deletion does not require deleting the GitHub repository.

Then open GitHub → Settings → Pages → Deploy from a branch → `main` → `/(root)` → Save.

## Test the room flow

1. Open the GitHub Pages site in browser/device A.
2. Create a room and keep the code visible.
3. Open the site in browser/device B (preferably a separate browser/device so it receives a different anonymous UID).
4. Join with the exact code.
5. Both devices should see both player names in the room lobby.
6. Test leaving/closing the room and repeat once.

## Troubleshooting

- `PASTE_...` still in `firebase.js`: finish the config before deployment.
- `permission-denied`: confirm the full Rules JSON was Published and the current `js/firebase.js` + `js/app.js` were uploaded together.
- `auth/operation-not-allowed`: enable Anonymous in Firebase Authentication.
- `room-not-found`: compare the exact six-character code and check `/rooms` in Firebase Data.
- Blank JS/module error: ensure `index.html` is at repository root and GitHub Pages uses `main` / root.

## Copyright

© 2026 DiRi. All rights reserved for original DiRi / LDR Playroom project code, copy, and visual design. Third-party services, fonts, and SDKs remain under their respective licenses and terms.
