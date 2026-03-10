import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io("http://localhost:5000", {
        transports: ["websocket"],
      });

      newSocket.emit("setup", user._id);

      newSocket.on("user_online", (userId) => {
        setOnlineUsers((prev) => [...new Set([...prev, userId])]);
      });

      newSocket.on("user_offline", (userId) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
