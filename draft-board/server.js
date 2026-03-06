const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const HALFTIME_PICK = 10;
const HALFTIME_DURATION_MS = 60 * 1000;

const PLAYER_POOL = [
  "Jack Oliver",
  "Anthony Ibarra",
  "Jacob C",
  "Victor",
  "Ryan",
  "Josh",
  "Elias",
  "Jo",
  "Mike",
  "Kris",
  "Guten",
  "Drew",
  "Timo",
  "Keyserling",
  "Chase Place",
  "Kai Woods",
  "Fiorni",
  "Kyler",
  "Tom",
  "Tyler"
];

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

function createInitialDraftState() {
  return {
    availablePlayers: [...PLAYER_POOL],
    team1: {
      name: "Thomas & Kobe",
      players: []
    },
    team2: {
      name: "Nick & Cam",
      players: []
    },
    draftHistory: [],
    speedballWinner: null,
    currentPickNumber: 0,
    currentTeam: null,
    halftimeBreakActive: false,
    halftimeBreakEndsAt: null,
    halftimeBreakCompleted: false
  };
}

let draftState = createInitialDraftState();
let halftimeTimeout = null;

// Calculate whose turn it is based on snake draft
function getCurrentTeam(pickNumber, speedballWinner) {
  if (pickNumber === 0) return null;

  // Snake draft pattern: 1, 2-3, 4-5, 6-7, ...
  if (pickNumber === 1) {
    return speedballWinner;
  }

  const adjustedPick = pickNumber - 1;
  const pairNumber = Math.ceil(adjustedPick / 2);
  const otherTeam = speedballWinner === 'team1' ? 'team2' : 'team1';

  return pairNumber % 2 === 1 ? otherTeam : speedballWinner;
}

function startHalftimeBreak() {
  draftState.halftimeBreakActive = true;
  draftState.halftimeBreakEndsAt = Date.now() + HALFTIME_DURATION_MS;
  draftState.halftimeBreakCompleted = true;

  io.emit('draftState', draftState);

  if (halftimeTimeout) {
    clearTimeout(halftimeTimeout);
  }

  halftimeTimeout = setTimeout(() => {
    draftState.halftimeBreakActive = false;
    draftState.halftimeBreakEndsAt = null;
    io.emit('draftState', draftState);
    halftimeTimeout = null;
  }, HALFTIME_DURATION_MS);
}

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');

  // Send current draft state to newly connected client
  socket.emit('draftState', draftState);

  // Handle speedball winner selection
  socket.on('setSpeedballWinner', (winner) => {
    if (draftState.speedballWinner !== null) {
      socket.emit('error', { message: 'Speedball winner already set' });
      return;
    }

    draftState.speedballWinner = winner;
    draftState.currentPickNumber = 1;
    draftState.currentTeam = getCurrentTeam(1, winner);

    io.emit('draftState', draftState);
  });

  // Handle draft pick
  socket.on('draftPlayer', (data) => {
    const { player } = data;

    if (!draftState.speedballWinner) {
      socket.emit('error', { message: 'Must select speedball winner first' });
      return;
    }

    if (draftState.halftimeBreakActive) {
      socket.emit('error', { message: 'Halftime break in progress. Wait for the timer to finish.' });
      return;
    }

    const team = draftState.currentTeam;

    const playerIndex = draftState.availablePlayers.indexOf(player);
    if (playerIndex === -1) {
      socket.emit('error', { message: 'Player not available' });
      return;
    }

    draftState.availablePlayers.splice(playerIndex, 1);

    if (team === 'team1') {
      draftState.team1.players.push(player);
    } else if (team === 'team2') {
      draftState.team2.players.push(player);
    }

    draftState.draftHistory.push({ player, team });

    draftState.currentPickNumber++;
    draftState.currentTeam = getCurrentTeam(draftState.currentPickNumber, draftState.speedballWinner);

    if (!draftState.halftimeBreakCompleted && draftState.draftHistory.length === HALFTIME_PICK) {
      startHalftimeBreak();
      return;
    }

    io.emit('draftState', draftState);
  });

  // Handle undo last pick
  socket.on('undoLastPick', () => {
    if (draftState.halftimeBreakActive) {
      socket.emit('error', { message: 'Cannot undo during halftime break.' });
      return;
    }

    if (draftState.draftHistory.length === 0) {
      socket.emit('error', { message: 'No picks to undo' });
      return;
    }

    const lastPick = draftState.draftHistory.pop();
    const { player, team } = lastPick;

    if (team === 'team1') {
      const index = draftState.team1.players.indexOf(player);
      if (index > -1) {
        draftState.team1.players.splice(index, 1);
      }
    } else if (team === 'team2') {
      const index = draftState.team2.players.indexOf(player);
      if (index > -1) {
        draftState.team2.players.splice(index, 1);
      }
    }

    draftState.availablePlayers.push(player);
    draftState.availablePlayers.sort();

    draftState.currentPickNumber--;
    draftState.currentTeam = getCurrentTeam(draftState.currentPickNumber, draftState.speedballWinner);

    io.emit('draftState', draftState);
  });

  // Handle draft reset
  socket.on('resetDraft', () => {
    if (halftimeTimeout) {
      clearTimeout(halftimeTimeout);
      halftimeTimeout = null;
    }

    draftState = createInitialDraftState();
    io.emit('draftState', draftState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
