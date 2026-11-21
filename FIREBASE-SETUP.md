# Firebase setup — DiRi / LDR Playroom Foundation

This package is configured for the existing Firebase Web App in project `ldr-playroom-diri`. The configuration is in `js/firebase.js` and uses the Realtime Database in `asia-southeast1` (Singapore).

## 1. Keep the existing Firebase project

Use the existing project and registered web app. Do not create a new project or enable billing for this foundation package. No Firebase Storage, Cloud Functions, or other paid backend product is used here.

The Realtime Database URL configured in `js/firebase.js` is:

```text
https://ldr-playroom-diri-default-rtdb.asia-southeast1.firebasedatabase.app
```

## 2. Enable Anonymous Authentication

1. Open Firebase Console and select `ldr-playroom-diri`.
2. Go to Build → Authentication → Sign-in method.
3. Enable **Anonymous** and save.
4. Go to Authentication → Settings → Authorized domains.
5. Confirm `kyriz21.github.io` is listed. Add it if missing. Enter the hostname only, without protocol or repository path.

## 3. Prepare Realtime Database

1. Open Build → Realtime Database → Data.
2. If this database still contains room data from the earlier prototype, export `/rooms` first if you need a backup.
3. Remove only the old `/rooms` node so legacy room structures do not conflict with the current schema. Do not delete the database or Firebase project.
4. Open the Rules tab.
5. Replace the complete Rules editor with the contents of `firebase-database.rules.json`.
6. Click **Publish** and confirm the console reports valid Rules.

**Important:** This rules file intentionally has no root-level `.read: false` or `.write: false`. Realtime Database rules cascade downward; a root-level false rule would also block the narrower room permissions below it.

## 4. Upload to GitHub Pages

1. Open repository `Kyriz21/ldr-playroom`.
2. Upload the **contents** of this project folder to the repository root, not the enclosing folder.
3. Replace the previous files with these foundation files.
4. Open Settings → Pages.
5. Select `Deploy from a branch`, branch `main`, folder `/(root)`.
6. Save and wait for GitHub Pages deployment.
7. Open `https://kyriz21.github.io/ldr-playroom/` using HTTPS.

The app uses browser ES modules from Firebase's CDN. There is no build command and no npm deployment step.

## 5. Verify the Firebase project

If room creation fails:

- `auth/unauthorized-domain`: add `kyriz21.github.io` to Authorized domains.
- `auth/operation-not-allowed`: enable Anonymous Authentication.
- `permission-denied`: verify that the exact rules file from this package was published and that the web app/database URLs belong to `ldr-playroom-diri`.
- `Room tidak berhasil dibuat`: check whether the rules were published, the project and database URL match, and the old `/rooms` node was cleared.

## 6. Browser identity note

Firebase Anonymous Authentication persists the UID in the same browser profile. Use the same browser profile when reconnecting. To test the second person, use a different device or a separate browser profile. Two tabs sharing one profile may use the same anonymous UID and therefore represent the same player.

## 7. Do not add private credentials

Firebase web app configuration is client-side application configuration. Never add Firebase Admin SDK service-account credentials, private keys, or other server secrets to this GitHub repository.
