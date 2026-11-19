# Firebase setup for a new DiRi / LDR Playroom project

This package intentionally contains placeholders in `js/firebase.js`. Create the new Firebase project first, then replace every `PASTE_...` value using the configuration from that new project. Do not upload this file with placeholders left in place.

## Firebase services required
- Firebase Web App (nickname: LDR Playroom Web)
- Realtime Database in Singapore (`asia-southeast1`), initially Locked mode
- Authentication with Anonymous sign-in enabled
- Realtime Database Rules from `firebase-database.rules.json` published to the database

## Required `firebaseConfig` values
- `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`: copy from the new Web App config.
- `databaseURL`: copy from the top of the new Realtime Database Data page. This value is not always included in the Web App config snippet, so add it manually.
- `measurementId`: optional; not required by this project.

The app imports Firebase SDK modules from `gstatic` using JavaScript modules. You do not need npm or a build step.
