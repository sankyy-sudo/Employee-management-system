import { io } from "socket.io-client";

const socketUrl = import.meta.env.VITE_SOCKET_URL
  || import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "")
  || "http://localhost:5000";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"]
    });
  }

  return socket;
}

export default getSocket;
