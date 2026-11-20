# Firebase setup — LDR Playroom DiRi

This repository is configured for the Firebase project `ldr-playroom-diri` using the web configuration provided for this project.

## 1. Firebase Authentication

In Firebase Console:

1. Select project `ldr-playroom-diri`.
2. Open Build → Authentication → Get started.
3. Open Sign-in method.
4. Enable **Anonymous** and save.
5. Open Authentication → Settings → Authorized domains.
6. Add `kyriz21.github.io` (domain only; no `https://` and no repository path).

## 2. Realtime Database

1. Open Build → Realtime Database.
2. Create or open the database in Singapore (`asia-southeast1`).
3. Confirm the database URL in the Data tab matches `databaseURL` in `js/firebase.js`.
4. Open the Rules tab.
5. Replace the entire Rules editor with the contents of `firebase-database.rules.json`.
6. Click Publish.

Do not enable public read/write or leave the database in Test mode.

## 3. Verify web config

The config is in `js/firebase.js`:

- `apiKey`
- `authDomain`
- `databaseURL`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

The current file points to `ldr-playroom-diri`. If you create another Firebase project, replace all config values together; do not mix values from different projects.

## 4. GitHub Pages

1. Upload the complete project folder contents to the repository root.
2. Open Settings → Pages.
3. Source: Deploy from a branch.
4. Branch: `main`.
5. Folder: `/(root)`.
6. Save and wait for the deployment to complete.

Open the site at `https://kyriz21.github.io/ldr-playroom/`.

## 5. Test with two identities

- Use the desktop browser for the host.
- Use a phone or a separate browser profile for the guest.
- Do not use two tabs that share the same anonymous Firebase Auth session; they may resolve to the same UID and are treated as one player.
- Create a room on the host, join from the guest, choose the same game on both, then let the host start.

## 6. Database schema

```text
rooms/
  ROOMCODE/
    host/
      uid
      name
    guest/
      uid
      name
      joinedAt
    createdAt
    selections/
      host
      guest
    presence/
      host
      guest
    game/
      id
      status
      data
      updatedAt
```

A host can create/delete its room. A guest can claim the single guest slot and remove their own guest profile when leaving. Room participants can read room state, update their own selection/presence, and update the shared game state.

The six-character room code is a bearer invitation: anyone who knows the code and can authenticate may read that room's data. Do not store private messages, passwords, personal documents, or other sensitive data here.

## 7. Troubleshooting

- **auth/unauthorized-domain**: add `kyriz21.github.io` to Authorized domains.
- **auth/operation-not-allowed**: enable Anonymous sign-in.
- **permission_denied**: publish the `firebase-database.rules.json` from this same package and verify that the web app and database belong to project `ldr-playroom-diri`.
- **Room not found**: confirm the room code is exactly six characters and the host has not left/deleted the room.
- **Guest cannot join**: check whether the room already has a guest. One room supports two players only.
- **Camera unavailable**: allow camera access in the browser or use Choose photos. Camera requires HTTPS and a camera-capable device.
