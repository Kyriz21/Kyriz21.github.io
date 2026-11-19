// DiRi / LDR Playroom — multiplayer game services.
// This module reuses the already configured Firebase database from firebase.js.
// It deliberately does not contain or replace firebaseConfig.
import { db } from './firebase.js';
import {
  ref,
  get,
  set,
  remove,
  runTransaction,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js';

export class GameServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GameServiceError';
    this.code = code;
  }
}

const GAME_IDS = new Set([
  'tic-tac-toe', 'love-quiz', 'this-or-that', 'truth-or-dare',
  'memory-card', 'connect-four', 'draw-guess', 'tebak-kata',
]);

function isRoomMember(room, uid) {
  return Boolean(uid && (uid === room?.hostUid || uid === room?.guestUid));
}

export async function selectRoomGame({ code, gameId, user }) {
  if (!user?.uid) throw new GameServiceError('no-user', 'Sesi pemain belum siap.');
  if (!GAME_IDS.has(gameId)) throw new GameServiceError('unknown-game', 'Game tidak dikenal.');

  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) throw new GameServiceError('room-not-found', 'Room sudah tidak tersedia.');
  const room = snapshot.val();
  if (!isRoomMember(room, user.uid)) throw new GameServiceError('not-a-player', 'Kamu bukan anggota room ini.');
  if (room.game?.status === 'playing') throw new GameServiceError('game-running', 'Game sedang berlangsung. Kembali ke room setelah ronde selesai.');

  await set(ref(db, `rooms/${code}/selections/${user.uid}`), {
    gameId,
    updatedAt: Date.now(),
  });
}

function createTicTacToeSession(hostUid, guestUid) {
  const cells = {};
  for (let i = 0; i < 9; i += 1) cells[`c${i}`] = '';
  return {
    id: 'tic-tac-toe',
    status: 'playing',
    hostUid,
    guestUid,
    startedAt: Date.now(),
    state: {
      cells,
      nextUid: hostUid,
      winnerUid: '',
      draw: false,
      moves: 0,
      lastMoveBy: '',
    },
  };
}

async function startTicTacToe({ code, user, allowRematch }) {
  if (!user?.uid) throw new GameServiceError('no-user', 'Sesi pemain belum siap.');
  const roomSnapshot = await get(ref(db, `rooms/${code}`));
  if (!roomSnapshot.exists()) throw new GameServiceError('room-not-found', 'Room tidak ditemukan.');
  const room = roomSnapshot.val();

  if (user.uid !== room.hostUid) throw new GameServiceError('host-only', 'Hanya host yang dapat memulai game atau ronde baru.');
  if (!room.guestUid || !room.players?.[room.hostUid] || !room.players?.[room.guestUid]) {
    throw new GameServiceError('waiting-player', 'Tunggu sampai kedua pemain berada di room.');
  }

  const hostChoice = room.selections?.[room.hostUid]?.gameId;
  const guestChoice = room.selections?.[room.guestUid]?.gameId;
  if (!hostChoice || hostChoice !== guestChoice) {
    throw new GameServiceError('choices-not-matched', 'Kalian harus memilih game yang sama terlebih dahulu.');
  }
  if (hostChoice !== 'tic-tac-toe') {
    throw new GameServiceError('game-not-ready', 'Game ini belum diaktifkan. Saat ini Tic Tac Toe sudah bisa dimainkan.');
  }

  const gameRef = ref(db, `rooms/${code}/game`);
  const result = await runTransaction(gameRef, (current) => {
    if (current?.status === 'playing') return undefined;
    if (current && !allowRematch && current.status !== 'finished') return undefined;
    return createTicTacToeSession(room.hostUid, room.guestUid);
  }, { applyLocally: false });

  if (!result.committed) {
    throw new GameServiceError('game-already-running', 'Game sedang berjalan atau sudah dimulai dari perangkat pasanganmu.');
  }
}

export async function startRoomGame({ code, gameId, user }) {
  if (gameId !== 'tic-tac-toe') throw new GameServiceError('game-not-ready', 'Game ini belum tersedia.');
  await startTicTacToe({ code, user, allowRematch: false });
}

const WIN_LINES = [
  ['c0', 'c1', 'c2'], ['c3', 'c4', 'c5'], ['c6', 'c7', 'c8'],
  ['c0', 'c3', 'c6'], ['c1', 'c4', 'c7'], ['c2', 'c5', 'c8'],
  ['c0', 'c4', 'c8'], ['c2', 'c4', 'c6'],
];

export async function playTicTacToeMove({ code, user, index }) {
  if (!user?.uid || !Number.isInteger(index) || index < 0 || index > 8) {
    throw new GameServiceError('invalid-move', 'Langkah tidak valid.');
  }

  const gameRef = ref(db, `rooms/${code}/game`);
  const result = await runTransaction(gameRef, (current) => {
    if (!current || current.id !== 'tic-tac-toe' || current.status !== 'playing') return undefined;
    const state = current.state;
    if (!state || state.nextUid !== user.uid || state.cells?.[`c${index}`] !== '') return undefined;

    const symbol = user.uid === current.hostUid ? 'X' : (user.uid === current.guestUid ? 'O' : '');
    if (!symbol) return undefined;

    const next = {
      ...current,
      state: {
        ...state,
        cells: { ...state.cells, [`c${index}`]: symbol },
        moves: (Number(state.moves) || 0) + 1,
        lastMoveBy: user.uid,
      },
      updatedAt: Date.now(),
    };

    const cells = next.state.cells;
    const won = WIN_LINES.some(([a, b, c]) => cells[a] === symbol && cells[b] === symbol && cells[c] === symbol);
    if (won) {
      next.status = 'finished';
      next.state.winnerUid = user.uid;
      next.state.draw = false;
      next.state.nextUid = user.uid;
    } else if (next.state.moves >= 9) {
      next.status = 'finished';
      next.state.winnerUid = '';
      next.state.draw = true;
      next.state.nextUid = user.uid;
    } else {
      next.state.nextUid = user.uid === current.hostUid ? current.guestUid : current.hostUid;
    }
    return next;
  }, { applyLocally: false });

  return {
    committed: result.committed,
    reason: result.committed ? '' : 'Langkah tidak diterima. Mungkin bukan giliranmu atau kotak sudah terisi.',
  };
}

export async function startNewTicTacToeRound({ code, user }) {
  await startTicTacToe({ code, user, allowRematch: true });
}

export async function leaveRoom({ code, user }) {
  if (!code || !user?.uid) return;
  const roomRef = ref(db, `rooms/${code}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) return;
  const room = snapshot.val();

  if (room.hostUid === user.uid) {
    await remove(roomRef);
    return;
  }

  if (room.guestUid === user.uid) {
    // Remove shared game state before releasing the guest seat, while membership is still valid.
    await remove(ref(db, `rooms/${code}/game`));
    await remove(ref(db, `rooms/${code}/selections/${user.uid}`));
    await remove(ref(db, `rooms/${code}/players/${user.uid}`));
    await remove(ref(db, `rooms/${code}/guestUid`));
  }
}
