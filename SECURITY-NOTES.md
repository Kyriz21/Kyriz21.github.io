# Security notes

- Firebase Authentication Anonymous must be enabled.
- Only the configured GitHub Pages origin should be added to Authentication Authorized domains.
- Realtime Database Rules in `firebase-database.rules.json` are designed for the app schema in this repository. If the app schema changes, review and update Rules together with the JavaScript.
- Room codes are six-character invite codes. The rules allow authenticated clients that know a code to read that room's data so a guest can verify and join it. Do not store sensitive information in room records.
- Firebase browser configuration is public client configuration. Do not add Firebase Admin SDK service-account keys, private keys, or secrets to this repository.
- Photobooth photos are kept in the browser and are not written to Firebase.
