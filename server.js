const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Node.js 18+ incluye globalmente fetch

const port = process.env.PORT || 3000;

// Mapas para almacenar clientes y juegos
const clients = new Map();
const clientsMap = new Map(); // Para identificar clientes por WebSocket
const activeGames = new Map();
const pendingInvites = new Map();
const waitingForGame = new Map(); // Para almacenar usuarios esperando partida sin invitación

// Actividades de respaldo en caso de que la API falle
const fallbackActivities = [
  "Dar un paseo por el parque",
  "Aprender una nueva receta",
  "Leer un libro",
  "Ver una película documental",
  "Hacer ejercicio durante 30 minutos"
];

// Citas de respaldo en caso de que las APIs fallen
const fallbackQuotes = [
  { quote: "La vida es lo que pasa mientras estás ocupado haciendo otros planes.", author: "John Lennon" },
  { quote: "El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el valor para continuar.", author: "Winston Churchill" },
  { quote: "La mejor forma de predecir el futuro es creándolo.", author: "Peter Drucker" },
  { quote: "No es la especie más fuerte la que sobrevive, ni la más inteligente, sino la que mejor responde al cambio.", author: "Charles Darwin" },
  { quote: "La innovación distingue a un líder de un seguidor.", author: "Steve Jobs" }
];

// Chistes de respaldo en caso de que la API falle
const fallbackJokes = [
  "¿Por qué los programadores prefieren el frío? Porque odian los calentamientos.",
  "¿Cómo se llama un montón de gatos? Un MEOWntaña.",
  "¿Qué hace una abeja en el gimnasio? Zum-ba!",
  "¿Por qué el libro de matemáticas estaba triste? Porque tenía muchos problemas.",
  "Si un pez lucha contra un pulpo, ¿qué tiene? Una pelea de ocho contundentes."
];

// Datos para el juego piedra, papel o tijera
const gameInvitations = new Map(); // Invitaciones pendientes: {inviterId: {inviteeId, timestamp}}

// Funciones para enviar mensajes
function broadcastToUser(ws, from, message, emoji) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'chat',
      from,
      message,
      emoji,
      timestamp: new Date().toISOString()
    }));
  }
}

function broadcast(from, message, emoji) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'chat',
        from,
        message,
        emoji,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

