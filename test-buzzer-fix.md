# Buzzer Lock/Unlock Fix

## Problem Found
When moving to the next question or starting a game, the host was clearing the local `buzzerLockedPlayers` state but **NOT** emitting an `unlock-buzzers` event to the clients. This caused clients to remain locked even though the host UI showed them as unlocked.

## Changes Made

### 1. QuizHost.jsx - startGame() function (lines 168-172)
Added `unlock-buzzers` socket emission when starting the game:
```javascript
// Unlock all buzzers for clients
socket.emit('unlock-buzzers', {
  roomCode: joinCode,
  playerIds: 'all'
})
```

### 2. QuizHost.jsx - nextQuestion() function (lines 190-194)
Added `unlock-buzzers` socket emission when moving to next question:
```javascript
// Unlock all buzzers for clients
socket.emit('unlock-buzzers', {
  roomCode: joinCode,
  playerIds: 'all'
})
```

## Manual Test Steps

1. Start local server: `npm run dev` (port 5173)
2. Start backend: `node server/local-server.js` (port 3000)
3. Open Host window: http://localhost:5173/create
4. Create a Buzzer quiz with 3 questions
5. Open 2 User windows (different browsers/incognito):
   - User1: http://localhost:5173/join
   - User2: http://localhost:5173/join
6. Both users join with the quiz code
7. Host starts the game
8. **Test 1**: User1 presses buzzer
   - ✅ User1 should be locked (button disabled)
   - ✅ Host shows User1 as "🔒 Gesperrt"
   - ✅ User2 can still buzz
9. **Test 2**: Host clicks "Freigeben" next to User1
   - ✅ User1 buzzer should be unlocked (button enabled again)
   - ✅ Host shows User1 as "✓ Frei"
10. **Test 3**: Both users press buzzer
    - ✅ Both should be locked
    - ✅ Host shows both as "🔒 Gesperrt"
11. **Test 4**: Host clicks "Alle freigeben"
    - ✅ Both buzzers should be unlocked
    - ✅ Host shows both as "✓ Frei"
12. **Test 5**: Both users press buzzer again
    - ✅ Both should be locked
13. **Test 6**: Host clicks "Nächste Frage"
    - ✅ Both buzzers should automatically unlock (**THIS WAS THE BUG!**)
    - ✅ Users can press buzzer on the new question
    - ✅ Host shows both as "✓ Frei"

## Expected Behavior After Fix

- ✅ Buzzers unlock automatically when starting the game
- ✅ Buzzers unlock automatically when moving to the next question
- ✅ Buzzers unlock when host clicks "Alle freigeben"
- ✅ Individual buzzers unlock when host clicks "Freigeben" next to a player
- ✅ Host UI always matches client buzzer state
