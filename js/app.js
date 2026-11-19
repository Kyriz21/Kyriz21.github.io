import {
  ensureAnonymousUser,
  createRoom,
  joinRoom,
  watchRoom,
  startPresence,
} from './firebase.js';
import {
  leaveRoom,
  selectRoomGame,
  startRoomGame,
  playTicTacToeMove,
  startNewTicTacToeRound,
} from './game-service.js';

const $ = (id) => document.getElementById(id);
const roomDialog = $('roomDialog');
const roomForm = $('roomForm');
const playerNameInput = $('playerName');
const codeField = $('codeField');
const roomCodeInput = $('roomCode');
const roomTitle = $('roomTitle');
const roomLead = $('roomLead');
const roomError = $('roomError');
const roomSubmit = $('roomSubmit');
const roomLobby = $('roomLobby');
const lobbyCode = $('lobbyCode');
const lobbyStatus = $('lobbyStatus');
const playerList = $('playerList');
const roomTip = $('lobbyTip');
const roomGames = $('roomGames');
const myGameChoice = $('myGameChoice');
const partnerGameChoice = $('partnerGameChoice');
const selectionHint = $('selectionHint');
const startGameButton = $('startGame');
const activeGameBanner = $('activeGameBanner');
const leaveRoomButton = $('leaveRoom');
const gameDialog = $('gameDialog');
const ticBoard = $('ticBoard');
const gameStatus = $('gameStatus');
const rematchButton = $('rematchGame');
const toast = $('toast');

const GAME_NAMES = { 'tic-tac-toe': 'Tic Tac Toe' };
const AVAILABLE_GAMES = new Set(['tic-tac-toe']);
let mode = 'create';
let currentUser = null;
let activeCode = null;
let activeRoom = null;
let activeName = '';
let stopRoomWatch = null;
let stopPresenceWatch = null;
let toastTimer = null;
let submitting = false;
let moving = false;
let lastOpenedRoundKey = null;

function notify(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 4200);
}

function showError(message) {
  roomError.textContent = message || '';
  roomError.hidden = !message;
}

function setBusy(busy) {
  submitting = busy;
  roomSubmit.disabled = busy;
  roomSubmit.textContent = busy ? 'Menghubungkan…' : (mode === 'join' ? 'Join room ♡' : 'Create room ♡');
}

function resetRoomDialog() {
  roomForm.hidden = false;
  roomLobby.hidden = true;
  codeField.hidden = mode !== 'join';
  roomTitle.textContent = mode === 'join' ? 'Join your person.' : "Let's get together.";
  roomLead.textContent = mode === 'join'
    ? 'Masukkan nama dan kode room yang dibagikan pasanganmu.'
    : 'Buat ruang kecil untuk kalian berdua. Bagikan kodenya kepada pasangan.';
  roomCodeInput.required = mode === 'join';
  showError('');
  setBusy(false);
}

function openRoom(modeToOpen) {
  if (!roomDialog) return;
  if (activeCode && activeRoom) {
    roomForm.hidden = true;
    roomLobby.hidden = false;
    renderRoom(activeRoom);
    if (!roomDialog.open) roomDialog.showModal();
    return;
  }
  mode = modeToOpen === 'join' ? 'join' : 'create';
  resetRoomDialog();
  if (!roomDialog.open) roomDialog.showModal();
  window.setTimeout(() => playerNameInput.focus({ preventScroll: true }), 100);
}

function stopRoomListeners() {
  if (stopRoomWatch) stopRoomWatch();
  if (stopPresenceWatch) stopPresenceWatch();
  stopRoomWatch = null;
  stopPresenceWatch = null;
}

function currentPlayers(room = activeRoom) {
  const players = Object.entries(room?.players || {});
  players.sort(([uidA], [uidB]) => {
    if (uidA === room?.hostUid) return -1;
    if (uidB === room?.hostUid) return 1;
    return 0;
  });
  return players;
}

function playerName(room, uid) {
  return room?.players?.[uid]?.name || (uid === currentUser?.uid ? activeName : 'Your person');
}

