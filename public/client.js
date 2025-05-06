const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
const chat = document.getElementById('chat');
const usernameInput = document.getElementById('username');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const jokeBtn = document.getElementById('jokeBtn');
const quoteBtn = document.getElementById('quoteBtn');
const activityBtn = document.getElementById('activityBtn');
const catBtn = document.getElementById('catBtn');
const pptBtn = document.getElementById('pptBtn'); // Botón para piedra, papel o tijera
const userEmojiDisplay = document.getElementById('userEmojiDisplay');

// Elementos de la pantalla de inicio
const loginScreen = document.getElementById('loginScreen');
const loginUsername = document.getElementById('loginUsername');
const userEmoji = document.getElementById('userEmoji');
const enterChatBtn = document.getElementById('enterChatBtn');
const loginError = document.getElementById('loginError');
const chatInterface = document.getElementById('chatInterface');
const emojiOptions = document.querySelectorAll('.emoji-option');

// Enfocar el campo de nombre al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  loginUsername.focus();
  
  // Configurar selectores de emoji
  emojiOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Quitar la selección anterior
      document.querySelector('.emoji-option.selected').classList.remove('selected');
      // Seleccionar el nuevo emoji
      option.classList.add('selected');
      // Almacenar el emoji seleccionado
      userEmoji.value = option.getAttribute('data-emoji');
    });
  });
});

// Manejar el ingreso al chat
function enterChat() {
  const username = loginUsername.value.trim();
  
  if (username.length < 2) {
    loginError.classList.remove('d-none');
    loginUsername.classList.add('is-invalid');
    return;
  }
  
  // Establecer el nombre de usuario y emoji en la interfaz principal
  usernameInput.textContent = username;
  userEmojiDisplay.textContent = userEmoji.value;
  
  // Ocultar la pantalla de inicio y mostrar el chat
  loginScreen.classList.add('hidden');
  setTimeout(() => {
    loginScreen.style.display = 'none';
    chatInterface.classList.add('chat-visible');
    textInput.focus();
  }, 500);
}

// Event listeners para la pantalla de inicio
enterChatBtn.addEventListener('click', enterChat);
loginUsername.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    enterChat();
  }
});

loginUsername.addEventListener('input', () => {
  if (loginUsername.value.trim().length >= 2) {
    loginError.classList.add('d-none');
    loginUsername.classList.remove('is-invalid');
  }
});

// Event listeners para la interfaz del chat
sendBtn.addEventListener('click', sendMessage);
textInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

// Añadir event listeners para los botones de comandos
jokeBtn.addEventListener('click', () => sendCommand('/joke'));
quoteBtn.addEventListener('click', () => sendCommand('/quote'));
activityBtn.addEventListener('click', () => sendCommand('/activity'));
catBtn.addEventListener('click', () => sendCommand('/cat'));

// Botón piedra-papel-tijera
pptBtn.addEventListener('click', () => {
  // Solo enviamos la petición; el servidor mostrará el estado de búsqueda
  sendCommand('/ppt');
});

function sendMessage() {
  const text = textInput.value.trim();
  const user = usernameInput.textContent.trim();
  const emoji = userEmoji.value;
  
  if (!text) return;
  
  ws.send(JSON.stringify({ 
    type: 'chat', 
    user, 
    text,
    emoji
  }));
  
  textInput.value = '';
  
  // Mostrar el mensaje propio inmediatamente con un estilo diferente
  if (!text.startsWith('/')) { // No mostrar comandos
    addMessage(user, text, 'message-received', emoji);
  }
}

// Función para enviar comandos directamente sin mostrar mensaje de sistema
function sendCommand(command) {
  const user = usernameInput.textContent.trim();
  const emoji = userEmoji.value;
  ws.send(JSON.stringify({ 
    type: 'chat', 
    user, 
    text: command,
    emoji
  }));
}

