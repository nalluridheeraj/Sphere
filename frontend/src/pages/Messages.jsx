import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageAPI, mediaAPI, userAPI } from '../services/api';
import { resolveUrl, API_BASE } from '../utils/media';
import {
  MessageSquare, Search, Send, Image, Mic, MicOff, Paperclip,
  FileText, Play, Pause, X, Check, Ban, ArrowLeft, Loader2,
  Phone, Video as VideoIcon
} from 'lucide-react';

const WS_BASE = API_BASE.replace(/^http/, 'ws');

/* ────────────────────────────────────────────────────────────────────────── */
/*  Conversation List Item                                                   */
/* ────────────────────────────────────────────────────────────────────────── */
const ConvItem = ({ conv, isActive, onClick }) => {
  const other = conv.other_user;
  const last = conv.last_message;
  const preview = last
    ? last.media_type === 'text'
      ? last.content?.slice(0, 40) || ''
      : last.media_type === 'audio' ? 'Voice message' : `Sent ${last.media_type}`
    : 'No messages yet';

  const timeStr = last ? new Date(last.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-brand-800/60 ${
        isActive ? 'bg-brand-800/80 border-l-2 border-sphere-500' : ''
      }`}>
      <div className="h-11 w-11 rounded-full overflow-hidden bg-sphere-900 border border-brand-700 flex-shrink-0">
        {other.avatar_url ? (
          <img src={resolveUrl(other.avatar_url)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sphere-300 font-bold text-lg">
            {(other.display_name || other.username)[0].toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-brand-100 truncate">{other.display_name}</span>
          <span className="text-[10px] text-brand-500 flex-shrink-0">{timeStr}</span>
        </div>
        <p className="text-xs text-brand-400 truncate">{preview}</p>
      </div>
      {conv.unread_count > 0 && (
        <span className="bg-sphere-600 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
          {conv.unread_count}
        </span>
      )}
    </button>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Message Bubble                                                           */
/* ────────────────────────────────────────────────────────────────────────── */
const MessageBubble = ({ msg, isMine }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
        isMine
          ? 'bg-sphere-600/90 text-white rounded-br-md'
          : 'bg-brand-800 text-brand-100 rounded-bl-md'
      }`}>
        {/* Shared Post */}
        {msg.shared_post && (
          <div className="bg-black/20 rounded-xl p-3 mb-2 border border-white/10">
            <p className="text-xs text-brand-400 mb-1">@{msg.shared_post.author?.username}</p>
            <p className="text-sm">{msg.shared_post.content?.slice(0, 120)}</p>
            {msg.shared_post.media_url && (
              <img src={resolveUrl(msg.shared_post.media_url)} alt="" className="mt-2 rounded-lg max-h-32 object-cover w-full" />
            )}
          </div>
        )}

        {/* Image */}
        {msg.media_type === 'image' && msg.media_url && (
          <img src={resolveUrl(msg.media_url)} alt="media" className="rounded-xl max-h-64 object-cover mb-1" />
        )}

        {/* Video */}
        {msg.media_type === 'video' && msg.media_url && (
          <video src={resolveUrl(msg.media_url)} controls className="rounded-xl max-h-64 mb-1" />
        )}

        {/* Audio / Voice */}
        {msg.media_type === 'audio' && msg.media_url && (
          <div className="flex items-center gap-3 py-1">
            <button onClick={toggleAudio} className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="flex-1 flex items-center gap-0.5">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-1 bg-white/40 rounded-full" style={{ height: `${4 + Math.random() * 16}px` }} />
              ))}
            </div>
            <audio ref={audioRef} src={resolveUrl(msg.media_url)} onEnded={() => setPlaying(false)} />
          </div>
        )}

        {/* File */}
        {msg.media_type === 'file' && msg.media_url && (
          <a href={resolveUrl(msg.media_url)} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 hover:bg-white/20 transition-all mb-1">
            <FileText className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm truncate">{msg.file_name || 'File'}</span>
          </a>
        )}

        {/* Text content */}
        {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}

        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/50' : 'text-brand-500'}`}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isMine && msg.is_read && <span className="ml-1">✓✓</span>}
        </p>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Chat View                                                                */
