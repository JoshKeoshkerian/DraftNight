// Initialize Socket.io connection
const socket = io();

// DOM elements
const speedballScreen = document.getElementById('speedballScreen');
const draftBoard = document.getElementById('draftBoard');
const selectedPlayerDisplay = document.getElementById('selectedPlayerDisplay');
const undoBtn = document.getElementById('undoBtn');
const resetBtn = document.getElementById('resetBtn');
const availablePlayersEl = document.getElementById('availablePlayers');
const team1PlayersEl = document.getElementById('team1Players');
const team2PlayersEl = document.getElementById('team2Players');
const statusEl = document.getElementById('status');
const currentPickBanner = document.getElementById('currentPickBanner');

let lastPickedPlayer = null;
let selectedPlayer = null;

// Use explicit filenames when a player's uploaded image doesn't match the slug format.
const PLAYER_IMAGE_MAP = {
  'Jack Oliver': 'jack.png',
  'Kris': 'kris.png'
};

function getPlayerImagePath(player) {
  const mappedFile = PLAYER_IMAGE_MAP[player];
  if (mappedFile) {
    return `/images/${mappedFile}`;
  }

  const slug = player.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `/images/${slug}.png`;
}

function getPlayerInitials(player) {
  return player
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// Select speedball winner
function selectSpeedballWinner(team) {
  socket.emit('setSpeedballWinner', team);
}

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
  
  // Show draft board if speedball winner is selected
  if (draftState.speedballWinner) {
    speedballScreen.classList.add('hidden');
    draftBoard.classList.remove('hidden');
    updateCurrentPickBanner(draftState);
  } else {
    // Show speedball screen when reset
    speedballScreen.classList.remove('hidden');
    draftBoard.classList.add('hidden');
  }
  
  updateUI(draftState);
});

// Handle errors
socket.on('error', (error) => {
  alert(error.message);
});

// Update current pick banner
function updateCurrentPickBanner(draftState) {
  if (!draftState.currentTeam) {
    currentPickBanner.textContent = 'Draft Complete! 🎉';
    currentPickBanner.style.background = 'rgba(40, 167, 69, 0.3)';
    currentPickBanner.style.borderColor = '#28a745';
    return;
  }
  
  const teamName = draftState.currentTeam === 'team1' 
    ? 'Thomas & Kobe' 
    : 'Nick & Cam';
  const color = draftState.currentTeam === 'team1' ? '#007bff' : '#fd7e14';
  
  currentPickBanner.textContent = `Pick #${draftState.currentPickNumber} - ${teamName}'s Turn`;
  currentPickBanner.style.borderColor = color;
}

// Update UI with current draft state
function updateUI(draftState) {
  // Update available players
  availablePlayersEl.innerHTML = '';

  if (selectedPlayer && !draftState.availablePlayers.includes(selectedPlayer)) {
    selectedPlayer = null;
  }

  selectedPlayerDisplay.textContent = selectedPlayer || 'None';
  
  draftState.availablePlayers.forEach(player => {
    const playerDiv = document.createElement('button');
    playerDiv.type = 'button';
    playerDiv.className = 'player-item';
    if (player === selectedPlayer) {
      playerDiv.classList.add('selected');
    }

    playerDiv.innerHTML = `
      <div class="player-photo-wrap">
        <img class="player-photo" src="${getPlayerImagePath(player)}" alt="${player}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="player-photo-fallback" style="display:none;">${getPlayerInitials(player)}</div>
      </div>
      <div class="player-name">${player}</div>
      <div class="player-draft-overlay">
        <button type="button">Draft</button>
      </div>
    `;
    
    playerDiv.onclick = (e) => {
      e.stopPropagation();
      if (selectedPlayer === player) {
        // If already selected, draft on click
        draftPlayerAction(player);
      } else {
        // Otherwise just select
        selectPlayerFromGrid(player);
      }
    };
    
    availablePlayersEl.appendChild(playerDiv);
  });
  
  // Update Team 1
  team1PlayersEl.innerHTML = '';
  draftState.team1.players.forEach((player, index) => {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-item roster-player';
    playerDiv.innerHTML = `
      <img class="roster-photo" src="${getPlayerImagePath(player)}" alt="${player}" onerror="this.style.display='none';">
      <span>${player}</span>
    `;
    
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
    playerDiv.className = 'player-item roster-player';
    playerDiv.innerHTML = `
      <img class="roster-photo" src="${getPlayerImagePath(player)}" alt="${player}" onerror="this.style.display='none';">
      <span>${player}</span>
    `;
    
    // Highlight most recent pick
    if (index === draftState.team2.players.length - 1 && player === lastPickedPlayer) {
      playerDiv.classList.add('recent-pick');
    }
    
    team2PlayersEl.appendChild(playerDiv);
  });
  
  // Enable/disable undo button
  undoBtn.disabled = draftState.draftHistory.length === 0;
}

// Select player from available photo grid
function selectPlayerFromGrid(player) {
  selectedPlayer = player;
  selectedPlayerDisplay.textContent = player;
}

// Draft the selected player
function draftPlayerAction(player) {
  if (!player) {
    alert('Please select a player');
    return;
  }
  
  // Save last picked player for highlighting
  lastPickedPlayer = player;
  
  // Emit draft event to server
  socket.emit('draftPlayer', { player });
  
  // Reset selection
  selectedPlayer = null;
  selectedPlayerDisplay.textContent = 'None';
}

// Draft player button click
draftBtn.addEventListener('click', () => {
  const player = selectedPlayer;
  
  if (!player) {
    alert('Please select a player card');
    return;
  }
  
  // Save last picked player for highlighting
  lastPickedPlayer = player;
  
  // Emit draft event to server (team is determined automatically)
  socket.emit('draftPlayer', { player });
  
  // Reset selection
  selectedPlayer = null;
  selectedPlayerDisplay.textContent = 'None';
  draftBtn.disabled = true;
});

// Draft player button click
draftBtn.addEventListener('click', () => {
  const player = selectedPlayer;
  
  if (!player) {
    alert('Please select a player card');
    return;
  }
  
  // Save last picked player for highlighting
  lastPickedPlayer = player;
  
  // Emit draft event to server (team is determined automatically)
  socket.emit('draftPlayer', { player });
  
  // Reset selection
  selectedPlayer = null;
  selectedPlayerDisplay.textContent = 'None';
  draftBtn.disabled = true;
});

// Undo last pick button click
undoBtn.addEventListener('click', () => {
  socket.emit('undoLastPick');
  lastPickedPlayer = null;
});

// Reset draft button click
resetBtn.addEventListener('click', () => {
  if (confirm('Are you sure? This will reset the entire draft.')) {
    socket.emit('resetDraft');
    selectedPlayer = null;
    selectedPlayerDisplay.textContent = 'None';
    draftBtn.disabled = true;
  }
});

// Allow Enter key to draft
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && selectedPlayer) {
    draftBtn.click();
  }
});
