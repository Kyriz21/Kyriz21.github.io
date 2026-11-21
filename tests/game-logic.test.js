import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTicTacToeWin, getConnectFourWin, normalizeGuess,
  isExactAnswerGuess, calculateCompatibility, nextMatchStreak
} from '../js/games/logic.js';

test('Tic Tac Toe detects all row, column and diagonal wins', () => {
  assert.equal(isTicTacToeWin(['X','X','X',null,'O',null,'O',null,null], 'X'), true);
  assert.equal(isTicTacToeWin(['O',null,'X','O',null,'X',null,null,'X'], 'X'), true);
  assert.equal(isTicTacToeWin(['X',null,'O',null,'X',null,'O',null,'X'], 'X'), true);
  assert.equal(isTicTacToeWin(Array(9).fill(null), 'X'), false);
  assert.equal(isTicTacToeWin(Array(8).fill('X'), 'X'), false);
});

test('Connect Four finds horizontal, vertical and both diagonal wins', () => {
  const horizontal = Array(42).fill(null);
  [0,1,2,3].forEach(c => { horizontal[5*7+c] = 'A'; });
  assert.equal(getConnectFourWin(horizontal)?.uid, 'A');
  assert.deepEqual(getConnectFourWin(horizontal)?.cells, [35,36,37,38]);

  const vertical = Array(42).fill(null);
  [2,3,4,5].forEach(r => { vertical[r*7+1] = 'B'; });
  assert.equal(getConnectFourWin(vertical)?.uid, 'B');

  const rising = Array(42).fill(null);
  [[5,0],[4,1],[3,2],[2,3]].forEach(([r,c]) => { rising[r*7+c] = 'C'; });
  assert.equal(getConnectFourWin(rising)?.uid, 'C');

  const falling = Array(42).fill(null);
  [[2,0],[3,1],[4,2],[5,3]].forEach(([r,c]) => { falling[r*7+c] = 'D'; });
  assert.equal(getConnectFourWin(falling)?.uid, 'D');
});

test('Connect Four does not connect across board edges', () => {
  const board = Array(42).fill(null);
  [6,7,8,9].forEach(i => { board[i] = 'A'; });
  assert.equal(getConnectFourWin(board), null);
});

test('answer normalization ignores case, accents and punctuation but not meaning', () => {
  assert.equal(normalizeGuess('  KENCAN—PERTAMA! '), 'kencan pertama');
  assert.equal(isExactAnswerGuess('Kucing!', ['kucing']), true);
  assert.equal(isExactAnswerGuess('kucng', ['kucing']), false);
  assert.equal(isExactAnswerGuess(' ', ['kucing']), false);
});

test('compatibility percentages and streaks stay within valid bounds', () => {
  assert.equal(calculateCompatibility(8,10), 80);
  assert.equal(calculateCompatibility(12,10), 100);
  assert.equal(calculateCompatibility(-2,10), 0);
  assert.equal(calculateCompatibility(1,0), 0);
  assert.equal(nextMatchStreak(3,true), 4);
  assert.equal(nextMatchStreak(3,false), 0);
});
