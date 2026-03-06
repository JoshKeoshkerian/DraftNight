// Initialize Socket.io connection
const socket = io();

// DOM elements
const playerSelect = document.getElementById('playerSelect');
const teamSelect = document.getElementById('teamSelect');
const draftBtn = document.getElementById('draftBtn');
const undoBtn = document.getElementById('undoBtn');
const availablePlayersEl = document.getElementById('availablePlayers');
const team1PlayersEl = document.getElementById('team1Players');
const team2PlayersEl = document.getElementById('team2Players');
const statusEl = document.getElementById('status');

let lastPickedPlayer = null;

// Connection status
socket.on('connect', () => {
  console.log('Connected to server');
  statusEl.textContent = 'Connected';
  statusEl.className = 'status-connected';
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  statusEl.textContent = 'Disconnected';
  statusEl.className = 'status-disconnected';
});

// Receive draft state updates
socket.on('draftState', (draftState) => {
  console.log('Draft state updated:', draftState);
  updateUI(draftState);
});

// Handle errors
socket.on('error', (error) => {
  alert(error.message);
});

// Update UI with current draft state
function updateUI(draftState) {
  // Update available players
  availablePlayersEl.innerHTML = '';
  playerSelect.innerHTML = '<option value="">-- Choose Player --</option>';
  
  draftState.availablePlayers.forEach(player => {
    // Add to visual list
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-item';
    playerDiv.textContent = player;
    playerDiv.onclick = () => selectPlayerFromList(player);
    availablePlayersEl.appendChild(playerDiv);
    
    // Add to dropdown
    const option = document.createElement('option');
    option.value = player;
    option.textContent = player;
    playerSelect.appendChild(option);
  });
  
  // Update Team 1
  team1PlayersEl.innerHTML = '';
  draftState.team1.players.forEach((player, index) => {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-item';
    playerDiv.textContent = player;
    
    // Highlight most recent pick
    if (index === draftState.team1.players.length - 1 && player === lastPickedPlayer) {
      playerDiv.classList.add('recent-pick');
    }
    
    team1PlayersEl.appendChild(playerDiv);
  });
  
  // Update Team 2
  team2PlayersEl.innerHTML = '';
  draftState.team2.players.forEach((player, index) => {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-item';
    playerDiv.textContent = player;
    
    // Highlight most recent pick
    if (index === draftState.team2.players.length - 1 && player === lastPickedPlayer) {
      playerDiv.classList.add('recent-pick');
    }
    
    team2PlayersEl.appendChild(playerDiv);
  });
  
  // Enable/disable undo button
  undoBtn.disabled = draftState.draftHistory.length === 0;
}

// Select player from available list
function selectPlayerFromList(player) {
  playerSelect.value = player;
}

// Draft player button click
draftBtn.addEventListener('click', () => {
  const player = playerSelect.value;
  const team = teamSelect.value;
  
  if (!player) {
    alert('Please select a player');
    return;
  }
  
  if (!team) {
    alert('Please select a team');
    return;
  }
  
  // Save last picked player for highlighting
  lastPickedPlayer = player;
  
  // Emit draft event to server
  socket.emit('draftPlayer', { player, team });
  
  // Reset selections
  playerSelect.value = '';
  teamSelect.value = '';
});

// Undo last pick button click
undoBtn.addEventListener('click', () => {
  socket.emit('undoLastPick');
  lastPickedPlayer = null;
});

// Allow Enter key to draft
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && playerSelect.value && teamSelect.value) {
    draftBtn.click();
  }
});
