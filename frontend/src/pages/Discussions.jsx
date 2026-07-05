import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { fetchDiscussions, fetchDiscussionById, createDiscussion, upvoteDiscussion, createComment, createReply, hideDiscussion, hideComment } from '../services/api';
import { MessageSquare, ThumbsUp, Send, Plus, ArrowLeft, Globe, Image, X, Search, Filter, ChevronDown, Heart, Reply as ReplyIcon, EyeOff, Eye, Shield } from 'lucide-react';

const CATEGORIES = ['All', 'General', 'Safety', 'Suggestions', 'Cleanliness', 'Infrastructure', 'Water & Drainage', 'Events'];

const CATEGORY_COLORS = {
  General: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Safety: 'bg-red-500/10 text-red-400 border-red-500/20',
  Suggestions: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Cleanliness: 'bg-green-500/10 text-green-400 border-green-500/20',
  Infrastructure: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Water & Drainage': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Events: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

function TimeAgo({ date }) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return <span>{diff}s ago</span>;
  if (diff < 3600) return <span>{Math.floor(diff / 60)}m ago</span>;
  if (diff < 86400) return <span>{Math.floor(diff / 3600)}h ago</span>;
  return <span>{Math.floor(diff / 86400)}d ago</span>;
}

function Avatar({ name, pic, size = 'sm' }) {
  const sz = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs';
  if (pic) return <img src={pic} alt={name} className={`${sz} rounded-full object-cover border border-gray-700`} />;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-emerald-500/30 to-green-600/30 border border-emerald-500/20 flex items-center justify-center font-black text-emerald-400`}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

export default function Discussions() {
  const { user } = useContext(AuthContext);
  const permissions = usePermissions();

  const [discussions, setDiscussions] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // New Thread form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newLocality, setNewLocality] = useState(user?.locality || '');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageUrls, setNewImageUrls] = useState([]);

  // Comment & Reply states
  const [commentText, setCommentText] = useState('');
  const [commentImageUrl, setCommentImageUrl] = useState('');
  const [showCommentImage, setShowCommentImage] = useState(false);
  const [activeReplyBox, setActiveReplyBox] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    loadDiscussions();
  }, [activeCategory]);

  const loadDiscussions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeCategory !== 'All') params.category = activeCategory;
      const data = await fetchDiscussions(params);
      setDiscussions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectThread = async (id) => {
    try {
      const data = await fetchDiscussionById(id);
      setSelectedThread(data);
    } catch (err) {
      console.error('Failed to load thread:', err);
    }
  };

  const handleAddImageToPost = () => {
    if (newImageUrl.trim()) {
      setNewImageUrls(prev => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;
    try {
      await createDiscussion({
        title: newTitle,
        content: newContent,
        category: newCategory,
        locality: newLocality || 'General',
        images: newImageUrls
      });
      setNewTitle(''); setNewContent(''); setNewImageUrls([]); setShowCreateForm(false);
      loadDiscussions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpvote = async (threadId, e) => {
    if (e) e.stopPropagation();
    if (!permissions.canUpvoteIssues) {
      alert('Please sign in to like threads');
      return;
    }
    try {
      await upvoteDiscussion(threadId);
      if (selectedThread?.id === threadId) handleSelectThread(threadId);
      loadDiscussions();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText || !selectedThread) return;
    setSubmittingComment(true);
    try {
      await createComment(selectedThread.id, {
        content: commentText,
        images: commentImageUrl ? [commentImageUrl] : []
      });
      setCommentText(''); setCommentImageUrl(''); setShowCommentImage(false);
      handleSelectThread(selectedThread.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePostReply = async (commentId, e) => {
    e.preventDefault();
    if (!replyText) return;
    try {
      await createReply(commentId, { content: replyText });
      setReplyText(''); setActiveReplyBox(null);
      handleSelectThread(selectedThread.id);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDiscussions = discussions.filter(d =>
    !searchQuery ||
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCatColor = (cat) => CATEGORY_COLORS[cat] || 'bg-gray-800 text-gray-400 border-gray-700';

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#0b0f19] text-white">
      
      {/* TOP HERO BAR */}
      <div className="bg-gradient-to-r from-[#111827] to-[#0f1a2e] border-b border-gray-800 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Globe size={18} className="text-black" />
              </div>
              Neighborhood Forum
            </h1>
            <p className="text-xs text-gray-400 mt-1 ml-12">Ask questions · Share suggestions · Discuss local civic issues</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg pl-8 pr-4 py-2.5 outline-none w-52 transition-colors"
              />
            </div>
            {/* VISITOR: hide create button. Only logged-in users can post. */}
            {permissions.canPostDiscussions && !showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-green-500/20 transition-all"
              >
                <Plus size={14} /> New Thread
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CATEGORY FILTER TABS */}
      <div className="bg-[#0d1420] border-b border-gray-800/60 px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-1 py-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-green-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6">

        {/* LEFT PANE — Thread List */}
        <div className={`lg:w-[420px] flex-shrink-0 space-y-4 ${selectedThread ? 'hidden lg:block' : ''}`}>

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-[#111827] border border-gray-700 rounded-2xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Start a Discussion</h3>
                <button onClick={() => setShowCreateForm(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateThread} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Title *</label>
                  <input
                    required type="text"
                    placeholder="What do you want to discuss?"
                    value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg p-2.5 outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Category</label>
                    <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg p-2.5 outline-none">
                      {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Neighborhood</label>
                    <input type="text" placeholder="e.g. Greenwood Valley"
                      value={newLocality} onChange={e => setNewLocality(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg p-2.5 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Content *</label>
                  <textarea required rows={4} placeholder="Share your thoughts, suggestions, or questions..."
                    value={newContent} onChange={e => setNewContent(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg p-2.5 outline-none resize-none" />
                </div>

                {/* Image attachment */}
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Attach Images (URLs)</label>
                  <div className="flex gap-2">
                    <input type="url" placeholder="Paste image URL..."
                      value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                      className="flex-grow bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-l-lg p-2.5 outline-none" />
                    <button type="button" onClick={handleAddImageToPost}
                      className="bg-gray-800 hover:bg-gray-700 text-xs text-white px-3 py-2 rounded-r-lg font-bold transition-colors">
                      Add
                    </button>
                  </div>
                  {newImageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newImageUrls.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                          <button type="button" onClick={() => setNewImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center">
                            <X size={10} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-white text-xs font-semibold px-3 py-2">Cancel</button>
                  <button type="submit"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-black px-5 py-2 rounded-lg shadow-md">
                    Post Thread
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Thread List */}
          <div className="space-y-3">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="bg-[#111827] border border-gray-800 rounded-xl p-5 animate-pulse space-y-3">
                  <div className="h-3 bg-gray-800 rounded w-1/3" />
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800 rounded w-full" />
                </div>
              ))
            ) : filteredDiscussions.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <MessageSquare size={40} className="mx-auto text-gray-700 mb-3" />
                <p className="text-sm">No discussions found. Start one!</p>
              </div>
            ) : (
              filteredDiscussions.map(d => (
                <div
                  key={d.id}
                  onClick={() => handleSelectThread(d.id)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all group ${
                    selectedThread?.id === d.id
                      ? 'bg-green-500/5 border-green-500/40 shadow-lg shadow-green-500/5'
                      : 'bg-[#111827]/60 border-gray-800 hover:border-gray-600 hover:bg-[#111827]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getCatColor(d.category)}`}>
                      {d.category}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">📍 {d.locality}</span>
                    <span className="ml-auto text-[10px] text-gray-600">
                      <TimeAgo date={d.createdAt} />
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-green-300 transition-colors">{d.title}</h3>
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{d.content}</p>

                  {/* Images strip preview */}
                  {d.images?.length > 0 && (
                    <div className="flex gap-1.5 mt-3">
                      {d.images.slice(0, 3).map((img, i) => (
                        <img key={i} src={img} alt="" className="w-12 h-12 object-cover rounded-lg border border-gray-700" />
                      ))}
                      {d.images.length > 3 && (
                        <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center text-[10px] text-gray-400 font-bold">
                          +{d.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-800/40 text-[11px] text-gray-500 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={d.author?.name} pic={d.author?.profilePic} />
                      <span className="text-gray-400">{d.author?.name}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      <button
                        onClick={(e) => handleUpvote(d.id, e)}
                        className="flex items-center gap-1.5 hover:text-green-400 transition-colors"
                      >
                        <Heart size={13} /> {d._count?.upvotes || 0}
                      </button>
                      <span className="flex items-center gap-1.5">
                        <MessageSquare size={13} /> {d._count?.comments || 0}
                      </span>
                      {/* MODERATOR/ADMIN: hide discussion from public */}
                      {permissions.canHideContent && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await hideDiscussion(d.id, !d.hidden);
                              loadDiscussions();
                            } catch (err) { console.error(err); }
                          }}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                            d.hidden
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                              : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                          }`}
                          title={d.hidden ? 'Restore post' : 'Hide post'}
                        >
                          {d.hidden ? <Eye size={10} /> : <EyeOff size={10} />}
                          {d.hidden ? 'Restore' : 'Hide'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANE — Thread Detail */}
        <div className="flex-grow min-h-0">
          {selectedThread ? (
            <div className="bg-[#111827] border border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-160px)] overflow-hidden">
              
              {/* Thread header */}
              <div className="p-6 border-b border-gray-800 flex-shrink-0">
                <button
                  onClick={() => setSelectedThread(null)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors font-bold mb-4 lg:hidden"
                >
                  <ArrowLeft size={14} /> Back to Forum
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${getCatColor(selectedThread.category)}`}>
                    {selectedThread.category}
                  </span>
                  <span className="text-xs text-gray-400">📍 {selectedThread.locality}</span>
                </div>

                <h2 className="text-xl font-extrabold text-white">{selectedThread.title}</h2>

                <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                  <Avatar name={selectedThread.author?.name} pic={selectedThread.author?.profilePic} size="lg" />
                  <div>
                    <span className="font-bold text-gray-200">{selectedThread.author?.name}</span>
                    <span className="ml-2 text-gray-600 text-[10px]"><TimeAgo date={selectedThread.createdAt} /></span>
                  </div>
                </div>

                <p className="text-sm text-gray-300 leading-relaxed mt-4 pl-4 border-l-2 border-gray-700">
                  {selectedThread.content}
                </p>

                {/* Thread images */}
                {selectedThread.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedThread.images.map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                        <img src={img} alt="" className="w-24 h-24 object-cover rounded-xl border border-gray-700 hover:border-green-500 transition-colors" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-800">
                  <button
                    onClick={() => handleUpvote(selectedThread.id)}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400 text-xs text-gray-300 px-4 py-2 rounded-lg font-bold transition-all border border-gray-700"
                  >
                    <Heart size={14} className="text-green-400" />
                    Like ({selectedThread.upvotes?.length || 0})
                  </button>
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <MessageSquare size={13} /> {selectedThread.comments?.length || 0} comments
                  </span>

                  {/* MODERATOR/ADMIN: hide/unhide the current thread */}
                  {permissions.canHideContent && (
                    <button
                      onClick={async () => {
                        try {
                          await hideDiscussion(selectedThread.id, !selectedThread.hidden);
                          handleSelectThread(selectedThread.id);
                          loadDiscussions();
                        } catch (err) { console.error(err); }
                      }}
                      className={`ml-auto flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                        selectedThread.hidden
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                          : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {selectedThread.hidden ? <Eye size={11} /> : <EyeOff size={11} />}
                      {selectedThread.hidden ? 'Restore Thread' : 'Hide Thread'}
                    </button>
                  )}
                </div>
              </div>

              {/* Comments Section */}
              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={13} /> Comments
                </h3>

                {selectedThread.comments?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs">
                    <MessageSquare size={28} className="mx-auto text-gray-700 mb-2" />
                    No comments yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedThread.comments?.map(comment => (
                      <div key={comment.id} className="bg-[#0b0f19] border border-gray-800/60 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Avatar name={comment.author?.name} pic={comment.author?.profilePic} />
                            <div>
                              <p className="text-xs font-bold text-green-400">{comment.author?.name}</p>
                              <p className="text-[10px] text-gray-600"><TimeAgo date={comment.createdAt} /></p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">{comment.content}</p>

                        {/* Comment images */}
                        {comment.images?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {comment.images.map((img, i) => (
                              <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-700 hover:border-green-500 transition-colors" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Replies */}
                        {comment.replies?.length > 0 && (
                          <div className="pl-4 border-l-2 border-gray-800 space-y-2 mt-2">
                            {comment.replies.map(reply => (
                              <div key={reply.id} className="bg-[#111827] p-3 rounded-lg border border-gray-800/40">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar name={reply.author?.name} pic={reply.author?.profilePic} />
                                    <span className="text-[11px] font-bold text-gray-300">{reply.author?.name}</span>
                                  </div>
                                  <span className="text-[9px] text-gray-600"><TimeAgo date={reply.createdAt} /></span>
                                </div>
                                <p className="text-[11px] text-gray-400 pl-8">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply action — logged-in users only */}
                        {permissions.canCommentOnDiscussions && (
                          <div>
                            {activeReplyBox === comment.id ? (
                              <form onSubmit={(e) => handlePostReply(comment.id, e)} className="flex gap-2 mt-2">
                                <input
                                  type="text" required autoFocus
                                  placeholder="Write a reply..."
                                  value={replyText} onChange={e => setReplyText(e.target.value)}
                                  className="flex-grow bg-[#111827] border border-gray-700 focus:border-green-500 text-xs text-white rounded-lg px-3 py-2 outline-none"
                                />
                                <button type="submit" className="bg-green-500 hover:bg-green-600 text-black p-2 rounded-lg transition-colors">
                                  <Send size={12} />
                                </button>
                                <button type="button" onClick={() => setActiveReplyBox(null)} className="text-gray-500 hover:text-white p-2">
                                  <X size={12} />
                                </button>
                              </form>
                            ) : (
                              <button
                                onClick={() => setActiveReplyBox(comment.id)}
                                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-green-400 font-semibold mt-1 transition-colors"
                              >
                                <ReplyIcon size={11} /> Reply
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment Input Box — logged-in users only (not visitors) */}
              {permissions.canCommentOnDiscussions ? (
                <div className="p-4 border-t border-gray-800 flex-shrink-0 bg-[#0d1120]">
                  <form onSubmit={handlePostComment} className="space-y-2">
                    <div className="flex gap-2 items-start">
                      <Avatar name={user.name} pic={user.profilePic} size="lg" />
                      <div className="flex-grow space-y-2">
                        <textarea
                          required rows={2}
                          placeholder="Write a comment..."
                          value={commentText} onChange={e => setCommentText(e.target.value)}
                          className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-xl p-3 outline-none resize-none transition-colors"
                        />
                        {showCommentImage && (
                          <div className="flex gap-2">
                            <input type="url" placeholder="Image URL..."
                              value={commentImageUrl} onChange={e => setCommentImageUrl(e.target.value)}
                              className="flex-grow bg-[#0b0f19] border border-gray-800 text-xs text-white rounded-lg p-2 outline-none" />
                            {commentImageUrl && (
                              <img src={commentImageUrl} alt="" className="w-10 h-10 object-cover rounded-lg border border-gray-700" />
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setShowCommentImage(v => !v)}
                            className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${showCommentImage ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}
                          >
                            <Image size={12} /> Attach Image
                          </button>
                          <button
                            type="submit"
                            disabled={submittingComment}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 text-black text-xs font-black px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                          >
                            <Send size={12} /> {submittingComment ? 'Posting...' : 'Comment'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                /* VISITOR: show sign-in prompt instead of comment box */
                <div className="p-4 border-t border-gray-800 flex-shrink-0 bg-[#0d1120]">
                  <div className="flex items-center justify-center gap-3 py-3 bg-gray-800/30 border border-gray-700/50 rounded-xl">
                    <Shield size={15} className="text-gray-500" />
                    <p className="text-xs text-gray-500 font-semibold">
                      <a href="/" className="text-green-400 hover:text-green-300 font-bold transition-colors">Sign in</a>
                      {' '}to join the discussion
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-24 text-gray-600">
              <div className="w-20 h-20 rounded-2xl bg-gray-800/50 flex items-center justify-center mb-4">
                <MessageSquare size={36} className="text-gray-700" />
              </div>
              <p className="font-bold text-gray-500">Select a thread to read the discussion</p>
              <p className="text-xs text-gray-700 mt-1">Click any thread on the left to open it</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