// Función para añadir mensajes al chat con formato
function addMessage(user, text, messageClass = 'message-user', emoji = '😊') {
  const div = document.createElement('div');
  div.classList.add('message', 'd-flex');
  const isSpecialCommand = text.startsWith('🚀 Actividad:') || 
                          text.startsWith('🤣 Chiste:') || 
                          text.startsWith('💭 Cita:') || 
                          text.startsWith('<img src=');
  
  // Determinar si el mensaje es propio o recibido
  const isOwnMessage = user === (usernameInput.textContent.trim() || 'Anónimo');
  
  // Establecer la alineación según si el mensaje es propio
  if (isOwnMessage) {
    div.classList.add('justify-content-end');
    messageClass = 'message-received';
  } else {
    div.classList.add('justify-content-start');
  }
  
  // Añadir estilos específicos para los comandos especiales
  if (text.startsWith('🚀 Actividad:')) {
    messageClass += ' activity-message';
  } else if (text.startsWith('🤣 Chiste:')) {
    messageClass += ' joke-message';
  } else if (text.startsWith('💭 Cita:')) {
    messageClass += ' quote-message';
  } else if (text.startsWith('<img src=')) {
    messageClass += ' cat-message';
  } else if (user === 'Sistema') {
    div.classList.remove('justify-content-start', 'justify-content-end');
    div.classList.add('justify-content-center');
    messageClass = 'message-system';
  }
  
  div.innerHTML = `
    <div class="message-content ${messageClass}">
      <div class="message-meta"><strong>${emoji} ${user}</strong></div>
      <div class="message-text">${text}</div>
    </div>
  `;
  
  chat.appendChild(div); 
  chat.scrollTop = chat.scrollHeight;
}

// Función para añadir mensajes de sistema
function addSystemMessage(text) {
  addMessage('Sistema', text, 'message-system', '🤖');
}

ws.addEventListener('message', event => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'getUsername') {
    // Responder con el nombre de usuario (para invitaciones de juego)
    ws.send(JSON.stringify({
      type: 'username',
      username: usernameInput.textContent.trim()
    }));
    return;
  }
  
  if (msg.type === 'chat') {
    const fromMe = msg.from === usernameInput.textContent.trim();
    const isSystem = msg.from === 'Sistema';
    const text = msg.message.trim();

    // 1) Mostrar siempre mensajes de sistema
    if (isSystem) {
      addMessage(msg.from, msg.message, 'message-system', msg.emoji);
      return;
    }

    // 2) Mostrar siempre respuestas de comandos (emoji inicial o HTML)
    if ( text.startsWith('😂')  || text.startsWith('📜') ||
         text.startsWith('<')  || text.startsWith('🎲') ||
         text.startsWith('🎮')  ) {
      addMessage(msg.from, msg.message, undefined, msg.emoji);
      return;
    }

    // 3) Para mensajes "normales" de chat, evitar duplicar el tuyo propio
    if (!fromMe) {
      addMessage(msg.from, msg.message, undefined, msg.emoji);
    }
  }
  
  // Manejo de eventos del juego de piedra, papel o tijera
  if (msg.type === 'game_invite') {
    const inviteMessage = `<div class="game-invite">
      <p>${msg.from} te ha invitado a jugar Piedra, Papel o Tijera</p>
      <button class="btn btn-success btn-sm" onclick="acceptGameInvite('${msg.inviterId}')">Aceptar</button>
      <button class="btn btn-danger btn-sm" onclick="rejectGameInvite('${msg.inviterId}')">Rechazar</button>
    </div>`;
    addMessage('Sistema', inviteMessage, 'message-system');
  }
  
  if (msg.type === 'game_start') {
    const gameInterface = `<div class="game-interface border rounded p-2" id="game-${msg.gameId}">
      <p>🎯 <strong>Mejor de 3</strong> contra ${msg.opponent} — Ronda ${msg.round} / ${msg.maxRounds}</p>
      <div class="game-options">
        <button class="btn btn-light game-btn mx-1" onclick="makeGameChoice('${msg.gameId}', 'piedra')">✊</button>
        <button class="btn btn-light game-btn mx-1" onclick="makeGameChoice('${msg.gameId}', 'papel')">✋</button>
        <button class="btn btn-light game-btn mx-1" onclick="makeGameChoice('${msg.gameId}', 'tijera')">✌️</button>
      </div>
    </div>`;
    addMessage('Sistema', gameInterface, 'message-system');
  }
  
  if (msg.type === 'game_result') {
    let resultText = '';
    if (msg.result === 'win')    resultText = '<p>🎉 ¡Ganaste esta ronda!</p>';
    else if (msg.result === 'lose') resultText = '<p>😞 Esta ronda es para tu oponente.</p>';
    else                         resultText = '<p>🤝 Empate en esta ronda.</p>';
    
    if (msg.playerChoice && msg.opponentChoice) {
      resultText += `<p>Tu elección: ${getChoiceEmoji(msg.playerChoice)} vs. Oponente: ${getChoiceEmoji(msg.opponentChoice)}</p>`;
    }
    
    resultText += `<p>📊 Marcador: Tú ${msg.playerScore} – ${msg.opponentScore} Oponente</p>`;
    
    // Si no terminó todavía, mostrar botón para siguiente ronda
    if (!msg.isFinal) {
      resultText += `<button class="btn btn-primary btn-sm mt-1" onclick="nextRound('${msg.gameId}')">
                       ▶️ Siguiente ronda</button>`;
    }
    
    addMessage('Sistema', resultText, 'message-system');
  }
  
  if (msg.type === 'game_end') {
    const rematch = `<button class="btn btn-success btn-sm mt-2" onclick="sendMessage('/ppt')">
                       🔄 Volver a jugar</button>`;
    addMessage('Sistema', `${msg.message}${rematch}`, 'message-system');
  }
});

