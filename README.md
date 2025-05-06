# ChatAPI

**ChatAPI** es una aplicación de chat en tiempo real desarrollada con *Node.js*, *Express* y *WebSocket*. Permite a múltiples usuarios conectarse, conversar y disfrutar de funcionalidades interactivas mediante una interfaz moderna e intuitiva.

---

## Funcionalidades principales

- Interfaz responsiva con diseño moderno (usando Bootstrap 5).
- Ingreso personalizado con nombre y emoji.
- Comunicación en tiempo real mediante WebSocket.
- **Botones interactivos** para realizar acciones especiales (en lugar de escribir comandos manualmente).
- Mini-juego de "Piedra, Papel o Tijera" contra otros usuarios.
- Sistema de mensajes clasificados: normales, del sistema, chistes, citas, actividades, e imágenes animadas.

---

## Botones y sus funciones

En lugar de escribir comandos como `/joke` o `/quote`, los usuarios pueden hacer clic en botones para activar estas acciones:

| Botón                   | Acción que realiza                              |
|-------------------------|-------------------------------------------------|
| Chiste                  | Solicita un chiste aleatorio.                   |
| Cita                    | Muestra una cita inspiradora.                   |
| Actividad               | Sugiere una actividad aleatoria.                |
| Gato GIF                | Muestra un GIF animado de gato.                 |
| Piedra, Papel o Tijera  | Inicia una partida de *Piedra, Papel o Tijera*. |

---

## Estructura del proyecto

```
chatAPI/
├── package.json
├── package-lock.json
├── server.js
└── public/
    ├── index.html      ← Interfaz de usuario
    └── client.js       ← Lógica del cliente y WebSocket
```

---

## ▶ Cómo ejecutar el proyecto localmente

1. Clona este repositorio:

   ```bash
   git clone https://github.com/tuusuario/chatAPI.git
   cd chatAPI
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Inicia el servidor:

   ```bash
   npm start
   ```

4. Abre tu navegador y accede a:

   ```
   http://localhost:3000
   ```

---

## Despliegue en la nube

Puedes desplegar esta aplicación en plataformas como:

- **[Railway](https://railway.app/)** Recomendado por su simplicidad y soporte WebSocket.
- **[Render](https://render.com/)** también es compatible.
- **VPS/Docker** si tienes un entorno propio.

---

## Requisitos

- Node.js 18+
- Navegador moderno compatible con WebSocket

---

## Licencia

Este proyecto está licenciado bajo la MIT License.

Desarrollado por [Mateo](https://github.com/mateoabrah)