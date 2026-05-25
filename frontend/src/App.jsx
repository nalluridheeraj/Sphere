import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import PostDetail from './pages/PostDetail';
import Messages from './pages/Messages';
import Toast from './components/Toast';
import IncomingCallModal from './components/IncomingCallModal';
import CallModal from './components/CallModal';
import { API_BASE } from './utils/media';

const WS_BASE = API_BASE.replace(/^http/, 'ws');

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center dark:bg-brand-950">
      <div className="h-8 w-8 rounded-full border-2 border-sphere-600 border-t-transparent animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const MainLayout = () => {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const wsRef = useRef(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // ── Notification WebSocket ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/ws/notify/${user.username}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'incoming-call') {
            setIncomingCall(data);
          }
        } catch {}
      };

      ws.onclose = () => {
        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          if (wsRef.current === ws) connect();
        }, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.close();
      }
    };
  }, [user]);

  const handleAcceptCall = useCallback(() => {
    if (!incomingCall) return;
    setActiveCall({
      targetUsername: incomingCall.caller,
      callType: incomingCall.call_type,
      roomId: incomingCall.room_id,
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const handleDeclineCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const handleEndCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  return (
    <div className="min-h-screen bg-brand-50 dark:bg-brand-950">
      <Navbar setToast={showToast} />
      <main className="pb-20">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Feed setToast={showToast} /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages setToast={showToast} /></ProtectedRoute>} />
          <Route path="/messages/:username" element={<ProtectedRoute><Messages setToast={showToast} /></ProtectedRoute>} />
          <Route path="/profile/:username" element={<ProtectedRoute><Profile setToast={showToast} /></ProtectedRoute>} />
          <Route path="/post/:postId" element={<ProtectedRoute><PostDetail setToast={showToast} /></ProtectedRoute>} />
          <Route path="/login" element={<Login setToast={showToast} />} />
          <Route path="/register" element={<Register setToast={showToast} />} />
          <Route path="/verify-email" element={<VerifyEmail setToast={showToast} />} />
          <Route path="/forgot-password" element={<ForgotPassword setToast={showToast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Incoming call popup — shows globally on any page */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.caller}
          callerDisplayName={incomingCall.caller_display_name}
          callerAvatar={incomingCall.caller_avatar}
          callType={incomingCall.call_type}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {/* Active call modal */}
      {activeCall && user && (
        <CallModal
          targetUsername={activeCall.targetUsername}
          callType={activeCall.callType}
          currentUsername={user.username}
          roomId={activeCall.roomId}
          onClose={handleEndCall}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
