import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, orderBy, limit,
  onSnapshot, updateDoc, deleteDoc, doc, writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { timeAgo } from '@/lib/utils'

const TYPE_META = {
  reply:    { label: 'Reply',    color: '#3b82f6' },
  like:     { label: 'Like',     color: '#e5181b' },
  approved: { label: 'Approved', color: '#22c55e' },
  mention:  { label: 'Mention',  color: '#8b5cf6' },
  event:    { label: 'Event',    color: '#f59e0b' },
  system:   { label: 'System',   color: '#6b7280' },
}

export default function NotificationsPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [notifs,  setNotifs]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.uid) return
    const q = query(
      collection(db, 'users', profile.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    return onSnapshot(q,
      s => { setNotifs(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
  }, [profile?.uid])

  async function markRead(n) {
    if (n.read) return
    await updateDoc(
      doc(db, 'users', profile.uid, 'notifications', n.id),
      { read: true }
    )
  }

  async function markAllRead() {
    const unread = notifs.filter(n => !n.read)
    if (!unread.length) return
    const batch = writeBatch(db)
    unread.forEach(n =>
      batch.update(doc(db, 'users', profile.uid, 'notifications', n.id), { read: true })
    )
    await batch.commit()
  }

  async function deleteNotif(id) {
    await deleteDoc(doc(db, 'users', profile.uid, 'notifications', id))
  }

  async function clearAll() {
    if (!confirm('Clear all notifications?')) return
    const batch = writeBatch(db)
    notifs.forEach(n =>
      batch.delete(doc(db, 'users', profile.uid, 'notifications', n.id))
    )
    await batch.commit()
  }

  function handleClick(n) {
    markRead(n)
    if (n.link) nav(n.link)
  }

  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <div className="max-w-screen-sm mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[Montserrat] text-[1.3rem] font-black">Notifications</h1>
          <p className="text-[0.76rem] text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="text-[0.72rem] font-bold font-[Montserrat] text-gray-400 hover:text-white transition-colors px-3 py-1.5 bg-white/[.04] border border-white/[.06] rounded-[7px]">
              Mark all read
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={clearAll}
              className="text-[0.72rem] font-bold font-[Montserrat] text-gray-600 hover:text-red-400 transition-colors px-3 py-1.5 bg-white/[.04] border border-white/[.06] rounded-[7px]">
              Clear all
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="bg-[#111] border border-white/[.05] rounded-[12px] px-6 py-14 text-center">
          <div className="text-[0.85rem] text-gray-500">No notifications yet.</div>
          <div className="text-[0.75rem] text-gray-700 mt-1">You'll be notified when someone replies to your posts.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {notifs.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.system
            return (
              <div key={n.id}
                onClick={() => handleClick(n)}
                className={`group flex items-start gap-3.5 px-4 py-3.5 rounded-[10px] border cursor-pointer transition-all ${n.read ? 'bg-[#0d0d0d] border-white/[.04] hover:border-white/[.08]' : 'bg-[#111] border-white/[.07] hover:border-white/[.12]'}`}>

                {/* unread dot */}
                <div className="flex-shrink-0 mt-1.5">
                  {n.read
                    ? <div className="w-2 h-2 rounded-full bg-transparent border border-white/[.1]" />
                    : <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />}
                </div>

                {/* content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[0.62rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded border"
                      style={{
                        background: `${meta.color}18`,
                        color: meta.color,
                        borderColor: `${meta.color}30`,
                      }}>
                      {meta.label}
                    </span>
                    <span className="text-[0.65rem] text-gray-600">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className={`text-[0.8rem] leading-snug ${n.read ? 'text-gray-500' : 'text-gray-200'}`}>
                    {n.message}
                  </p>
                  {n.preview && (
                    <p className="text-[0.72rem] text-gray-600 mt-1 line-clamp-1 italic">
                      "{n.preview}"
                    </p>
                  )}
                </div>

                {/* delete */}
                <button
                  onClick={ev => { ev.stopPropagation(); deleteNotif(n.id) }}
                  className="opacity-0 group-hover:opacity-100 text-[0.7rem] text-gray-700 hover:text-red-400 transition-all flex-shrink-0 mt-0.5 px-1">
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
