import { db, ref, onValue } from './firebase.js';
import { getCurrentPlayer } from './services/auth-service.js';
import { attachPresence } from './services/presence-service.js';
import {
  createRoom, joinRoom, readRoom, subscribeRoom, setGameSelection,
  setReady, startSelectedGame, returnToLobby, leaveRoom,
  clearDisconnectedGuest, removeExpiredRoom
} from './services/room-service.js';
import { saveRoomCode, loadRoomCode, clearRoomCode, saveDisplayName, loadDisplayName } from './services/room-session.js';
import { GAME_CATALOG, GAME_LABELS } from './constants.js';
import { mountGame } from './games/engine.js';
import { mountPhotobooth } from './photobooth/photobooth.js';
import {
  normalizeRoomCode, getPlayerRole, isRoomExpired, canStartGame,
  canClearGuest, roleLabel
} from './room-utils.js';

const appRoot = document.querySelector('#app');
const dialog = document.querySelector('#room-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const createForm = document.querySelector('#create-form');
const joinForm = document.querySelector('#join-form');
const dialogError = document.querySelector('#dialog-error');
const toastRegion = document.querySelector('#toast-region');
const connectionStatus = document.querySelector('#connection-status');

const state = {
  player: null,
  currentRoom: null,
  bootError: '',
  isBusy: false,
  expiring: false,
  mountedGame: null
};

let databaseConnectionUnsubscribe = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function friendlyError(error) {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? 'Terjadi kesalahan yang tidak diketahui.');
  if (code.includes('unauthorized-domain')) return 'Domain website belum terdaftar di Firebase Authentication → Authorized domains.';
  if (code.includes('operation-not-allowed')) return 'Anonymous Authentication belum diaktifkan di Firebase Console.';
  if (code.toLowerCase().includes('permission') || message.toLowerCase().includes('permission_denied')) {
    return 'Akses Firebase ditolak. Periksa apakah Realtime Database Rules sudah dipublikasikan dan sesuai dengan paket project ini.';
  }
  if (code.includes('network') || message.toLowerCase().includes('network')) return 'Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.';
  return message;
}

function showToast(message, type = 'default') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4800);
}

function setConnectionState(connected, error = false) {
  connectionStatus.classList.toggle('is-online', connected && !error);
  connectionStatus.classList.toggle('is-error', error || connected === false);
  connectionStatus.innerHTML = `<i></i>${error ? 'Connection issue' : connected ? 'Connected' : 'Offline'}`;
}

function setDialogError(message = '') {
  dialogError.textContent = message;
  dialogError.hidden = !message;
}

function setFormBusy(form, busy) {
  const button = form.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = busy;
    button.dataset.originalText ??= button.textContent;
    button.textContent = busy ? 'Please wait…' : button.dataset.originalText;
  }
}

function openDialog(mode) {
  setDialogError('');
  const createMode = mode === 'create';
  dialogTitle.textContent = createMode ? 'Create a room' : 'Join your room';
  createForm.hidden = !createMode;
  joinForm.hidden = createMode;
  const savedName = loadDisplayName();
  document.querySelector('#create-name').value = savedName;
  document.querySelector('#join-name').value = savedName;
  document.querySelector('#join-code').value = '';
  if (!dialog.open) dialog.showModal();
  window.setTimeout(() => (createMode ? document.querySelector('#create-name') : document.querySelector('#join-code')).focus(), 30);
}

function closeDialog() {
  if (dialog.open) dialog.close();
  setDialogError('');
}

function disposeMountedGame() {
  if (state.mountedGame?.destroy) state.mountedGame.destroy();
  state.mountedGame = null;
}

function clearCurrentRoom({ clearStorage = true } = {}) {
  disposeMountedGame();
  const current = state.currentRoom;
  if (current?.unsubscribe) current.unsubscribe();
  if (current?.presenceCleanup) void current.presenceCleanup();
  state.currentRoom = null;
  state.expiring = false;
  if (clearStorage) clearRoomCode();
}

async function enterRoom({ code, role }) {
  closeDialog();
  clearCurrentRoom({ clearStorage: false });
  saveRoomCode(code);
  state.currentRoom = { code, role, room: null, unsubscribe: null, presenceCleanup: null };
  render();
  state.currentRoom.unsubscribe = subscribeRoom(code, (room) => {
    void handleRoomSnapshot(code, room);
  }, (error) => {
    console.error(error);
    showToast(friendlyError(error), 'error');
  });
  state.currentRoom.presenceCleanup = attachPresence(code, role);
}

