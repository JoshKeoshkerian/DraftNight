# 🥎 Draft Night - Softball Draft Board

A live intramural softball draft board application with real-time updates across multiple browsers.

## Features

- **Live Draft Updates**: Uses WebSockets (Socket.io) to sync draft picks in real-time
- **Two Teams**: Team Thomas & Kobe vs Team Nick & Cam
- **Player Pool**: 20 available players ready to draft
- **Draft Controls**: Easy-to-use dropdowns and buttons
- **Undo Functionality**: Undo the last pick if needed
- **Sports Theme**: Dark background with team-colored panels
- **Highlight Recent Picks**: Latest drafted player is highlighted

## Project Structure

```
/draft-board
  server.js         # Express + Socket.io backend
  package.json      # Dependencies
  /public
      index.html    # Main HTML layout
      style.css     # Draft board styling
      app.js        # Client-side JavaScript
```

## Installation & Setup

1. **Install dependencies:**
   ```bash
   cd draft-board
   npm install
   ```

2. **Start the server:**
   ```bash
   node server.js
   ```

3. **Open in browser:**
   ```
   http://localhost:3000
   ```

4. **Test real-time sync:**
   - Open the same URL in multiple browser windows
   - Draft a player in one window
   - Watch it update instantly in all windows!

## How to Use

1. **Select a Player** from the dropdown (or click on a player in the Available Players column)
2. **Select a Team** - either Team Thomas & Kobe or Team Nick & Cam
3. **Click "Draft Player"** button
4. The player moves to the selected team and updates on all connected browsers
5. Use **"Undo Last Pick"** to reverse the most recent draft

## Tech Stack

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Real-time**: WebSocket connections for live updates

## Default Players

Alex, Ben, Chris, David, Ethan, Frank, George, Henry, Ian, Jack, Kevin, Logan, Matt, Nate, Owen, Paul, Quinn, Ryan, Sam, Tyler

---

Built for Draft Night 🎉
