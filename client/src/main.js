import './style.css'
import io from "socket.io-client"

const socket = io("https://sudoku-legends.onrender.com")

let currentBoard = []
let solutionBoard = []
let timerInterval = null
let serverStartTime = null

document.querySelector('#app').innerHTML = `
  <div class="container">
    <h1 class="title">SUDOKU LEGENDS</h1>
    <div id="timer" class="timer">⏱ 00:00</div>

    <div class="controls">
      <input id="nameInput" placeholder="Nickname" />
      <button id="joinBtn">Entra</button>
      <button id="startBtn">Singola</button>
      <button id="tournamentBtn">Torneo</button>
    </div>

    <div class="layout">
      <div>
        <h2>Classifica</h2>
        <div id="playersList" class="leaderboard"></div>
      </div>
      <div id="gameBoard" class="board"></div>
    </div>
  </div>
`

const joinBtn = document.getElementById("joinBtn")
const startBtn = document.getElementById("startBtn")
const tournamentBtn = document.getElementById("tournamentBtn")
const nameInput = document.getElementById("nameInput")
const playersList = document.getElementById("playersList")
const gameBoard = document.getElementById("gameBoard")

joinBtn.onclick = () => {
  if (nameInput.value.trim() !== "")
    socket.emit("join", nameInput.value)
}

startBtn.onclick = () => socket.emit("startGame")
tournamentBtn.onclick = () => socket.emit("startTournament")

socket.on("updatePlayers", (players) => {
  playersList.innerHTML = ""
  players.sort((a,b)=>b.score-a.score)
    .forEach(p=>{
      playersList.innerHTML += `
        <div class="player">
          <span>${p.name}</span>
          <span>${p.score}</span>
        </div>`
    })
})

socket.on("gameStarted", (data) => {
  currentBoard = data.board
  solutionBoard = data.solution
  serverStartTime = data.startTime
  renderBoard()
  startTimer()
})

socket.on("newRound", (data) => {
  currentBoard = data.board
  solutionBoard = data.solution
  serverStartTime = data.startTime
  document.getElementById("timer").innerText =
    "🏆 ROUND " + data.round + "/" + data.totalRounds
  renderBoard()
  startTimer()
})

socket.on("roundEnded", () => {
  socket.emit("submitBoard", {
    board: currentBoard
  })
})

socket.on("tournamentEnded", (players) => {
  clearInterval(timerInterval)
  const winner = [...players].sort((a,b)=>b.score-a.score)[0]
  alert("🏆 Vincitore: " + winner.name)
})

function renderBoard() {
  gameBoard.innerHTML = ""

  currentBoard.forEach((row, r) => {
    row.forEach((cell, c) => {

      const input = document.createElement("input")
      input.type = "number"
      input.min = 1
      input.max = 9
      input.value = cell !== 0 ? cell : ""

      if (cell !== 0) input.disabled = true

      // Blocchi 3x3
      if (r % 3 === 0) input.style.borderTop = "3px solid #111"
      if (c % 3 === 0) input.style.borderLeft = "3px solid #111"
      if (r === 8) input.style.borderBottom = "3px solid #111"
      if (c === 8) input.style.borderRight = "3px solid #111"

      input.addEventListener("focus", () => highlight(r, c))
      input.addEventListener("blur", clearHighlight)

      input.oninput = () => {
        const val = parseInt(input.value)

        if (val >= 1 && val <= 9) {
          currentBoard[r][c] = val

          if (val !== solutionBoard[r][c])
            input.classList.add("error")
          else
            input.classList.remove("error")

        } else {
          input.value = ""
          currentBoard[r][c] = 0
        }

        checkCompletion()
      }

      input.dataset.row = r
      input.dataset.col = c

      gameBoard.appendChild(input)
    })
  })
}

function highlight(row, col) {
  const inputs = document.querySelectorAll(".board input")

  inputs.forEach(input => {
    const r = parseInt(input.dataset.row)
    const c = parseInt(input.dataset.col)

    if (r === row || c === col)
      input.classList.add("highlight")

    if (
      Math.floor(r / 3) === Math.floor(row / 3) &&
      Math.floor(c / 3) === Math.floor(col / 3)
    ) {
      input.classList.add("block-highlight")
    }
  })
}

function clearHighlight() {
  const inputs = document.querySelectorAll(".board input")
  inputs.forEach(input => {
    input.classList.remove("highlight")
    input.classList.remove("block-highlight")
  })
}

function checkCompletion() {
  const full = currentBoard.flat().every(x => x !== 0)
  if (!full) return

  const correct = currentBoard.every((row, r) =>
    row.every((cell, c) => cell === solutionBoard[r][c])
  )

  if (correct) {
    socket.emit("playerFinished", {
      board: currentBoard
    })
  }
}

function startTimer(){
  const t=document.getElementById("timer")
  clearInterval(timerInterval)
  timerInterval=setInterval(()=>{
    const e=Math.floor((Date.now()-serverStartTime)/1000)
    const m=Math.floor(e/60)
    const s=e%60
    t.innerText="⏱ "+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")
  },1000)
}