async function handleRoomSnapshot(sourceCode, room) {
  const current = state.currentRoom;
  if (!current || current.code !== sourceCode) return;
  if (!room) {
    clearCurrentRoom();
    render();
    showToast('Room sudah ditutup atau tidak lagi tersedia.', 'error');
    return;
  }
  const role = getPlayerRole(room, state.player?.uid);
  if (!role) {
    clearCurrentRoom();
    render();
    showToast('Identitas browser ini tidak lagi terdaftar di room. Masuk kembali dengan undangan terbaru.', 'error');
    return;
  }
  current.role = role;
  current.room = room;
  render();

  if (isRoomExpired(room) && role === 'host' && !state.expiring) {
    state.expiring = true;
    try {
      await removeExpiredRoom({ code: current.code, uid: state.player.uid });
      if (state.currentRoom?.code !== sourceCode) return;
      clearCurrentRoom();
      render();
      showToast('Room kedaluwarsa 24 jam dan dibersihkan saat host kembali.', 'error');
    } catch (error) {
      state.expiring = false;
      showToast(friendlyError(error), 'error');
    }
  }
}

async function restoreLastRoom() {
  const code = normalizeRoomCode(loadRoomCode());
  if (code.length !== 6) {
    clearRoomCode();
    render();
    return;
  }
  try {
    const room = await readRoom(code);
    if (!room) {
      clearRoomCode();
      render();
      return;
    }
    const role = getPlayerRole(room, state.player.uid);
    if (!role) {
      clearRoomCode();
      render();
      showToast('Sesi room sebelumnya tidak cocok dengan identitas browser saat ini. Silakan buat atau gabung room lagi.', 'error');
      return;
    }
    if (isRoomExpired(room) && role === 'host') {
      await removeExpiredRoom({ code, uid: state.player.uid });
      clearRoomCode();
      render();
      showToast('Room lama sudah kedaluwarsa dan dibersihkan.', 'error');
      return;
    }
    await enterRoom({ code, role });
    if (isRoomExpired(room)) showToast('Room telah melewati masa aktif 24 jam. Host perlu membuat room baru.', 'error');
  } catch (error) {
    clearRoomCode();
    render();
    const code = String(error?.code ?? '');
    const message = code.includes('permission') || code === 'PERMISSION_DENIED'
      ? 'UID browser ini tidak lagi terdaftar atau room tidak dapat diakses. Jika UID berubah, minta host membuka kembali slot guest setelah masa offline 5 menit.'
      : friendlyError(error);
    showToast(message, 'error');
  }
}

function renderLanding() {
  const bootBanner = state.bootError
    ? `<div class="room-alert">Firebase belum siap: ${escapeHtml(state.bootError)}</div>` : '';
  appRoot.innerHTML = `
    ${bootBanner}
    <section class="hero">
      <div class="hero-text">
        <span class="eyebrow">A LITTLE PLACE FOR TWO</span>
        <h1>Distance is just a detail.<br><em>Let's play together.</em></h1>
        <p class="hero-copy">Satu ruang kecil untuk dua orang yang saling merindukan. Pilih permainan, bagikan kode room, lalu ciptakan momen bersama meski berada di tempat berbeda.</p>
        <div class="hero-actions">
          <button class="button button-primary" data-action="open-create">Create a room <span>♡</span></button>
          <button class="button button-secondary" data-action="open-join">Join with a code <span>→</span></button>
        </div>
        <div class="hero-note"><span>✧</span> Private room · Two players · Made for LDR</div>
      </div>
      <div class="hero-art" aria-label="Decorative preview of a DiRi photo strip">
        <span class="float-heart one">♡</span><span class="float-heart two">♡</span><span class="float-star">✦</span>
        <div class="postcard">
          <div class="postcard-top"><span>OUR LITTLE MOMENTS</span><span class="postcard-heart">♡</span></div>
          <div class="photo-strip"><div class="photo-cell"></div><div class="photo-cell"></div><div class="photo-cell"></div><div class="photo-cell"></div></div>
          <div class="postcard-caption"><span>you & me</span><small>ANYWHERE · ALWAYS</small></div>
        </div>
      </div>
    </section>

    <section class="feature-section">
      <div class="section-heading">
        <div><span class="eyebrow">HOW IT WORKS</span><h2>Your room, your moment</h2></div>
        <p>Hanya tiga langkah untuk mulai bermain bersama.</p>
      </div>
      <div class="feature-grid">
        <article class="feature-card"><span class="feature-icon">♡</span><strong>Make a private room</strong><p>Satu orang membuat room dan membagikan kode undangan.</p></article>
        <article class="feature-card"><span class="feature-icon">⌁</span><strong>Join from anywhere</strong><p>Pasangan masuk dengan kode yang sama dari perangkat berbeda.</p></article>
        <article class="feature-card"><span class="feature-icon">✿</span><strong>Choose a game</strong><p>Kalian memilih game yang sama dari katalog DiRi.</p></article>
        <article class="feature-card"><span class="feature-icon">✧</span><strong>Play in sync</strong><p>Room menyinkronkan status dan aktivitas kedua pemain.</p></article>
      </div>
    </section>

    <section class="catalog-section">
      <div class="section-heading"><div><span class="eyebrow">THE PLAYROOM</span><h2>Eight ways to say hello</h2></div><p>Delapan permainan dan Photobooth untuk dua orang.</p></div>
      <div class="feature-grid">
        ${GAME_CATALOG.map((game) => `<article class="feature-card"><span class="feature-icon">${escapeHtml(game.icon)}</span><strong>${escapeHtml(game.title)}</strong><p>${escapeHtml(game.description)}</p></article>`).join('')}
      </div>
    </section>`;
}

