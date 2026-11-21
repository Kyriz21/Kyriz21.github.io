/** Pure game rules shared with the test suite. */
const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

export function isTicTacToeWin(board, symbol) {
  if (!Array.isArray(board) || board.length !== 9 || !symbol) return false;
  return TTT_LINES.some(line => line.every(index => board[index] === symbol));
}

/** Returns the four winning board indices for a 7-column × 6-row Connect Four board. */
export function getConnectFourWin(board) {
  if (!Array.isArray(board) || board.length !== 42) return null;
  const rows = 6;
  const columns = 7;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const token = board[row * columns + column];
      if (!token) continue;
      for (const [dr, dc] of directions) {
        const cells = [];
        for (let offset = 0; offset < 4; offset += 1) {
          const r = row + dr * offset;
          const c = column + dc * offset;
          if (r < 0 || r >= rows || c < 0 || c >= columns || board[r * columns + c] !== token) break;
          cells.push(r * columns + c);
        }
        if (cells.length === 4) return { uid: token, cells };
      }
    }
  }
  return null;
}

export function normalizeGuess(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isExactAnswerGuess(value, acceptedAnswers = []) {
  const normalized = normalizeGuess(value);
  if (!normalized) return false;
  return acceptedAnswers.some(answer => normalizeGuess(answer) === normalized);
}

export function calculateCompatibility(matches, total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.round((Math.max(0, Math.min(matches, total)) / total) * 100);
}

export function nextMatchStreak(current, matched) {
  return matched ? Math.max(0, current) + 1 : 0;
}
