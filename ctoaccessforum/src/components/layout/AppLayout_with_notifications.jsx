import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { initials, strToColor, ROLE_META } from '@/lib/utils'
import { db } from '@/lib/firebase'
import {
  collection, query, where, orderBy, limit,
  onSnapshot, doc, updateDoc, serverTimestamp, Timestamp
} from 'firebase/firestore'

const NAV = [
  { to: 'dashboard',      label: 'Dashboard' },
  { to: 'forum',          label: 'Forum' },
  { to: 'courses',        label: 'Courses' },
  { to: 'resources',      label: 'Resources' },
  { to: 'events',         label: 'Events' },
  { to: 'profile',        label: 'Profile' },
]

const CHANNELS = [
  { to: 'forum/cloud',      label: 'Cloud & Infra',   dot: '#3b82f6' },
  { to: 'forum/security',   label: 'Security',        dot: '#ef4444' },
  { to: 'forum/ai',         label: 'AI & Automation', dot: '#8b5cf6' },
  { to: 'forum/leadership', label: 'Leadership',      dot: '#f59e0b' },
  { to: 'forum/uae',        label: 'UAE Market',      dot: '#10b981' },
]

const PRESENCE_INTERVAL = 2 * 60 * 1000
const ONLINE_THRESHOLD  = 10 * 60 * 1000