// Función para convertir elección en emoji
function getChoiceEmoji(choice) {
  switch(choice) {
    case 'rock': return '✊';
    case 'paper': return '✋';
    case 'scissors': return '✌️';
    case 'piedra': return '✊';
    case 'papel': return '✋';
    case 'tijera': return '✌️';
    default: return choice;
  }
}

// Manejar conexión y desconexión
ws.addEventListener('open', () => {
  console.log('Conectado al servidor de chat');
});

ws.addEventListener('close', () => {
  addSystemMessage('Se ha perdido la conexión con el servidor. Intentando reconectar...');
  // Intentar reconectar después de un breve retraso
  setTimeout(() => {
    window.location.reload();
  }, 3000);
});

ws.addEventListener('error', () => {
  addSystemMessage('Error de conexión. Verifica tu conexión a internet.');
});

// Funciones para el juego de piedra, papel o tijera
function acceptGameInvite(inviterId) {
  const playerName = usernameInput.textContent.trim();
  ws.send(JSON.stringify({ 
    type: 'game_action', 
    action: 'accept_invite',
    inviterId,
    playerName,
    inviterName: 'oponente' // El servidor actualizará esto
  }));
}

function rejectGameInvite(inviterId) {
  const playerName = usernameInput.textContent.trim();
  ws.send(JSON.stringify({ 
    type: 'game_action', 
    action: 'reject_invite',
    inviterId,
    playerName
  }));
}

function makeGameChoice(gameId, choice) {
  const playerName = usernameInput.textContent.trim();
  ws.send(JSON.stringify({ 
    type: 'game-choice',
    gameId,
    choice,
    playerName
  }));
  
  // Deshabilitar botones después de elegir
  const buttons = document.querySelectorAll(`.game-btn`);
  buttons.forEach(button => {
    button.disabled = true;
    button.classList.add('disabled');
  });
}

function rematchGame(gameId) {
  const playerName = usernameInput.textContent.trim();
  ws.send(JSON.stringify({ 
    type: 'game_action', 
    action: 'rematch',
    gameId,
    playerName
  }));
}

// Función para avanzar a la siguiente ronda
function nextRound(gameId) {
  // Simplemente ocultar el mensaje de resultado y esperar la siguiente ronda
  const buttons = document.querySelectorAll(`.game-btn`);
  buttons.forEach(button => {
    button.disabled = false;
    button.classList.remove('disabled');
  });
  
  addSystemMessage('Preparándose para la siguiente ronda...');
}