function renderPlayers(room) {
  playerList.replaceChildren();
  const players = currentPlayers(room);
  players.forEach(([uid, player]) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    const avatar = document.createElement('span');
    avatar.className = 'player-avatar';
    avatar.textContent = (player.name || '?').trim().charAt(0).toUpperCase();
    const details = document.createElement('div');
    details.className = 'player-details';
    const name = document.createElement('b');
    name.textContent = uid === currentUser?.uid ? `${player.name || 'Player'} (You)` : (player.name || 'Player');
    const role = document.createElement('small');
    role.textContent = uid === room.hostUid ? 'Room host · X' : 'Guest · O';
    details.append(name, role);
    const presence = document.createElement('span');
    presence.className = `presence ${player.online ? 'online' : ''}`;
    presence.textContent = player.online ? 'Online' : 'Offline';
    row.append(avatar, details, presence);
    playerList.append(row);
  });

  const hasPartner = Boolean(room.guestUid && room.players?.[room.guestUid]);
  roomGames.hidden = !hasPartner;
  if (!hasPartner) {
    lobbyStatus.textContent = 'Menunggu pasanganmu bergabung… Bagikan kode room di atas.';
    roomTip.textContent = 'Room sudah dibuat. Pasanganmu bisa bergabung dari HP atau laptop menggunakan kode ini.';
    activeGameBanner.hidden = true;
  } else {
    lobbyStatus.textContent = 'Yeay! Kalian sudah berada di room yang sama. Sekarang pilih game bersama ♡';
    roomTip.textContent = 'Kalian harus memilih game yang sama. Game baru terbuka setelah pilihan cocok.';
  }
}

function renderSelection(room) {
  const selections = room.selections || {};
  const own = selections[currentUser?.uid]?.gameId || '';
  const partnerUid = currentUser?.uid === room.hostUid ? room.guestUid : room.hostUid;
  const partner = partnerUid ? (selections[partnerUid]?.gameId || '') : '';
  myGameChoice.textContent = own ? (GAME_NAMES[own] || own) : 'Belum memilih';
  partnerGameChoice.textContent = partner ? (GAME_NAMES[partner] || partner) : 'Belum memilih';

  document.querySelectorAll('[data-lobby-game]').forEach((button) => {
    const id = button.dataset.lobbyGame;
    const ownSelected = own === id;
    const partnerSelected = partner === id;
    button.classList.toggle('is-selected', ownSelected);
    button.classList.toggle('partner-selected', partnerSelected);
    button.setAttribute('aria-pressed', String(ownSelected));
  });

  const hasPartner = Boolean(room.guestUid && room.players?.[room.guestUid]);
  const match = Boolean(hasPartner && own && own === partner && AVAILABLE_GAMES.has(own));
  const gameInProgress = room.game?.status === 'playing';
  const isHost = currentUser?.uid === room.hostUid;

  if (gameInProgress) {
    selectionHint.textContent = 'Tic Tac Toe sedang berlangsung. Kalian bisa kembali ke game kapan saja.';
    startGameButton.hidden = true;
    activeGameBanner.hidden = false;
    return;
  }

  activeGameBanner.hidden = true;
  startGameButton.hidden = !hasPartner;
  startGameButton.disabled = !match || !isHost;
  if (!own && !partner) {
    selectionHint.textContent = 'Pilih Tic Tac Toe. Minta pasanganmu memilih game yang sama.';
    startGameButton.textContent = 'Menunggu pilihan yang cocok ♡';
  } else if (!own || !partner) {
    selectionHint.textContent = 'Satu pemain sudah memilih. Sekarang giliran pasanganmu.';
    startGameButton.textContent = 'Menunggu pilihan pasangan ♡';
  } else if (own !== partner) {
    selectionHint.textContent = `Pilihan belum cocok: kamu memilih ${GAME_NAMES[own] || own}, pasangan memilih ${GAME_NAMES[partner] || partner}.`;
    startGameButton.textContent = 'Pilih game yang sama ♡';
  } else if (!AVAILABLE_GAMES.has(own)) {
    selectionHint.textContent = 'Game ini belum aktif. Silakan pilih game yang sudah tersedia.';
    startGameButton.textContent = 'Game belum tersedia';
  } else if (!isHost) {
    selectionHint.textContent = 'Pilihan kalian cocok! Menunggu host memulai permainan.';
    startGameButton.textContent = 'Menunggu host memulai ♡';
  } else {
    selectionHint.textContent = 'Pilihan cocok! Kalian siap bermain. Mulai saat sudah siap.';
    startGameButton.textContent = 'Mulai Tic Tac Toe ♡';
  }
}

