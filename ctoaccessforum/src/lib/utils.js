import { formatDistanceToNow, format } from 'date-fns'
import { clsx } from 'clsx'

export const cn = (...a) => clsx(a)
export const toDate = ts => ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null
export const timeAgo = ts => { const d=toDate(ts); return d ? formatDistanceToNow(d,{addSuffix:true}) : '' }
export const fmtDate = ts => { const d=toDate(ts); return d ? format(d,'d MMM yyyy') : '' }
export const initials = (n='?') => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

export function strToColor(s='') {
  const p=['#E5181B','#1d3d7f','#7f1d1d','#374151','#065f46','#4a1d1d','#1e3a5f','#5b21b6']
  let h=0; for(let i=0;i<s.length;i++) h=s.charCodeAt(i)+((h<<5)-h)
  return p[Math.abs(h)%p.length]
}

export const escHtml = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
export const bytesToSize = b => !b?'':b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'

export const CHANNELS = [
  {id:'all',      label:'All Posts',       color:'#E5181B', emoji:'💬'},
  {id:'cloud',    label:'Cloud & Infra',   color:'#3b82f6', emoji:'☁️'},
  {id:'security', label:'Security',        color:'#ef4444', emoji:'🛡️'},
  {id:'ai',       label:'AI & Automation', color:'#8b5cf6', emoji:'🤖'},
  {id:'leadership',label:'Leadership',     color:'#f59e0b', emoji:'👥'},
  {id:'uae',      label:'UAE Market',      color:'#10b981', emoji:'🇦🇪'},
  {id:'vendors',  label:'Vendor Reviews',  color:'#6b7280', emoji:'🔍'},
  {id:'career',   label:'Career Advice',   color:'#ec4899', emoji:'🎯'},
]

export const ROLE_META = {
  admin:       {label:'Admin',      badge:'🔴 Admin',      cls:'bg-red-900/40 text-red-300 border border-red-500/30'},
  instructor:  {label:'Instructor', badge:'🎤 Instructor', cls:'bg-purple-900/40 text-purple-300 border border-purple-500/30'},
  member_pro:  {label:'Pro',        badge:'⭐ Pro',         cls:'bg-yellow-900/40 text-yellow-300 border border-yellow-500/30'},
  member_free: {label:'Member',     badge:'Member',        cls:'bg-white/5 text-gray-400 border border-white/10'},
}

export function parseVideoUrl(url) {
  if (!url) return null
  url = url.trim()

  // YouTube regular: youtube.com/watch?v=ID
  const yt1 = url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/)
  if (yt1) return {type:'iframe', src:`https://www.youtube.com/embed/${yt1[1]}?rel=0`}

  // YouTube embed: youtube.com/embed/ID
  const yt2 = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/)
  if (yt2) return {type:'iframe', src:`https://www.youtube.com/embed/${yt2[1]}?rel=0`}

  // YouTube short URL: youtu.be/ID
  const yt3 = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  if (yt3) return {type:'iframe', src:`https://www.youtube.com/embed/${yt3[1]}?rel=0`}

  // YouTube Shorts: youtube.com/shorts/ID
  const yt4 = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/)
  if (yt4) return {type:'iframe', src:`https://www.youtube.com/embed/${yt4[1]}?rel=0`}

  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return {type:'iframe', src:`https://player.vimeo.com/video/${vm[1]}`}

  // Google Drive
  const gd = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (gd) return {type:'iframe', src:`https://drive.google.com/file/d/${gd[1]}/preview`}

  // Cloudinary video
  if (url.includes('cloudinary.com') && url.match(/\.(mp4|webm)/))
    return {type:'video', src:url}

  return null
}
