import React, { useState, useEffect, useRef } from 'react';
import { postAPI, mediaAPI } from '../services/api';
import { X, PenSquare, Image, Video, Loader2, FileText } from 'lucide-react';
import { resolveUrl } from '../utils/media';

const CreatePostModal = ({ isOpen, onClose, onPostChange, editingPost, setToast, quotePost = null }) => {
  const [tab, setTab]       = useState('text'); // text | photo | video
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('text');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef(null);

  const isEdit = !!editingPost;

  useEffect(() => {
    if (isOpen) {
      setContent(editingPost?.content || '');
      setTab('text');
      setMediaFile(null); setMediaPreview(''); setMediaUrl(''); setMediaType('text');
      setError('');
    }
  }, [isOpen, editingPost]);

  if (!isOpen) return null;

  const handleFile = async (file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setMediaPreview(preview);
    setMediaFile(file);
    setUploading(true);
    try {
      const res = await mediaAPI.upload(file);
      setMediaUrl(res.data.url);
      setMediaType(res.data.media_type);
    } catch {
      setError('Upload failed. Try a smaller file (max 50 MB).');
      setMediaFile(null); setMediaPreview('');
    } finally { setUploading(false); }
  };

  const clearMedia = () => {
    setMediaFile(null); setMediaPreview(''); setMediaUrl(''); setMediaType('text');
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaUrl && !quotePost) { setError('Add some content or media.'); return; }
    setLoading(true); setError('');
    try {
      let res;
      if (isEdit) {
        res = await postAPI.update(editingPost.id, content);
        onPostChange(res.data, 'edit');
      } else {
        const payload = {
          content,
          media_url: mediaUrl || '',
          media_type: mediaUrl ? mediaType : 'text',
          quote_of_id: quotePost?.id || null,
        };
        res = await postAPI.create(payload);
        onPostChange(res.data, 'create');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const CHAR_LIMIT = 1000;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-brand-200 bg-white shadow-2xl dark:border-brand-700 dark:bg-brand-900 animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-100 dark:border-brand-800 px-5 py-4">
          <h3 className="font-semibold text-brand-900 dark:text-white">
            {isEdit ? 'Edit Post' : 'New Post'}
          </h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-800 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs (only when creating, not editing) */}
        {!isEdit && (
          <div className="flex gap-0 border-b border-brand-100 dark:border-brand-800 px-5">
            {[
              { id: 'text',  label: 'Text',  icon: FileText },
              { id: 'photo', label: 'Photo', icon: Image },
              { id: 'video', label: 'Video', icon: Video },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setTab(id); clearMedia(); }}
                className={`tab-btn py-3 ${tab === id ? 'active' : ''}`}>
                <Icon className="inline h-3.5 w-3.5 mr-1" />{label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Quoted post preview */}
          {quotePost && !isEdit && (
            <div className="rounded-xl border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-800/50 p-3 text-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-5 w-5 rounded-full bg-sphere-900 overflow-hidden flex-shrink-0">
                  {quotePost.author?.avatar_url
                    ? <img src={resolveUrl(quotePost.author.avatar_url)} alt="" className="h-full w-full object-cover" />
                    : <div className="h-full w-full flex items-center justify-center text-[9px] font-bold text-sphere-300">
                        {(quotePost.author?.username || '?')[0].toUpperCase()}
                      </div>
                  }
                </div>
                <span className="text-xs font-semibold text-brand-700 dark:text-brand-200">
                  {quotePost.author?.display_name || quotePost.author?.username}
                </span>
                <span className="text-[10px] text-brand-400">@{quotePost.author?.username}</span>
              </div>
              {quotePost.content && (
                <p className="text-brand-600 dark:text-brand-300 line-clamp-3">{quotePost.content}</p>
              )}
              {quotePost.media_url && (
                <img src={resolveUrl(quotePost.media_url)} alt="" className="mt-2 rounded-lg max-h-24 object-cover" />
              )}
            </div>
          )}

          {/* Text area */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={tab === 'text' ? 5 : 3}
              maxLength={CHAR_LIMIT}
              placeholder={
                tab === 'text' ? "What's on your mind?" :
                tab === 'photo' ? 'Add a caption (optional)…' :
                'Add a video description (optional)…'
              }
              className="textarea w-full"
              autoFocus
            />
            <span className={`absolute bottom-2 right-3 text-[10px] ${content.length > CHAR_LIMIT * 0.9 ? 'text-rose-400' : 'text-brand-300 dark:text-brand-600'}`}>
              {CHAR_LIMIT - content.length}
            </span>
          </div>

          {/* Media picker */}
          {!isEdit && (tab === 'photo' || tab === 'video') && (
            <div>
              {!mediaPreview ? (
                <label className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-brand-200 dark:border-brand-700 cursor-pointer hover:border-sphere-500 hover:bg-sphere-50 dark:hover:bg-sphere-950/20 transition-all group">
                  {tab === 'photo' ? <Image className="h-8 w-8 text-brand-300 group-hover:text-sphere-500 transition-colors mb-2" />
                                   : <Video className="h-8 w-8 text-brand-300 group-hover:text-sphere-500 transition-colors mb-2" />}
                  <span className="text-sm text-brand-400 group-hover:text-sphere-500 transition-colors">
                    Click to upload {tab === 'photo' ? 'photo' : 'video'}
                  </span>
                  <span className="text-xs text-brand-300 mt-0.5">
                    {tab === 'photo' ? 'JPEG, PNG, GIF, WEBP — max 50MB' : 'MP4, WEBM, MOV — max 50MB'}
                  </span>
                  <input ref={fileRef} type="file" className="hidden"
                    accept={tab === 'photo' ? 'image/*' : 'video/*'}
                    onChange={(e) => handleFile(e.target.files[0])} />
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-brand-100 dark:border-brand-800">
                  {tab === 'photo'
                    ? <img src={mediaPreview} alt="preview" className="w-full max-h-60 object-contain bg-black" />
                    : <video src={mediaPreview} controls className="w-full max-h-56" />
                  }
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                  <button type="button" onClick={clearMedia}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={loading || uploading}
              className="btn-primary">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Posting…</> :
               isEdit ? 'Update' : 'Post to Sphere'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
