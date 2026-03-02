const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const generateSudoku = require("./sudokuGenerator");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let players = [];
let gameStartTime = null;

// Modalità torneo
let tournamentMode = false;
let currentRound = 0;
let totalRounds = 3;

let currentSolution = null;
let roundClosed = false;
let firstFinisherId = null;

io.on("connection", (socket) => {

  console.log("Nuovo giocatore connesso");

  socket.on("join", (name) => {
    players.push({ id: socket.id, name, score: 0, lastBoard: null });
    io.emit("updatePlayers", players);
  });

  // 🎮 PARTITA SINGOLA
  socket.on("startGame", () => {

    tournamentMode = false;

    players = players.map(p => ({
      ...p,
      score: 0
    }));

    const { puzzle, solution } = generateSudoku();
    gameStartTime = Date.now();

    io.emit("updatePlayers", players);

    io.emit("gameStarted", {
      board: puzzle,
      solution: solution,
      startTime: gameStartTime
    });
  });

  // 🏆 AVVIO TORNEO
  socket.on("startTournament", () => {

    tournamentMode = true;
    currentRound = 0;

    players = players.map(p => ({
      ...p,
      score: 0,
      lastBoard: null
    }));

    io.emit("updatePlayers", players);

    startNewRound();
  });

  // 🏁 PRIMO CHE FINISCE
  socket.on("playerFinished", (data) => {

    if (!tournamentMode || roundClosed) return;

    roundClosed = true;
    firstFinisherId = socket.id;

    const player = players.find(p => p.id === socket.id);
    if (player) {
      player.lastBoard = data.board;
    }

    // Chiediamo a tutti di inviare la propria board
    io.emit("roundEnded");
  });

  // 📤 RICEVIAMO LE BOARD DI TUTTI
  socket.on("submitBoard", (data) => {

    const player = players.find(p => p.id === socket.id);
    if (!player) return;

    player.lastBoard = data.board;

    const allSubmitted = players.every(p => p.lastBoard);

    if (!allSubmitted) return;

    // Calcolo punteggi
    players.forEach(p => {

      let correctCells = 0;

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (p.lastBoard[r][c] === currentSolution[r][c]) {
            correctCells++;
          }
        }
      }

      p.score += correctCells;

      // BONUS PRIMO
      if (p.id === firstFinisherId) {
        p.score += 20;
      }

      p.lastBoard = null;
    });

    io.emit("updatePlayers", players);

    setTimeout(() => {
      startNewRound();
    }, 3000);
  });

  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id);
    io.emit("updatePlayers", players);
  });

});

// 🔁 NUOVO ROUND
function startNewRound() {

  if (currentRound >= totalRounds) {
    io.emit("tournamentEnded", players);
    tournamentMode = false;
    return;
  }

  currentRound++;
  roundClosed = false;
  firstFinisherId = null;

  const { puzzle, solution } = generateSudoku();
  currentSolution = solution;
  gameStartTime = Date.now();

  io.emit("newRound", {
    board: puzzle,
    solution: solution,
    startTime: gameStartTime,
    round: currentRound,
    totalRounds: totalRounds
  });
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log("Server attivo su porta " + PORT);
});