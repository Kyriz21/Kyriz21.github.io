export const BRAND = 'DiRi';
export const ROOM_CODE_LENGTH = 6;
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
export const RECONNECT_GRACE_MS = 5 * 60 * 1000;
export const ROOM_STORAGE_KEY = 'diri-ldr-playroom-room-code';
export const DISPLAY_NAME_STORAGE_KEY = 'diri-ldr-playroom-display-name';

export const GAME_CATALOG = [
  { id: 'tictactoe', number: '01', title: 'Tic Tac Toe', subtitle: 'Three in a row', description: 'A little strategy, a little luck.', icon: '✿', state: 'active' },
  { id: 'lovequiz', number: '02', title: 'Love Quiz', subtitle: 'How well do we know?', description: 'Discover what you remember about each other.', icon: '♡', state: 'active' },
  { id: 'thisorthat', number: '03', title: 'This or That', subtitle: 'Choose together', description: 'Two choices, one shared reveal.', icon: '↔', state: 'active' },
  { id: 'truthordare', number: '04', title: 'Truth or Dare', subtitle: 'A little brave', description: 'Stories, surprises, and playful challenges.', icon: '✧', state: 'active' },
  { id: 'memorycard', number: '05', title: 'Memory Card', subtitle: 'Remember the little things', description: 'Find matching pairs together or in a duel.', icon: '▦', state: 'active' },
  { id: 'connectfour', number: '06', title: 'Connect Four', subtitle: 'Four in a row', description: 'Plan ahead and block the other player.', icon: '●', state: 'active' },
  { id: 'drawguess', number: '07', title: 'Draw & Guess', subtitle: 'Draw it, guess it', description: 'One draws while the other figures it out.', icon: '✎', state: 'active' },
  { id: 'tebakkata', number: '08', title: 'Tebak Kata', subtitle: 'Find the right word', description: 'Give clues and avoid forbidden words.', icon: 'Aa', state: 'active' },
  { id: 'photobooth', number: 'PB', title: 'DiRi Photobooth', subtitle: 'Make a little keepsake', description: 'Solo or Couple photo strips with frames, filters and a shared editor.', icon: '▧', state: 'active' }
];

export const GAME_LABELS = Object.fromEntries(GAME_CATALOG.map(game => [game.id, game.title]));
