import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, addDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { strToColor, initials, ROLE_META } from '@/lib/utils'
import toast from 'react-hot-toast'

const ROLES = ['member_free', 'member_pro', 'instructor', 'admin']
const ROLE_LABELS = {
  member_free: '👤 Member',
  member_pro:  'Pro',
  instructor:  'Instructor',
  admin:       'Admin',
}
const STATUS_META = {
  approved:         { label: 'Active',    cls: 'bg-green-900/30 text-green-300 border-green-500/25' },
  pending:          { label: 'Pending',   cls: 'bg-amber-900/30 text-amber-300 border-amber-500/25' },
  pending_approval: { label: 'Pending',   cls: 'bg-amber-900/30 text-amber-300 border-amber-500/25' },
  suspended:        { label: 'Suspended', cls: 'bg-red-900/30 text-red-300 border-red-500/25' },
  banned:           { label: 'Banned',    cls: 'bg-red-900/50 text-red-200 border-red-400/40' },
}

function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/[.08] rounded-[16px] p-6 w-full max-w-sm">
        <div className="text-[0.95rem] font-semibold mb-5 leading-snug">{msg}</div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 bg-white/[.04] border border-white/[.08] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[9px]">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[9px]">Confirm</button>
        </div>
      </div>
    </div>
  )
}

function EnrollDropdown({ u, courses, onEnroll }) {
  const [val, setVal] = useState('')
  if (!courses.length) return null
  return (
    <div className="flex items-center gap-1.5">
      <select value={val} onChange={e => setVal(e.target.value)}
        className="bg-[#1E1E1E] border border-white/[.06] rounded-[7px] px-2 py-1.5 text-white text-[0.68rem] outline-none font-[Poppins]">
        <option value="">Enroll in course…</option>
        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      {val && (
        <button onClick={() => { onEnroll(val); setVal('') }}
          className="text-[0.68rem] font-bold font-[Montserrat] px-2.5 py-1.5 rounded-[6px] bg-[rgba(229,24,27,.1)] border border-red-500/20 text-[#FF4447]">
          + Enroll
        </button>
      )}
    </div>
  )
}

