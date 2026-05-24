import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { initials, strToColor, ROLE_META } from '@/lib/utils'

const NAV = [
  { to:'dashboard',  icon:'📊', label:'Dashboard' },
  { to:'forum',      icon:'💬', label:'Forum' },
  { to:'courses',    icon:'🎓', label:'Courses' },
  { to:'resources',  icon:'📁', label:'Resources' },
  { to:'events',     icon:'🗓️', label:'Events' },
  { to:'profile',    icon:'👤', label:'Profile' },
]

const CHANNELS = [
  { to:'forum/cloud',     emoji:'🔵', label:'Cloud & Infra' },
  { to:'forum/security',  emoji:'🔴', label:'Security' },
  { to:'forum/ai',        emoji:'🟣', label:'AI & Automation' },
  { to:'forum/leadership',emoji:'🟡', label:'Leadership' },
  { to:'forum/uae',       emoji:'🟢', label:'UAE Market' },
]

export default function AppLayout({ children }) {
  const { profile, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const rm = ROLE_META[profile?.role] || ROLE_META.member_free
  const av = initials(profile?.displayName || '?')
  const color = strToColor(profile?.uid || '')

  const Link = ({ to, icon, label }) => (
    <NavLink to={to} onClick={() => setOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[0.76rem] font-medium transition-all
        ${isActive ? 'bg-[rgba(229,24,27,.12)] text-[#FF4447]' : 'text-gray-500 hover:bg-white/[.04] hover:text-white'}`}>
      <span>{icon}</span><span>{label}</span>
    </NavLink>
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#080808]">
      {/* TOP BAR */}
      <header className="sticky top-0 z-[300] h-14 flex items-center gap-3 px-4 bg-[rgba(8,8,8,.98)] backdrop-blur-2xl border-b border-white/[.06]">
        <button className="lg:hidden p-1.5 rounded-lg bg-white/[.04] border border-white/[.06] text-gray-400" onClick={() => setOpen(!open)}>
          {open ? '✕' : '☰'}
        </button>
        <button onClick={() => nav('dashboard')} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-[#E5181B] rounded-[6px] flex items-center justify-center font-[Montserrat] font-black text-[0.62rem] text-white">CTO</div>
          <span className="hidden sm:block font-[Montserrat] font-black text-[0.72rem] tracking-wide">ACCESS <em className="text-[#E5181B] not-italic">FORUM</em></span>
        </button>
        {/* desktop tabs */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.73rem] font-semibold font-[Montserrat] transition-all whitespace-nowrap
                ${isActive ? 'bg-[rgba(229,24,27,.12)] text-[#FF4447]' : 'text-gray-500 hover:text-white hover:bg-white/[.04]'}`}>
              {n.icon} {n.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="admin"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.73rem] font-semibold font-[Montserrat] transition-all
                ${isActive ? 'bg-[rgba(229,24,27,.12)] text-[#FF4447]' : 'text-gray-500 hover:text-white hover:bg-white/[.04]'}`}>
              ⚙️ Admin
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <button onClick={() => nav('profile')}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.6rem] flex-shrink-0" style={{ background: color }}>
              {av}
            </div>
          </button>
          <button onClick={signOut} className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[.03] border border-white/[.06] text-gray-500 hover:text-red-300 text-[0.72rem] transition-all">
            🚪
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className={`${open ? 'flex' : 'hidden'} lg:flex flex-col w-[200px] flex-shrink-0 border-r border-white/[.06] bg-[#101010] fixed lg:sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto z-[200] lg:z-auto p-3 gap-0.5`}>
          {NAV.map(n => <Link key={n.to} {...n} />)}
          {isAdmin && <Link to="admin" icon="⚙️" label="Admin Panel" />}
          <div className="mt-3 mb-1 px-2.5 text-[0.58rem] font-bold tracking-[.12em] uppercase text-gray-600">Channels</div>
          {CHANNELS.map(c => (
            <NavLink key={c.to} to={c.to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[0.74rem] font-medium transition-all
                ${isActive ? 'bg-[rgba(229,24,27,.12)] text-[#FF4447]' : 'text-gray-500 hover:bg-white/[.04] hover:text-white'}`}>
              {c.emoji} {c.label}
            </NavLink>
          ))}
          {/* Profile mini */}
          <div className="mt-auto pt-3 border-t border-white/[.06]">
            <div className="flex items-center gap-2 px-2.5 py-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.56rem] flex-shrink-0" style={{ background: color }}>{av}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.73rem] font-semibold truncate">{profile?.displayName}</div>
                <div className={`inline-flex text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full ${rm.cls}`}>{rm.badge}</div>
              </div>
            </div>
            <button onClick={signOut} className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[0.74rem] text-gray-500 hover:text-red-300 hover:bg-red-900/10 transition-all w-full">🚪 Sign Out</button>
          </div>
        </aside>
        {open && <div className="fixed inset-0 bg-black/60 z-[199] lg:hidden" onClick={() => setOpen(false)}/>}

        {/* MAIN */}
        <main className="flex-1 min-w-0 p-5 overflow-auto">{children}</main>

        {/* RIGHT PANEL */}
        <aside className="hidden xl:flex flex-col w-[252px] flex-shrink-0 border-l border-white/[.06] bg-[#101010] p-3.5 gap-3 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-4">
            <div className="font-[Montserrat] text-[0.67rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-3">Online Now</div>
            {[{n:'Mark K.',r:'CTO · FinTech',c:'#E5181B'},{n:'Sara R.',r:'IT Director',c:'#1d3d7f'},{n:'Ahmed L.',r:'CTO · UAE',c:'#7f1d1d'},{n:'Nadia R.',r:'DevOps Lead',c:'#065f46'},{n:'James P.',r:'IT Director',c:'#374151'}].map(m=>(
              <div key={m.n} className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold font-[Montserrat] text-[0.56rem] flex-shrink-0" style={{background:m.c}}>{initials(m.n)}</div>
                <div className="flex-1 min-w-0"><div className="text-[0.71rem] font-medium truncate">{m.n}</div><div className="text-[0.59rem] text-gray-500 truncate">{m.r}</div></div>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"/>
              </div>
            ))}
          </div>
          {profile && (
            <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-4">
              <div className="font-[Montserrat] text-[0.67rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-3">My Progress</div>
              {[{l:'XP Points',v:profile.xp||0},{l:'Posts Made',v:profile.posts||0},{l:'Day Streak',v:`🔥 ${profile.streak||0}d`}].map(s=>(
                <div key={s.l} className="flex justify-between text-[0.7rem] mb-1.5">
                  <span className="text-gray-500">{s.l}</span>
                  <span className="font-semibold text-[#FF4447] font-[Montserrat]">{s.v}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
