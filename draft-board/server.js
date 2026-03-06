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
    "Russell",
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
  draftHistory: [] // Track picks for undo functionality
};

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Send current draft state to newly connected client
  socket.emit('draftState', draftState);
  
  // Handle draft pick
  socket.on('draftPlayer', (data) => {
    const { player, team } = data;
    
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
    
    // Broadcast updated state to all clients
    io.emit('draftState', draftState);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
