import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { API_URL, cropStyle } from "../api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "😍", "🎉", "🤔", "👀"];

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

export default function Chat() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    joinConversation,
    sendMessage: socketSend,
    emitTyping,
    newMessageEvent,
    onlineUsers,
    reactionEvent,
    setActiveConversation,
    markConversationRead,
  } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [sendingImage, setSendingImage] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const conversationIdRef = useRef(conversationId);

  const activeConv = conversations.find((c) => c._id === conversationId);
  const otherUser = activeConv?.participants?.find((p) => p._id !== user?.id);
  const isOnline = otherUser && onlineUsers.has(otherUser._id);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Confetti on fun emojis
  const spawnConfetti = useCallback(() => {
    const id = Date.now();
    const pieces = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.4,
      color: ["#f4a300", "#ff6b57", "#7fb069", "#c9c2e8", "#4ea8de"][i % 5],
    }));
    setConfetti((prev) => [...prev, { id, pieces }]);
    setTimeout(() => setConfetti((prev) => prev.filter((c) => c.id !== id)), 2500);
  }, []);

  const CONFETTI_EMOJIS = ["🎉", "🥳", "🎊", "🎉", "❤️", "🔥", "😍", "💪"];

  // Tell socket which conversation is active, mark as read
  useEffect(() => {
    setActiveConversation(conversationId || null);
    if (conversationId) {
      markConversationRead(conversationId);
    }
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation, markConversationRead]);

  // Load conversations and join all rooms
  const loadConversations = () => {
    api.get("/chat").then((res) => {
      setConversations(res.data);
      res.data.forEach((conv) => joinConversation(conv._id));
    });
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Handle incoming socket messages
  useEffect(() => {
    if (!newMessageEvent) return;
    const msg = newMessageEvent;

    if (msg.conversation === conversationIdRef.current) {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      // Check for confetti emojis
      if (msg.text && CONFETTI_EMOJIS.some((e) => msg.text.includes(e))) {
        spawnConfetti();
      }
    }

    loadConversations();
  }, [newMessageEvent, spawnConfetti]);

  // Handle reaction updates
  useEffect(() => {
    if (!reactionEvent) return;
    setMessages((prev) =>
      prev.map((m) =>
        m._id === reactionEvent.messageId
          ? { ...m, reactions: reactionEvent.reactions }
          : m
      )
    );
  }, [reactionEvent]);

  // Load messages + join room when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setReplyTo(null);
      return;
    }
    api.get(`/chat/${conversationId}/messages`).then((res) => setMessages(res.data));
    joinConversation(conversationId);
    setReplyTo(null);
    setReactionTarget(null);
  }, [conversationId, joinConversation]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typing indicator timeout
  useEffect(() => {
    if (!typingUser) return;
    const t = setTimeout(() => setTypingUser(""), 3000);
    return () => clearTimeout(t);
  }, [typingUser]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !conversationId) return;
    const replyId = replyTo?._id || null;
    socketSend(conversationId, text, replyId);
    setText("");
    setReplyTo(null);
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    emitTyping(conversationId, user?.name);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendImage = async () => {
    if (!imageFile || !conversationId) return;
    setSendingImage(true);
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      await api.post(`/chat/${conversationId}/image`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      removeImage();
    } catch (err) {
      console.error("Failed to send image");
    } finally {
      setSendingImage(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (imageFile) {
      sendImage();
    } else {
      handleSendMessage(e);
    }
  };

  const handleDelete = async (e, convId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await api.delete(`/chat/${convId}`);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (conversationId === convId) navigate("/chat");
    } catch (err) {
      console.error("Failed to delete conversation");
    }
  };

  const toggleReaction = async (messageId, emoji) => {
    if (!conversationId) return;
    try {
      const res = await api.post(`/chat/${conversationId}/messages/${messageId}/reaction`, { emoji });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, reactions: res.data.reactions } : m
        )
      );
      setReactionTarget(null);
      if (CONFETTI_EMOJIS.includes(emoji)) spawnConfetti();
    } catch (err) {
      console.error("Failed to toggle reaction");
    }
  };

  const otherParticipant = (conv) => conv.participants.find((p) => p._id !== user.id);

  const resolveImg = (src) =>
    src?.startsWith("/uploads") ? `${API_URL}${src}` : src;

  // Check if consecutive messages are from same sender (for grouping)
  const isGrouped = (msgs, idx) => {
    if (idx === 0) return false;
    const prev = msgs[idx - 1];
    const curr = msgs[idx];
    return (
      prev.sender?._id &&
      curr.sender?._id &&
      prev.sender._id === curr.sender._id &&
      !prev.system &&
      !curr.system &&
      !curr.listing &&
      !prev.listing
    );
  };

  return (
    <div className="app-shell">
      <div className="chat-shell">
        {/* Conversation sidebar */}
        <div className="conv-list">
          <div className="conv-list-header">Chats</div>
          {conversations.length === 0 && (
            <div className="empty-state">No conversations yet.</div>
          )}
          {conversations.map((conv) => {
            const other = otherParticipant(conv);
            const isOnlineList = other && onlineUsers.has(other._id);
            return (
              <div key={conv._id} className={`conv-item ${conv._id === conversationId ? "active" : ""}`}>
                <Link to={`/chat/${conv._id}`} className="conv-item-link">
                  <div className="conv-top-row">
                    <span className="t">{other?.name || "User"}</span>
                    {isOnlineList && <span className="online-dot-sm" />}
                  </div>
                  <div className="p">{conv.listing?.title}</div>
                  <div className="p">{conv.lastMessage || "Say hi 👋"}</div>
                </Link>
                <button
                  className="conv-delete-btn"
                  onClick={(e) => handleDelete(e, conv._id)}
                  title="Delete conversation"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {/* Chat window */}
        <div className="chat-window">
          {!activeConv ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <div>Pick a conversation to start chatting.</div>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="chat-header-name">
                    {otherUser?.name}
                    {isOnline && <span className="online-dot" />}
                  </div>
                  <div className="chat-header-listing">
                    {activeConv.listing?.title}
                    {isOnline ? " · Online" : " · Offline"}
                  </div>
                </div>
              </div>

              <div className="chat-messages">
                {messages.map((msg, idx) => {
                  const isMine = !msg.system && msg.sender?._id === user.id;
                  const grouped = isGrouped(messages, idx);
                  const showTime =
                    idx === messages.length - 1 ||
                    messages[idx + 1]?.sender?._id !== msg.sender?._id ||
                    messages[idx + 1]?.system;

                  const reactions = msg.reactions || {};
                  const hasReactions = typeof reactions === "object" && !Array.isArray(reactions) && Object.keys(reactions).length > 0;

                  return (
                    <div key={msg._id} className={`msg-row ${isMine ? "mine" : ""} ${grouped ? "grouped" : ""} ${msg.system ? "system-row" : ""} ${msg.listing ? "listing-row" : ""}`}>
                      {msg.system ? (
                        <div className="system-msg">{msg.text}</div>
                      ) : msg.listing ? (
                        <Link to={`/listing/${msg.listing._id}`} className="chat-product-card">
                          <div className="chat-product-img">
                            {msg.listing.imageUrl ? (
                              <img src={resolveImg(msg.listing.imageUrl)} alt={msg.listing.title} style={cropStyle(msg.listing)} />
                            ) : (
                              <span>No photo</span>
                            )}
                          </div>
                          <div className="chat-product-info">
                            <span className={`card-badge ${msg.listing.type}`} style={{ position: "static", display: "inline-block", fontSize: 10, padding: "2px 8px", marginBottom: 4 }}>
                              {msg.listing.type === "buy" ? "FOR SALE" : "FOR RENT"}
                            </span>
                            <div className="chat-product-title">{msg.listing.title}</div>
                            <div className="chat-product-price">
                              ₹{msg.listing.price}
                              {msg.listing.type === "rent" ? ` / ${msg.listing.rentDuration?.replace("per ", "")}` : ""}
                            </div>
                            <div className="chat-product-meta">{msg.listing.condition} · {msg.listing.category}</div>
                          </div>
                        </Link>
                      ) : (
                        <>
                          <div className="bubble-wrap">
                            {msg.replyTo && (
                              <div className="reply-quote">
                                <span className="reply-quote-name">{msg.replyTo.sender?.name}</span>
                                <span className="reply-quote-text">{msg.replyTo.text || msg.replyTo.image ? "📷 Photo" : ""}</span>
                              </div>
                            )}
                            <div
                              className={`bubble ${isMine ? "mine" : ""}`}
                              onDoubleClick={() => setReactionTarget(reactionTarget === msg._id ? null : msg._id)}
                            >
                              {msg.image && (
                                <img src={resolveImg(msg.image)} alt="shared" className="chat-image" />
                              )}
                              {msg.text && <span>{msg.text}</span>}
                            </div>

                            {/* Reactions display */}
                            {hasReactions && (
                              <div className="reactions-row">
                                {Object.entries(reactions).map(([emoji, userIds]) => (
                                  <button
                                    key={emoji}
                                    className={`reaction-chip ${userIds.includes(user.id) ? "mine" : ""}`}
                                    onClick={() => toggleReaction(msg._id, emoji)}
                                  >
                                    {emoji} {userIds.length}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Hover actions */}
                            <div className="msg-actions">
                              <button className="msg-action-btn" onClick={() => setReplyTo(msg)} title="Reply">↩</button>
                              <button className="msg-action-btn" onClick={() => setReactionTarget(reactionTarget === msg._id ? null : msg._id)} title="React">😊</button>
                            </div>

                            {/* Reaction picker */}
                            {reactionTarget === msg._id && (
                              <div className="reaction-picker">
                                {QUICK_EMOJIS.map((emoji) => (
                                  <button key={emoji} className="reaction-pick-btn" onClick={() => toggleReaction(msg._id, emoji)}>
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {showTime && (
                            <div className={`msg-time ${isMine ? "mine" : ""}`}>
                              {formatTime(msg.createdAt)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Typing indicator */}
              {typingUser && (
                <div className="typing-indicator">
                  <span className="typing-name">{typingUser}</span>
                  <span className="typing-dots">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                </div>
              )}

              {/* Reply preview */}
              {replyTo && (
                <div className="reply-preview">
                  <div className="reply-preview-inner">
                    <span className="reply-preview-label">Replying to {replyTo.sender?.name}</span>
                    <span className="reply-preview-text">{replyTo.text || (replyTo.image ? "📷 Photo" : "")}</span>
                  </div>
                  <button className="reply-preview-close" onClick={() => setReplyTo(null)}>✕</button>
                </div>
              )}

              {/* Image preview */}
              {imagePreview && (
                <div className="chat-image-preview-bar">
                  <img src={imagePreview} alt="preview" className="chat-image-thumb" />
                  <button type="button" className="chat-image-cancel" onClick={removeImage}>✕</button>
                </div>
              )}

              <form className="chat-input-row" onSubmit={handleSend}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="chat-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Share a photo"
                >
                  📷
                </button>
                <input
                  className="text-input"
                  placeholder={imagePreview ? "Add a caption..." : replyTo ? `Reply to ${replyTo.sender?.name}...` : "Type a message..."}
                  value={text}
                  onChange={handleTyping}
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={sendingImage || (!text.trim() && !imageFile)}
                >
                  {sendingImage ? "..." : imageFile ? "Send Photo" : "Send"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Confetti overlay */}
      {confetti.map((c) => (
        <div key={c.id} className="confetti-overlay">
          {c.pieces.map((p) => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.x}%`,
                background: p.color,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