export default function AppLayout({ children }) {
  const { profile, isAdmin, signOut } = useAuth()
  const [open,         setOpen]        = useState(false)
  const [onlineUsers,  setOnlineUsers] = useState([])
  const [unreadCount,  setUnreadCount] = useState(0)
  const nav   = useNavigate()
  const rm    = ROLE_META[profile?.role] || ROLE_META.member_free
  const av    = initials(profile?.displayName || '?')
  const color = strToColor(profile?.uid || '')

  // presence ping
  useEffect(() => {
    if (!profile?.uid) return
    const ref = doc(db, 'users', profile.uid)
    const ping = async () => {
      try { await updateDoc(ref, { lastSeen: serverTimestamp(), isOnline: true }) } catch (_) {}
    }
    ping()
    const iv = setInterval(ping, PRESENCE_INTERVAL)
    const bye = () => { try { updateDoc(ref, { isOnline: false }) } catch (_) {} }
    window.addEventListener('beforeunload', bye)
    return () => { clearInterval(iv); window.removeEventListener('beforeunload', bye); bye() }
  }, [profile?.uid])

  // online users
  useEffect(() => {
    if (!profile?.uid) return
    const threshold = Timestamp.fromMillis(Date.now() - ONLINE_THRESHOLD)
    const q = query(collection(db, 'users'), where('lastSeen', '>=', threshold))
    return onSnapshot(q, snap => {
      setOnlineUsers(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.uid !== profile.uid)
          .sort((a, b) => (b.lastSeen?.toMillis?.() || 0) - (a.lastSeen?.toMillis?.() || 0))
          .slice(0, 8)
      )
    }, () => {})
  }, [profile?.uid])

  // unread notifications count
  useEffect(() => {
    if (!profile?.uid) return
    const q = query(
      collection(db, 'users', profile.uid, 'notifications'),
      where('read', '==', false),
      limit(20)
    )
    return onSnapshot(q, snap => setUnreadCount(snap.size), () => {})
  }, [profile?.uid])

  const NavItem = ({ to, label }) => (
    <NavLink to={to} onClick={() => setOpen(false)}
      className={({ isActive }) =>
        `flex items-center px-2.5 py-2 rounded-[8px] text-[0.76rem] font-medium transition-all
        ${isActive ? 'bg-[rgba(229,24,27,.1)] text-[#FF4447] font-semibold' : 'text-gray-500 hover:bg-white/[.04] hover:text-white'}`}>
      {label}
    </NavLink>
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#080808]">
      {/* TOP BAR */}
      <header className="sticky top-0 z-[300] h-14 flex items-center gap-4 px-5 bg-[rgba(8,8,8,.98)] backdrop-blur-2xl border-b border-white/[.06]">
        <button className="lg:hidden p-1.5 rounded-lg bg-white/[.04] border border-white/[.06] text-gray-400 text-sm"
          onClick={() => setOpen(!open)}>
          {open ? '✕' : '☰'}
        </button>

        {/* logo */}
        <button onClick={() => nav('dashboard')} className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 bg-[#E5181B] rounded-[6px] flex items-center justify-center font-[Montserrat] font-black text-[0.62rem] text-white tracking-wide">
            CTO
          </div>
          <span className="hidden sm:block font-[Montserrat] font-black text-[0.72rem] tracking-widest text-white uppercase">
            Access <span className="text-[#E5181B]">Forum</span>
          </span>
        </button>

        {/* desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-[0.73rem] font-medium font-[Montserrat] transition-all whitespace-nowrap
                ${isActive ? 'text-[#FF4447] font-semibold' : 'text-gray-500 hover:text-white'}`}>
              {n.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="admin"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-[0.73rem] font-medium font-[Montserrat] transition-all whitespace-nowrap
                ${isActive ? 'text-[#FF4447] font-semibold' : 'text-gray-500 hover:text-white'}`}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* right side */}
        <div className="flex items-center gap-3 ml-auto flex-shrink-0">
          {/* online indicator */}
          {onlineUsers.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-blink flex-shrink-0"/>
              <span className="text-[0.67rem] text-gray-500 font-[Montserrat]">{onlineUsers.length} online</span>
            </div>
          )}

          {/* notification bell */}
          <button onClick={() => nav('notifications')}
            className="relative w-8 h-8 rounded-[8px] flex items-center justify-center bg-white/[.03] border border-white/[.06] hover:border-white/[.12] transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E5181B] rounded-full flex items-center justify-center text-white font-bold font-[Montserrat]"
                style={{ fontSize: '9px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* avatar */}
          <button onClick={() => nav('profile')}
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.6rem] flex-shrink-0 ring-1 ring-white/10 hover:ring-red-500/40 transition-all"
            style={{ background: color }}>
            {av}
          </button>

          <button onClick={signOut}
            className="hidden md:block text-[0.72rem] text-gray-600 hover:text-red-400 transition-colors font-[Montserrat]">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* LEFT SIDEBAR */}
        <aside className={`${open ? 'flex' : 'hidden'} lg:flex flex-col w-[196px] flex-shrink-0 border-r border-white/[.05] bg-[#0c0c0c] fixed lg:sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto z-[200] lg:z-auto p-3 gap-0.5`}>
          {NAV.map(n => <NavItem key={n.to} {...n} />)}
          {isAdmin && <NavItem to="admin" label="Admin Panel" />}
          <NavItem to="notifications" label={unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'} />

          <div className="mt-4 mb-1.5 px-2.5 text-[0.58rem] font-bold tracking-[.14em] uppercase text-gray-700">
            Channels
          </div>
          {CHANNELS.map(c => (
            <NavLink key={c.to} to={c.to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] text-[0.73rem] font-medium transition-all
                ${isActive ? 'bg-[rgba(229,24,27,.08)] text-[#FF4447]' : 'text-gray-500 hover:bg-white/[.03] hover:text-white'}`}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }}/>
              {c.label}
            </NavLink>
          ))}

          {/* profile mini */}
          <div className="mt-auto pt-3 border-t border-white/[.05]">
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.56rem] flex-shrink-0"
                style={{ background: color }}>{av}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.73rem] font-semibold truncate">{profile?.displayName}</div>
                <div className={`inline-flex text-[0.58rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full ${rm.cls}`}>
                  {rm.badge}
                </div>
              </div>
            </div>
            <button onClick={signOut}
              className="w-full text-left px-2.5 py-1.5 rounded-[8px] text-[0.73rem] text-gray-600 hover:text-red-400 hover:bg-red-900/10 transition-all font-[Montserrat]">
              Sign out
            </button>
          </div>
        </aside>
        {open && <div className="fixed inset-0 bg-black/60 z-[199] lg:hidden" onClick={() => setOpen(false)}/>}

        {/* MAIN */}
        <main className="flex-1 min-w-0 p-6 overflow-auto">{children}</main>

        {/* RIGHT PANEL */}
        <aside className="hidden xl:flex flex-col w-[240px] flex-shrink-0 border-l border-white/[.05] bg-[#0c0c0c] p-4 gap-4 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.65rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat]">Online Now</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-blink"/>
                <span className="text-[0.65rem] text-gray-500 font-[Montserrat]">{onlineUsers.length}</span>
              </div>
            </div>
            {onlineUsers.length === 0 ? (
              <p className="text-[0.7rem] text-gray-700">No other members online.</p>
            ) : onlineUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2.5 py-1.5 border-b border-white/[.03] last:border-0">
                <div className="relative flex-shrink-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold font-[Montserrat] text-[0.54rem]"
                    style={{ background: strToColor(u.uid || u.id) }}>
                    {initials(u.displayName || '?')}
                  </div>
                  <span className="absolute -bottom-px -right-px w-2 h-2 rounded-full bg-green-400 border border-[#0c0c0c]"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.72rem] font-medium truncate text-gray-200">{u.displayName}</div>
                  <div className="text-[0.6rem] text-gray-600 truncate">{u.title || ROLE_META[u.role]?.label || 'Member'}</div>
                </div>
              </div>
            ))}
          </div>

          {profile && (
            <div>
              <div className="text-[0.65rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">My Stats</div>
              {[
                { l: 'XP Points', v: (profile.xp || 0).toLocaleString() },
                { l: 'Posts',     v: profile.posts  || 0 },
                { l: 'Streak',    v: `${profile.streak || 0} days` },
              ].map(s => (
                <div key={s.l} className="flex justify-between items-center py-1.5 border-b border-white/[.03] last:border-0">
                  <span className="text-[0.71rem] text-gray-500">{s.l}</span>
                  <span className="text-[0.71rem] font-semibold text-white font-[Montserrat]">{s.v}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
