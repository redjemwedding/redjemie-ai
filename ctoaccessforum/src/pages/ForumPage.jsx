import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  collection, query, where, orderBy, limit,
  onSnapshot, updateDoc, doc, increment, addDoc, serverTimestamp,
  arrayUnion, arrayRemove
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { uploadFile } from '@/lib/cloudinary'
import { timeAgo, strToColor, initials, CHANNELS, ROLE_META, parseVideoUrl } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── channel id map — handles both old and new channel values ──────
const CHANNEL_MAP = {
  'cloud':        'cloud',
  'Cloud & Infra':'cloud',
  'cloud & infra':'cloud',
  'security':     'security',
  'Security':     'security',
  'ai':           'ai',
  'AI & Automation':'ai',
  'ai & automation':'ai',
  'leadership':   'leadership',
  'Leadership':   'leadership',
  'uae':          'uae',
  'UAE Market':   'uae',
  'uae market':   'uae',
  'vendors':      'vendors',
  'Vendor Reviews':'vendors',
  'career':       'career',
  'Career Advice':'career',
  'general':      'general',
  'General':      'general',
  'all':          'all',
}

function normalizeChannel(ch) {
  return CHANNEL_MAP[ch] || ch?.toLowerCase() || 'general'
}

// ── image preview component ───────────────────────────────────────
function ImagePreview({ url, name }) {
  const [err, setErr] = useState(false)
  const ext = name?.split('.').pop()?.toLowerCase()
  const isImage = ['jpg','jpeg','png','gif','webp','svg'].includes(ext)
  if (!url) return null
  if (!isImage || err) {
    return (
      <div className="flex items-center gap-2.5 bg-[#1a1a1a] border border-white/[.05] rounded-[7px] px-3 py-2 mb-3">
        <div className="text-[0.62rem] font-bold text-gray-500 font-[Montserrat] uppercase w-8 h-7 flex items-center justify-center bg-white/[.03] border border-white/[.06] rounded flex-shrink-0">
          {ext?.toUpperCase() || 'FILE'}
        </div>
        <div className="flex-1 min-w-0 text-[0.72rem] font-medium truncate">{name || 'Attachment'}</div>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-[0.68rem] font-bold font-[Montserrat] text-[#FF4447] hover:underline flex-shrink-0">
          Download
        </a>
      </div>
    )
  }
  return (
    <div className="mb-3 rounded-[8px] overflow-hidden border border-white/[.06]">
      <img
        src={url}
        alt={name || 'image'}
        onError={() => setErr(true)}
        className="w-full max-h-[400px] object-contain bg-[#1a1a1a]"
      />
    </div>
  )
}

export default function ForumPage() {
  const { profile } = useAuth()
  const { ch }      = useParams()
  const nav         = useNavigate()

  // normalize channel from URL param
  const [channel, setChannel] = useState(ch ? normalizeChannel(ch) : 'all')
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form,    setForm]    = useState({ channel: 'cloud', title: '', body: '', videoUrl: '' })
  const [file,    setFile]    = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [posting, setPosting] = useState(false)
  const [upPct,   setUpPct]   = useState(0)
  const modalRef = useRef(null)

  // ── fetch posts filtered by channel ──────────────────────────────
  useEffect(() => {
    setLoading(true)
    let q
    if (!channel || channel === 'all') {
      q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30))
    } else {
      // query using normalized id AND also catch legacy stored values
      q = query(
        collection(db, 'posts'),
        where('channel', '==', channel),
        orderBy('createdAt', 'desc'),
        limit(30)
      )
    }
    return onSnapshot(q,
      s => { setPosts(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
  }, [channel])

  // ── search filter ─────────────────────────────────────────────────
  const filtered = search
    ? posts.filter(p => `${p.title} ${p.body} ${p.authorName}`.toLowerCase().includes(search.toLowerCase()))
    : posts

  // ── file selection with image preview ────────────────────────────
  function handleFileSelect(f) {
    setFile(f)
    if (!f) { setImagePreviewUrl(null); return }
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
      const reader = new FileReader()
      reader.onload = e => setImagePreviewUrl(e.target.result)
      reader.readAsDataURL(f)
    } else {
      setImagePreviewUrl(null)
    }
  }

  // ── submit post ───────────────────────────────────────────────────
  async function submitPost() {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and content required'); return }
    setPosting(true)
    try {
      let fileUrl = null, fileName = null, fileType = null
      if (file) {
        const res = await uploadFile(file, p => setUpPct(p))
        fileUrl = res.url; fileName = file.name
        fileType = file.type || ''
      }
      const postRef = await addDoc(collection(db, 'posts'), {
        channel:    form.channel,
        title:      form.title.trim(),
        body:       form.body.trim(),
        fileUrl,
        fileName,
        fileType,
        videoUrl:   form.videoUrl || null,
        tags:       [],
        authorId:   profile.uid,
        authorName: profile.displayName,
        authorRole: profile.role,
        pinned:     false,
        likes:      0,
        likedBy:    [],
        replies:    0,
        views:      0,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
      })
      await updateDoc(doc(db, 'users', profile.uid), { posts: increment(1), xp: increment(5) })
      setShowNew(false)
      setForm({ channel: 'cloud', title: '', body: '', videoUrl: '' })
      setFile(null); setImagePreviewUrl(null); setUpPct(0)
      toast.success('Post published.')
      nav(`/forum/post/${postRef.id}`)
    } catch (err) { toast.error(err.message) }
    finally { setPosting(false) }
  }

  // ── like toggle ───────────────────────────────────────────────────
  function toggleLike(p) {
    if (!profile?.uid) return
    const liked = p.likedBy?.includes(profile.uid)
    updateDoc(doc(db, 'posts', p.id), {
      likes:   increment(liked ? -1 : 1),
      likedBy: liked ? arrayRemove(profile.uid) : arrayUnion(profile.uid),
    }).catch(err => toast.error(err.message))
  }

  const ic = "w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"

  // channel label helper
  function channelLabel(ch) {
    return CHANNELS.find(c => c.id === normalizeChannel(ch))?.label || ch || 'General'
  }

  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-[Montserrat] text-[1.3rem] font-black">Community Forum</h1>
          <p className="text-[0.76rem] text-gray-500 mt-0.5">Discussions, questions, and insights.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="bg-[#E5181B] hover:bg-[#C01215] text-white px-4 py-2 rounded-[8px] text-[0.76rem] font-bold font-[Montserrat] transition-colors">
          New Post
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[168px_1fr] gap-4">
        {/* ── channel sidebar ── */}
        <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
          {CHANNELS.map(c => (
            <button key={c.id}
              onClick={() => setChannel(c.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-[0.74rem] font-medium whitespace-nowrap transition-all text-left ${channel === c.id ? 'bg-[rgba(229,24,27,.1)] text-[#FF4447] font-semibold' : 'text-gray-500 hover:bg-white/[.04] hover:text-white'}`}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color || '#666' }} />
              {c.label}
            </button>
          ))}
        </div>

        {/* ── posts list ── */}
        <div>
          {/* search */}
          <div className="mb-4">
            <input value={search} onChange={ev => setSearch(ev.target.value)}
              placeholder={`Search ${channel === 'all' ? 'all posts' : channelLabel(channel)}…`}
              className="w-full bg-[#111] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.8rem] outline-none font-[Poppins] placeholder-gray-600" />
          </div>

          {/* active channel indicator */}
          {channel !== 'all' && (
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: CHANNELS.find(c => c.id === channel)?.color || '#666' }} />
              <span className="text-[0.72rem] font-bold font-[Montserrat] text-gray-400">{channelLabel(channel)}</span>
              <button onClick={() => setChannel('all')}
                className="ml-auto text-[0.67rem] text-gray-600 hover:text-gray-300 font-[Montserrat]">
                Clear filter
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-[0.85rem]">
              {channel !== 'all'
                ? <span>No posts in {channelLabel(channel)} yet. <button onClick={() => setShowNew(true)} className="text-[#FF4447] hover:underline">Create one.</button></span>
                : <span>No posts yet. <button onClick={() => setShowNew(true)} className="text-[#FF4447] hover:underline">Create one.</button></span>}
            </div>
          ) : filtered.map(p => {
            const normCh = normalizeChannel(p.channel)
            const chMeta = CHANNELS.find(c => c.id === normCh)
            const isImage = ['jpg','jpeg','png','gif','webp'].includes(p.fileName?.split('.').pop()?.toLowerCase())
            return (
              <div key={p.id}
                className={`bg-[#111] border rounded-[12px] p-4 mb-2.5 transition-all ${p.pinned ? 'border-l-2 border-l-[#E5181B] border-white/[.05]' : 'border-white/[.05] hover:border-white/[.1]'}`}>
                {/* author */}
                <div className="flex gap-3 mb-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.62rem] flex-shrink-0"
                    style={{ background: strToColor(p.authorId || '') }}>
                    {initials(p.authorName || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[0.76rem] font-semibold mb-0.5 flex-wrap">
                      <span>{p.authorName}</span>
                      <span className={`text-[0.58rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${(ROLE_META[p.authorRole] || ROLE_META.member_free).cls}`}>
                        {(ROLE_META[p.authorRole] || ROLE_META.member_free).label}
                      </span>
                      {p.pinned && <span className="text-[0.6rem] font-bold text-amber-400 font-[Montserrat]">Pinned</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-[0.63rem] text-gray-500">
                      <span>{timeAgo(p.createdAt)}</span>
                      <span>·</span>
                      {chMeta && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: chMeta.color }} />}
                      <span>{chMeta?.label || channelLabel(p.channel)}</span>
                    </div>
                  </div>
                </div>

                {/* title */}
                <div onClick={() => nav(`/forum/post/${p.id}`)}
                  className="font-[Montserrat] text-[0.9rem] font-bold mb-1.5 cursor-pointer hover:text-[#FF4447] transition-colors leading-snug">
                  {p.title}
                </div>

                {/* body */}
                <div className="text-[0.77rem] text-gray-400 leading-relaxed mb-3 line-clamp-2">{p.body}</div>

                {/* tags */}
                {p.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.tags.map(t => (
                      <span key={t} className="text-[0.6rem] bg-white/[.03] border border-white/[.05] text-gray-500 px-2 py-0.5 rounded font-[Montserrat]">{t}</span>
                    ))}
                  </div>
                )}

                {/* video */}
                {p.videoUrl && (() => {
                  const e = parseVideoUrl(p.videoUrl)
                  return e ? (
                    <div className="mb-3 video-wrap">
                      <iframe src={e.src} allowFullScreen className="absolute inset-0 w-full h-full border-0" />
                    </div>
                  ) : null
                })()}

                {/* image attachment — shows image inline */}
                {p.fileUrl && isImage && (
                  <div className="mb-3 rounded-[8px] overflow-hidden border border-white/[.06]">
                    <img
                      src={p.fileUrl}
                      alt={p.fileName || 'image'}
                      className="w-full max-h-[360px] object-contain bg-[#1a1a1a]"
                    />
                  </div>
                )}

                {/* file attachment — non-image */}
                {p.fileUrl && !isImage && (
                  <div className="flex items-center gap-2.5 bg-[#1a1a1a] border border-white/[.05] rounded-[7px] px-3 py-2 mb-3">
                    <div className="text-[0.62rem] font-bold text-gray-500 font-[Montserrat] uppercase w-8 h-7 flex items-center justify-center bg-white/[.03] border border-white/[.06] rounded flex-shrink-0">
                      {p.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}
                    </div>
                    <div className="flex-1 min-w-0 text-[0.72rem] font-medium truncate">{p.fileName || 'Attachment'}</div>
                    <a href={p.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[0.68rem] font-bold font-[Montserrat] text-[#FF4447] hover:underline flex-shrink-0">
                      Download
                    </a>
                  </div>
                )}

                {/* actions */}
                <div className="flex items-center gap-4 text-[0.72rem] text-gray-500 pt-2.5 border-t border-white/[.04]">
                  <button onClick={() => toggleLike(p)}
                    className={`flex items-center gap-1.5 transition-colors ${p.likedBy?.includes(profile?.uid) ? 'text-[#FF4447]' : 'hover:text-gray-300'}`}>
                    {p.likedBy?.includes(profile?.uid) ? '♥' : '♡'} {p.likes || 0}
                  </button>
                  <button onClick={() => nav(`/forum/post/${p.id}`)}
                    className="flex items-center gap-1.5 hover:text-gray-300 transition-colors">
                    Reply ({p.replies || 0})
                  </button>
                  {(p.authorId === profile?.uid) && (
                    <button onClick={() => nav(`/forum/post/${p.id}?edit=1`)}
                      className="hover:text-gray-300 transition-colors">
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/forum/post/${p.id}`); toast.success('Link copied.') }}
                    className="ml-auto hover:text-gray-300 transition-colors">
                    Share
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── new post modal ── */}
      {showNew && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[900] flex items-center justify-center p-4"
          onClick={ev => ev.target === ev.currentTarget && setShowNew(false)}>
          <div
            ref={modalRef}
            className="bg-[#161616] border border-white/[.06] rounded-[16px] w-full max-w-2xl red-topline flex flex-col"
            style={{ maxHeight: '90vh' }}>

            {/* modal header — fixed */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/[.05] flex-shrink-0">
              <div>
                <h2 className="font-[Montserrat] font-black text-[1rem]">Create Post</h2>
                <p className="text-[0.72rem] text-gray-500 mt-0.5">Share knowledge, ask questions, or start a discussion.</p>
              </div>
              <button onClick={() => setShowNew(false)}
                className="w-7 h-7 rounded-[6px] bg-white/5 border border-white/[.06] flex items-center justify-center text-gray-500 hover:text-white text-sm flex-shrink-0">
                ✕
              </button>
            </div>

            {/* modal body — scrollable */}
            <div className="overflow-y-auto flex-1 p-6 pt-4">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[0.68rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Channel</label>
                  <select value={form.channel} onChange={ev => setForm(f => ({ ...f, channel: ev.target.value }))} className={ic}>
                    {CHANNELS.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[0.68rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Title</label>
                  <input value={form.title} onChange={ev => setForm(f => ({ ...f, title: ev.target.value }))}
                    placeholder="Post title…" maxLength={200} className={ic} />
                </div>
                <div>
                  <label className="block text-[0.68rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Content</label>
                  <textarea value={form.body} onChange={ev => setForm(f => ({ ...f, body: ev.target.value }))}
                    placeholder="Share your thoughts…" rows={4} maxLength={10000}
                    className={`${ic} resize-none`} />
                </div>
                <div>
                  <label className="block text-[0.68rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Image or File (optional)</label>
                  <div className="border border-dashed border-white/[.08] rounded-[8px] px-4 py-3 cursor-pointer hover:border-red-500/25 transition-colors"
                    onClick={() => document.getElementById('f-file').click()}>
                    {imagePreviewUrl ? (
                      <div className="relative">
                        <img src={imagePreviewUrl} alt="preview" className="w-full max-h-[200px] object-contain rounded-[6px] bg-[#1a1a1a]" />
                        <button
                          onClick={ev => { ev.stopPropagation(); handleFileSelect(null) }}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full text-white text-xs flex items-center justify-center">
                          ✕
                        </button>
                      </div>
                    ) : file ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[0.78rem] text-white">{file.name}</span>
                        <button onClick={ev => { ev.stopPropagation(); handleFileSelect(null) }}
                          className="text-gray-500 hover:text-red-400 text-xs ml-auto">✕</button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-[0.75rem] text-gray-500">Click to attach an image or file</div>
                        <div className="text-[0.65rem] text-gray-700 mt-0.5">PNG, JPG, GIF, PDF, DOCX, ZIP — max 50MB</div>
                      </div>
                    )}
                    {upPct > 0 && posting && (
                      <div className="h-1 bg-white/[.06] rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-[#E5181B] rounded-full transition-all" style={{ width: `${upPct}%` }} />
                      </div>
                    )}
                  </div>
                  <input id="f-file" type="file" className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.pptx,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={ev => handleFileSelect(ev.target.files[0] || null)} />
                </div>
                <div>
                  <label className="block text-[0.68rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Video link (optional)</label>
                  <input value={form.videoUrl} onChange={ev => setForm(f => ({ ...f, videoUrl: ev.target.value }))}
                    placeholder="YouTube, Vimeo, or Google Drive link" type="url" className={ic} />
                </div>
                {/* end of form fields */}
              </div>
            </div>

            {/* modal footer — fixed */}
            <div className="flex gap-2 p-6 pt-4 border-t border-white/[.05] flex-shrink-0">
              <button onClick={() => setShowNew(false)}
                className="px-5 py-2.5 bg-white/[.04] border border-white/[.08] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px]">
                Cancel
              </button>
              <button onClick={submitPost} disabled={posting}
                className="flex-1 py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {posting
                  ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Publishing…</span></>
                  : 'Publish Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