function gameRoundKey(room) {
  return room?.game?.startedAt ? `${activeCode}:${room.game.startedAt}` : null;
}

function renderGame(room) {
  const game = room?.game;
  if (!game || game.id !== 'tic-tac-toe') return;
  const hostName = playerName(room, room.hostUid);
  const guestName = playerName(room, room.guestUid);
  $('gamePlayerOne').textContent = hostName.charAt(0).toUpperCase();
  $('gamePlayerOneName').textContent = hostName;
  $('gamePlayerTwo').textContent = guestName.charAt(0).toUpperCase();
  $('gamePlayerTwoName').textContent = guestName;

  const state = game.state || {};
  const cells = state.cells || {};
  const isFinished = game.status === 'finished';
  const myTurn = state.nextUid === currentUser?.uid;
  if (state.winnerUid) {
    gameStatus.textContent = state.winnerUid === currentUser?.uid
      ? 'Kamu menang! Yeay! ♡'
      : `${playerName(room, state.winnerUid)} menang. Nice game! ♡`;
    gameStatus.classList.add('is-finished');
  } else if (state.draw) {
    gameStatus.textContent = 'Seri! Kalian sama-sama hebat. ♡';
    gameStatus.classList.add('is-finished');
  } else {
    gameStatus.textContent = myTurn ? 'Giliran kamu. Pilih satu kotak! ♡' : `Giliran ${playerName(room, state.nextUid)}. Tunggu sebentar ya…`;
    gameStatus.classList.remove('is-finished');
  }

  ticBoard.querySelectorAll('[data-cell]').forEach((button) => {
    const index = Number(button.dataset.cell);
    const value = cells[`c${index}`] || '';
    button.textContent = value === 'X' ? '×' : value === 'O' ? '○' : '';
    button.classList.toggle('cell-x', value === 'X');
    button.classList.toggle('cell-o', value === 'O');
    button.disabled = Boolean(value) || !myTurn || isFinished || moving;
    button.setAttribute('aria-label', `Kotak ${index + 1}${value ? `: ${value}` : ': kosong'}`);
  });

  rematchButton.hidden = !isFinished;
  rematchButton.disabled = !isFinished || currentUser?.uid !== room.hostUid;
  rematchButton.textContent = currentUser?.uid === room.hostUid ? 'Main lagi ♡' : 'Menunggu host untuk main lagi';
  $('gameHelp').textContent = `Kamu bermain sebagai ${currentUser?.uid === room.hostUid ? 'X' : 'O'}. X adalah ${hostName}, O adalah ${guestName}. Setiap langkah langsung tersinkron ke perangkat pasangan.`;
}

function maybeOpenGame(room) {
  if (room?.game?.status !== 'playing' || room.game.id !== 'tic-tac-toe') return;
  const key = gameRoundKey(room);
  if (!key || key === lastOpenedRoundKey) return;
  lastOpenedRoundKey = key;
  if (roomDialog.open) roomDialog.close();
  if (!gameDialog.open) gameDialog.showModal();
}

function renderRoom(room) {
  if (!room) return;
  activeRoom = room;
  lobbyCode.textContent = activeCode || '------';
  renderPlayers(room);
  if (room.guestUid && room.players?.[room.guestUid]) renderSelection(room);
  else {
    roomGames.hidden = true;
    activeGameBanner.hidden = true;
    startGameButton.hidden = true;
  }

  if (room.game?.status === 'playing') {
    if (gameDialog.open) renderGame(room);
    else activeGameBanner.hidden = false;
  } else if (room.game?.status === 'finished') {
    if (gameDialog.open) renderGame(room);
  }
  maybeOpenGame(room);
}

function attachRoom(code, user) {
  stopRoomListeners();
  stopRoomWatch = watchRoom(code, (room) => {
    if (!room) {
      stopRoomListeners();
      activeCode = null;
      activeRoom = null;
      if (roomDialog.open) roomDialog.close();
      if (gameDialog.open) gameDialog.close();
      notify('Room sudah ditutup. Kamu bisa membuat room baru.');
      return;
    }
    renderRoom(room);
  }, (error) => {
    console.error('[DiRi / LDR Playroom] Room listener error:', error);
    lobbyStatus.textContent = error.message;
    notify(error.message);
  });
  stopPresenceWatch = startPresence(code, user);
}

