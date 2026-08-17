import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import api, { API_URL } from "../api";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const activeConversationRef = useRef(null);
  const [unreadIds, setUnreadIds] = useState(new Set());
  const [newMessageEvent, setNewMessageEvent] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [reactionEvent, setReactionEvent] = useState(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setUnreadIds(new Set());
      setOnlineUsers(new Set());
      return;
    }

    const token = localStorage.getItem("cc_token");
    if (!token) return;

    const socket = io(API_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Global socket connected");
      api.get("/chat").then((res) => {
        res.data.forEach((conv) => {
          socket.emit("join-conversation", conv._id);
        });
      });
    });

    socket.on("conversation-created", ({ conversationId }) => {
      socket.emit("join-conversation", conversationId);
    });

    socket.on("new-message", (msg) => {
      setNewMessageEvent({ ...msg, _receivedAt: Date.now() });
      if (msg.conversation && msg.conversation !== activeConversationRef.current) {
        setUnreadIds((prev) => {
          const next = new Set(prev);
          next.add(msg.conversation);
          return next;
        });
      }
    });

    socket.on("user-online", ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    });

    socket.on("user-offline", ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on("reaction-updated", (data) => {
      setReactionEvent({ ...data, _receivedAt: Date.now() });
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const setActiveConversation = useCallback((conversationId) => {
    activeConversationRef.current = conversationId;
  }, []);

  const markConversationRead = useCallback((conversationId) => {
    setUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(conversationId);
      return next;
    });
  }, []);

  const joinConversation = useCallback((conversationId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-conversation", conversationId);
    }
  }, []);

  const sendMessage = useCallback((conversationId, text, replyTo) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("send-message", { conversationId, text, replyTo });
    }
  }, []);

  const emitTyping = useCallback((conversationId, name) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing", { conversationId, name });
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef,
        unreadIds,
        newMessageEvent,
        onlineUsers,
        reactionEvent,
        setActiveConversation,
        markConversationRead,
        joinConversation,
        sendMessage,
        emitTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