/* ────────────────────────────────────────────────────────────────────────── */
const ChatView = ({ username, currentUser, setToast, onBack }) => {
  const [convData, setConvData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load conversation
  useEffect(() => {
    if (!username) return;
    const load = async () => {
      try {
        const res = await messageAPI.getMessages(username);
        setConvData(res.data.conversation);
        setMessages(res.data.messages);
        // Mark as read
        if (res.data.conversation?.id) {
          messageAPI.markRead(res.data.conversation.id).catch(() => {});
        }
      } catch (err) {
        setToast(err.response?.data?.detail || 'Failed to load chat.', 'error');
      }
    };
    load();
  }, [username]);

  // WebSocket for real-time
  useEffect(() => {
    if (!currentUser) return;
    const ws = new WebSocket(`${WS_BASE}/ws/chat/${currentUser.username}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new-message' && data.message) {
          setMessages(prev => [...prev, data.message]);
          // Mark read if this chat is open
          if (data.conversation_id && convData?.id === data.conversation_id) {
            messageAPI.markRead(data.conversation_id).catch(() => {});
          }
        }
      } catch {}
    };

    return () => { ws.close(); wsRef.current = null; };
  }, [currentUser, convData?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await messageAPI.sendMessage(username, { content: text.trim(), media_type: 'text' });
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch (err) {
      setToast(err.response?.data?.detail || 'Failed to send.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await mediaAPI.upload(file);
      const { url, media_type } = res.data;
      const msgRes = await messageAPI.sendMessage(username, {
        media_url: url, media_type, file_name: file.name,
      });
      setMessages(prev => [...prev, msgRes.data]);
    } catch (err) {
      setToast('Failed to upload.', 'error');
    }
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
        try {
          const res = await mediaAPI.upload(file);
          const msgRes = await messageAPI.sendMessage(username, {
            media_url: res.data.url, media_type: 'audio',
          });
          setMessages(prev => [...prev, msgRes.data]);
        } catch {
          setToast('Failed to send voice message.', 'error');
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch {
      setToast('Microphone access denied.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleAccept = async () => {
    try {
      await messageAPI.acceptRequest(convData.id);
      setConvData(prev => ({ ...prev, is_accepted: true }));
      setToast('Chat request accepted!');
    } catch { setToast('Failed.', 'error'); }
  };

  const handleDecline = async () => {
    try {
      await messageAPI.declineRequest(convData.id);
      onBack();
      setToast('Request declined.');
    } catch { setToast('Failed.', 'error'); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!username) {
    return (
      <div className="flex-1 flex items-center justify-center text-brand-500">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Select a conversation</p>
          <p className="text-sm">or start a new chat</p>
        </div>
      </div>
    );
  }

  const other = convData?.other_user;
  const isRequest = convData && !convData.is_accepted;
  // Check if current user is the recipient of the request (not the one who sent it)
  const isRequestRecipient = isRequest && messages.length > 0 && messages[0]?.sender?.username !== currentUser?.username;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-700 bg-brand-900/80 backdrop-blur-sm">
        <button onClick={onBack} className="md:hidden text-brand-400 hover:text-brand-200 mr-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {other && (
          <>
            <div className="h-9 w-9 rounded-full overflow-hidden bg-sphere-900 border border-brand-700">
              {other.avatar_url ? (
                <img src={resolveUrl(other.avatar_url)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sphere-300 font-bold">
                  {(other.display_name || other.username)[0].toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-100">{other.display_name}</p>
              <p className="text-[11px] text-brand-500">@{other.username}</p>
            </div>
          </>
        )}
        {isRequest && (
          <span className="ml-auto text-[11px] bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-medium">
            Message Request
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{ minHeight: 0 }}>
        {messages.map(m => (
          <MessageBubble key={m.id} msg={m} isMine={m.sender?.username === currentUser?.username} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Request actions or input bar */}
      {isRequestRecipient ? (
        <div className="p-4 border-t border-brand-700 bg-brand-900/80">
          <p className="text-sm text-brand-400 text-center mb-3">
            This is a message request from <strong className="text-brand-200">@{other?.username}</strong>
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleDecline}
              className="px-6 py-2.5 rounded-xl bg-brand-800 text-brand-300 hover:bg-brand-700 transition-all text-sm font-medium flex items-center gap-2">
              <Ban className="h-4 w-4" /> Decline
            </button>
            <button onClick={handleAccept}
              className="px-6 py-2.5 rounded-xl bg-sphere-600 text-white hover:bg-sphere-700 transition-all text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4" /> Accept
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-brand-700 bg-brand-900/80 backdrop-blur-sm">
          {recording ? (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-brand-800">
              <div className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-sm text-rose-400 font-mono">
                {String(Math.floor(recordTime / 60)).padStart(2, '0')}:{String(recordTime % 60).padStart(2, '0')}
              </span>
              <div className="flex-1 flex items-center gap-0.5 overflow-hidden">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="w-1 bg-rose-500/50 rounded-full animate-pulse"
                    style={{ height: `${4 + Math.random() * 12}px`, animationDelay: `${i * 50}ms` }} />
                ))}
              </div>
              <button onClick={stopRecording}
                className="h-10 w-10 rounded-full bg-rose-600 flex items-center justify-center text-white hover:bg-rose-700 transition-all">
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" />
              <button onClick={() => fileInputRef.current?.click()}
                className="h-10 w-10 rounded-full bg-brand-800 text-brand-300 hover:text-brand-100 hover:bg-brand-700 flex items-center justify-center transition-all flex-shrink-0">
                <Paperclip className="h-4.5 w-4.5" />
              </button>
              <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Type a message..." rows={1}
                className="flex-1 bg-brand-800 text-brand-100 placeholder-brand-500 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-sphere-600 border border-brand-700 max-h-32"
                style={{ minHeight: '40px' }} />
              {text.trim() ? (
                <button onClick={handleSend} disabled={sending}
                  className="h-10 w-10 rounded-full bg-sphere-600 text-white hover:bg-sphere-700 flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={startRecording}
                  className="h-10 w-10 rounded-full bg-brand-800 text-brand-300 hover:text-sphere-400 hover:bg-brand-700 flex items-center justify-center transition-all flex-shrink-0">
                  <Mic className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Main Messages Page                                                       */
/* ────────────────────────────────────────────────────────────────────────── */
const Messages = ({ setToast }) => {
  const { user } = useAuth();
  const { username: activeChat } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [tab, setTab] = useState('chats');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(!!activeChat);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeChat) setShowChat(true);
  }, [activeChat]);

  const loadConversations = async () => {
    try {
      const res = await messageAPI.getConversations();
      setConversations(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await userAPI.search(q);
      setSearchResults(res.data.filter(u => u.username !== user?.username));
    } catch {}
  };

  const openChat = (username) => {
    navigate(`/messages/${username}`);
    setShowChat(true);
    setSearch('');
    setSearchResults([]);
  };

  const handleBack = () => {
    setShowChat(false);
    navigate('/messages');
    loadConversations();
  };

  const chats = conversations.filter(c => c.is_accepted);
  const requests = conversations.filter(c => !c.is_accepted && !c.is_requester);

  return (
    <div className="max-w-5xl mx-auto px-0 md:px-4 pt-20">
      <div className="flex rounded-none md:rounded-2xl overflow-hidden border-0 md:border border-brand-700 bg-brand-900"
        style={{ height: 'calc(100vh - 6rem)' }}>

        {/* Left Panel - Conversation List */}
        <div className={`w-full md:w-96 border-r border-brand-700 flex flex-col ${showChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-brand-700">
            <h2 className="text-lg font-bold text-brand-100 mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-sphere-500" /> Messages
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-500" />
              <input value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full bg-brand-800 text-brand-100 placeholder-brand-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sphere-600 border border-brand-700" />
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="border-b border-brand-700">
              {searchResults.map(u => (
                <button key={u.id} onClick={() => openChat(u.username)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-800/60 transition-all text-left">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-sphere-900 border border-brand-700">
                    {u.avatar_url ? (
                      <img src={resolveUrl(u.avatar_url)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-sphere-300 font-bold">
                        {(u.display_name || u.username)[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-100">{u.display_name || u.username}</p>
                    <p className="text-xs text-brand-500">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-brand-700">
            <button onClick={() => setTab('chats')}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                tab === 'chats' ? 'text-sphere-400 border-b-2 border-sphere-500' : 'text-brand-500 hover:text-brand-300'
              }`}>
              Chats {chats.length > 0 && `(${chats.length})`}
            </button>
            <button onClick={() => setTab('requests')}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                tab === 'requests' ? 'text-sphere-400 border-b-2 border-sphere-500' : 'text-brand-500 hover:text-brand-300'
              }`}>
              Requests {requests.length > 0 && (
                <span className="ml-1 bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full">{requests.length}</span>
              )}
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-sphere-500" />
              </div>
            ) : (tab === 'chats' ? chats : requests).length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm text-brand-500">
                  {tab === 'chats' ? 'No conversations yet. Search for someone to chat with!' : 'No message requests.'}
                </p>
              </div>
            ) : (
              (tab === 'chats' ? chats : requests).map(c => (
                <ConvItem key={c.id} conv={c} isActive={c.other_user.username === activeChat}
                  onClick={() => openChat(c.other_user.username)} />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Chat View */}
        <div className={`flex-1 flex flex-col ${showChat ? 'flex' : 'hidden md:flex'}`}>
          <ChatView
            username={activeChat}
            currentUser={user}
            setToast={setToast}
            onBack={handleBack}
          />
        </div>
      </div>
    </div>
  );
};

export default Messages;
