import React, { useState } from 'react';
import { Link2, Share2, Twitter, Check, X } from 'lucide-react';

const ShareModal = ({ post, onClose, setToast }) => {
  const [copied, setCopied] = useState(false);
  const postUrl = `${window.location.origin}/post/${post.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setToast?.('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch { setToast?.('Could not copy link.', 'error'); }
  };

  const shareToTwitter = () => {
    const text = post.content ? encodeURIComponent(post.content.slice(0, 100) + (post.content.length > 100 ? '…' : '')) : '';
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(postUrl)}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-brand-200 bg-white p-6 shadow-2xl dark:border-brand-700 dark:bg-brand-900 animate-scale-in"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-800 transition-all">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-5">
          <Share2 className="h-5 w-5 text-sphere-500" />
          <h3 className="font-semibold text-brand-900 dark:text-white">Share Post</h3>
        </div>

        {/* Copy link */}
        <div className="flex items-center gap-2 rounded-xl border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-800 px-3 py-2.5 mb-4">
          <Link2 className="h-4 w-4 text-brand-400 flex-shrink-0" />
          <span className="flex-1 truncate text-xs text-brand-500 dark:text-brand-300">{postUrl}</span>
          <button onClick={copy}
            className={`flex-shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              copied ? 'bg-emerald-500 text-white' : 'bg-sphere-600 text-white hover:bg-sphere-700'
            }`}>
            {copied ? <><Check className="inline h-3 w-3 mr-1" />Copied!</> : 'Copy'}
          </button>
        </div>

        {/* External shares */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-brand-400 mb-2">Share externally</p>
          <button onClick={shareToTwitter}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 border border-brand-200 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-800 transition-colors">
            <div className="h-7 w-7 rounded-lg bg-black flex items-center justify-center">
              <Twitter className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-brand-700 dark:text-brand-200">Share on X (Twitter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
