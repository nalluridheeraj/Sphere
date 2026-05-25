import React, { useEffect, useRef, useState } from 'react';
import { callAPI } from '../services/api';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2 } from 'lucide-react';
import { API_BASE } from '../utils/media';

const WS_BASE = API_BASE.replace(/^http/, 'ws');

const CallModal = ({ targetUsername, callType, currentUsername, onClose, roomId: existingRoomId }) => {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const wsRef          = useRef(null);

  const [status, setStatus] = useState('Initializing…');
  const [muted, setMuted]   = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    let localStream = null;

    const init = async () => {
      try {
        // 1. Get call room — use existing room_id if accepting, or initiate new
        let rid;
        if (existingRoomId) {
          rid = existingRoomId;
        } else {
          const res = await callAPI.initiate(targetUsername, callType);
          rid = res.data.room_id;
        }
        setRoomId(rid);
        setStatus('Connecting…');

        // 2. Grab local media
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // 3. WebRTC peer connection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        pcRef.current = pc;

        localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          setStatus('Connected');
        };

        // 4. WebSocket signaling
        const ws = new WebSocket(`${WS_BASE}/ws/call/${rid}?username=${currentUsername}`);
        wsRef.current = ws;

        ws.onmessage = async (msg) => {
          const data = JSON.parse(msg.data);
          if (data.from === currentUsername) return;

          if (data.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription }));
          } else if (data.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          } else if (data.type === 'ice-candidate') {
            if (data.candidate) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else if (data.type === 'user-joined') {
            setStatus(`@${data.username} joined!`);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription }));
          } else if (data.type === 'user-left') {
            setStatus('Call ended by other party.');
            setTimeout(cleanup, 2000);
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) ws.send(JSON.stringify({ type: 'ice-candidate', candidate: e.candidate }));
        };

        ws.onopen = () => setStatus('Waiting for other party…');
        ws.onerror = () => setStatus('Connection error');
      } catch (err) {
        console.error(err);
        setStatus('Could not start call: ' + (err.message || 'permission denied'));
      }
    };

    const cleanup = () => {
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      onClose();
    };

    init();

    return () => {
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
      if (pcRef.current) { pcRef.current.close(); }
      if (wsRef.current) { wsRef.current.close(); }
    };
  }, []);

  const toggleMute = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
      setMuted((m) => !m);
    }
  };

  const toggleCamera = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
      setCamOff((c) => !c);
    }
  };

  const hangUp = () => {
    if (wsRef.current) wsRef.current.close();
    if (pcRef.current) pcRef.current.close();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden bg-brand-950 border border-brand-800 shadow-2xl animate-scale-in">
        {/* Remote video */}
        <div className="relative bg-brand-900 h-96 flex items-center justify-center">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            {status !== 'Connected' && (
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-sphere-800 border-2 border-sphere-600 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-sphere-200">{targetUsername[0].toUpperCase()}</span>
                </div>
                <p className="text-sm font-medium text-white">@{targetUsername}</p>
                <div className="flex items-center justify-center gap-2 mt-2 text-sphere-400 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{status}</span>
                </div>
              </div>
            )}
          </div>

          {/* Local video (PIP) */}
          {callType === 'video' && (
            <video ref={localVideoRef} autoPlay playsInline muted
              className="absolute bottom-3 right-3 h-28 w-40 rounded-xl border border-brand-700 object-cover bg-brand-800" />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 bg-brand-950 px-6 py-5">
          <button onClick={toggleMute}
            className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
              muted ? 'bg-rose-600 text-white' : 'bg-brand-800 text-brand-200 hover:bg-brand-700'
            }`}>
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <button onClick={hangUp}
            className="h-14 w-14 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-all shadow-lg">
            <PhoneOff className="h-6 w-6" />
          </button>

          {callType === 'video' && (
            <button onClick={toggleCamera}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                camOff ? 'bg-rose-600 text-white' : 'bg-brand-800 text-brand-200 hover:bg-brand-700'
              }`}>
              {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;