function presenceState(room, role) {
  const value = room?.presence?.[role];
  if (value?.connected === true) return { label: 'Online', css: 'online' };
  if (value?.connected === false) return { label: 'Offline', css: 'offline' };
  return { label: 'Connecting', css: '' };
}

function playerCard(room, role) {
  const player = room?.[role];
  const presence = presenceState(room, role);
  const ready = room?.lobby?.ready?.[role] === true;
  const name = player?.name ?? 'Waiting for your person';
  const avatar = role === 'host' ? '♡' : '✿';
  return `
    <div class="player-item ${role}">
      <div class="player-avatar">${avatar}</div>
      <div class="player-info"><strong>${escapeHtml(name)}</strong><small>${roleLabel(role)}${ready ? ' · Ready' : ''}</small></div>
      ${player ? `<span class="status-dot ${presence.css}">${presence.label}</span>` : '<span class="status-dot">Waiting</span>'}
    </div>`;
}

function renderExpiredRoom(room, current) {
  appRoot.innerHTML = `
    <section class="panel expired-panel">
      <div class="active-game-icon">⌛</div>
      <span class="eyebrow">ROOM EXPIRED</span>
      <h1>This room has expired</h1>
      <p>Room ini sudah melewati masa aktif 24 jam tanpa aktivitas. ${current.role === 'host' ? 'Host dapat membuat room baru untuk melanjutkan.' : 'Silakan minta host membuat room baru dan membagikan kode undangan.'}</p>
      ${current.role === 'host' ? '<button class="button button-primary" data-action="go-home">Back to home</button>' : '<button class="button button-secondary" data-action="go-home">Leave this screen</button>'}
    </section>`;
}

function renderInvalidRoom(room, current) {
  appRoot.innerHTML = `
    <section class="panel expired-panel">
      <div class="active-game-icon">!</div>
      <span class="eyebrow">ROOM FORMAT UPDATE</span>
      <h1>This room uses an older format</h1>
      <p>Room ini dibuat oleh versi lama aplikasi dan tidak memiliki struktur fondasi terbaru. ${current.role === 'host' ? 'Tutup room lama, lalu buat room baru.' : 'Minta host membuat room baru.'}</p>
      ${current.role === 'host' ? '<button class="button button-danger" data-action="close-old-room">Close old room</button>' : '<button class="button button-secondary" data-action="go-home">Back to home</button>'}
    </section>`;
}

