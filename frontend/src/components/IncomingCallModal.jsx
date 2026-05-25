import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { resolveUrl } from '../utils/media';

const IncomingCallModal = ({ caller, callerDisplayName, callerAvatar, callType, onAccept, onDecline }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onDecline}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative w-full max-w-sm rounded-2xl border border-brand-700 bg-brand-900 p-8 shadow-2xl animate-scale-in text-center"
        onClick={(e) => e.stopPropagation()}>

        {/* Pulsing ring animation */}
        <div className="relative mx-auto mb-6 h-24 w-24">
          <div className="absolute inset-0 rounded-full bg-sphere-600/30 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-sphere-600/20 animate-ping" style={{ animationDelay: '0.3s' }} />
          <div className="relative h-24 w-24 rounded-full overflow-hidden border-3 border-sphere-500 bg-sphere-900 flex items-center justify-center">
            {callerAvatar ? (
              <img src={resolveUrl(callerAvatar)} alt={caller} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-sphere-200">
                {(callerDisplayName || caller)[0].toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Caller info */}
        <h3 className="text-lg font-semibold text-white mb-1">
          {callerDisplayName || caller}
        </h3>
        <p className="text-sm text-brand-400 mb-2">@{caller}</p>
        <p className="text-sm text-sphere-400 mb-8 flex items-center justify-center gap-1.5">
          {callType === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          Incoming {callType} call…
        </p>

        {/* Accept / Decline buttons */}
        <div className="flex items-center justify-center gap-8">
          <button onClick={onDecline}
            className="flex flex-col items-center gap-2 group">
            <div className="h-14 w-14 rounded-full bg-rose-600 flex items-center justify-center hover:bg-rose-700 transition-all shadow-lg group-hover:scale-110">
              <PhoneOff className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-brand-400">Decline</span>
          </button>

          <button onClick={onAccept}
            className="flex flex-col items-center gap-2 group">
            <div className="h-14 w-14 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg group-hover:scale-110 animate-pulse">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-brand-400">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