async function handleRoomSubmit(event) {
  event.preventDefault();
  if (submitting) return;
  showError('');
  const name = playerNameInput.value.trim();
  const code = roomCodeInput.value.trim();
  if (!name) {
    showError('Nama panggilan harus diisi.');
    playerNameInput.focus();
    return;
  }
  if (mode === 'join' && !code) {
    showError('Masukkan kode room dari pasanganmu.');
    roomCodeInput.focus();
    return;
  }

  setBusy(true);
  try {
    currentUser = await ensureAnonymousUser();
    activeName = name;
    activeCode = mode === 'create'
      ? await createRoom({ name, user: currentUser })
      : await joinRoom({ code, name, user: currentUser });

    lastOpenedRoundKey = null;
    roomForm.hidden = true;
    roomLobby.hidden = false;
    roomTitle.textContent = 'You are in your room.';
    roomLead.textContent = 'Bagikan kode ini kepada pasanganmu. Setelah masuk, pilih game bersama.';
    lobbyCode.textContent = activeCode;
    lobbyStatus.textContent = 'Menghubungkan room…';
    roomGames.hidden = true;
    attachRoom(activeCode, currentUser);
    notify(mode === 'create' ? 'Room berhasil dibuat. Bagikan kodenya ya! ♡' : 'Berhasil bergabung ke room! ♡');
  } catch (error) {
    console.error('[DiRi / LDR Playroom] Room action failed:', error);
    showError(error?.message || 'Terjadi kendala. Coba lagi.');
  } finally {
    setBusy(false);
  }
}

async function handleLeaveRoom() {
  if (!activeCode || !currentUser) return;
  leaveRoomButton.disabled = true;
  leaveRoomButton.textContent = 'Leaving…';
  const codeToLeave = activeCode;
  stopRoomListeners();
  try {
    await leaveRoom({ code: codeToLeave, user: currentUser });
    activeCode = null;
    activeRoom = null;
    lastOpenedRoundKey = null;
    roomForm.reset();
    roomForm.hidden = false;
    roomLobby.hidden = true;
    if (roomDialog.open) roomDialog.close();
    if (gameDialog.open) gameDialog.close();
    notify('Kamu sudah keluar dari room. Sampai bertemu lagi ♡');
  } catch (error) {
    console.error('[DiRi / LDR Playroom] Leave room failed:', error);
    notify(error?.message || 'Belum berhasil keluar dari room.');
    attachRoom(codeToLeave, currentUser);
  } finally {
    leaveRoomButton.disabled = false;
    leaveRoomButton.textContent = 'Leave room';
  }
}

async function handleGameSelection(gameId) {
  if (!activeCode || !activeRoom || !currentUser) {
    notify('Buat atau gabung room terlebih dahulu. Setelah pasangan masuk, kalian bisa memilih game bersama.');
    openRoom('create');
    return;
  }
  if (!activeRoom.guestUid || !activeRoom.players?.[activeRoom.guestUid]) {
    notify('Tunggu sampai pasanganmu bergabung ke room.');
    if (!roomDialog.open) roomDialog.showModal();
    return;
  }
  if (!AVAILABLE_GAMES.has(gameId)) {
    notify('Game ini sedang disiapkan. Saat ini Tic Tac Toe sudah bisa dimainkan.');
    return;
  }
  try {
    await selectRoomGame({ code: activeCode, gameId, user: currentUser });
    if (!roomDialog.open) {
      roomForm.hidden = true;
      roomLobby.hidden = false;
      roomDialog.showModal();
    }
    notify('Pilihan game tersimpan. Sekarang pasanganmu memilih juga. ♡');
  } catch (error) {
    notify(error?.message || 'Pilihan game belum berhasil disimpan.');
  }
}

async function handleStartGame() {
  if (!activeCode || !currentUser) return;
  startGameButton.disabled = true;
  try {
    await startRoomGame({ code: activeCode, gameId: 'tic-tac-toe', user: currentUser });
    notify('Game dimulai! Semoga beruntung. ♡');
  } catch (error) {
    notify(error?.message || 'Game belum bisa dimulai.');
  } finally {
    if (activeRoom) renderSelection(activeRoom);
  }
}

