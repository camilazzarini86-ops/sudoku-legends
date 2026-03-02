function isValid(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
    if (board[x][col] === num) return false;
  }

  const startRow = row - row % 3;
  const startCol = col - col % 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[startRow + r][startCol + c] === num) return false;
    }
  }

  return true;
}

function solve(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solve(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSudoku() {
  let board = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => 0)
  );

  solve(board);

  const solution = JSON.parse(JSON.stringify(board));

  for (let i = 0; i < 40; i++) {
    let row = Math.floor(Math.random() * 9);
    let col = Math.floor(Math.random() * 9);
    board[row][col] = 0;
  }

  return { puzzle: board, solution: solution };
}

module.exports = generateSudoku;