function renderActiveSession(room, current) {
  const session = room.lobby.activeSession;
  if (!room.guest) {
    disposeMountedGame();
    appRoot.innerHTML = `<section class="panel expired-panel"><div class="active-game-icon">♡</div><span class="eyebrow">SESSION PAUSED</span><h1>Waiting for your person</h1><p>Guest telah meninggalkan room. Sesi yang sedang berjalan tidak dilanjutkan tanpa dua pemain. Host dapat mengembalikan room ke lobby untuk memulai sesi baru.</p>${current.role === 'host' ? '<button class="button button-primary" data-action="back-to-lobby">Return to lobby</button>' : '<p class="small-note">Menunggu host mengatur room kembali.</p>'}</section>`;
    return;
  }
  const key = `${current.code}:${session.sessionId}:${session.gameId}`;
  if (state.mountedGame?.key === key) return;
  disposeMountedGame();
  const context = {
    code: current.code,
    session,
    room,
    role: current.role,
    player: state.player,
    toast: showToast,
    onBack: async () => {
      if (current.role !== 'host') {
        showToast('Host yang mengembalikan room ke lobby.');
        return;
      }
      await returnToLobby({ code: current.code, uid: state.player.uid });
      showToast('Room kembali ke lobby.', 'success');
    }
  };
  const module = session.gameId === 'photobooth' ? mountPhotobooth(appRoot, context) : mountGame(appRoot, context);
  state.mountedGame = { key, destroy: module?.destroy };
}

function renderLobby(room, current) {
  const code = current.code;
  const role = current.role;
  const selections = room.lobby?.selections ?? {};
  const ready = room.lobby?.ready ?? {};
  const sameSelection = Boolean(selections.host && selections.host === selections.guest);
  const selectedGame = selections[role] ?? '';
  const guestMissing = !room.guest;
  const guestPresence = presenceState(room, 'guest');
  const canStart = role === 'host' && canStartGame(room);
  const startHint = !room.guest
    ? 'Menunggu pemain kedua bergabung.'
    : !sameSelection
      ? 'Kedua pemain harus memilih game yang sama.'
      : !(ready.host && ready.guest)
        ? 'Kedua pemain perlu menekan Ready.'
        : 'Semua siap. Host dapat memulai permainan.';

  const guestGraceMessage = guestMissing ? '' : guestPresence.css === 'offline'
    ? `<div class="room-alert">Guest sedang offline. Room memberi waktu reconnect 5 menit sebelum host dapat membuka slot guest kembali.</div>`
    : '';
  const missingGuestMessage = guestMissing ? '<div class="room-alert">Bagikan kode undangan di atas kepada pasangan. Room hanya menerima satu guest.</div>' : '';
  const activeStatus = room.lobby.activeSession ? `<div class="room-alert">Sesi sebelumnya belum dikembalikan ke lobby.</div>` : '';
  if (state.mountedGame) disposeMountedGame();

  appRoot.innerHTML = `
    <section class="room-shell">
      <div class="room-topbar">
        <div class="room-title"><span class="eyebrow">YOUR PRIVATE SPACE · ${roleLabel(role).toUpperCase()}</span><h1>Room for two</h1><p>Choose a game together, then get ready.</p></div>
        <div class="room-code-card"><div><small>SHARE THIS ROOM CODE</small><div class="room-code">${escapeHtml(code)}</div></div><button class="icon-button" data-action="copy-code" type="button" aria-label="Copy room code">⧉</button></div>
      </div>
      ${activeStatus}${missingGuestMessage}${guestGraceMessage}
      <div class="lobby-layout">
        <aside class="panel players-panel">
          <div class="panel-title"><h2>Your people</h2><small>2 seats only</small></div>
          ${playerCard(room, 'host')}
          ${playerCard(room, 'guest')}
          <p class="player-help">Room ini menggunakan identitas anonim browser. Gunakan browser profile yang sama saat kembali. Menghapus data browser dapat membuat UID berubah dan memerlukan undangan ulang.</p>
          ${role === 'host' && canClearGuest(room) ? '<div class="host-tools"><button class="button button-danger button-wide" data-action="clear-guest">Release disconnected guest</button></div>' : ''}
          <div class="host-tools">
            <button class="button button-quiet button-wide" data-action="leave-room">${role === 'host' ? 'Close room for both' : 'Leave room'}</button>
          </div>
        </aside>
        <section class="panel lobby-main">
          <div class="panel-title"><div><h2>Pick your game</h2><small>Choose the same card on both devices.</small></div><span class="ready-chip">8 games + Photobooth</span></div>
          <div class="game-grid">
            ${GAME_CATALOG.map((game) => {
              const own = selectedGame === game.id;
              const other = selections[role === 'host' ? 'guest' : 'host'] === game.id;
              return `<button type="button" class="game-card ${own ? 'selected' : ''}" data-action="select-game" data-game-id="${game.id}" aria-pressed="${own}">
                <span class="game-icon">${escapeHtml(game.icon)}</span><span class="game-number">GAME ${game.number}</span><h3>${escapeHtml(game.title)}</h3><p>${escapeHtml(game.description)}</p><span class="game-state-label">${own ? 'Your choice' : other ? 'Your partner chose this' : 'Choose this game'}</span>
              </button>`;
            }).join('')}
          </div>
          <div class="ready-panel">
            <div class="ready-copy"><strong>${sameSelection ? escapeHtml(GAME_LABELS[selections.host]) : 'Waiting for matching choices'}</strong><span>${escapeHtml(startHint)}</span></div>
            <div class="ready-actions">
              <button type="button" class="button ${ready[role] ? 'button-secondary' : 'button-primary'}" data-action="toggle-ready" ${!sameSelection || guestMissing ? 'disabled' : ''}>${ready[role] ? 'Not ready' : 'I am ready'}</button>
              ${role === 'host' ? `<button type="button" class="button button-secondary" data-action="start-game" ${canStart ? '' : 'disabled'}>Start game →</button>` : ''}
            </div>
          </div>
          <div class="ready-status">
            <span class="ready-chip ${ready.host ? 'done' : ''}">Host ${ready.host ? 'ready' : 'not ready'}</span>
            <span class="ready-chip ${ready.guest ? 'done' : ''}">Guest ${ready.guest ? 'ready' : 'not ready'}</span>
          </div>
        </section>
      </div>
    </section>`;
}