async function handleCellClick(index) {
  if (!activeCode || !currentUser || moving) return;
  moving = true;
  ticBoard.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  try {
    const result = await playTicTacToeMove({ code: activeCode, user: currentUser, index });
    if (!result.committed) notify(result.reason || 'Langkah belum diterima. Periksa giliran dan kotak yang dipilih.');
  } catch (error) {
    notify(error?.message || 'Langkah belum berhasil dikirim.');
  } finally {
    moving = false;
    if (activeRoom?.game) renderGame(activeRoom);
  }
}

async function handleRematch() {
  if (!activeCode || !currentUser) return;
  rematchButton.disabled = true;
  try {
    await startNewTicTacToeRound({ code: activeCode, user: currentUser });
    notify('Ronde baru dimulai. Good luck! ♡');
  } catch (error) {
    notify(error?.message || 'Belum bisa memulai ronde baru.');
  } finally {
    rematchButton.disabled = currentUser?.uid !== activeRoom?.hostUid;
  }
}

function returnToRoom() {
  if (gameDialog.open) gameDialog.close();
  if (activeCode && activeRoom) {
    lastOpenedRoundKey = gameRoundKey(activeRoom);
    roomForm.hidden = true;
    roomLobby.hidden = false;
    roomTitle.textContent = 'You are in your room.';
    roomLead.textContent = 'Pilih game bersama dan nikmati waktu kalian. ♡';
    if (!roomDialog.open) roomDialog.showModal();
    renderRoom(activeRoom);
  }
}

// Homepage and navigation interactions.
$('year').textContent = new Date().getFullYear();
$('menuToggle').addEventListener('click', () => {
  const nav = $('mainNav');
  const isOpen = nav.classList.toggle('open');
  $('menuToggle').setAttribute('aria-expanded', String(isOpen));
});
$('mainNav').querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  $('mainNav').classList.remove('open');
  $('menuToggle').setAttribute('aria-expanded', 'false');
}));
document.querySelectorAll('[data-open-room]').forEach((button) => {
  button.addEventListener('click', () => openRoom(button.dataset.openRoom));
});
roomForm.addEventListener('submit', handleRoomSubmit);
$('closeRoom').addEventListener('click', () => roomDialog.close());
$('leaveRoom').addEventListener('click', handleLeaveRoom);
roomCodeInput.addEventListener('input', () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
});
$('copyCode').addEventListener('click', async () => {
  if (!activeCode) return;
  try {
    await navigator.clipboard.writeText(activeCode);
    notify('Kode room berhasil disalin. ♡');
  } catch {
    notify(`Kode room: ${activeCode}`);
  }
});

document.querySelectorAll('[data-lobby-game]').forEach((button) => {
  button.addEventListener('click', () => handleGameSelection(button.dataset.lobbyGame));
});
document.querySelectorAll('.game-open[data-game]').forEach((button) => {
  button.addEventListener('click', () => {
    const gameId = button.dataset.game === 'Tic Tac Toe' ? 'tic-tac-toe' : '';
    if (!gameId) return notify('Game ini segera hadir. Untuk sekarang, Tic Tac Toe sudah bisa dimainkan. ♡');
    handleGameSelection(gameId);
  });
});
startGameButton.addEventListener('click', handleStartGame);
$('resumeGame').addEventListener('click', () => {
  if (!activeRoom?.game || activeRoom.game.status !== 'playing') return;
  const key = gameRoundKey(activeRoom);
  lastOpenedRoundKey = key;
  if (roomDialog.open) roomDialog.close();
  if (!gameDialog.open) gameDialog.showModal();
  renderGame(activeRoom);
});
ticBoard.addEventListener('click', (event) => {
  const cell = event.target.closest('[data-cell]');
  if (!cell || cell.disabled) return;
  handleCellClick(Number(cell.dataset.cell));
});
rematchButton.addEventListener('click', handleRematch);
$('closeGame').addEventListener('click', returnToRoom);
$('backToRoom').addEventListener('click', returnToRoom);
gameDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  returnToRoom();
});
window.addEventListener('pagehide', () => {
  if (stopPresenceWatch) stopPresenceWatch();
});
