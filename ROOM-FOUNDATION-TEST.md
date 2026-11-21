# Room foundation — two-device test checklist

Run this test after publishing both the updated Realtime Database Rules and the GitHub Pages files.

## Test setup

- Device A: desktop browser, used as Host.
- Device B: phone or a separate browser profile, used as Guest.
- Both devices must use the same deployed GitHub Pages URL.
- Do not test as two players in two tabs that share one browser profile.

## A. Authentication and room creation

- [ ] Both browsers open the site without a module or Firebase initialization error.
- [ ] The connection indicator changes to Connected when Firebase Realtime Database is connected.
- [ ] Device A creates a room with a display name.
- [ ] A six-character code is shown.
- [ ] Refresh Device A; it returns to the same room with the same host identity.

## B. Guest join and two-seat limit

- [ ] Device B joins using the six-character code and a different display name.
- [ ] Both devices display the same two player names.
- [ ] Both devices display the other member as Online after presence attaches.
- [ ] A third anonymous browser cannot claim the occupied guest slot.
- [ ] Refresh Device B; it returns to the same room with the same guest identity.

## C. Game selection and Ready handshake

- [ ] Device A selects one game.
- [ ] Device B selects the same game.
- [ ] The selected game is reflected on both devices.
- [ ] Ready cannot be used while selections do not match.
- [ ] Each player presses Ready.
- [ ] The host Start button becomes enabled only after both Ready states are true.
- [ ] The host starts; both devices show the same session title and session state.
- [ ] The host returns the room to the lobby; both Ready states reset.
- [ ] Change one player's selection; both Ready states reset.

## D. Leave and reconnect behavior

- [ ] Guest leaves; host remains in the room and the guest slot becomes empty.
- [ ] Guest can join again using the same browser identity.
- [ ] Guest closes the browser/network unexpectedly; host sees Offline after Firebase reports disconnect.
- [ ] The host cannot release the guest slot before the 5-minute grace period.
- [ ] After at least 5 minutes offline, the host can release the guest slot.
- [ ] The old guest UID can no longer access the room after its slot is released.
- [ ] The guest can join again with a new anonymous UID after the slot is released.
- [ ] Host closes the room; the guest is returned to the home screen with a clear message.

## E. Security Rules checks

Use Firebase Rules Simulator or Emulator for these checks before release:

- [ ] Unauthenticated reads and writes are denied.
- [ ] A third UID cannot read a filled room as a member or claim the guest slot.
- [ ] Guest cannot delete or overwrite the host record.
- [ ] Guest can delete only their own guest membership when leaving.
- [ ] Guest cannot close/delete the room.
- [ ] Host can delete/close their own room.
- [ ] A player cannot set the other player's Ready state to true.
- [ ] A player may reset the other Ready state to false when a selection changes.
- [ ] Host cannot start unless both selections match and both Ready states are true.
- [ ] Private game paths under `/privateRooms/{roomCode}/{gameId}/{sessionId}/{uid}` are readable only by the matching UID and room member.
- [ ] Room operations are denied after the 24-hour TTL, except host cleanup of the expired room.

## Expected limitation

This checklist verifies the room foundation only. It does not certify game-specific private answers, scoring, timer synchronization, Photobooth transfer, or anti-cheat. Those must be tested when their modules are added.