function render() {
  const current = state.currentRoom;
  if (!current) {
    renderLanding();
    return;
  }
  if (!current.room) {
    appRoot.innerHTML = '<section class="loading-state"><span class="loading-heart">♡</span><p>Opening your room…</p></section>';
    return;
  }
  if (isRoomExpired(current.room)) {
    renderExpiredRoom(current.room, current);
    return;
  }
  if (!current.room.lobby?.selections || !current.room.lobby?.ready) {
    renderInvalidRoom(current.room, current);
    return;
  }
  if (current.room.lobby.activeSession) {
    renderActiveSession(current.room, current);
    return;
  }
  renderLobby(current.room, current);
}

async function handleCreateSubmit(event) {
  event.preventDefault();
  if (state.isBusy) return;
  const form = event.currentTarget;
  const name = form.elements.name.value;
  state.isBusy = true;
  setFormBusy(form, true);
  setDialogError('');
  try {
    const player = await getCurrentPlayer();
    state.player = player;
    saveDisplayName(name.trim());
    const room = await createRoom({ uid: player.uid, name });
    await enterRoom(room);
    showToast(`Room ${room.code} berhasil dibuat. Bagikan kodenya kepada pasangan.`, 'success');
  } catch (error) {
    console.error(error);
    setDialogError(friendlyError(error));
  } finally {
    state.isBusy = false;
    setFormBusy(form, false);
  }
}

async function handleJoinSubmit(event) {
  event.preventDefault();
  if (state.isBusy) return;
  const form = event.currentTarget;
  const name = form.elements.name.value;
  const code = normalizeRoomCode(form.elements.code.value);
  state.isBusy = true;
  setFormBusy(form, true);
  setDialogError('');
  try {
    const player = await getCurrentPlayer();
    state.player = player;
    saveDisplayName(name.trim());
    const room = await joinRoom({ code, uid: player.uid, name });
    await enterRoom(room);
    showToast(room.rejoined ? 'Kamu kembali ke room sebelumnya.' : 'Berhasil bergabung ke room.', 'success');
  } catch (error) {
    console.error(error);
    setDialogError(friendlyError(error));
  } finally {
    state.isBusy = false;
    setFormBusy(form, false);
  }
}