function UserRow({ u, courses, onAction }) {
  const [open, setOpen] = useState(false)
  const status = u.status || 'approved'
  const sm = STATUS_META[status] || STATUS_META.approved
  return (
    <>
      <tr className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.62rem] flex-shrink-0"
              style={{ background: strToColor(u.uid || u.id) }}>
              {initials(u.displayName || '?')}
            </div>
            <div>
              <div className="text-[0.8rem] font-semibold">{u.displayName || '—'}</div>
              <div className="text-[0.67rem] text-gray-500">{u.email}</div>
            </div>
          </div>
        </td>
        <td className="py-3 px-4">
          <select value={u.role || 'member_free'} onChange={e => onAction('role', u, e.target.value)}
            className="bg-[#1E1E1E] border border-white/[.06] rounded-[7px] px-2 py-1.5 text-white text-[0.72rem] outline-none font-[Poppins] cursor-pointer">
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </td>
        <td className="py-3 px-4">
          <span className={`text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full border ${sm.cls}`}>{sm.label}</span>
        </td>
        <td className="py-3 px-4 text-center">
          <span className="font-[Montserrat] text-[0.78rem] font-bold text-[#FF4447]">{(u.xp || 0).toLocaleString()}</span>
        </td>
        <td className="py-3 px-4 text-center text-[0.75rem] text-gray-400">{u.posts || 0}</td>
        <td className="py-3 px-4 text-center text-[0.75rem] text-gray-400">{u.enrolledCourses?.length || 0}</td>
        <td className="py-3 px-4">
          <button onClick={() => setOpen(o => !o)}
            className="text-[0.68rem] font-bold font-[Montserrat] px-2.5 py-1 rounded-[6px] bg-white/[.04] border border-white/[.06] hover:border-red-500/20 hover:text-[#FF4447] transition-all">
            Actions ▾
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-[#111]">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex flex-wrap gap-2 items-center">
              {status !== 'approved' && (
                <button onClick={() => onAction('status', u, 'approved')}
                  className="text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-green-900/30 text-green-300 border border-green-500/25">✅ Reactivate</button>
              )}
              {status !== 'suspended' && (
                <button onClick={() => onAction('status', u, 'suspended')}
                  className="text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-amber-900/30 text-amber-300 border border-amber-500/25">⏸ Suspend</button>
              )}
              {status !== 'banned' && (
                <button onClick={() => onAction('status', u, 'banned')}
                  className="text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-red-900/30 text-red-300 border border-red-500/25">🚫 Ban</button>
              )}
              <button onClick={() => onAction('resetXP', u)}
                className="text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-purple-900/30 text-purple-300 border border-purple-500/25">Reset XP</button>
              <button onClick={() => onAction('resetStreak', u)}
                className="text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-blue-900/30 text-blue-300 border border-blue-500/25">🔥 Reset Streak</button>
              <EnrollDropdown u={u} courses={courses} onEnroll={cid => onAction('enroll', u, cid)} />
              <button onClick={() => onAction('delete', u)}
                className="ml-auto text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-red-900/40 text-red-200 border border-red-400/30">🗑 Delete Account</button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AdminPage() {
  const { isAdmin, approveUser } = useAuth()
  const [tab,          setTab]          = useState('users')
  const [users,        setUsers]        = useState([])
  const [queue,        setQueue]        = useState([])
  const [apps,         setApps]         = useState([])
  const [courses,      setCourses]      = useState([])
  const [codes,        setCodes]        = useState([])
  const [genCount,     setGenCount]     = useState(1)
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [acting,       setActing]       = useState({})
  const [confirm,      setConfirm]      = useState(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!isAdmin) return
    const unsubs = [
      // No orderBy on users — avoids missing field errors
      onSnapshot(collection(db, 'users'),
        s => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
        () => setLoading(false)),
      onSnapshot(query(collection(db, 'approvalQueue'), orderBy('submittedAt', 'desc')),
        s => setQueue(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'applications'), orderBy('appliedAt', 'desc')),
        s => setApps(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'courses'),
        s => setCourses(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'inviteCodes'),
        s => setCodes(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ]
    return () => unsubs.forEach(u => u())
  }, [isAdmin])

  if (!isAdmin) return (
    <div className="flex items-center justify-center min-h-[50vh] text-gray-500">🔒 Admin access only.</div>
  )

  // Sort client-side by xp
  const sortedUsers = [...users].sort((a, b) => (b.xp || 0) - (a.xp || 0))
  const filteredUsers = sortedUsers.filter(u => {
    const matchSearch = !search || `${u.displayName || ''} ${u.email || ''}`.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    const matchStatus = statusFilter === 'all' || (u.status || 'approved') === statusFilter
    return matchSearch && matchRole && matchStatus
  })

  async function handleAction(type, u, value) {
    const uid = u.uid || u.id
    const ref = doc(db, 'users', uid)
    const run = async () => {
      setActing(a => ({ ...a, [uid]: true }))
      try {
        if (type === 'role')        { await updateDoc(ref, { role: value }); toast.success(`Role → ${ROLE_LABELS[value]}`) }
        if (type === 'status')      { await updateDoc(ref, { status: value }); toast.success(`User ${value}`) }
        if (type === 'resetXP')     { await updateDoc(ref, { xp: 0 }); toast.success('XP reset to 0') }
        if (type === 'resetStreak') { await updateDoc(ref, { streak: 0 }); toast.success('Streak reset') }
        if (type === 'enroll')      { await updateDoc(ref, { enrolledCourses: [...(u.enrolledCourses || []), value] }); toast.success('Enrolled!') }
        if (type === 'delete')      { await deleteDoc(ref); toast.success('User deleted') }
      } catch (e) { toast.error(e.message) }
      finally { setActing(a => ({ ...a, [uid]: false })) }
    }
    if (type === 'delete' || type === 'resetXP') {
      setConfirm({
        msg: type === 'delete' ? `Permanently delete ${u.displayName}? This cannot be undone.` : `Reset ${u.displayName}'s XP to 0?`,
        onConfirm: async () => { setConfirm(null); await run() }
      })
    } else { await run() }
  }

  async function handleApprove(uid, approve) {
    setActing(a => ({ ...a, [uid]: true }))
    try { await approveUser(uid, approve); toast.success(approve ? '✅ Approved!' : 'Rejected.') }
    catch (e) { toast.error(e.message) }
    finally { setActing(a => ({ ...a, [uid]: false })) }
  }

  async function handleInstructor(appId, uid, approve) {
    try {
      await updateDoc(doc(db, 'applications', appId), { status: approve ? 'approved' : 'rejected' })
      if (approve) await updateDoc(doc(db, 'users', uid), { role: 'instructor' })
      toast.success(approve ? '🎤 Instructor approved!' : 'Rejected.')
    } catch (e) { toast.error(e.message) }
  }

  async function generateCodes() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const newCodes = Array.from({ length: genCount }, () =>
      Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
    try {
      await Promise.all(newCodes.map(code =>
        addDoc(collection(db, 'inviteCodes'), { code, used: false, createdAt: serverTimestamp() })
      ))
      toast.success(`${genCount} code(s) saved!`)
    } catch (e) { toast.error(e.message) }
  }

  const stats = [
    { l: 'Total Users',      v: users.length,                                                         c: 'text-blue-400',   i: ' ' },
    { l: 'Active',           v: users.filter(u => !['suspended','banned'].includes(u.status)).length, c: 'text-green-400',  i: ' ' },
    { l: 'Suspended/Banned', v: users.filter(u => ['suspended','banned'].includes(u.status)).length,  c: 'text-red-400',    i: ' ' },
    { l: 'Pending Queue',    v: queue.filter(u => u.status === 'pending').length,                     c: 'text-amber-400',  i: ' ' },
    { l: 'Instructor Apps',  v: apps.filter(a => a.status === 'pending').length,                      c: 'text-purple-400', i: ' ' },
    { l: 'Invite Codes',     v: codes.filter(c => !c.used).length,                                    c: 'text-cyan-400',   i: ' ' },
  ]

  const TABS = [
    { id: 'users', label: ' Users',          count: users.length },
    { id: 'queue', label: ' Approval Queue',  count: queue.filter(u => u.status === 'pending').length },
    { id: 'apps',  label: ' Instructor Apps', count: apps.filter(a => a.status === 'pending').length },
    { id: 'codes', label: ' Invite Codes',    count: codes.filter(c => !c.used).length },
  ]

  return (
    <div className="max-w-screen-xl mx-auto">
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="font-[Montserrat] text-[1.35rem] font-black">⚙️ Admin Panel</h1>
        <span className="text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full bg-red-900/30 text-red-300 border border-red-500/25">Admin Only</span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.l} className="bg-[#161616] border border-white/[.06] rounded-[14px] p-3 text-center">
            <div className="text-xl mb-1">{s.i}</div>
            <div className={`font-[Montserrat] text-[1.3rem] font-black ${s.c}`}>{s.v}</div>
            <div className="text-[0.58rem] text-gray-500 mt-0.5 leading-tight">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 bg-[#161616] border border-white/[.06] rounded-[12px] p-1 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[9px] text-[0.73rem] font-bold font-[Montserrat] whitespace-nowrap transition-all ${tab === t.id ? 'bg-[#E5181B] text-white' : 'text-gray-500 hover:text-white'}`}>
            {t.label}
            {t.count > 0 && <span className={`text-[0.58rem] px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-white/20' : 'bg-amber-500/20 text-amber-300'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="bg-[#161616] border border-white/[.06] rounded-[14px] overflow-hidden">
          <div className="flex flex-wrap gap-2 p-4 border-b border-white/[.05]">
            <div className="relative flex-1 min-w-[180px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
                className="w-full bg-[#1E1E1E] border border-white/[.06] rounded-[9px] pl-8 pr-3 py-2 text-white text-[0.78rem] outline-none font-[Poppins] placeholder-gray-600" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="bg-[#1E1E1E] border border-white/[.06] rounded-[9px] px-3 py-2 text-white text-[0.75rem] outline-none font-[Poppins]">
              <option value="all">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#1E1E1E] border border-white/[.06] rounded-[9px] px-3 py-2 text-white text-[0.75rem] outline-none font-[Poppins]">
              <option value="all">All Status</option>
              <option value="approved">Active</option>
              <option value="pending">Pending</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
            <div className="text-[0.7rem] text-gray-500 flex items-center ml-auto">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</div>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-[0.85rem]">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[.05]">
                    {['User', 'Role', 'Status', 'XP', 'Posts', 'Courses', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2.5 px-4 text-[0.63rem] font-bold font-[Montserrat] tracking-[.06em] uppercase text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => <UserRow key={u.id} u={u} courses={courses} onAction={handleAction} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'queue' && (
        <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-5">
          <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-4">Account Approval Queue</div>
          {queue.length === 0 ? (
            <div className="text-[0.82rem] text-gray-500 py-6 text-center">✅ No pending accounts</div>
          ) : (
            <div className="divide-y divide-white/[.05]">
              {queue.map(u => (
                <div key={u.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.68rem] flex-shrink-0" style={{ background: strToColor(u.uid || u.id) }}>{initials(u.name || '?')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-[0.84rem]">{u.name}</span>
                      <span className={`text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${STATUS_META[u.status]?.cls || STATUS_META.pending.cls}`}>{STATUS_META[u.status]?.label || 'Pending'}</span>
                    </div>
                    <div className="text-[0.73rem] text-gray-400">{u.email}</div>
                    <div className="text-[0.67rem] text-gray-600 mt-0.5">Code: <strong className="text-gray-400 font-[Montserrat]">{u.inviteCode}</strong></div>
                  </div>
                  {u.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button disabled={acting[u.id]} onClick={() => handleApprove(u.uid || u.id, true)} className="bg-green-900/30 text-green-300 border border-green-500/25 px-2.5 py-1 rounded-[6px] text-[0.65rem] font-bold font-[Montserrat] disabled:opacity-50">✅ Approve</button>
                      <button disabled={acting[u.id]} onClick={() => handleApprove(u.uid || u.id, false)} className="bg-red-900/30 text-red-300 border border-red-500/25 px-2.5 py-1 rounded-[6px] text-[0.65rem] font-bold font-[Montserrat] disabled:opacity-50">✕ Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'apps' && (
        <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-5">
          <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-4">Instructor Applications</div>
          {apps.length === 0 ? (
            <div className="text-[0.82rem] text-gray-500 py-6 text-center">No applications yet.</div>
          ) : (
            <div className="divide-y divide-white/[.05]">
              {apps.map(a => (
                <div key={a.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.68rem] flex-shrink-0" style={{ background: strToColor(a.uid) }}>{initials(a.name || a.displayName || '?')}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[0.84rem]">{a.name || a.displayName}</span>
                        <span className={`text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${a.status === 'pending' ? 'bg-amber-900/30 text-amber-300 border-amber-500/25' : 'bg-green-900/30 text-green-300 border-green-500/25'}`}>{a.status}</span>
                      </div>
                      <div className="text-[0.72rem] text-gray-400">{a.email}</div>
                    </div>
                  </div>
                  <div className="bg-[#1E1E1E] rounded-[10px] p-3 mb-3">
                    <div className="text-[0.71rem] font-bold text-[#FF4447] mb-1">Topic: {a.topic}</div>
                    <div className="text-[0.73rem] text-gray-400 leading-relaxed line-clamp-3">{a.bio}</div>
                  </div>
                  {a.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleInstructor(a.id, a.uid, true)} className="bg-green-900/30 text-green-300 border border-green-500/25 px-3 py-1.5 rounded-[6px] text-[0.7rem] font-bold font-[Montserrat]">✅ Approve</button>
                      <button onClick={() => handleInstructor(a.id, a.uid, false)} className="bg-red-900/30 text-red-300 border border-red-500/25 px-3 py-1.5 rounded-[6px] text-[0.7rem] font-bold font-[Montserrat]">✕ Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'codes' && (
        <div className="bg-[#161616] border border-white/[.06] rounded-[14px] p-5">
          <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-4">Invite Codes</div>
          <div className="flex items-end gap-3 mb-5">
            <div>
              <label className="font-[Montserrat] text-[0.72rem] font-bold text-gray-300 block mb-1.5">How many?</label>
              <input type="number" min={1} max={50} value={genCount} onChange={e => setGenCount(+e.target.value)}
                className="w-24 bg-[#1E1E1E] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins]" />
            </div>
            <button onClick={generateCodes} className="bg-[#E5181B] hover:bg-[#C01215] text-white px-4 py-2.5 rounded-[10px] text-[0.8rem] font-bold font-[Montserrat]">🔑 Generate & Save</button>
          </div>
          {codes.length === 0 ? (
            <div className="text-[0.82rem] text-gray-500 py-4 text-center">No codes yet. Generate some above.</div>
          ) : (
            <>
              <div className="font-[Montserrat] text-[0.7rem] font-bold text-gray-400 mb-2">{codes.filter(c => !c.used).length} unused · {codes.filter(c => c.used).length} used</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {codes.map(c => (
                  <button key={c.id} onClick={() => { navigator.clipboard?.writeText(c.code); toast.success('Copied!') }}
                    className={`font-[Montserrat] font-bold text-[0.82rem] tracking-widest rounded-[8px] py-2.5 px-3 text-center transition-all ${c.used ? 'bg-white/[.02] border border-white/[.04] text-gray-600 line-through cursor-not-allowed' : 'bg-[#1E1E1E] border border-red-500/20 text-[#FF4447] hover:bg-red-900/20'}`}>
                    {c.code}
                    {c.used && <div className="text-[0.55rem] font-normal text-gray-600 mt-0.5">Used</div>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