wss.on('connection', ws => {
  console.log('Nueva conexión establecida');
  const clientId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  clientsMap.set(ws, clientId);
  
  ws.on('message', async raw => {
    let msg;
    try {
      msg = JSON.parse(raw);
      console.log('Mensaje recibido:', msg);
    } catch (err) {
      console.error('Error al parsear mensaje:', err);
      return;
    }

    if (msg.type === 'chat') {
      const text = msg.text.trim().toLowerCase();
      const user = msg.user;
      const emoji = msg.emoji || '😊'; // Extraer el emoji del mensaje o usar el predeterminado
      console.log(`Comando o mensaje recibido de ${emoji} ${user}: "${text}"`);

      // Comando /joke - Obtener un chiste
      if (text === '/joke') {
        console.log('Procesando comando /joke de', user);
        try {
          const res = await fetch('https://v2.jokeapi.dev/joke/Programming,Miscellaneous,Pun?blacklistFlags=nsfw,religious,political,racist,sexist&type=single');
          const data = await res.json();
          
          if (data && data.joke) {
            broadcast(user, `😂 ${data.joke}`, emoji);
          } else {
            const fallbackJoke = fallbackJokes[Math.floor(Math.random() * fallbackJokes.length)];
            broadcast(user, `😂 ${fallbackJoke}`, emoji);
          }
        } catch (err) {
          console.error('Error al obtener chiste:', err);
          const fallbackJoke = fallbackJokes[Math.floor(Math.random() * fallbackJokes.length)];
          broadcast(user, `😂 ${fallbackJoke}`, emoji);
        }
        return; // Terminar el procesamiento para este comando
      }

      // Comando /quote - Obtener una cita inspiradora
      if (text === '/quote') {
        console.log('Procesando comando /quote de', user);
        try {
          const res = await fetch('https://api.quotable.io/random');
          const data = await res.json();
          
          if (data && data.content && data.author) {
            broadcast(user, `📜 "${data.content}" - ${data.author}`, emoji);
          } else {
            const fallbackQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            broadcast(user, `📜 "${fallbackQuote.quote}" - ${fallbackQuote.author}`, emoji);
          }
        } catch (err) {
          console.error('Error al obtener cita:', err);
          const fallbackQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
          broadcast(user, `📜 "${fallbackQuote.quote}" - ${fallbackQuote.author}`, emoji);
        }
        return; // Terminar el procesamiento para este comando
      }

      // Comando /cat - Obtener un GIF de gato
      if (text === '/cat') {
        console.log('Procesando comando /cat de', user);
        try {
          const res = await fetch('https://api.thecatapi.com/v1/images/search?mime_types=gif');
          const data = await res.json();
          
          if (data && data[0] && data[0].url) {
            broadcast(user, `
              <div class="text-center">
                <img src="${data[0].url}" alt="Cat GIF" style="max-width: 300px; max-height: 300px;" class="img-fluid rounded">
              </div>
            `, emoji);
          } else {
            broadcast(user, `🐱 Lo siento, no pude obtener un GIF de gato en este momento.`, emoji);
          }
        } catch (err) {
          console.error('Error al obtener GIF de gato:', err);
          broadcast(user, `🐱 Lo siento, no pude obtener un GIF de gato en este momento.`, emoji);
        }
        return; // Terminar el procesamiento para este comando
      }

      // Comando /ppt - Piedra, Papel o Tijera
      if (text === '/ppt') {
        console.log('Procesando comando /ppt de', user);
        
        // Registrar al cliente con su nombre de usuario
        clients.set(user, ws);
        
        // Si hay otro jugador esperando, emparejar y comenzar juego
        if (waitingForGame.size > 0) {
          // Encontrar un oponente que no sea el mismo jugador
          let opponent = null;
          for (const [waitingUser, waitingWs] of waitingForGame.entries()) {
        if (waitingUser !== user) {
          opponent = waitingUser;
          break;
        }
          }
          
          if (opponent) {
        const opponentWs = waitingForGame.get(opponent);
        waitingForGame.delete(opponent);
        
        // Crear un ID único para este juego
        const gameId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        // Inicializar el juego
        activeGames.set(gameId, {
          players: [
            { name: user, ws: ws, score: 0, choice: null },
            { name: opponent, ws: opponentWs, score: 0, choice: null }
          ],
          round: 1,
          maxRounds: 3
        });
        
        // Enviar notificación a ambos jugadores
        broadcastToUser(ws, 'Sistema', `
          ¡Oponente encontrado! Comienza el mejor de 3 contra <strong>${opponent}</strong>.
          Ronda 1 / 3: elige tu jugada:
          <div class="game-controls mt-2">
            <button onclick="makeGameChoice('${gameId}', 'piedra')" class="btn btn-light game-btn">✊ Piedra</button>
            <button onclick="makeGameChoice('${gameId}', 'papel')" class="btn btn-light game-btn">✋ Papel</button>
            <button onclick="makeGameChoice('${gameId}', 'tijera')" class="btn btn-light game-btn">✌️ Tijera</button>
          </div>
        `, '🎲');
        
        broadcastToUser(opponentWs, 'Sistema', `
          ¡Oponente encontrado! Comienza el mejor de 3 contra <strong>${user}</strong>.
          Ronda 1 / 3: elige tu jugada:
          <div class="game-controls mt-2">
            <button onclick="makeGameChoice('${gameId}', 'piedra')" class="btn btn-light game-btn">✊ Piedra</button>
            <button onclick="makeGameChoice('${gameId}', 'papel')" class="btn btn-light game-btn">✋ Papel</button>
            <button onclick="makeGameChoice('${gameId}', 'tijera')" class="btn btn-light game-btn">✌️ Tijera</button>
          </div>
        `, '🎲');
          } else {
        // No hay oponentes disponibles, agregar a la cola de espera
        waitingForGame.set(user, ws);
        broadcastToUser(ws, 'Sistema', `
          <div class="text-center game-search">
            <p>🔎 ${user}, buscando oponente para "…Piedra, Papel o Tijera" (Mejor de 3)…</p>
            <button onclick="cancelGameSearch()" class="btn btn-warning btn-sm">❌ Cancelar búsqueda</button>
          </div>
        `, '🎲');
          }
        } else {
          // No hay otros jugadores esperando, añadir a la cola de espera
          waitingForGame.set(user, ws);
          broadcastToUser(ws, 'Sistema', `
        <div class="text-center game-search">
          <p>🔎 ${user}, buscando oponente para "…Piedra, Papel o Tijera" (Mejor de 3)…</p>
          <button onclick="cancelGameSearch()" class="btn btn-warning btn-sm">❌ Cancelar búsqueda</button>
        </div>
          `, '🎲');
        }
        return; // Terminar el procesamiento para este comando
      }

      // Comando /activity: Bored API con fallback
      if (text === '/activity') {
        console.log('Procesando comando /activity de', user);
        try {
          const res = await fetch('https://www.boredapi.com/api/activity');
          const data = await res.json();
          
          if (data && data.activity) {
            // Mostrar solo la actividad sugerida, sin preguntarle al usuario si repite
            broadcast(user, `🎲 Actividad sugerida: ${data.activity}`, emoji);
          } else {
            const fallbackActivity = fallbackActivities[Math.floor(Math.random() * fallbackActivities.length)];
            // Mostrar solo la actividad sugerida, sin preguntarle al usuario si repite
            broadcast(user, `🎲 Actividad sugerida: ${fallbackActivity}`, emoji);
          }
        } catch (err) {
          console.error('Error al obtener actividad:', err);
          // Usar una actividad de respaldo cuando hay un error
          const fallbackActivity = fallbackActivities[Math.floor(Math.random() * fallbackActivities.length)];
          try {
            // Mostrar solo la actividad sugerida, sin preguntarle al usuario si repite
            broadcast(user, `🎲 Actividad sugerida: ${fallbackActivity}`, emoji);
          } catch (broadcastErr) {
            console.error('Error al enviar mensaje de respaldo:', broadcastErr);
          }
        }
        return; // Terminar el procesamiento para este comando
      }
      
      // Comando /ppt-cancel – quitar de la cola de espera
      else if (text === '/ppt-cancel') {
        if (waitingForGame.has(user)) {
          waitingForGame.delete(user);
          ws.send(JSON.stringify({
            type: 'chat',
            from: 'Sistema',
            message: '❌ Has cancelado la búsqueda de oponente.',
            emoji: '🎲'
          }));
        }
      }
    }

    if (msg.type === 'game-invite-accepted') {
      const { gameId, action } = msg;
      const inviterWs = clients.get(action.inviterId);
      
      // Recuperamos el estado del juego para usar sus valores
      const game = activeGames.get(gameId);
      
      // Notificar a ambos jugadores
      broadcastToUser(inviterWs, 'Sistema', `
        ¡${action.playerName} aceptó tu invitación! Ronda ${game.round} de ${game.maxRounds}. Elige tu jugada:
        <div class="game-controls mt-2">
          <button onclick="makeGameChoice('${gameId}', 'piedra')" class="btn btn-light game-btn">✊ Piedra</button>
          <button onclick="makeGameChoice('${gameId}', 'papel')" class="btn btn-light game-btn">✋ Papel</button>
          <button onclick="makeGameChoice('${gameId}', 'tijera')" class="btn btn-light game-btn">✌️ Tijera</button>
        </div>
      `, '🎲');
      
      broadcastToUser(ws, 'Sistema', `
        ¡Has aceptado jugar contra ${action.inviterName}! Ronda ${game.round} de ${game.maxRounds}. Elige tu jugada:
        <div class="game-controls mt-2">
          <button onclick="makeGameChoice('${gameId}', 'piedra')" class="btn btn-light game-btn">✊ Piedra</button>
          <button onclick="makeGameChoice('${gameId}', 'papel')" class="btn btn-light game-btn">✋ Papel</button>
          <button onclick="makeGameChoice('${gameId}', 'tijera')" class="btn btn-light game-btn">✌️ Tijera</button>
        </div>
      `, '🎲');
    }

    // Procesar la elección en el juego de Piedra, Papel o Tijera
    if (msg.type === 'game-choice') {
      const { gameId, choice, playerName } = msg;
      const game = activeGames.get(gameId);
      
      if (game) {
        // Registrar la elección del jugador
        const playerIndex = game.players.findIndex(p => p.name === playerName);
        
        if (playerIndex !== -1) {
          game.players[playerIndex].choice = choice;
          
          // Enviar mensaje de confirmación al jugador que ha hecho su elección
          const choiceEmojis = {
            piedra: '✊',
            papel: '✋',
            tijera: '✌️'
          };
          
          broadcastToUser(game.players[playerIndex].ws, 'Sistema', `
            Has elegido: ${choiceEmojis[choice]}
            Esperando a que tu oponente realice su elección...
          `, '🎲');
          
          // Verificar si ambos jugadores han hecho su elección
          const allPlayersChosen = game.players.every(player => player.choice !== null);
          
          if (allPlayersChosen) {
            const player1 = game.players[0];
            const player2 = game.players[1];
            
            // Determinar ganador de la ronda
            let roundResult;
            if (player1.choice === player2.choice) {
              roundResult = 'empate';
            } else if (
              (player1.choice === 'piedra' && player2.choice === 'tijera') ||
              (player1.choice === 'papel' && player2.choice === 'piedra') ||
              (player1.choice === 'tijera' && player2.choice === 'papel')
            ) {
              roundResult = 'jugador1';
              player1.score++;
            } else {
              roundResult = 'jugador2';
              player2.score++;
            }
            
            // Convertir elecciones a emojis para mostrar
            const choiceEmojis = {
              piedra: '✊',
              papel: '✋',
              tijera: '✌️'
            };
            
            // Enviar resultado a ambos jugadores
            const roundMessage = `
              Ronda ${game.round}:
              ${player1.name} eligió ${choiceEmojis[player1.choice]}
              ${player2.name} eligió ${choiceEmojis[player2.choice]}
              ${roundResult === 'empate' ? '🤝 ¡Empate!' : 
                roundResult === 'jugador1' ? `🏆 ¡${player1.name} gana esta ronda!` : 
                `🏆 ¡${player2.name} gana esta ronda!`}
              
              Puntuación: ${player1.name} ${player1.score} - ${player2.score} ${player2.name}
            `;
            
            broadcastToUser(player1.ws, 'Sistema', roundMessage, '🎲');
            broadcastToUser(player2.ws, 'Sistema', roundMessage, '🎲');
            
            game.round++;
            
            // Verificar si el juego ha terminado
            if (game.round > game.maxRounds || player1.score > game.maxRounds/2 || player2.score > game.maxRounds/2) {
              // Juego terminado, mostrar resultado final
              let gameWinner;
              if (player1.score === player2.score) {
              gameWinner = 'empate';
              } else if (player1.score > player2.score) {
              gameWinner = player1.name;
              } else {
              gameWinner = player2.name;
              }
              
              const gameResultTie = `🏆 Partida finalizada: <strong>¡Empate!</strong> ${player1.score} – ${player2.score}.`;
              const gameResultWinner = `🏆 ¡Has ganado la partida! Resultado final: ${player1.score} – ${player2.score}.`;
              const gameResultLoser = `😔 Has perdido la partida. Resultado final: ${player1.score} – ${player2.score}.`;
              
              const finalMessageBase = `
              <div class="text-center mt-2">
                <button onclick="sendMessage('/ppt')" class="btn btn-success btn-sm">🔄 Volver a jugar</button>
              </div>
              `;
              
              if (gameWinner === 'empate') {
              // En caso de empate, ambos reciben el mismo mensaje
              broadcastToUser(player1.ws, 'Sistema', gameResultTie + finalMessageBase, '🎲');
              broadcastToUser(player2.ws, 'Sistema', gameResultTie + finalMessageBase, '🎲');
              } else if (gameWinner === player1.name) {
              // Player1 ganó
              broadcastToUser(player1.ws, 'Sistema', gameResultWinner + finalMessageBase, '🎲');
              broadcastToUser(player2.ws, 'Sistema', gameResultLoser + finalMessageBase, '🎲');
              } else {
              // Player2 ganó
              broadcastToUser(player1.ws, 'Sistema', gameResultLoser + finalMessageBase, '🎲');
              broadcastToUser(player2.ws, 'Sistema', gameResultWinner + finalMessageBase, '🎲');
              }
              
              // Eliminar el juego
              activeGames.delete(gameId);
            } else {
              // Preparar para la siguiente ronda
              player1.choice = null;
              player2.choice = null;
              
              const nextRoundMessage = `
                Ronda ${game.round} de ${game.maxRounds}. Elige tu jugada:
                <div class="game-controls mt-2">
                  <button onclick="makeGameChoice('${gameId}', 'piedra')" class="btn btn-light game-btn">✊ Piedra</button>
                  <button onclick="makeGameChoice('${gameId}', 'papel')" class="btn btn-light game-btn">✋ Papel</button>
                  <button onclick="makeGameChoice('${gameId}', 'tijera')" class="btn btn-light game-btn">✌️ Tijera</button>
                </div>
              `;
              
              broadcastToUser(player1.ws, 'Sistema', nextRoundMessage, '🎲');
              broadcastToUser(player2.ws, 'Sistema', nextRoundMessage, '🎲');
            }
          }
        }
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});