async function runAction(action, element) {
  const current = state.currentRoom;
  if (action === 'open-create') return openDialog('create');
  if (action === 'open-join') return openDialog('join');
  if (action === 'close-dialog') return closeDialog();
  if (action === 'go-home') {
    clearCurrentRoom();
    render();
    return;
  }
  if (!current) return;

  const code = current.code;
  const role = current.role;
  const uid = state.player.uid;

  if (action === 'copy-code') {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Room code copied.', 'success');
    } catch {
      window.prompt('Copy this room code:', code);
    }
    return;
  }

  if (action === 'select-game') {
    const gameId = element.dataset.gameId;
    await setGameSelection({ code, role, gameId });
    showToast(`${GAME_LABELS[gameId]} dipilih. Kedua status Ready direset.`, 'success');
    return;
  }

  if (action === 'toggle-ready') {
    const ready = current.room?.lobby?.ready?.[role] === true;
    await setReady({ code, role, ready: !ready });
    showToast(!ready ? 'Status Ready tersimpan.' : 'Status Ready dibatalkan.');
    return;
  }

  if (action === 'back-to-lobby') {
    await returnToLobby({ code: state.currentRoom.code, uid: state.player.uid });
    showToast('Room kembali ke lobby.', 'success');
    return;
  }
  if (action === 'start-game') {
    await startSelectedGame({ code, uid });
    showToast('Sesi bersama dimulai.', 'success');
    return;
  }

  if (action === 'return-lobby') {
    disposeMountedGame();
    await returnToLobby({ code, uid });
    showToast('Room kembali ke lobby.', 'success');
    return;
  }

  if (action === 'clear-guest') {
    const accepted = window.confirm('Buka kembali slot guest? Pemain yang terputus akan dikeluarkan dari room dan harus bergabung ulang dengan UID baru.');
    if (!accepted) return;
    await clearDisconnectedGuest({ code, uid });
    showToast('Slot guest berhasil dibuka kembali.', 'success');
    return;
  }

  if (action === 'leave-room') {
    const host = role === 'host';
    const accepted = window.confirm(host
      ? 'Host keluar akan menutup room untuk kedua pemain. Lanjutkan?'
      : 'Kamu akan keluar dan slot guest dibuka kembali. Lanjutkan?');
    if (!accepted) return;
    await leaveRoom({ code, uid });
    clearCurrentRoom();
    render();
    showToast(host ? 'Room sudah ditutup.' : 'Kamu sudah keluar dari room.', 'success');
    return;
  }

  if (action === 'close-old-room') {
    const accepted = window.confirm('Tutup room format lama ini? Pemain lain tidak akan dapat mengaksesnya lagi.');
    if (!accepted) return;
    await leaveRoom({ code, uid });
    clearCurrentRoom();
    render();
    showToast('Room format lama telah ditutup.', 'success');
  }
}

document.addEventListener('click', async (event) => {
  const element = event.target.closest('[data-action]');
  if (!element || element.disabled) return;
  event.preventDefault();
  const action = element.dataset.action;
  try {
    await runAction(action, element);
  } catch (error) {
    console.error(error);
    showToast(friendlyError(error), 'error');
  }
});

createForm.addEventListener('submit', handleCreateSubmit);
joinForm.addEventListener('submit', handleJoinSubmit);
document.querySelector('#join-code').addEventListener('input', (event) => {
  event.target.value = normalizeRoomCode(event.target.value);
});

async function boot() {
  try {
    state.player = await getCurrentPlayer();
    state.bootError = '';
    setConnectionState(false);
    if (databaseConnectionUnsubscribe) databaseConnectionUnsubscribe();
    databaseConnectionUnsubscribe = onValue(ref(db, '.info/connected'), (snapshot) => {
      setConnectionState(snapshot.val() === true);
    }, () => setConnectionState(false, true));
    await restoreLastRoom();
  } catch (error) {
    console.error(error);
    state.bootError = friendlyError(error);
    setConnectionState(false, true);
    render();
  }
}

// Local countdown/expiry UI only; database Rules remain the enforcement point.
window.setInterval(() => {
  const current = state.currentRoom;
  if (!current?.room || current.role !== 'host' || state.expiring) return;
  if (!isRoomExpired(current.room)) return;

  state.expiring = true;
  // Expiry is a room-level event, not a reason to re-render an active game every 15 seconds.
  // Re-render only after the TTL check actually identifies an expired room.
  render();
  void removeExpiredRoom({ code: current.code, uid: state.player.uid })
    .then(() => {
      if (state.currentRoom?.code === current.code) {
        clearCurrentRoom();
        render();
        showToast('Room kedaluwarsa dan dibersihkan.', 'error');
      }
    })
    .catch((error) => {
      state.expiring = false;
      showToast(friendlyError(error), 'error');
    });
}, 15000);

boot();
