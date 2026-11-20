# LDR Playroom — by DiRi

A mobile-first multiplayer playroom for two people in a long-distance relationship. Built with HTML, CSS, vanilla JavaScript modules, and Firebase Realtime Database.

## What's included

- Create Room and Join Room with a six-character invite code.
- Anonymous Firebase Authentication (no email/password sign-up required).
- Shared room lobby with two player identities and online presence.
- Both players choose a game; the host can start only after both selections match.
- Eight real-time mini-games: Tic Tac Toe, Love Quiz, This or That, Truth or Dare, Memory Card, Connect Four, Draw & Guess, and Tebak Kata.
- DiRi Photobooth: camera capture or gallery upload, four-shot strip, three frame themes, and PNG download.
- Responsive layouts for desktop and mobile.
- DiRi copyright and project documentation.

## Project structure

```text
ldr-playroom/
├── index.html
├── README.md
├── COPYRIGHT.md
├── FIREBASE-SETUP.md
├── firebase-database.rules.json
├── .nojekyll
├── assets/
│   └── favicon.svg
├── css/
│   └── styles.css
└── js/
    ├── app.js
    ├── firebase.js
    └── photobooth.js
```

## Before publishing

1. Open `js/firebase.js` and verify its Firebase web config is for project `ldr-playroom-diri`.
2. In Firebase Authentication, enable **Anonymous** sign-in.
3. Add `kyriz21.github.io` in Authentication → Settings → Authorized domains.
4. In Realtime Database → Rules, publish the contents of `firebase-database.rules.json`.
5. Upload the contents of this folder to the root of the GitHub repository.
6. In GitHub → Settings → Pages, choose `Deploy from a branch`, branch `main`, folder `/(root)`.
7. Open the GitHub Pages URL over HTTPS.

See [FIREBASE-SETUP.md](./FIREBASE-SETUP.md) for the complete setup checklist.

## Room flow

1. One person creates a room and shares the six-character code.
2. The second person joins with that code.
3. Both choose the same game in the room lobby.
4. The host starts the game once the choices match.
5. Game state is synchronized through Realtime Database.

The host controls starting/restarting a game and returning both players to the lobby. Either player can leave the room.

## Photobooth note

Photobooth uses the camera or images selected on the current device. It creates and downloads a four-photo PNG locally in the browser. It does **not** currently combine two separate cameras into one shared strip or upload photos to Firebase.

Camera access requires HTTPS (GitHub Pages provides HTTPS) and browser permission. Gallery upload works without camera permission.

## Important security note

The Firebase web config is client-side application configuration, not a server secret. Database access is controlled by Realtime Database Security Rules and authenticated room membership. A room code is an invitation code; do not use this app to store sensitive or confidential information.

## No build step

This project uses Firebase's modular browser SDK through CDN imports. No npm install, bundler, or local build is required. The site can be hosted directly from GitHub Pages.

© 2026 DiRi. All rights reserved.
