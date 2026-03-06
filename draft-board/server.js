const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initial draft state
let draftState = {
  availablePlayers: [
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
  ],
  team1: {
    name: "Thomas & Kobe",
    players: []
  },
  team2: {
    name: "Nick & Cam",
    players: []
  },
  draftHistory: [], // Track picks for undo functionality
  speedballWinner: null, // Which team won speedball (gets first pick)
  currentPickNumber: 0, // Current pick in the draft (0 = not started)
  currentTeam: null // Which team's turn it is
};

// Calculate whose turn it is based on snake draft
function getCurrentTeam(pickNumber, speedballWinner) {
  if (pickNumber === 0) return null;
  
  // Snake draft pattern: 1, 2-2, 2-2, 2-2...
  // Pick 1: speedball winner
  // Picks 2-3: other team
  // Picks 4-5: speedball winner
  // Picks 6-7: other team
  // And so on...
  
  if (pickNumber === 1) {
    return speedballWinner;
  }
  
  // For picks 2+, determine the round
  const adjustedPick = pickNumber - 1; // picks 2+ become 1+
  const pairNumber = Math.ceil(adjustedPick / 2); // which pair (1st pair, 2nd pair, etc.)
  
  // Odd pairs go to the team that didn't win speedball, even pairs to winner
  const otherTeam = speedballWinner === 'team1' ? 'team2' : 'team1';
  
  if (pairNumber % 2 === 1) {
    return otherTeam;
  } else {
    return speedballWinner;
  }
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
    
    // Check if draft has started
    if (!draftState.speedballWinner) {
      socket.emit('error', { message: 'Must select speedball winner first' });
      return;
    }
    
    const team = draftState.currentTeam;
    
    // Check if player is available
    const playerIndex = draftState.availablePlayers.indexOf(player);
    if (playerIndex === -1) {
      socket.emit('error', { message: 'Player not available' });
      return;
    }
    
    // Remove player from available list
    draftState.availablePlayers.splice(playerIndex, 1);
    
    // Add player to selected team
    if (team === 'team1') {
      draftState.team1.players.push(player);
    } else if (team === 'team2') {
      draftState.team2.players.push(player);
    }
    
    // Add to history for undo
    draftState.draftHistory.push({ player, team });
    
    // Move to next pick
    draftState.currentPickNumber++;
    draftState.currentTeam = getCurrentTeam(draftState.currentPickNumber, draftState.speedballWinner);
    
    // Broadcast updated state to all clients
    io.emit('draftState', draftState);
  });
  
  // Handle undo last pick
  socket.on('undoLastPick', () => {
    if (draftState.draftHistory.length === 0) {
      socket.emit('error', { message: 'No picks to undo' });
      return;
    }
    
    // Get last pick
    const lastPick = draftState.draftHistory.pop();
    const { player, team } = lastPick;
    
    // Remove player from team
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
    
    // Add player back to available list
    draftState.availablePlayers.push(player);
    draftState.availablePlayers.sort(); // Keep alphabetically sorted
    
    // Move back one pick
    draftState.currentPickNumber--;
    draftState.currentTeam = getCurrentTeam(draftState.currentPickNumber, draftState.speedballWinner);
    
    // Broadcast updated state to all clients
    io.emit('draftState', draftState);
  });
  
  // Handle draft reset
  socket.on('resetDraft', () => {
    // Reset to initial state
    draftState = {
      availablePlayers: [
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
      ],
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
      currentTeam: null
    };
    
    // Broadcast reset state to all clients
    io.emit('draftState', draftState);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
