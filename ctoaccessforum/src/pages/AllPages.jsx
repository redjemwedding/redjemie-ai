import { useEffect, useState } from 'react'
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

// ═══════════════════════════════════════════════
//  DASHBOARD PAGE
// ═══════════════════════════════════════════════
export function DashboardPage() {
  const { profile, isInstructor } = useAuth()
  const nav = useNavigate()
  const [posts,   setPosts]   = useState([])
  const [leaders, setLeaders] = useState([])
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.displayName?.split(' ')[0] || 'there'

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(6))
    return onSnapshot(q, s => setPosts(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {})
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(5))
    return onSnapshot(q, s => setLeaders(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {})
  }, [])

  const kpis = [
    { l: 'XP Points',  v: (profile?.xp || 0).toLocaleString(), c: 'text-[#FF4447]' },
    { l: 'Posts',      v: profile?.posts || 0,                  c: 'text-blue-400'  },
    { l: 'Courses',    v: profile?.enrolledCourses?.length || 0, c: 'text-green-400' },
    { l: 'Streak',     v: `${profile?.streak || 0} days`,       c: 'text-amber-400' },
  ]

  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="font-[Montserrat] text-[1.4rem] font-black mb-1">{greeting}, {firstName}</h1>
        <p className="text-[0.82rem] text-gray-500">Welcome to CTO Access Forum University.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map(k => (
          <div key={k.l} className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#E5181B]" />
            <div className={`font-[Montserrat] text-[1.5rem] font-black leading-none ${k.c} mb-1`}>{k.v}</div>
            <div className="text-[0.62rem] text-gray-500 uppercase tracking-[.06em] font-[Montserrat]">{k.l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        <div className="flex flex-col gap-4">
          <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500">Recent Activity</span>
              <button onClick={() => nav('/forum')} className="text-[0.7rem] text-[#FF4447] font-[Montserrat] font-bold hover:underline">View Forum</button>
            </div>
            {posts.length === 0 ? (
              <div className="text-[0.8rem] text-gray-500 py-4 text-center">
                No posts yet. <button onClick={() => nav('/forum')} className="text-[#FF4447] hover:underline">Be the first.</button>
              </div>
            ) : posts.map(p => (
              <div key={p.id}
                onClick={() => nav(`/forum/post/${p.id}`)}
                className="flex gap-3 py-3 border-b border-white/[.05] last:border-0 first:pt-0 cursor-pointer hover:bg-white/[.02] -mx-2 px-2 rounded transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.6rem] flex-shrink-0"
                  style={{ background: strToColor(p.authorId || '') }}>
                  {initials(p.authorName || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.77rem] font-semibold mb-0.5 truncate">{p.authorName} <span className="text-gray-500 font-normal">posted</span></div>
                  <div className="text-[0.74rem] text-gray-400 mb-1 truncate font-medium">{p.title}</div>
                  <div className="flex items-center gap-2 text-[0.62rem] text-gray-600">
                    <span className="bg-[rgba(229,24,27,.08)] text-[#FF4447] px-1.5 py-0.5 rounded text-[0.6rem] font-bold font-[Montserrat]">
                      {CHANNELS.find(c => c.id === p.channel)?.label || 'General'}
                    </span>
                    <span>{timeAgo(p.createdAt)}</span>
                    <span>{p.likes || 0} likes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isInstructor && (
            <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
              <div className="font-[Montserrat] text-[0.88rem] font-bold mb-1">Teach on the Platform</div>
              <div className="text-[0.76rem] text-gray-400 leading-relaxed mb-3">Apply to become an instructor — reviewed within 3–5 business days.</div>
              <button onClick={() => nav('/profile?apply=1')} className="bg-[#E5181B] hover:bg-[#C01215] text-white px-3.5 py-1.5 rounded-[8px] text-[0.74rem] font-bold font-[Montserrat] transition-colors">
                Apply as Instructor
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
            <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-3">Top Members</div>
            {leaders.length === 0 ? (
              <div className="text-[0.75rem] text-gray-600 py-2">Loading…</div>
            ) : leaders.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-2.5 py-2 border-b border-white/[.05] last:border-0 ${m.uid === profile?.uid ? 'bg-red-900/5 -mx-2 px-2 rounded-lg' : ''}`}>
                <span className={`font-[Montserrat] text-[0.72rem] font-black w-4 text-center ${i < 3 ? 'text-[#E5181B]' : 'text-gray-600'}`}>{i + 1}</span>
                <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.54rem] flex-shrink-0"
                  style={{ background: strToColor(m.uid || m.id) }}>
                  {initials(m.displayName || '?')}
                </div>
                <span className="flex-1 text-[0.74rem] font-medium truncate">
                  {m.displayName}{m.uid === profile?.uid ? ' (you)' : ''}
                </span>
                <span className="font-[Montserrat] text-[0.68rem] font-bold text-[#FF4447]">{(m.xp || 0).toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
//  FORUM PAGE
// ═══════════════════════════════════════════════
export function ForumPage() {
  const { profile } = useAuth()
  const { ch }      = useParams()
  const nav         = useNavigate()

  const [channel, setChannel] = useState(ch || 'all')
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form,    setForm]    = useState({ channel: 'all', title: '', body: '', videoUrl: '', tags: '' })
  const [file,    setFile]    = useState(null)
  const [posting, setPosting] = useState(false)
  const [upPct,   setUpPct]   = useState(0)

  useEffect(() => {
    setLoading(true)
    let q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30))
    if (channel && channel !== 'all')
      q = query(collection(db, 'posts'), where('channel', '==', channel), orderBy('createdAt', 'desc'), limit(30))
    return onSnapshot(q,
      s => { setPosts(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
  }, [channel])

  const filtered = search
    ? posts.filter(p => `${p.title} ${p.body} ${p.authorName}`.toLowerCase().includes(search.toLowerCase()))
    : posts

  async function submitPost() {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and content required'); return }
    setPosting(true)
    try {
      let fileUrl = null, fileName = null
      if (file) {
        const res = await uploadFile(file, p => setUpPct(p))
        fileUrl = res.url; fileName = file.name
      }
      const postRef = await addDoc(collection(db, 'posts'), {
        channel:    form.channel === 'all' ? 'general' : form.channel,
        title:      form.title.trim(),
        body:       form.body.trim(),
        fileUrl,
        fileName,
        videoUrl:   form.videoUrl || null,
        tags:       form.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10),
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
      setForm({ channel: 'all', title: '', body: '', videoUrl: '', tags: '' })
      setFile(null); setUpPct(0)
      toast.success('Post published.')
      nav(`/forum/post/${postRef.id}`)
    } catch (err) { toast.error(err.message) }
    finally { setPosting(false) }
  }

  function toggleLike(p) {
    if (!profile?.uid) return
    const liked = p.likedBy?.includes(profile.uid)
    updateDoc(doc(db, 'posts', p.id), {
      likes:   increment(liked ? -1 : 1),
      likedBy: liked ? arrayRemove(profile.uid) : arrayUnion(profile.uid),
    }).catch(err => toast.error(err.message))
  }

  const ic = "w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"

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
        {/* channels */}
        <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
          {CHANNELS.map(c => (
            <button key={c.id} onClick={() => setChannel(c.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-[0.74rem] font-medium whitespace-nowrap transition-all text-left ${channel === c.id ? 'bg-[rgba(229,24,27,.1)] text-[#FF4447] font-semibold' : 'text-gray-500 hover:bg-white/[.04] hover:text-white'}`}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color || '#666' }} />
              {c.label}
            </button>
          ))}
        </div>

        {/* posts */}
        <div>
          <div className="mb-4">
            <input value={search} onChange={ev => setSearch(ev.target.value)} placeholder="Search posts…"
              className="w-full bg-[#111] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.8rem] outline-none font-[Poppins] placeholder-gray-600" />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-[0.85rem]">
              No posts yet. <button onClick={() => setShowNew(true)} className="text-[#FF4447] hover:underline">Create one.</button>
            </div>
          ) : filtered.map(p => (
            <div key={p.id}
              className={`bg-[#111] border rounded-[12px] p-4 mb-2.5 transition-all ${p.pinned ? 'border-l-2 border-l-[#E5181B] border-white/[.05]' : 'border-white/[.05] hover:border-white/[.1]'}`}>
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
                  <div className="text-[0.63rem] text-gray-500">
                    {timeAgo(p.createdAt)} · {CHANNELS.find(c => c.id === p.channel)?.label || 'General'}
                  </div>
                </div>
              </div>

              <div onClick={() => nav(`/forum/post/${p.id}`)}
                className="font-[Montserrat] text-[0.9rem] font-bold mb-1.5 cursor-pointer hover:text-[#FF4447] transition-colors leading-snug">
                {p.title}
              </div>
              <div className="text-[0.77rem] text-gray-400 leading-relaxed mb-3 line-clamp-2">{p.body}</div>

              {p.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {p.tags.map(t => (
                    <span key={t} className="text-[0.6rem] bg-white/[.03] border border-white/[.05] text-gray-500 px-2 py-0.5 rounded font-[Montserrat]">{t}</span>
                  ))}
                </div>
              )}

              {p.videoUrl && (() => { const e = parseVideoUrl(p.videoUrl); return e ? <div className="mb-3 video-wrap"><iframe src={e.src} allowFullScreen className="absolute inset-0 w-full h-full border-0" /></div> : null })()}

              {p.fileUrl && (
                <div className="flex items-center gap-2.5 bg-[#1a1a1a] border border-white/[.05] rounded-[7px] px-3 py-2 mb-3">
                  <div className="text-[0.62rem] font-bold text-gray-500 font-[Montserrat] uppercase w-8 h-7 flex items-center justify-center bg-white/[.03] border border-white/[.06] rounded flex-shrink-0">
                    {p.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}
                  </div>
                  <div className="flex-1 min-w-0 text-[0.72rem] font-medium truncate">{p.fileName || 'Attachment'}</div>
                  <a href={p.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[0.68rem] font-bold font-[Montserrat] text-[#FF4447] hover:underline flex-shrink-0">Download</a>
                </div>
              )}

              <div className="flex items-center gap-4 text-[0.72rem] text-gray-500 pt-2.5 border-t border-white/[.04]">
                <button onClick={() => toggleLike(p)}
                  className={`flex items-center gap-1.5 transition-colors ${p.likedBy?.includes(profile?.uid) ? 'text-[#FF4447]' : 'hover:text-gray-300'}`}>
                  {p.likedBy?.includes(profile?.uid) ? '♥' : '♡'} {p.likes || 0}
                </button>
                <button onClick={() => nav(`/forum/post/${p.id}`)}
                  className="flex items-center gap-1.5 hover:text-gray-300 transition-colors">
                  Reply ({p.replies || 0})
                </button>
                <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/forum/post/${p.id}`); toast.success('Link copied.') }}
                  className="ml-auto hover:text-gray-300 transition-colors">
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* new post modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[900] flex items-center justify-center p-5"
          onClick={ev => ev.target === ev.currentTarget && setShowNew(false)}>
          <div className="bg-[#161616] border border-white/[.06] rounded-[16px] p-7 w-full max-w-2xl red-topline max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-[Montserrat] font-black text-[1rem]">Create Post</h2>
                <p className="text-[0.72rem] text-gray-500 mt-0.5">Share knowledge, ask questions, or start a discussion.</p>
              </div>
              <button onClick={() => setShowNew(false)}
                className="w-7 h-7 rounded-[6px] bg-white/5 border border-white/[.06] flex items-center justify-center text-gray-500 hover:text-white text-sm">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[0.68rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Channel</label>
                <select value={form.channel} onChange={ev => setForm(f => ({ ...f, channel: ev.target.value }))} className={ic}>
                  {CHANNELS.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
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
                  placeholder="Share your thoughts…" rows={5} maxLength={10000} className={`${ic} resize-y`} />
              </div>
              <div>
                <label className="block text-[0.68rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Attachment (optional)</label>
                <div className="border border-dashed border-white/[.08] rounded-[8px] px-4 py-3 cursor-pointer hover:border-red-500/25 transition-colors text-center"
                  onClick={() => document.getElementById('f-file').click()}>
                  {file
                    ? <span className="text-[0.78rem] text-white">{file.name}</span>
                    : <span className="text-[0.75rem] text-gray-500">Click to attach — PDF, DOCX, ZIP, max 50MB</span>}
                  {upPct > 0 && (
                    <div className="h-1 bg-white/[.06] rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-[#E5181B] rounded-full transition-all" style={{ width: `${upPct}%` }} />
                    </div>
                  )}
                </div>
                <input id="f-file" type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.pptx"
                  onChange={ev => setFile(ev.target.files[0] || null)} />
              </div>
              <div>
                <label className="block text-[0.68rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Video link (optional)</label>
                <input value={form.videoUrl} onChange={ev => setForm(f => ({ ...f, videoUrl: ev.target.value }))}
                  placeholder="YouTube, Vimeo, or Google Drive link" type="url" className={ic} />
              </div>
              <div>
                <label className="block text-[0.68rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Tags (optional)</label>
                <input value={form.tags} onChange={ev => setForm(f => ({ ...f, tags: ev.target.value }))}
                  placeholder="security, cloud, ai — comma separated" className={ic} />
              </div>
              <div className="flex gap-2 pt-1">
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
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
//  COURSES PAGE
// ═══════════════════════════════════════════════
export function CoursesPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('All')
  const FILTERS = ['All', 'Free', 'Cloud', 'Security', 'AI Strategy', 'Leadership', 'DevOps']

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'))
    return onSnapshot(q,
      s => { setCourses(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
  }, [])

  async function handleEnroll(course) {
    if (!profile?.uid) return
    const enrolled = profile?.enrolledCourses?.includes(course.id)
    if (enrolled) { nav(`/courses/${course.id}`); return }
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        enrolledCourses: arrayUnion(course.id),
        xp: increment(10),
      })
      toast.success(`Enrolled in "${course.title}"`)
    } catch (err) { toast.error(err.message) }
  }

  const shown = courses.filter(c => {
    if (filter === 'All')  return true
    if (filter === 'Free') return c.price === 0
    return c.category === filter
  })

  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-[Montserrat] text-[1.3rem] font-black">Course Library</h1>
          <p className="text-[0.76rem] text-gray-500 mt-0.5">Expand your knowledge with expert-led courses.</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-[6px] text-[0.73rem] font-bold font-[Montserrat] border transition-all ${filter === f ? 'bg-[rgba(229,24,27,.1)] border-red-500/25 text-[#FF4447]' : 'border-white/[.08] text-gray-500 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-green-900/10 border border-green-500/20 rounded-[12px] p-4 mb-5 flex items-center gap-3">
        <div>
          <div className="font-[Montserrat] text-[0.8rem] font-bold text-green-300 mb-0.5">Free Courses Available</div>
          <div className="text-[0.72rem] text-gray-500">Courses marked Free are fully unlocked for all members.</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-[0.85rem]">No courses available yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shown.map(c => {
            const enrolled = profile?.enrolledCourses?.includes(c.id)
            return (
              <div key={c.id}
                className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden cursor-pointer hover:border-red-500/20 hover:-translate-y-0.5 transition-all">
                <div className="h-28 flex items-center justify-center relative text-[0.9rem] font-black text-white font-[Montserrat]"
                  style={{ background: c.thumbnail || 'linear-gradient(135deg,#1a0505,#3d0a0a)' }}>
                  {c.emoji || c.title?.charAt(0) || 'C'}
                  <span className={`absolute top-2 left-2 text-[0.58rem] font-bold font-[Montserrat] px-2 py-0.5 rounded uppercase ${c.level === 'Beginner' ? 'bg-green-900/40 text-green-300' : c.level === 'Advanced' ? 'bg-red-900/40 text-red-300' : 'bg-yellow-900/40 text-yellow-300'}`}>
                    {c.level || 'All levels'}
                  </span>
                  {c.price === 0 && (
                    <span className="absolute top-2 right-2 text-[0.58rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-green-900/40 text-green-300 border border-green-500/25">
                      Free
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-[0.59rem] text-[#FF4447] font-bold font-[Montserrat] uppercase tracking-wide mb-1">{c.category}</div>
                  <div className="font-[Montserrat] font-bold text-[0.85rem] mb-1.5 leading-snug">{c.title}</div>
                  <div className="text-[0.67rem] text-gray-500 mb-3">{c.instructorName || 'CTO Access'}</div>
                  <div className="flex items-center justify-between border-t border-white/[.05] pt-3">
                    <div className="text-[0.64rem] text-gray-500">{c.lessons || 0} lessons · {c.duration || '—'}</div>
                    <button onClick={() => handleEnroll(c)}
                      className={`text-[0.68rem] font-bold font-[Montserrat] px-2.5 py-1 rounded-[6px] transition-colors ${enrolled ? 'bg-green-900/20 text-green-400 border border-green-500/20' : c.price === 0 ? 'bg-[rgba(229,24,27,.1)] text-[#FF4447] border border-red-500/20' : 'bg-[rgba(229,24,27,.1)] text-[#FF4447] border border-red-500/20'}`}>
                      {enrolled ? 'Continue' : c.price === 0 ? 'Enroll Free' : `AED ${c.price}`}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
//  PROFILE PAGE
// ═══════════════════════════════════════════════
export function ProfilePage() {
  const { profile, isInstructor, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [applying, setApplying] = useState(() => new URLSearchParams(window.location.search).get("apply") === "1")
  const [appForm, setAppForm] = useState({ topic: '', bio: '' })
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    title:       profile?.title       || '',
    location:    profile?.location    || '',
    bio:         profile?.bio         || '',
  })

  const rm = ROLE_META[profile?.role] || ROLE_META.member_free

  if (!profile) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )

  function startEdit() {
    setForm({
      displayName: profile.displayName || '',
      title:       profile.title       || '',
      location:    profile.location    || '',
      bio:         profile.bio         || '',
    })
    setEditing(true)
  }

  async function saveProfile() {
    if (!form.displayName.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: form.displayName.trim(),
        title:       form.title.trim(),
        location:    form.location.trim(),
        bio:         form.bio.trim(),
      })
      await refreshProfile()
      setEditing(false)
      toast.success('Profile updated.')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function submitInstructorApp() {
    if (!appForm.topic.trim() || !appForm.bio.trim()) {
      toast.error('Please fill in all fields'); return
    }
    try {
      await addDoc(collection(db, 'applications'), {
        uid:         profile.uid,
        name:        profile.displayName,
        email:       profile.email,
        topic:       appForm.topic.trim(),
        bio:         appForm.bio.trim(),
        status:      'pending',
        appliedAt:   serverTimestamp(),
      })
      toast.success('Application submitted! Admin will review within 3–5 days.')
      setApplying(false)
      setAppForm({ topic: '', bio: '' })
    } catch (err) { toast.error(err.message) }
  }

  const ic = "w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"

  const stats = [
    { l: 'XP Points', v: (profile.xp    || 0).toLocaleString() },
    { l: 'Courses',   v: profile.enrolledCourses?.length || 0   },
    { l: 'Posts',     v: profile.posts   || 0                   },
    { l: 'Streak',    v: `${profile.streak || 0} days`          },
  ]

  return (
    <div className="max-w-screen-sm mx-auto">
      <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-6 mb-4 red-topline relative">
        <div className="absolute top-5 right-5 flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-[0.72rem] font-bold font-[Montserrat] bg-white/[.04] border border-white/[.08] text-gray-400 hover:text-white rounded-[7px]">
                Cancel
              </button>
              <button onClick={saveProfile} disabled={saving}
                className="px-3 py-1.5 text-[0.72rem] font-bold font-[Montserrat] bg-[#E5181B] hover:bg-[#C01215] text-white rounded-[7px] disabled:opacity-50 flex items-center gap-1.5 transition-colors">
                {saving && <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Save
              </button>
            </>
          ) : (
            <button onClick={startEdit}
              className="px-3 py-1.5 text-[0.72rem] font-bold font-[Montserrat] bg-white/[.04] border border-white/[.08] text-gray-400 hover:text-white rounded-[7px]">
              Edit Profile
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-black font-[Montserrat] text-white text-lg border-2 border-white/[.08] flex-shrink-0"
            style={{ background: strToColor(profile.uid || '') }}>
            {initials(profile.displayName || '?')}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input value={form.displayName} onChange={ev => setForm(f => ({ ...f, displayName: ev.target.value }))}
                maxLength={60}
                className="w-full bg-[#1a1a1a] border border-white/[.06] rounded-[7px] px-3 py-1.5 text-white text-[1rem] font-black font-[Montserrat] outline-none focus:border-[rgba(229,24,27,.3)] mb-1" />
            ) : (
              <div className="font-[Montserrat] text-[1.1rem] font-black mb-1">{profile.displayName}</div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full border ${rm.cls}`}>{rm.badge}</span>
              {profile.status === 'approved' && (
                <span className="text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 border border-green-500/20">
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {editing ? (
          <div className="flex flex-col gap-3 mb-5">
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Job Title</label>
              <input value={form.title} onChange={ev => setForm(f => ({ ...f, title: ev.target.value }))}
                placeholder="e.g. CTO at Acme Corp" maxLength={80} className={ic} />
            </div>
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Location</label>
              <input value={form.location} onChange={ev => setForm(f => ({ ...f, location: ev.target.value }))}
                placeholder="e.g. Dubai, UAE" maxLength={60} className={ic} />
            </div>
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Bio</label>
              <textarea value={form.bio} onChange={ev => setForm(f => ({ ...f, bio: ev.target.value }))}
                placeholder="A short bio about yourself…" rows={3} maxLength={400}
                className={`${ic} resize-none`} />
              <div className="text-right text-[0.62rem] text-gray-700 mt-1">{form.bio.length}/400</div>
            </div>
          </div>
        ) : (
          <div className="mb-5 space-y-2">
            {profile.title && (
              <div className="flex items-center gap-2.5 text-[0.78rem]">
                <span className="text-gray-600 w-16 flex-shrink-0 font-[Montserrat] text-[0.67rem] uppercase tracking-wide">Title</span>
                <span className="text-gray-200">{profile.title}</span>
              </div>
            )}
            {profile.location && (
              <div className="flex items-center gap-2.5 text-[0.78rem]">
                <span className="text-gray-600 w-16 flex-shrink-0 font-[Montserrat] text-[0.67rem] uppercase tracking-wide">Location</span>
                <span className="text-gray-200">{profile.location}</span>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-2.5 text-[0.78rem]">
                <span className="text-gray-600 w-16 flex-shrink-0 font-[Montserrat] text-[0.67rem] uppercase tracking-wide">Email</span>
                <span className="text-gray-400">{profile.email}</span>
              </div>
            )}
            {profile.bio && (
              <div className="pt-2 mt-2 border-t border-white/[.05]">
                <p className="text-[0.78rem] text-gray-400 leading-relaxed">{profile.bio}</p>
              </div>
            )}
            {!profile.title && !profile.location && !profile.bio && (
              <p className="text-[0.78rem] text-gray-600">
                No profile info yet. <button onClick={startEdit} className="text-[#FF4447] hover:underline">Add your details.</button>
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/[.05]">
          {stats.map(s => (
            <div key={s.l} className="bg-white/[.02] border border-white/[.04] rounded-[8px] p-2.5 text-center">
              <div className="font-[Montserrat] text-[1rem] font-black text-[#FF4447]">{s.v}</div>
              <div className="text-[0.58rem] text-gray-600 mt-0.5 font-[Montserrat]">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* membership */}
      <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-5 mb-4">
        <div className="text-[0.65rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">Membership</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-[Montserrat] text-[0.95rem] font-black mb-0.5">
              {profile.plan === 'pro' ? 'Pro Member' : isInstructor ? 'Instructor' : 'Free Plan'}
            </div>
            <div className="text-[0.72rem] text-gray-500">
              {profile.plan !== 'pro' && !isInstructor
                ? 'Upgrade to access all courses and certificates.'
                : 'Full platform access.'}
            </div>
          </div>
          {!isInstructor && profile.plan !== 'pro' && (
            <button className="px-3.5 py-1.5 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.74rem] font-bold font-[Montserrat] rounded-[7px] transition-colors flex-shrink-0">
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* instructor application */}
      {!isInstructor && (
        <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-5">
          <div className="text-[0.65rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">Teach on the Platform</div>
          {applying ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Topic / Expertise</label>
                <input value={appForm.topic} onChange={ev => setAppForm(f => ({ ...f, topic: ev.target.value }))}
                  placeholder="e.g. Cloud Architecture, Cybersecurity" maxLength={100} className={ic} />
              </div>
              <div>
                <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Why you want to teach</label>
                <textarea value={appForm.bio} onChange={ev => setAppForm(f => ({ ...f, bio: ev.target.value }))}
                  placeholder="Tell us about your experience and what you'd like to teach…" rows={3} maxLength={500}
                  className={`${ic} resize-none`} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setApplying(false)}
                  className="px-4 py-2 bg-white/[.04] border border-white/[.08] text-gray-400 text-[0.74rem] font-bold font-[Montserrat] rounded-[7px]">
                  Cancel
                </button>
                <button onClick={submitInstructorApp}
                  className="flex-1 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.74rem] font-bold font-[Montserrat] rounded-[7px] transition-colors">
                  Submit Application
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[0.78rem] text-gray-400 leading-relaxed mb-3">
                Share your expertise with the community. Applications reviewed within 3–5 business days.
              </p>
              <button onClick={() => setApplying(true)}
                className="px-4 py-2 bg-white/[.04] border border-white/[.08] text-white text-[0.74rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-white/[.07] transition-colors">
                Apply as Instructor
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default DashboardPage
