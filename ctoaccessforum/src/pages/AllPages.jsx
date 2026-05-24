// DashboardPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { timeAgo, strToColor, initials, ROLE_META } from '@/lib/utils'

export function DashboardPage() {
  const { profile, isInstructor } = useAuth()
  const nav = useNavigate()
  const [posts, setPosts] = useState([])
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = profile?.displayName?.split(' ')[0] || 'there'

  useEffect(() => {
    const q = query(collection(db,'posts'), orderBy('createdAt','desc'), limit(6))
    return onSnapshot(q, s => setPosts(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{})
  }, [])

  const kpis = [
    {l:'XP Points',  v:profile?.xp||0,           c:'text-[#FF4447]'},
    {l:'Posts Made', v:profile?.posts||0,         c:'text-blue-400'},
    {l:'Day Streak', v:`🔥 ${profile?.streak||0}`,c:'text-amber-400'},
    {l:'Role',       v:ROLE_META[profile?.role]?.label||'Member', c:'text-purple-400'},
  ]

  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="mb-6 animate-fadeUp">
        <h1 className="font-[Montserrat] text-[1.4rem] font-black mb-1">Good {greeting}, {firstName} 👋</h1>
        <p className="text-[0.82rem] text-gray-500">Welcome to CTO Access Forum University.</p>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map((k,i)=>(
          <div key={k.l} className="bg-[#161616] border border-white/[.06] rounded-[14px] p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#E5181B] rounded-[2px_0_0_2px]"/>
            <div className={`font-[Montserrat] text-[1.55rem] font-black leading-none ${k.c} mb-1`}>{k.v}</div>
            <div className="text-[0.62rem] text-gray-500 uppercase tracking-[.06em] font-[Montserrat]">{k.l}</div>
          </div>
        ))}
      </div>
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        <div className="flex flex-col gap-4">
          {/* Recent activity */}
          <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500">Recent Activity</span>
              <button onClick={()=>nav('../forum')} className="text-[0.65rem] text-[#FF4447] font-[Montserrat] font-bold">View Forum →</button>
            </div>
            {posts.length === 0 ? (
              <div className="text-[0.8rem] text-gray-500 py-4 text-center">No posts yet. <button onClick={()=>nav('../forum')} className="text-[#FF4447]">Be the first!</button></div>
            ) : posts.map(p => (
              <div key={p.id} className="flex gap-3 py-3 border-b border-white/[.05] last:border-0 last:pb-0 first:pt-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.64rem] flex-shrink-0" style={{background:strToColor(p.authorId||'')}}>{initials(p.authorName||'?')}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.77rem] font-semibold mb-0.5 truncate">{p.authorName} <span className="text-gray-500 font-normal">posted</span></div>
                  <div className="text-[0.74rem] text-gray-400 mb-1 truncate">{p.title}</div>
                  <div className="flex items-center gap-2 text-[0.62rem] text-gray-600">
                    <span className="bg-[rgba(229,24,27,.1)] text-[#FF4447] px-1.5 py-0.5 rounded text-[0.6rem] font-bold font-[Montserrat]">{p.channel||'General'}</span>
                    <span>{timeAgo(p.createdAt)}</span>
                    <span>❤️ {p.likes||0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Instructor CTA */}
          {!isInstructor && (
            <div className="relative bg-gradient-to-br from-[#1a0808] to-[#0e0e0e] border border-red-500/20 rounded-[14px] p-5 flex items-center gap-4 overflow-hidden red-topline">
              <div className="text-3xl flex-shrink-0">🎤</div>
              <div className="flex-1">
                <div className="font-[Montserrat] text-[0.88rem] font-bold mb-1">Want to Teach Here?</div>
                <div className="text-[0.76rem] text-gray-400 leading-relaxed">Apply to become an instructor — reviewed by admin within 3–5 days.</div>
              </div>
              <button onClick={()=>nav('../profile')} className="bg-[#E5181B] hover:bg-[#C01215] text-white px-3.5 py-1.5 rounded-[10px] text-[0.76rem] font-bold font-[Montserrat] flex-shrink-0">Apply →</button>
            </div>
          )}
        </div>
        {/* Right */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-5">
            <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-3">Top Members 🏆</div>
            {[{n:'Mark K.',xp:2140,uid:'m1'},{n:'Sara R.',xp:1890,uid:'m2'},{n:'Ahmed L.',xp:1620,uid:'m3'},{n:'James P.',xp:1240,uid:'m4'},{n:profile?.displayName||'You',xp:profile?.xp||0,uid:profile?.uid||'me',me:true}].map((m,i)=>(
              <div key={m.uid} className={`flex items-center gap-2.5 py-2 border-b border-white/[.05] last:border-0 ${m.me?'bg-red-900/5 -mx-2 px-2 rounded-lg':''}`}>
                <span className={`font-[Montserrat] text-[0.72rem] font-black w-4 text-center ${i<3?'text-[#E5181B]':'text-gray-600'}`}>{i+1}</span>
                <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.56rem] flex-shrink-0" style={{background:strToColor(m.uid)}}>{initials(m.n)}</div>
                <span className="flex-1 text-[0.74rem] font-medium truncate">{m.n}</span>
                <span className="font-[Montserrat] text-[0.68rem] font-bold text-[#FF4447]">{m.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ForumPage.jsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { uploadFile } from '@/lib/cloudinary'
import { timeAgo, strToColor, initials, CHANNELS, parseVideoUrl } from '@/lib/utils'
import toast from 'react-hot-toast'

export function ForumPage() {
  const { profile } = useAuth()
  const { ch } = useParams()
  const [channel, setChannel] = useState(ch || 'all')
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form,    setForm]    = useState({channel:'all',title:'',body:'',videoUrl:'',tags:''})
  const [file,    setFile]    = useState(null)
  const [posting, setPosting] = useState(false)
  const [upPct,   setUpPct]   = useState(0)

  useEffect(() => {
    setLoading(true)
    let q = query(collection(db,'posts'), orderBy('createdAt','desc'), limit(30))
    if (channel && channel !== 'all') q = query(collection(db,'posts'), where('channel','==',channel), orderBy('createdAt','desc'), limit(30))
    return onSnapshot(q, s => { setPosts(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false) }, ()=>setLoading(false))
  }, [channel])

  const filtered = search ? posts.filter(p=>`${p.title} ${p.body} ${p.authorName}`.toLowerCase().includes(search.toLowerCase())) : posts

  async function submitPost() {
    if (!form.title.trim()||!form.body.trim()) { toast.error('Title and content required'); return }
    setPosting(true)
    try {
      let fileUrl=null, fileName=null
      if (file) {
        const res = await uploadFile(file, p=>setUpPct(p))
        fileUrl=res.url; fileName=file.name
      }
      const { addDoc, serverTimestamp } = await import('firebase/firestore')
      await addDoc(collection(db,'posts'), {
        channel:form.channel, title:form.title.trim(), body:form.body.trim(),
        fileUrl, fileName, videoUrl:form.videoUrl||null,
        tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean).slice(0,10),
        authorId:profile.uid, authorName:profile.displayName, authorRole:profile.role,
        pinned:false, likes:0, replies:0, views:0,
        createdAt:serverTimestamp(), updatedAt:serverTimestamp()
      })
      const { updateDoc: upd, doc: d, increment: inc } = await import('firebase/firestore')
      await upd(d(db,'users',profile.uid), { posts:inc(1), xp:inc(5) })
      setShowNew(false); setForm({channel:'all',title:'',body:'',videoUrl:'',tags:''}); setFile(null); setUpPct(0)
      toast.success('Post published! 🎉')
    } catch(e) { toast.error(e.message) }
    finally { setPosting(false) }
  }

  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-[Montserrat] text-[1.3rem] font-black">Community Forum</h1>
        <button onClick={()=>setShowNew(true)} className="bg-[#E5181B] hover:bg-[#C01215] text-white px-4 py-2 rounded-[10px] text-[0.78rem] font-bold font-[Montserrat] flex items-center gap-1.5">✏️ New Post</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-4">
        {/* Channel sidebar */}
        <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
          {CHANNELS.map(c=>(
            <button key={c.id} onClick={()=>setChannel(c.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-[9px] text-[0.75rem] font-medium whitespace-nowrap transition-all
              ${channel===c.id?'bg-[rgba(229,24,27,.12)] text-[#FF4447]':'text-gray-500 hover:bg-white/[.04] hover:text-white'}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        {/* Feed */}
        <div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search posts..."
                className="w-full bg-[#161616] border border-white/[.06] rounded-[10px] pl-8 pr-3.5 py-2.5 text-white text-[0.8rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.2)]"/>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin"/></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-[0.85rem]">No posts yet. <button onClick={()=>setShowNew(true)} className="text-[#FF4447]">Create one!</button></div>
          ) : filtered.map(p => (
            <div key={p.id} className={`bg-[#161616] border rounded-[14px] p-4 mb-3 transition-colors ${p.pinned?'border-l-2 border-l-[#E5181B] border-white/[.06]':'border-white/[.06] hover:border-red-500/15'}`}>
              <div className="flex gap-3 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.64rem] flex-shrink-0" style={{background:strToColor(p.authorId||'')}}>{initials(p.authorName||'?')}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap text-[0.78rem] font-semibold mb-0.5">
                    <span>{p.authorName}</span>
                    <span className="bg-[rgba(229,24,27,.1)] text-[#FF4447] px-1.5 py-0.5 rounded text-[0.6rem] font-bold font-[Montserrat]">{p.authorRole||'Member'}</span>
                    {p.pinned && <span className="bg-[rgba(229,24,27,.08)] text-[#E5181B] px-1.5 py-0.5 rounded text-[0.6rem] font-bold font-[Montserrat]">📌 PINNED</span>}
                  </div>
                  <div className="text-[0.63rem] text-gray-500">{timeAgo(p.createdAt)} · {CHANNELS.find(c=>c.id===p.channel)?.label||'General'}</div>
                </div>
              </div>
              <div className="font-[Montserrat] text-[0.88rem] font-bold mb-2">{p.title}</div>
              <div className="text-[0.77rem] text-gray-400 leading-relaxed mb-3 line-clamp-3">{p.body}</div>
              {p.fileUrl && (
                <div className="flex items-center gap-2.5 bg-[#1E1E1E] border border-white/[.06] rounded-[8px] px-3 py-2.5 mb-3">
                  <span className="text-base">📎</span>
                  <div className="flex-1 min-w-0"><div className="font-semibold text-[0.73rem] truncate">{p.fileName||'Attachment'}</div></div>
                  <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="bg-[rgba(229,24,27,.1)] border border-red-500/20 text-[#FF4447] px-2.5 py-1 rounded text-[0.64rem] font-bold font-[Montserrat]">⬇ Download</a>
                </div>
              )}
              {p.videoUrl && (() => { const e=parseVideoUrl(p.videoUrl); return e ? <div className="mb-3 video-wrap"><iframe src={e.src} allowFullScreen className="absolute inset-0 w-full h-full"/></div> : null })()}
              {p.tags?.length > 0 && <div className="flex flex-wrap gap-1.5 mb-3">{p.tags.map(t=><span key={t} className="text-[0.61rem] bg-white/[.04] border border-white/[.06] text-gray-400 px-2 py-0.5 rounded font-[Montserrat] font-semibold">{t}</span>)}</div>}
              <div className="flex items-center gap-3 text-[0.72rem] text-gray-500">
                <button onClick={()=>updateDoc(doc(db,'posts',p.id),{likes:increment(1)})} className="flex items-center gap-1 hover:text-[#FF4447] transition-colors">❤️ {p.likes||0}</button>
                <span className="flex items-center gap-1">💬 {p.replies||0}</span>
                <button onClick={()=>{navigator.clipboard?.writeText(window.location.href+'#'+p.id);toast.success('Link copied!')}} className="ml-auto hover:text-white transition-colors text-[0.65rem]">🔗 Share</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Post Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[900] flex items-center justify-center p-5" onClick={e=>e.target===e.currentTarget&&setShowNew(false)}>
          <div className="bg-[#161616] border border-white/[.06] rounded-[18px] p-8 w-full max-w-2xl red-topline max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-[Montserrat] font-black text-[1.1rem]">Create Post</h2>
              <button onClick={()=>setShowNew(false)} className="w-7 h-7 rounded-[6px] bg-white/5 border border-white/[.06] flex items-center justify-center text-sm text-gray-400 hover:text-red-300">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <select value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))} className="w-full bg-[#1E1E1E] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins]">
                {CHANNELS.filter(c=>c.id!=='all').map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Post title..." maxLength={200} className="w-full bg-[#1E1E1E] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600"/>
              <textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder="Share your thoughts, questions or insights..." rows={5} maxLength={10000} className="w-full bg-[#1E1E1E] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 resize-y min-h-[100px]"/>
              <div>
                <div className="upload-zone" onClick={()=>document.getElementById('f-file').click()}>
                  <div className="text-2xl mb-2">📎</div>
                  <div className="text-[0.78rem] text-gray-400">{file?file.name:'Click to attach a file · PDF, DOCX, ZIP · Max 50MB'}</div>
                  {upPct>0 && <div className="h-1 bg-white/[.06] rounded-full mt-3 overflow-hidden"><div className="h-full bg-[#E5181B] rounded-full transition-all" style={{width:`${upPct}%`}}/></div>}
                </div>
                <input id="f-file" type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.pptx" onChange={e=>setFile(e.target.files[0]||null)}/>
              </div>
              <input value={form.videoUrl} onChange={e=>setForm(f=>({...f,videoUrl:e.target.value}))} placeholder="Video link — YouTube, Vimeo, Google Drive, Cloudinary" type="url" className="w-full bg-[#1E1E1E] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600"/>
              <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="Tags: security, zero-trust, cloud (comma separated)" className="w-full bg-[#1E1E1E] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600"/>
              <div className="flex gap-2">
                <button onClick={()=>setShowNew(false)} className="px-5 py-2.5 bg-white/[.04] border border-white/[.08] text-white font-bold font-[Montserrat] text-[0.8rem] rounded-[10px]">Cancel</button>
                <button onClick={submitPost} disabled={posting} className="flex-1 py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.8rem] rounded-[10px] disabled:opacity-50">
                  {posting ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : '📤 Publish Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// CoursesPage.jsx
export function CoursesPage() {
  const COURSES = [
    {id:'c1',title:'Zero Trust Architecture Masterclass',cat:'Security',level:'Advanced',price:149,inst:'Mark K.',mod:12,dur:'4.5h',emoji:'🛡️',bg:'linear-gradient(135deg,#1a0505,#3d0a0a)',lc:'text-red-300',lb:'bg-red-900/20'},
    {id:'c2',title:'Cloud Fundamentals for IT Leaders',cat:'Cloud',level:'Intermediate',price:0,inst:'Sara R.',mod:8,dur:'3h',emoji:'☁️',bg:'linear-gradient(135deg,#050e1a,#0a2040)',lc:'text-yellow-300',lb:'bg-yellow-900/20'},
    {id:'c3',title:'AI Strategy for Executive Leaders',cat:'AI Strategy',level:'Advanced',price:199,inst:'Ahmed L.',mod:15,dur:'6h',emoji:'🤖',bg:'linear-gradient(135deg,#080d1a,#141a3d)',lc:'text-red-300',lb:'bg-red-900/20'},
    {id:'c4',title:'Intro to Tech Leadership',cat:'Leadership',level:'Beginner',price:0,inst:'James P.',mod:6,dur:'2h',emoji:'👥',bg:'linear-gradient(135deg,#0d1a0a,#1a3d14)',lc:'text-green-300',lb:'bg-green-900/20'},
    {id:'c5',title:'Building High-Performance Tech Teams',cat:'Leadership',level:'Intermediate',price:129,inst:'Mark K.',mod:9,dur:'3.2h',emoji:'📊',bg:'linear-gradient(135deg,#1a1205,#3d2d0a)',lc:'text-yellow-300',lb:'bg-yellow-900/20'},
    {id:'c6',title:'Cybersecurity Basics for IT Professionals',cat:'Security',level:'Beginner',price:0,inst:'Sara R.',mod:7,dur:'2.5h',emoji:'🔐',bg:'linear-gradient(135deg,#0a0a1a,#1a1a40)',lc:'text-green-300',lb:'bg-green-900/20'},
    {id:'c7',title:'Digital Transformation Roadmap 2025',cat:'Cloud',level:'Advanced',price:249,inst:'Ahmed L.',mod:18,dur:'7.5h',emoji:'🗺️',bg:'linear-gradient(135deg,#1a0a14,#3d1a2e)',lc:'text-red-300',lb:'bg-red-900/20'},
    {id:'c8',title:'DevOps Essentials: CI/CD Pipelines',cat:'DevOps',level:'Intermediate',price:0,inst:'Nadia R.',mod:10,dur:'4h',emoji:'⚙️',bg:'linear-gradient(135deg,#0a140a,#1a3d1a)',lc:'text-yellow-300',lb:'bg-yellow-900/20'},
  ]
  const [filter, setFilter] = useState('All')
  const FILTERS = ['All','Free','Cloud','Security','AI Strategy','Leadership','DevOps']
  const shown = filter==='All'?COURSES:filter==='Free'?COURSES.filter(c=>c.price===0):COURSES.filter(c=>c.cat===filter)
  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-[Montserrat] text-[1.3rem] font-black">Course Library</h1>
        <div className="flex gap-1.5 flex-wrap">{FILTERS.map(f=><button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-[6px] text-[0.73rem] font-bold font-[Montserrat] border transition-all ${filter===f?'bg-[rgba(229,24,27,.1)] border-red-500/25 text-[#FF4447]':'border-white/[.08] text-gray-500 hover:text-white'}`}>{f}</button>)}</div>
      </div>
      <div className="bg-green-900/10 border border-green-500/20 rounded-[14px] p-4 mb-5 flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">🆓</span>
        <div><div className="font-[Montserrat] text-[0.8rem] font-bold text-green-300 mb-0.5">Free Courses — No Upgrade Needed</div><div className="text-[0.72rem] text-gray-500">Courses marked FREE are fully unlocked for all members.</div></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {shown.map(c=>(
          <div key={c.id} className="bg-[#161616] border border-white/[.06] rounded-[14px] overflow-hidden cursor-pointer hover:border-red-500/20 hover:-translate-y-0.5 transition-all duration-200">
            <div className="h-32 flex items-center justify-center text-4xl relative" style={{background:c.bg}}>
              {c.emoji}
              <span className={`absolute top-2.5 left-2.5 text-[0.58rem] font-bold font-[Montserrat] px-2 py-0.5 rounded uppercase tracking-wide ${c.lb} ${c.lc} border border-current/20`}>{c.level}</span>
              {c.price===0 && <span className="absolute top-2.5 right-2.5 text-[0.58rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-green-900/40 text-green-300 border border-green-500/25">FREE</span>}
            </div>
            <div className="p-4">
              <div className="text-[0.59rem] text-[#FF4447] font-bold font-[Montserrat] uppercase tracking-wide mb-1">{c.cat}</div>
              <div className="font-[Montserrat] font-bold text-[0.85rem] mb-1.5 leading-snug">{c.title}</div>
              <div className="text-[0.67rem] text-gray-500 mb-3">{c.inst}</div>
              <div className="flex items-center justify-between border-t border-white/[.05] pt-3">
                <div className="text-[0.64rem] text-gray-500">🎬 {c.mod} mod · {c.dur}</div>
                <div className={`font-[Montserrat] font-bold text-[0.7rem] ${c.price===0?'text-green-300':'text-[#FF4447]'}`}>{c.price===0?'Free':`AED ${c.price}`}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ResourcesPage.jsx
export function ResourcesPage() {
  const RESOURCES = [
    {id:'r1',title:'M365 Migration Playbook v3',by:'Sara R.',meta:'2.4 MB · PDF · 47 pages',icon:'📄',cat:'Cloud',free:true,dl:208,url:'#'},
    {id:'r2',title:'UAE Cloud Compliance Guide 2025',by:'Ahmed L.',meta:'1.8 MB · PDF · 32 pages',icon:'📄',cat:'UAE Market',free:true,dl:387,url:'#'},
    {id:'r3',title:'Zero Trust Implementation Checklist',by:'Mark K.',meta:'890 KB · XLSX',icon:'📊',cat:'Security',free:false,dl:145,url:'#'},
    {id:'r4',title:'DevOps CI/CD Pipeline Templates',by:'Nadia R.',meta:'4.2 MB · ZIP · 12 files',icon:'📦',cat:'DevOps',free:true,dl:92,url:'#'},
    {id:'r5',title:'AI Policy Template for SMEs',by:'Admin',meta:'245 KB · DOCX',icon:'📋',cat:'AI',free:true,dl:54,url:'#'},
    {id:'r6',title:'CTO 90-Day Onboarding Plan',by:'James P.',meta:'560 KB · PPTX · 24 slides',icon:'📽️',cat:'Leadership',free:false,dl:213,url:'#'},
  ]
  const { isPro } = useAuth()
  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-[Montserrat] text-[1.3rem] font-black">Resource Library</h1>
        <button className="bg-[#E5181B] hover:bg-[#C01215] text-white px-4 py-2 rounded-[10px] text-[0.78rem] font-bold font-[Montserrat]">📤 Upload Resource</button>
      </div>
      <div className="flex flex-col gap-3">
        {RESOURCES.map(r=>(
          <div key={r.id} className="bg-[#161616] border border-white/[.06] rounded-[14px] p-4 flex items-center gap-4 hover:border-red-500/15 transition-colors">
            <div className="w-10 h-10 rounded-[9px] flex items-center justify-center text-base flex-shrink-0 bg-white/[.04] border border-white/[.06]">{r.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[0.82rem] mb-0.5">{r.title}</div>
              <div className="text-[0.67rem] text-gray-500 mb-1.5">By {r.by} · {r.meta}</div>
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">{r.cat}</span>
                {r.free?<span className="text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded bg-green-900/30 text-green-300 border border-green-500/25">Free</span>:<span className="text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-300 border border-yellow-500/25">Pro</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[0.66rem] text-gray-600">⬇ {r.dl}</span>
              {r.free||isPro
                ?<a href={r.url} target="_blank" rel="noopener noreferrer" className="bg-[rgba(229,24,27,.1)] border border-red-500/20 text-[#FF4447] px-2.5 py-1 rounded text-[0.66rem] font-bold font-[Montserrat]">Download</a>
                :<span className="text-[0.66rem] text-gray-600 border border-white/[.06] px-2.5 py-1 rounded">🔒 Pro</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// EventsPage.jsx
export function EventsPage() {
  const EVENTS = [
    {id:'e1',title:'AI Governance Frameworks for SMEs',desc:'Building AI policies, shadow AI management, GDPR & UAE PDPL compliance.',day:'23',month:'May',time:'3:00 PM',dur:60,type:'Webinar',access:'free',rsvp:58,host:'Ahmed L.',live:true},
    {id:'e2',title:'AMA: Scaling Engineering Teams from 5 to 50',desc:'Live Q&A with a CTO who scaled three engineering teams.',day:'28',month:'May',time:'6:00 PM',dur:90,type:'AMA',access:'pro',rsvp:112,host:'Mark K.'},
    {id:'e3',title:'Digital Transformation Summit — UAE Edition',desc:'Half-day virtual summit covering cloud adoption, AI in enterprise.',day:'4',month:'Jun',time:'10:00 AM',dur:240,type:'Summit',access:'free',rsvp:340,host:'Admin'},
    {id:'e4',title:'Cloud Security Workshop: AWS & Azure',desc:'Hands-on workshop covering cloud security config and IAM policies.',day:'11',month:'Jun',time:'4:00 PM',dur:180,type:'Workshop',access:'pro',rsvp:45,host:'Sara R.'},
    {id:'e5',title:'Getting Your First Tech Lead Role',desc:'Career Q&A for junior IT professionals looking to break into leadership.',day:'18',month:'Jun',time:'5:00 PM',dur:60,type:'Webinar',access:'free',rsvp:88,host:'James P.'},
  ]
  return (
    <div className="max-w-screen-lg mx-auto">
      <h1 className="font-[Montserrat] text-[1.3rem] font-black mb-5">Events &amp; Live Sessions</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EVENTS.map(e=>(
          <div key={e.id} className={`bg-[#161616] border rounded-[14px] p-5 transition-all hover:-translate-y-0.5 ${e.live?'border-red-500/40':'border-white/[.06] hover:border-red-500/15'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="text-center bg-[rgba(229,24,27,.1)] border border-red-500/20 rounded-[8px] px-3 py-2 min-w-[44px]">
                <div className="font-[Montserrat] text-[1.1rem] font-black text-[#E5181B] leading-none">{e.day}</div>
                <div className="text-[0.54rem] text-gray-500 uppercase">{e.month}</div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {e.live && <span className="text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-300 border border-red-500/25">🔴 LIVE</span>}
                <span className={`text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${e.access==='free'?'bg-green-900/30 text-green-300 border-green-500/25':'bg-yellow-900/30 text-yellow-300 border-yellow-500/25'}`}>{e.access==='free'?'Free':'Pro'}</span>
              </div>
            </div>
            <div className="font-[Montserrat] font-bold text-[0.88rem] mb-2 leading-snug">{e.title}</div>
            <div className="text-[0.75rem] text-gray-400 leading-relaxed mb-3 line-clamp-2">{e.desc}</div>
            <div className="flex items-center gap-2 text-[0.67rem] text-gray-500 mb-3 flex-wrap">
              <span>⏱ {e.dur} mins</span><span>👥 {e.rsvp}</span><span>🕐 {e.time} GST</span>
            </div>
            <div className="flex items-center gap-2 border-t border-white/[.05] pt-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.52rem] flex-shrink-0" style={{background:strToColor(e.host)}}>{initials(e.host)}</div>
              <span className="text-[0.68rem] text-gray-500 flex-1 truncate">{e.host}</span>
              {e.live
                ?<button className="bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.71rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px]">🔴 Join</button>
                :<button className="bg-[rgba(229,24,27,.1)] border border-red-500/20 text-[#FF4447] text-[0.71rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px]">RSVP</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ProfilePage.jsx
export function ProfilePage() {
  const { profile, isInstructor } = useAuth()
  const rm = ROLE_META[profile?.role] || ROLE_META.member_free
  if (!profile) return <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin"/></div>
  return (
    <div className="max-w-screen-md mx-auto">
      <div className="relative bg-gradient-to-br from-[#1a0505] to-[#0e0e0e] border border-white/[.06] rounded-[18px] p-7 mb-5 overflow-hidden red-topline">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-black font-[Montserrat] text-white text-xl border-[3px] border-red-500/30 flex-shrink-0" style={{background:strToColor(profile.uid||'')}}>
            {initials(profile.displayName||'?')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-[Montserrat] text-[1.15rem] font-black mb-1">{profile.displayName}</div>
            <div className="text-[0.78rem] text-gray-400 mb-3">{profile.title||'IT Professional'} · {profile.location||'Dubai, UAE'}</div>
            <div className="flex gap-2 flex-wrap">
              <span className={`inline-flex text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full ${rm.cls}`}>{rm.badge}</span>
              {profile.status==='approved'&&<span className="inline-flex text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full bg-green-900/30 text-green-300 border border-green-500/25">✅ Verified</span>}
            </div>
          </div>
          {!isInstructor && <button className="bg-white/[.04] border border-white/[.08] text-white px-3.5 py-1.5 rounded-[10px] text-[0.76rem] font-bold font-[Montserrat] hover:bg-white/[.08] transition-all">🎤 Apply as Instructor</button>}
        </div>
        <div className="grid grid-cols-4 gap-3 mt-5">
          {[{l:'XP Points',v:profile.xp||0},{l:'Courses',v:0},{l:'Posts',v:profile.posts||0},{l:'Streak',v:`🔥 ${profile.streak||0}d`}].map(s=>(
            <div key={s.l} className="bg-white/[.03] border border-white/[.05] rounded-[10px] p-3 text-center">
              <div className="font-[Montserrat] text-[1.15rem] font-black text-[#FF4447]">{s.v}</div>
              <div className="text-[0.6rem] text-gray-500 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-5">
        <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-3">Membership</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-[Montserrat] text-[1.05rem] font-black mb-0.5">{profile.plan==='pro'?'⭐ Pro Member':isInstructor?'🎤 Instructor':'Free Plan'}</div>
            <div className="text-[0.73rem] text-gray-500">{profile.plan!=='pro'&&!isInstructor?'Upgrade for all 86 courses + certificates':'Full platform access'}</div>
          </div>
          {!isInstructor&&profile.plan!=='pro'&&<button className="bg-[#E5181B] hover:bg-[#C01215] text-white px-3.5 py-1.5 rounded-[10px] text-[0.76rem] font-bold font-[Montserrat]">Upgrade →</button>}
        </div>
      </div>
    </div>
  )
}

// AdminPage.jsx
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import toast from 'react-hot-toast'

export function AdminPage() {
  const { isAdmin, approveUser } = useAuth()
  const [tab,    setTab]    = useState('queue')
  const [queue,  setQueue]  = useState([])
  const [apps,   setApps]   = useState([])
  const [acting, setActing] = useState({})
  const [codes,  setCodes]  = useState([])
  const [genCount, setGenCount] = useState(1)

  if (!isAdmin) return <div className="flex items-center justify-center min-h-[50vh] text-gray-500">🔒 Admin access only.</div>

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db,'approvalQueue'),orderBy('submittedAt','desc')), s=>setQueue(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{})
    const u2 = onSnapshot(query(collection(db,'applications'),orderBy('appliedAt','desc')), s=>setApps(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{})
    return ()=>{ u1(); u2() }
  }, [])

  async function handleApprove(uid, approve) {
    setActing(a=>({...a,[uid]:true}))
    try { await approveUser(uid, approve); toast.success(approve?'✅ User approved!':'User rejected.') }
    catch(e) { toast.error(e.message) }
    finally { setActing(a=>({...a,[uid]:false})) }
  }

  function generateCodes() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const newCodes = Array.from({length:genCount}, ()=>
      Array.from({length:8}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('')
    )
    setCodes(p=>[...newCodes,...p])
    toast.success(`${genCount} code(s) generated!`)
  }

  const TABS = [{id:'queue',label:'Approval Queue',count:queue.filter(u=>u.status==='pending').length},{id:'apps',label:'Instructor Apps',count:apps.filter(a=>a.status==='pending').length},{id:'codes',label:'Invite Codes'}]

  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-[Montserrat] text-[1.35rem] font-black">⚙️ Admin Panel</h1>
        <span className="text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full bg-red-900/30 text-red-300 border border-red-500/25">Admin Only</span>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[{l:'Pending Approval',v:queue.filter(u=>u.status==='pending').length,c:'text-amber-400',i:'⏳'},{l:'Instructor Apps',v:apps.filter(a=>a.status==='pending').length,c:'text-purple-400',i:'🎤'},{l:'Generated Codes',v:codes.length,c:'text-blue-400',i:'🔑'}].map(s=>(
          <div key={s.l} className="bg-[#161616] border border-white/[.06] rounded-[14px] p-4 text-center">
            <div className="text-2xl mb-1">{s.i}</div>
            <div className={`font-[Montserrat] text-[1.5rem] font-black ${s.c}`}>{s.v}</div>
            <div className="text-[0.62rem] text-gray-500 mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>
      {/* Tabs */}
      <div className="flex gap-1 bg-[#161616] border border-white/[.06] rounded-[12px] p-1 mb-5">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[9px] text-[0.74rem] font-bold font-[Montserrat] transition-all
            ${tab===t.id?'bg-[#E5181B] text-white':'text-gray-500 hover:text-white'}`}>
            {t.label}
            {t.count>0 && <span className={`text-[0.58rem] px-1.5 py-0.5 rounded-full font-bold ${tab===t.id?'bg-white/20':'bg-amber-500/20 text-amber-300'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* APPROVAL QUEUE */}
      {tab==='queue' && (
        <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-5">
          <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-4">Account Approval Queue</div>
          {queue.length===0 ? <div className="text-[0.82rem] text-gray-500 py-6 text-center">✅ No pending accounts</div> : (
            <div className="divide-y divide-white/[.05]">
              {queue.map(u=>(
                <div key={u.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.68rem] flex-shrink-0" style={{background:strToColor(u.uid||u.id)}}>{initials(u.name||'?')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-[0.84rem]">{u.name}</span>
                      <span className={`text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${u.status==='pending'?'bg-amber-900/30 text-amber-300 border-amber-500/25':u.status==='approved'?'bg-green-900/30 text-green-300 border-green-500/25':'bg-white/5 text-gray-400 border-white/10'}`}>{u.status}</span>
                    </div>
                    <div className="text-[0.73rem] text-gray-400">{u.email}</div>
                    <div className="text-[0.67rem] text-gray-600 mt-0.5">Code: <strong className="text-gray-400 font-[Montserrat]">{u.inviteCode}</strong></div>
                  </div>
                  {u.status==='pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button disabled={acting[u.id]} onClick={()=>handleApprove(u.uid||u.id,true)} className="bg-green-900/30 text-green-300 border border-green-500/25 px-2.5 py-1 rounded-[6px] text-[0.65rem] font-bold font-[Montserrat] hover:bg-green-900/50 disabled:opacity-50">✅ Approve</button>
                      <button disabled={acting[u.id]} onClick={()=>handleApprove(u.uid||u.id,false)} className="bg-red-900/30 text-red-300 border border-red-500/25 px-2.5 py-1 rounded-[6px] text-[0.65rem] font-bold font-[Montserrat] hover:bg-red-900/50 disabled:opacity-50">✕ Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INSTRUCTOR APPS */}
      {tab==='apps' && (
        <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-5">
          <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-4">Instructor Applications</div>
          {apps.length===0 ? <div className="text-[0.82rem] text-gray-500 py-6 text-center">No applications yet.</div> : (
            <div className="divide-y divide-white/[.05]">
              {apps.map(a=>(
                <div key={a.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.68rem] flex-shrink-0" style={{background:strToColor(a.uid)}}>{initials(a.name||a.displayName||'?')}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[0.84rem]">{a.name||a.displayName}</span>
                        <span className={`text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${a.status==='pending'?'bg-amber-900/30 text-amber-300 border-amber-500/25':'bg-green-900/30 text-green-300 border-green-500/25'}`}>{a.status}</span>
                      </div>
                      <div className="text-[0.72rem] text-gray-400">{a.email} · {a.jobTitle}</div>
                    </div>
                  </div>
                  <div className="bg-[#1E1E1E] rounded-[10px] p-3 mb-3">
                    <div className="text-[0.71rem] font-bold text-[#FF4447] mb-1">Topic: {a.topic}</div>
                    <div className="text-[0.73rem] text-gray-400 leading-relaxed line-clamp-3">{a.bio}</div>
                  </div>
                  {a.status==='pending' && (
                    <div className="flex gap-2">
                      <button onClick={async()=>{try{const {updateDoc,doc}=await import('firebase/firestore');await updateDoc(doc(db,'applications',a.id),{status:'approved'});await updateDoc(doc(db,'users',a.uid),{role:'instructor'});toast.success('🎤 Instructor approved!')}catch(e){toast.error(e.message)}}} className="bg-green-900/30 text-green-300 border border-green-500/25 px-3 py-1.5 rounded-[6px] text-[0.7rem] font-bold font-[Montserrat] hover:bg-green-900/50">✅ Approve as Instructor</button>
                      <button onClick={async()=>{try{const {updateDoc,doc}=await import('firebase/firestore');await updateDoc(doc(db,'applications',a.id),{status:'rejected'});toast.success('Rejected.')}catch(e){toast.error(e.message)}}} className="bg-red-900/30 text-red-300 border border-red-500/25 px-3 py-1.5 rounded-[6px] text-[0.7rem] font-bold font-[Montserrat] hover:bg-red-900/50">✕ Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INVITE CODES */}
      {tab==='codes' && (
        <div className="flex flex-col gap-4">
          <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-5">
            <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-4">Generate Invite Codes</div>
            <div className="flex items-center gap-3 mb-4">
              <div>
                <label className="font-[Montserrat] text-[0.72rem] font-bold text-gray-300 block mb-1.5">How many?</label>
                <input type="number" min={1} max={50} value={genCount} onChange={e=>setGenCount(+e.target.value)} className="w-24 bg-[#1E1E1E] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins]"/>
              </div>
              <button onClick={generateCodes} className="mt-5 bg-[#E5181B] hover:bg-[#C01215] text-white px-4 py-2.5 rounded-[10px] text-[0.8rem] font-bold font-[Montserrat]">🔑 Generate</button>
            </div>
            {codes.length>0 && (
              <div>
                <div className="font-[Montserrat] text-[0.7rem] font-bold text-gray-400 mb-2">Click any code to copy it → share with your invitees:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {codes.map(c=>(
                    <button key={c} onClick={()=>{navigator.clipboard?.writeText(c);toast.success('Copied!')}} className="font-[Montserrat] font-bold text-[0.82rem] tracking-widest bg-[#1E1E1E] border border-red-500/20 text-[#FF4447] rounded-[8px] py-2.5 px-3 hover:bg-red-900/20 transition-all text-center">
                      {c}
                    </button>
                  ))}
                </div>
                <p className="text-[0.68rem] text-gray-600 mt-3">⚠ Note: On Spark plan, save these codes and manually add them to Firestore inviteCodes collection.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
