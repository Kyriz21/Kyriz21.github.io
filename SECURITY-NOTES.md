# Security and free-tier notes

## What the room rules enforce

- Anonymous Firebase authentication is required for room access.
- Room creation is create-only for the authenticated host; an existing room code cannot be overwritten by another host.
- A room has one host and one guest slot.
- A joining player can claim the guest slot only while it is empty and the room has not expired or started a session.
- Host and guest can update only their own selection and Ready state.
- A player can reset a Ready flag to false when a selection changes, but cannot set the other player's Ready flag to true.
- Only the host can start a session, and the database rule checks matching selections plus both Ready flags.
- Guest cannot close the room. Host Leave deletes the room.
- A disconnected guest can be released by the host only after the 5-minute reconnect grace period.
- Room activity writes are allowed only to current members and only with a near-current timestamp.
- Private game data is scaffolded separately at `/privateRooms/.../{uid}` so a read grant on the public room node does not expose private answer nodes.

## Room code is an invitation credential

A six-character room code is a bearer invitation. Anyone who obtains an active code can attempt to join while the guest slot is empty. Do not store passwords, personal documents, financial information, private contact details, or sensitive relationship information in room data. The MVP does not implement server-side rate limiting for code guessing.

## Spark-only lifecycle

- Logical room expiry: 24 hours after `lastMeaningfulActivityAt`.
- Realtime Database Rules reject new room activity after that deadline.
- There is no scheduled Cloud Function cleanup. Physical deletion is best effort when the host returns and the app can remove an expired room, or by manual maintenance if needed.
- A guest cannot take over a host room. If the host loses their anonymous UID, they must create a new room.
- If the guest loses their anonymous UID, the host must wait for the old guest to be offline for 5 minutes, release the slot, and invite the guest to rejoin with the new UID.

## Client-only limitation

This is a casual two-person client app on Firebase Spark. Realtime Database Rules validate ownership and allowed write paths, but they do not turn browser code into a trusted game server. A technically capable participant can inspect or manipulate their own client. Game-specific hidden answers, reveal flows, score calculations, and timers require private data paths and careful Rules; some game modes cannot achieve strong anti-cheat without a trusted backend, which is outside this free-tier scope.

## Media rule

Never write camera images, video, audio, rendered canvas images, or base64 file payloads into Realtime Database. Use local browser storage, WebRTC direct transfer, or the agreed manual-transfer fallback in later Photobooth stages. STUN-only WebRTC is not guaranteed to connect through every NAT/firewall; the manual fallback is required.

## Browser and device limits

- Anonymous UID persistence depends on the same browser profile and its site data.
- Clearing browser data may create a new UID.
- GitHub Pages and Firebase CDN availability require an internet connection.
- Camera access requires browser permission and a secure context (HTTPS).
- Offline writes are not treated as confirmed success by the UI; the app waits for database acknowledgement before claiming success.
