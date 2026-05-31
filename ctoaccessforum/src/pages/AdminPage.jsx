import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot, getDocs,
  updateDoc, deleteDoc, doc, setDoc, serverTimestamp, where, arrayUnion, increment
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { strToColor, initials, ROLE_META } from '@/lib/utils'
import { notify } from '@/lib/notifications'
import toast from 'react-hot-toast'

const ROLES = ['member_free', 'member_pro', 'instructor', 'admin']
const ROLE_LABELS = { member_free: 'Member', member_pro: 'Pro', instructor: 'Instructor', admin: 'Admin' }
const STATUS_META = {
  approved:         { label: 'Active',    cls: 'bg-green-900/30 text-green-300 border-green-500/25' },
  pending:          { label: 'Pending',   cls: 'bg-amber-900/30 text-amber-300 border-amber-500/25' },
  pending_approval: { label: 'Pending',   cls: 'bg-amber-900/30 text-amber-300 border-amber-500/25' },
  suspended:        { label: 'Suspended', cls: 'bg-red-900/30 text-red-300 border-red-500/25' },
  banned:           { label: 'Banned',    cls: 'bg-red-900/50 text-red-200 border-red-400/40' },
}
const PLAN_OPTIONS = ['free', 'pro']

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
      <select value={val} onChange={ev => setVal(ev.target.value)}
        className="bg-[#1E1E1E] border border-white/[.06] rounded-[7px] px-2 py-1.5 text-white text-[0.68rem] outline-none font-[Poppins]">
        <option value="">Enroll in course…</option>
        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      {val && (
        <button onClick={() => { onEnroll(val); setVal('') }}
          className="text-[0.68rem] font-bold font-[Montserrat] px-2.5 py-1.5 rounded-[6px] bg-[rgba(229,24,27,.1)] border border-red-500/20 text-[#FF4447]">
          Enroll
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
          <select value={u.role || 'member_free'} onChange={ev => onAction('role', u, ev.target.value)}
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
            Actions
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-[#0d0d0d]">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex flex-wrap gap-2 items-center">
              {status !== 'approved' && <button onClick={() => onAction('status', u, 'approved')} className="text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-green-900/30 text-green-300 border border-green-500/25">Reactivate</button>}
              {status !== 'suspended' && <button onClick={() => onAction('status', u, 'suspended')} className="text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-amber-900/30 text-amber-300 border border-amber-500/25">Suspend</button>}
              {status !== 'banned' && <button onClick={() => onAction('status', u, 'banned')} className="text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-red-900/30 text-red-300 border border-red-500/25">Ban</button>}
              <button onClick={() => onAction('resetXP', u)} className="text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-purple-900/30 text-purple-300 border border-purple-500/25">Reset XP</button>
              <button onClick={() => onAction('resetStreak', u)} className="text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-blue-900/30 text-blue-300 border border-blue-500/25">Reset Streak</button>
              <EnrollDropdown u={u} courses={courses} onEnroll={cid => onAction('enroll', u, cid)} />
              <button onClick={() => onAction('delete', u)} className="ml-auto text-[0.68rem] font-bold font-[Montserrat] px-3 py-1.5 rounded-[6px] bg-red-900/40 text-red-200 border border-red-400/30">Delete Account</button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Instructor App Card ────────────────────────────────────────────
function InstructorAppCard({ app: a, onAction }) {
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const statusCls = {
    pending:  'bg-amber-900/30 text-amber-300 border-amber-500/25',
    approved: 'bg-green-900/30 text-green-300 border-green-500/25',
    rejected: 'bg-red-900/30 text-red-300 border-red-500/25',
  }
  return (
    <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[.05]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.68rem] flex-shrink-0"
            style={{ background: strToColor(a.uid) }}>
            {initials(a.name || '?')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[0.84rem]">{a.name}</span>
              <span className={`text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${statusCls[a.status] || statusCls.pending}`}>{a.status}</span>
            </div>
            <div className="text-[0.68rem] text-gray-500">{a.email} · {a.currentRole}</div>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-[0.7rem] text-gray-500 hover:text-white font-[Montserrat] transition-colors">
          {open ? 'Hide' : 'View details'}
        </button>
      </div>
      <div className="px-4 py-3 grid grid-cols-3 gap-3 text-[0.68rem]">
        <div><span className="text-gray-600">Expertise</span><div className="text-gray-300 mt-0.5">{a.expertise}</div></div>
        <div><span className="text-gray-600">Experience</span><div className="text-gray-300 mt-0.5">{a.yearsExp}</div></div>
        <div><span className="text-gray-600">Course type</span><div className="text-gray-300 mt-0.5 capitalize">{a.courseType}</div></div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-white/[.04]">
          <div className="grid grid-cols-1 gap-3 mt-3">
            <div>
              <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-1">Proposed course</div>
              <div className="text-[0.78rem] font-bold text-white">{a.proposedTitle}</div>
              <div className="text-[0.72rem] text-gray-500 mt-0.5">Target: {a.targetAudience}</div>
            </div>
            <div>
              <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-1">Professional bio</div>
              <p className="text-[0.75rem] text-gray-400 leading-relaxed">{a.bio}</p>
            </div>
            <div>
              <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-1">Course outline</div>
              <p className="text-[0.75rem] text-gray-400 leading-relaxed">{a.outline}</p>
            </div>
            {a.linkedin && (
              <div>
                <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-1">LinkedIn</div>
                <a href={a.linkedin} target="_blank" rel="noopener noreferrer" className="text-[0.75rem] text-[#FF4447] hover:underline">{a.linkedin}</a>
              </div>
            )}
          </div>
          {a.status === 'pending' && (
            <div className="mt-4 pt-4 border-t border-white/[.04]">
              <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-2">Decision note (sent to applicant)</div>
              <textarea value={note} onChange={ev => setNote(ev.target.value)}
                placeholder="Optional note to applicant…" rows={2} maxLength={500}
                className="w-full bg-[#111] border border-white/[.06] rounded-[8px] px-3 py-2 text-white text-[0.78rem] outline-none font-[Poppins] placeholder-gray-600 resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={() => onAction(a.id, a.uid, true, note)}
                  className="flex-1 py-2 bg-green-900/30 text-green-300 border border-green-500/25 text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-green-900/50 transition-colors">
                  Approve as Instructor
                </button>
                <button onClick={() => onAction(a.id, a.uid, false, note)}
                  className="flex-1 py-2 bg-red-900/30 text-red-300 border border-red-500/25 text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-red-900/50 transition-colors">
                  Reject
                </button>
              </div>
            </div>
          )}
          {a.status !== 'pending' && a.adminNote && (
            <div className="mt-3 pt-3 border-t border-white/[.04]">
              <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-1">Admin note sent</div>
              <p className="text-[0.75rem] text-gray-400 italic">"{a.adminNote}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Course Review Card ─────────────────────────────────────────────
function CourseReviewCard({ course: c, onAction }) {
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const statusCls = {
    draft:          'bg-gray-900/30 text-gray-400 border-gray-500/25',
    pending_review: 'bg-amber-900/30 text-amber-300 border-amber-500/25',
    published:      'bg-green-900/30 text-green-300 border-green-500/25',
    rejected:       'bg-red-900/30 text-red-300 border-red-500/25',
  }
  const totalLessons = (c.modules || []).reduce((a, m) => a + (m.lessons?.length || 0), 0)
  const totalQuizzes = Object.keys(c.quizzes || {}).filter(k => c.quizzes[k]?.questions?.length > 0).length

  return (
    <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] overflow-hidden">
      {/* header */}
      <div className="flex items-start gap-4 px-4 py-4 border-b border-white/[.05]">
        {c.thumbnailUrl ? (
          <img src={c.thumbnailUrl} alt={c.title} className="w-20 h-14 object-cover rounded-[6px] flex-shrink-0" />
        ) : (
          <div className="w-20 h-14 bg-[#111] border border-white/[.06] rounded-[6px] flex-shrink-0 flex items-center justify-center text-[0.68rem] text-gray-600 font-[Montserrat]">
            No thumb
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-[Montserrat] font-bold text-[0.88rem]">{c.title}</span>
            <span className={`text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${statusCls[c.status] || statusCls.draft}`}>
              {c.status?.replace('_', ' ')}
            </span>
          </div>
          <div className="text-[0.68rem] text-gray-500 mb-1">
            By {c.instructorName} · {c.category} · {c.level}
          </div>
          <div className="flex gap-3 text-[0.65rem] text-gray-600">
            <span>{(c.modules || []).length} modules</span>
            <span>{totalLessons} lessons</span>
            <span>{totalQuizzes} quizzes</span>
            <span>{c.isFree ? 'Free' : `AED ${c.price}`}</span>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)}
          className="text-[0.7rem] text-gray-500 hover:text-white font-[Montserrat] transition-colors flex-shrink-0">
          {open ? 'Hide' : 'Review'}
        </button>
      </div>

      {/* expanded review */}
      {open && (
        <div className="px-4 pb-4">
          {/* description */}
          <div className="mt-3 mb-3">
            <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-1">Description</div>
            <p className="text-[0.75rem] text-gray-400 leading-relaxed line-clamp-4">{c.description}</p>
          </div>

          {/* what students learn */}
          {c.whatYouLearn && (
            <div className="mb-3">
              <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-1">Learning Outcomes</div>
              <p className="text-[0.75rem] text-gray-400 leading-relaxed">{c.whatYouLearn}</p>
            </div>
          )}

          {/* modules list */}
          <div className="mb-3">
            <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-2">Course Structure</div>
            <div className="flex flex-col gap-1.5">
              {(c.modules || []).map((mod, mi) => (
                <div key={mod.id} className="bg-[#111] rounded-[6px] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.75rem] font-semibold">Module {mi + 1}: {mod.title || 'Untitled'}</span>
                    <div className="flex gap-2 text-[0.63rem] text-gray-500">
                      <span>{mod.lessons?.length || 0} lessons</span>
                      {c.quizzes?.[mod.id]?.questions?.length > 0 && (
                        <span>· {c.quizzes[mod.id].questions.length} quiz Qs</span>
                      )}
                    </div>
                  </div>
                  {(mod.lessons || []).map((l, li) => (
                    <div key={l.id} className="text-[0.67rem] text-gray-600 mt-1 pl-3">
                      {li + 1}. {l.title || 'Untitled lesson'}
                      {l.isFree && <span className="ml-1 text-purple-400">Free preview</span>}
                      {l.duration && <span className="ml-1">· {l.duration} min</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* trailer preview */}
          {c.trailerUrl && (
            <div className="mb-3">
              <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-1">Trailer</div>
              <a href={c.trailerUrl} target="_blank" rel="noopener noreferrer"
                className="text-[0.75rem] text-[#FF4447] hover:underline">{c.trailerUrl}</a>
            </div>
          )}

          {/* admin note + decision */}
          {c.status === 'pending_review' && (
            <div className="mt-4 pt-4 border-t border-white/[.04]">
              <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-2">
                Admin Note (sent to instructor)
              </div>
              <textarea value={note} onChange={ev => setNote(ev.target.value)}
                placeholder="e.g. Great content! Please add a thumbnail before we publish. OR Approved — excellent course structure."
                rows={3} maxLength={500}
                className="w-full bg-[#111] border border-white/[.06] rounded-[8px] px-3 py-2 text-white text-[0.78rem] outline-none font-[Poppins] placeholder-gray-600 resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={() => onAction(c.id, c.instructorId, 'published', note)}
                  className="flex-1 py-2.5 bg-green-900/30 text-green-300 border border-green-500/25 text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-green-900/50 transition-colors">
                  Approve & Publish
                </button>
                <button onClick={() => onAction(c.id, c.instructorId, 'rejected', note)}
                  className="flex-1 py-2.5 bg-red-900/30 text-red-300 border border-red-500/25 text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-red-900/50 transition-colors">
                  Reject with Note
                </button>
                <button onClick={() => onAction(c.id, c.instructorId, 'draft', note)}
                  className="px-3 py-2.5 bg-white/[.04] border border-white/[.08] text-gray-400 text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-white/[.07] transition-colors">
                  Return to Draft
                </button>
              </div>
            </div>
          )}

          {/* already decided */}
          {c.status === 'published' && (
            <div className="mt-3 pt-3 border-t border-white/[.04] flex gap-2">
              <button onClick={() => onAction(c.id, c.instructorId, 'rejected', '')}
                className="px-3 py-1.5 bg-red-900/30 text-red-300 border border-red-500/25 text-[0.7rem] font-bold font-[Montserrat] rounded-[6px]">
                Unpublish
              </button>
              <button onClick={() => onAction(c.id, c.instructorId, 'draft', '')}
                className="px-3 py-1.5 bg-white/[.04] border border-white/[.08] text-gray-400 text-[0.7rem] font-bold font-[Montserrat] rounded-[6px]">
                Return to Draft
              </button>
            </div>
          )}

          {c.adminNote && (
            <div className="mt-3 pt-3 border-t border-white/[.04]">
              <div className="text-[0.65rem] font-bold text-gray-600 uppercase tracking-wide font-[Montserrat] mb-1">Last admin note</div>
              <p className="text-[0.75rem] text-gray-400 italic">"{c.adminNote}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  MAIN ADMIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { isAdmin, approveUser } = useAuth()
  const [tab,          setTab]          = useState('users')
  const [users,        setUsers]        = useState([])
  const [queue,        setQueue]        = useState([])
  const [apps,         setApps]         = useState([])
  const [courses,      setCourses]      = useState([])
  const [allCourses,   setAllCourses]   = useState([])
  const [codes,        setCodes]        = useState([])
  const [enrollments,   setEnrollments]   = useState([])
  const [enrolLoading,  setEnrolLoading]  = useState(false)
  const [enrolSearch,   setEnrolSearch]   = useState('')
  const [pendingPay,    setPendingPay]    = useState([])
  const [settings,       setSettings]       = useState(null)
  const [savingSettings, setSavingSettings]  = useState(false)
  const [settingsForm,   setSettingsForm]    = useState({
    bankName:'', accountName:'', accountNumber:'', iban:'',
    instapayId:'', whatsapp:'+971506328968', email:'info@redjemie.com', notes:''
  })
  const [genCount,     setGenCount]     = useState(1)
  const [genPlan,      setGenPlan]      = useState('free')
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('pending_review')
  const [acting,       setActing]       = useState({})
  const [confirm,      setConfirm]      = useState(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!isAdmin) return
    const unsubs = [
      onSnapshot(collection(db, 'users'),
        s => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
        () => setLoading(false)),
      onSnapshot(query(collection(db, 'approvalQueue'), orderBy('submittedAt', 'desc')),
        s => setQueue(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'applications'), orderBy('appliedAt', 'desc')),
        s => setApps(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'courses'),
        s => {
          const all = s.docs.map(d => ({ id: d.id, ...d.data() }))
          setAllCourses(all)
          setCourses(all)
        }),
      onSnapshot(collection(db, 'inviteCodes'),
        s => {
          const all = s.docs.map(d => ({ id: d.id, ...d.data() }))
          all.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
          setCodes(all)
        }),
      onSnapshot(query(collection(db, 'enrollments'), orderBy('enrolledAt', 'desc')),
        s => setEnrollments(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        () => {}),
      onSnapshot(query(collection(db, 'pendingPayments'), orderBy('submittedAt', 'desc')),
        s => setPendingPay(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        () => {}),
      onSnapshot(doc(db, 'settings', 'payment'),
        snap => {
          const data = snap.exists() ? snap.data() : {
            bankName:'', accountName:'', accountNumber:'', iban:'',
            instapayId:'', whatsapp:'+971506328968', email:'info@redjemie.com', notes:''
          }
          setSettings(data)
          setSettingsForm(data)
        },
        () => {}),
    ]
    return () => unsubs.forEach(u => u())
  }, [isAdmin])

  if (!isAdmin) return (
    <div className="flex items-center justify-center min-h-[50vh] text-gray-500 text-[0.85rem]">Admin access only.</div>
  )

  const sortedUsers   = [...users].sort((a, b) => (b.xp || 0) - (a.xp || 0))
  const filteredUsers = sortedUsers.filter(u => {
    const matchSearch = !search || `${u.displayName || ''} ${u.email || ''}`.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    const matchStatus = statusFilter === 'all' || (u.status || 'approved') === statusFilter
    return matchSearch && matchRole && matchStatus
  })

  const filteredCourses = allCourses.filter(c =>
    courseFilter === 'all' ? true : c.status === courseFilter
  )

  const pendingCourses  = allCourses.filter(c => c.status === 'pending_review').length
  const publishedCourses = allCourses.filter(c => c.status === 'published').length

  async function handleAction(type, u, value) {
    const uid = u.uid || u.id
    const ref = doc(db, 'users', uid)
    const run = async () => {
      setActing(a => ({ ...a, [uid]: true }))
      try {
        if (type === 'role')        { await updateDoc(ref, { role: value }); toast.success(`Role updated to ${ROLE_LABELS[value]}`) }
        if (type === 'status')      { await updateDoc(ref, { status: value }); toast.success(`User ${value}`) }
        if (type === 'resetXP')     { await updateDoc(ref, { xp: 0 }); toast.success('XP reset') }
        if (type === 'resetStreak') { await updateDoc(ref, { streak: 0 }); toast.success('Streak reset') }
        if (type === 'enroll')      { await updateDoc(ref, { enrolledCourses: [...(u.enrolledCourses || []), value] }); toast.success('Enrolled') }
        if (type === 'delete')      { await deleteDoc(ref); toast.success('User deleted') }
      } catch (err) { toast.error(err.message) }
      finally { setActing(a => ({ ...a, [uid]: false })) }
    }
    if (type === 'delete' || type === 'resetXP') {
      setConfirm({
        msg: type === 'delete' ? `Permanently delete ${u.displayName}?` : `Reset ${u.displayName}'s XP to 0?`,
        onConfirm: async () => { setConfirm(null); await run() }
      })
    } else { await run() }
  }

  async function handleApprove(uid, approve) {
    setActing(a => ({ ...a, [uid]: true }))
    try { await approveUser(uid, approve); toast.success(approve ? 'Approved' : 'Rejected') }
    catch (err) { toast.error(err.message) }
    finally { setActing(a => ({ ...a, [uid]: false })) }
  }

  async function handleInstructor(appId, uid, approve, note = '') {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: approve ? 'approved' : 'rejected',
        adminNote: note || null,
        reviewedAt: serverTimestamp(),
      })
      if (approve) await updateDoc(doc(db, 'users', uid), { role: 'instructor' })
      await notify(uid, {
        type:    approve ? 'approved' : 'system',
        message: approve
          ? 'Your instructor application has been approved! You can now create courses.'
          : 'Your instructor application was not approved at this time.',
        preview: note || null,
        link:    '/profile',
      })
      toast.success(approve ? 'Instructor approved' : 'Rejected')
    } catch (err) { toast.error(err.message) }
  }

  async function handleCourseAction(courseId, instructorId, newStatus, note = '') {
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        status:      newStatus,
        adminNote:   note || null,
        reviewedAt:  serverTimestamp(),
        ...(newStatus === 'published' ? { publishedAt: serverTimestamp() } : {}),
      })
      // notify instructor
      const messages = {
        published: 'Your course has been approved and is now live!',
        rejected:  'Your course submission was not approved.',
        draft:     'Your course has been returned to draft for revisions.',
      }
      await notify(instructorId, {
        type:    newStatus === 'published' ? 'approved' : 'system',
        message: messages[newStatus] || `Course status updated to ${newStatus}`,
        preview: note || null,
        link:    '/courses',
      })
      toast.success(
        newStatus === 'published' ? 'Course published!' :
        newStatus === 'rejected'  ? 'Course rejected.' :
        'Course returned to draft.'
      )
    } catch (err) { toast.error(err.message) }
  }

  async function generateCodes() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const newCodes = Array.from({ length: genCount }, () =>
      Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    )
    try {
      await Promise.all(newCodes.map(code =>
        setDoc(doc(db, 'inviteCodes', code), {
          code, used: false, usedBy: null, usedAt: null,
          plan: genPlan, createdAt: serverTimestamp(), createdBy: 'admin',
        })
      ))
      toast.success(`${genCount} code${genCount > 1 ? 's' : ''} generated`)
    } catch (err) { toast.error(err.message) }
  }

  async function deleteCode(codeId) {
    try { await deleteDoc(doc(db, 'inviteCodes', codeId)); toast.success('Code deleted') }
    catch (err) { toast.error(err.message) }
  }

  const unusedCodes = codes.filter(c => !c.used)
  const usedCodes   = codes.filter(c => c.used)

  const stats = [
    { l: 'Total Users',      v: users.length,                                                         c: 'text-blue-400'   },
    { l: 'Active',           v: users.filter(u => !['suspended','banned'].includes(u.status)).length, c: 'text-green-400'  },
    { l: 'Pending Approval', v: queue.filter(u => u.status === 'pending').length,                     c: 'text-amber-400'  },
    { l: 'Instructor Apps',  v: apps.filter(a => a.status === 'pending').length,                      c: 'text-purple-400' },
    { l: 'Courses Pending',  v: pendingCourses,                                                        c: 'text-red-400'    },
    { l: 'Available Codes',  v: unusedCodes.length,                                                   c: 'text-cyan-400'   },
  ]

  const TABS = [
    { id: 'users',       label: 'Users',            count: users.length },
    { id: 'queue',       label: 'Approval Queue',   count: queue.filter(u => u.status === 'pending').length },
    { id: 'apps',        label: 'Instructor Apps',  count: apps.filter(a => a.status === 'pending').length },
    { id: 'courses',     label: 'Course Review',    count: pendingCourses },
    { id: 'payments',    label: 'Pending Payments', count: pendingPay.filter(p => p.status === 'pending').length },
    { id: 'enrollments', label: 'Enrollments',      count: enrollments.length },
    { id: 'revenue',     label: 'Revenue',          count: 0 },
    { id: 'codes',       label: 'Invite Codes',     count: unusedCodes.length },
    { id: 'settings',    label: '⚙ Settings',       count: 0 },
  ]

  return (
    <div className="max-w-screen-xl mx-auto">
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      <div className="flex items-center gap-3 mb-5">
        <h1 className="font-[Montserrat] text-[1.35rem] font-black">Admin Panel</h1>
        <span className="text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full bg-red-900/30 text-red-300 border border-red-500/25">Admin Only</span>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.l} className="bg-[#111] border border-white/[.06] rounded-[12px] p-3 text-center">
            <div className={`font-[Montserrat] text-[1.3rem] font-black ${s.c}`}>{s.v}</div>
            <div className="text-[0.58rem] text-gray-500 mt-0.5 leading-tight font-[Montserrat]">{s.l}</div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="flex gap-1 bg-[#111] border border-white/[.06] rounded-[12px] p-1 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[9px] text-[0.73rem] font-bold font-[Montserrat] whitespace-nowrap transition-all ${tab === t.id ? 'bg-[#E5181B] text-white' : 'text-gray-500 hover:text-white'}`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[0.58rem] px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-white/20' : 'bg-amber-500/20 text-amber-300'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── USERS ── */}
      {tab === 'users' && (
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden">
          <div className="flex flex-wrap gap-2 p-4 border-b border-white/[.05]">
            <input value={search} onChange={ev => setSearch(ev.target.value)} placeholder="Search name or email…"
              className="flex-1 min-w-[180px] bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2 text-white text-[0.78rem] outline-none font-[Poppins] placeholder-gray-600" />
            <select value={roleFilter} onChange={ev => setRoleFilter(ev.target.value)}
              className="bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3 py-2 text-white text-[0.75rem] outline-none font-[Poppins]">
              <option value="all">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <select value={statusFilter} onChange={ev => setStatusFilter(ev.target.value)}
              className="bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3 py-2 text-white text-[0.75rem] outline-none font-[Poppins]">
              <option value="all">All Status</option>
              <option value="approved">Active</option>
              <option value="pending_approval">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
            <div className="text-[0.7rem] text-gray-500 flex items-center ml-auto font-[Montserrat]">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-[0.85rem]">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[.05]">
                    {['User','Role','Status','XP','Posts','Courses','Actions'].map(h => (
                      <th key={h} className="text-left py-2.5 px-4 text-[0.63rem] font-bold font-[Montserrat] tracking-[.06em] uppercase text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => <UserRow key={u.id} u={u} courses={allCourses.filter(c => c.status === 'published')} onAction={handleAction} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── APPROVAL QUEUE ── */}
      {tab === 'queue' && (
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
          <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-4">Account Approval Queue</div>
          {queue.length === 0 ? (
            <div className="text-[0.82rem] text-gray-500 py-6 text-center">No pending accounts.</div>
          ) : (
            <div className="divide-y divide-white/[.05]">
              {queue.map(u => (
                <div key={u.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white text-[0.68rem] flex-shrink-0"
                    style={{ background: strToColor(u.uid || u.id) }}>
                    {initials(u.name || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-[0.84rem]">{u.name}</span>
                      <span className={`text-[0.6rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${STATUS_META[u.status]?.cls || STATUS_META.pending.cls}`}>
                        {STATUS_META[u.status]?.label || 'Pending'}
                      </span>
                    </div>
                    <div className="text-[0.73rem] text-gray-400">{u.email}</div>
                    <div className="text-[0.67rem] text-gray-600 mt-0.5">
                      Code: <strong className="text-gray-400 font-[Montserrat]">{u.inviteCode}</strong>
                      {u.plan && u.plan !== 'free' && <span className="ml-2 text-amber-400 font-bold">· {u.plan} plan</span>}
                    </div>
                  </div>
                  {u.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button disabled={acting[u.id]} onClick={() => handleApprove(u.uid || u.id, true)}
                        className="bg-green-900/30 text-green-300 border border-green-500/25 px-2.5 py-1 rounded-[6px] text-[0.65rem] font-bold font-[Montserrat] disabled:opacity-50">
                        Approve
                      </button>
                      <button disabled={acting[u.id]} onClick={() => handleApprove(u.uid || u.id, false)}
                        className="bg-red-900/30 text-red-300 border border-red-500/25 px-2.5 py-1 rounded-[6px] text-[0.65rem] font-bold font-[Montserrat] disabled:opacity-50">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INSTRUCTOR APPS ── */}
      {tab === 'apps' && (
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
          <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-4">Instructor Applications</div>
          {apps.length === 0 ? (
            <div className="text-[0.82rem] text-gray-500 py-6 text-center">No applications yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {apps.map(a => <InstructorAppCard key={a.id} app={a} onAction={handleInstructor} />)}
            </div>
          )}
        </div>
      )}

      {/* ── COURSE REVIEW ── */}
      {tab === 'courses' && (
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500">
              Course Review
            </div>
            <div className="flex gap-1">
              {[
                { id: 'pending_review', label: 'Pending', count: allCourses.filter(c => c.status === 'pending_review').length },
                { id: 'published',      label: 'Published', count: publishedCourses },
                { id: 'draft',          label: 'Drafts', count: allCourses.filter(c => c.status === 'draft').length },
                { id: 'rejected',       label: 'Rejected', count: allCourses.filter(c => c.status === 'rejected').length },
                { id: 'all',            label: 'All', count: allCourses.length },
              ].map(f => (
                <button key={f.id} onClick={() => setCourseFilter(f.id)}
                  className={`px-2.5 py-1 rounded-[6px] text-[0.67rem] font-bold font-[Montserrat] transition-all ${courseFilter === f.id ? 'bg-[#E5181B] text-white' : 'bg-white/[.04] border border-white/[.06] text-gray-500 hover:text-white'}`}>
                  {f.label} {f.count > 0 && `(${f.count})`}
                </button>
              ))}
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="text-[0.82rem] text-gray-500 py-8 text-center">
              {courseFilter === 'pending_review' ? 'No courses pending review.' : 'No courses in this category.'}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredCourses.map(c => (
                <CourseReviewCard key={c.id} course={c} onAction={handleCourseAction} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INVITE CODES ── */}
      {tab === 'codes' && (
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
          <div className="font-[Montserrat] text-[0.68rem] font-bold tracking-[.08em] uppercase text-gray-500 mb-4">Invite Codes</div>
          <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4 mb-5">
            <div className="text-[0.75rem] font-bold font-[Montserrat] text-gray-300 mb-3">Generate New Codes</div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">How many</label>
                <input type="number" min={1} max={50} value={genCount}
                  onChange={ev => setGenCount(Math.max(1, Math.min(50, +ev.target.value)))}
                  className="w-20 bg-[#111] border border-white/[.06] rounded-[8px] px-3 py-2 text-white text-[0.81rem] outline-none font-[Poppins]" />
              </div>
              <div>
                <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Plan</label>
                <select value={genPlan} onChange={ev => setGenPlan(ev.target.value)}
                  className="bg-[#111] border border-white/[.06] rounded-[8px] px-3 py-2 text-white text-[0.78rem] outline-none font-[Poppins]">
                  {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <button onClick={generateCodes}
                className="bg-[#E5181B] hover:bg-[#C01215] text-white px-4 py-2 rounded-[8px] text-[0.78rem] font-bold font-[Montserrat] transition-colors">
                Generate
              </button>
            </div>
          </div>

          {/* summary */}
          <div className="flex items-center gap-4 mb-4 text-[0.72rem] font-[Montserrat]">
            <span className="text-gray-500">{codes.length} total</span>
            <span className="text-green-400 font-bold">{unusedCodes.length} available</span>
            <span className="text-gray-600">{usedCodes.length} used</span>
          </div>

          {codes.length === 0 ? (
            <div className="text-[0.82rem] text-gray-500 py-4 text-center">No codes yet.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {unusedCodes.length > 0 && (
                <div>
                  <div className="text-[0.65rem] font-bold tracking-[.08em] uppercase text-green-500 font-[Montserrat] mb-2">Available — click to copy</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
                    {unusedCodes.map(c => (
                      <div key={c.id} className="flex items-center gap-1">
                        <button onClick={() => { navigator.clipboard?.writeText(c.code); toast.success('Copied!') }}
                          className="flex-1 font-[Montserrat] font-bold text-[0.8rem] tracking-widest bg-[#1a1a1a] border border-green-500/20 text-green-300 rounded-[8px] py-2 px-3 hover:bg-green-900/10 transition-all text-center">
                          {c.code}
                          {c.plan && c.plan !== 'free' && <div className="text-[0.55rem] text-amber-400 font-normal mt-0.5">{c.plan}</div>}
                          {c.createdBy && c.createdBy !== 'admin' && (
                            <div className="text-[0.52rem] text-blue-400 font-normal mt-0.5">by {c.createdBy}</div>
                          )}
                        </button>
                        <button onClick={() => deleteCode(c.id)} className="text-gray-700 hover:text-red-400 transition-colors text-xs px-1">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {usedCodes.length > 0 && (
                <div>
                  <div className="text-[0.65rem] font-bold tracking-[.08em] uppercase text-gray-600 font-[Montserrat] mb-2">Used</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[0.72rem]">
                      <thead>
                        <tr className="border-b border-white/[.05]">
                          {['Code','Plan','Used By','Generated By','Used At'].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-[0.6rem] font-bold font-[Montserrat] text-gray-600 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {usedCodes.map(c => (
                          <tr key={c.id} className="border-b border-white/[.03]">
                            <td className="px-3 py-2 font-[Montserrat] font-bold text-gray-500 tracking-widest line-through">{c.code}</td>
                            <td className="px-3 py-2 text-gray-600 capitalize">{c.plan || 'free'}</td>
                            <td className="px-3 py-2 text-gray-500">{c.usedBy || '—'}</td>
                            <td className="px-3 py-2 text-blue-400/60">{c.createdBy || 'admin'}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {c.usedAt?.toDate?.()?.toLocaleDateString('en-AE',{day:'2-digit',month:'short',year:'numeric'}) || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PENDING PAYMENTS TAB ── */}
      {tab === 'payments' && (
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden">

          {/* summary */}
          <div className="grid grid-cols-3 gap-3 p-4 border-b border-white/[.05]">
            {[
              { l: 'Pending',  v: pendingPay.filter(p=>p.status==='pending').length,  c: 'text-amber-400' },
              { l: 'Approved', v: pendingPay.filter(p=>p.status==='approved').length, c: 'text-green-400' },
              { l: 'Rejected', v: pendingPay.filter(p=>p.status==='rejected').length, c: 'text-red-400'   },
            ].map(s => (
              <div key={s.l} className="bg-[#0d0d0d] border border-white/[.05] rounded-[10px] p-3 text-center">
                <div className={`font-[Montserrat] font-black text-[1.4rem] ${s.c}`}>{s.v}</div>
                <div className="text-[0.6rem] text-gray-500 font-[Montserrat] font-bold uppercase tracking-wide mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>

          {/* table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[0.75rem]">
              <thead>
                <tr className="border-b border-white/[.05]">
                  {['Student','Course','Amount','Method','Reference','Submitted','Status','Action'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[0.62rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingPay.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-600 text-[0.8rem]">No payment submissions yet</td></tr>
                ) : pendingPay.map(p => (
                  <tr key={p.id} className="border-b border-white/[.03] hover:bg-white/[.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{p.studentName||'—'}</div>
                      <div className="text-[0.65rem] text-gray-500">{p.studentEmail||''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-[160px] leading-snug">{p.courseTitle||'—'}</td>
                    <td className="px-4 py-3 text-green-400 font-[Montserrat] font-bold">AED {p.price}</td>
                    <td className="px-4 py-3 text-gray-300 capitalize">{p.method||'—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-[0.7rem]">{p.reference||'—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-[0.7rem] whitespace-nowrap">
                      {p.submittedAt?.toDate?.()?.toLocaleDateString('en-AE',{day:'2-digit',month:'short',year:'numeric'})||'—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full font-[Montserrat] ${
                        p.status==='approved' ? 'bg-green-900/30 text-green-300 border border-green-500/25' :
                        p.status==='rejected' ? 'bg-red-900/30 text-red-300 border border-red-500/25' :
                        'bg-amber-900/30 text-amber-300 border border-amber-500/25'}`}>
                        {p.status||'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                // approve payment → enroll student
                                await updateDoc(doc(db,'pendingPayments',p.id), { status:'approved', approvedAt: serverTimestamp() })
                                const enrollmentId = `${p.studentId}_${p.courseId}`
                                await setDoc(doc(db,'enrollments',enrollmentId), {
                                  enrollmentId, courseId:p.courseId, courseTitle:p.courseTitle,
                                  instructorId:p.instructorId||'', instructorName:p.instructorName||'',
                                  studentId:p.studentId, studentName:p.studentName, studentEmail:p.studentEmail,
                                  price:p.price, instructorShare:Math.round(p.price*.6*100)/100,
                                  platformShare:Math.round(p.price*.4*100)/100,
                                  isFree:false, enrolledAt:serverTimestamp(), status:'active',
                                  completedAt:null, payoutStatus:'pending',
                                }, { merge:true })
                                await updateDoc(doc(db,'users',p.studentId), { enrolledCourses: arrayUnion(p.courseId), xp: increment(10) })
                                await updateDoc(doc(db,'courses',p.courseId), { enrollmentCount: increment(1) })
                                toast.success(`${p.studentName} enrolled in ${p.courseTitle}`)
                              } catch(e) { toast.error(e.message) }
                            }}
                            className="text-[0.68rem] font-bold font-[Montserrat] px-2.5 py-1 rounded-[6px] bg-green-900/20 text-green-300 border border-green-500/20 hover:bg-green-900/30 transition-colors">
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db,'pendingPayments',p.id), { status:'rejected', rejectedAt: serverTimestamp() })
                                toast.success('Payment rejected')
                              } catch(e) { toast.error(e.message) }
                            }}
                            className="text-[0.68rem] font-bold font-[Montserrat] px-2.5 py-1 rounded-[6px] bg-red-900/20 text-red-300 border border-red-500/20 hover:bg-red-900/30 transition-colors">
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ENROLLMENTS TAB ── */}
      {tab === 'enrollments' && (
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-white/[.05]">
            {[
              { l: 'Total Enrollments', v: enrollments.length,                       c: 'text-white' },
              { l: 'Unique Students',   v: new Set(enrollments.map(e=>e.studentId)).size, c: 'text-blue-400' },
              { l: 'Paid',             v: enrollments.filter(e => !e.isFree).length, c: 'text-green-400' },
              { l: 'Free',             v: enrollments.filter(e =>  e.isFree).length, c: 'text-gray-400' },
            ].map(s => (
              <div key={s.l} className="bg-[#0d0d0d] border border-white/[.05] rounded-[10px] p-3 text-center">
                <div className={`font-[Montserrat] font-black text-[1.4rem] ${s.c}`}>{s.v}</div>
                <div className="text-[0.6rem] text-gray-500 font-[Montserrat] font-bold uppercase tracking-wide mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="p-4 border-b border-white/[.05]">
            <input value={enrolSearch} onChange={e => setEnrolSearch(e.target.value)}
              placeholder="Search student, course, or instructor…"
              className="w-full bg-[#0d0d0d] border border-white/[.06] rounded-[8px] px-3 py-2 text-[0.8rem] text-white outline-none focus:border-[#E5181B]/40 placeholder-gray-600"/>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[0.75rem]">
              <thead>
                <tr className="border-b border-white/[.05]">
                  {['Student','Course','Instructor','Price (AED)','Instructor Share','Platform Share','Status','Enrolled'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[0.62rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrollments.filter(e => {
                  if (!enrolSearch) return true
                  const s = enrolSearch.toLowerCase()
                  return (e.studentName||'').toLowerCase().includes(s) ||
                         (e.courseTitle||'').toLowerCase().includes(s) ||
                         (e.instructorName||'').toLowerCase().includes(s)
                }).length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-600 text-[0.8rem]">No enrollments yet</td></tr>
                ) : enrollments.filter(e => {
                  if (!enrolSearch) return true
                  const s = enrolSearch.toLowerCase()
                  return (e.studentName||'').toLowerCase().includes(s) ||
                         (e.courseTitle||'').toLowerCase().includes(s) ||
                         (e.instructorName||'').toLowerCase().includes(s)
                }).map(e => (
                  <tr key={e.id} className="border-b border-white/[.03] hover:bg-white/[.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{e.studentName||'—'}</div>
                      <div className="text-[0.65rem] text-gray-500">{e.studentEmail||''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white max-w-[180px] leading-snug">{e.courseTitle||'—'}</div>
                      <div className="text-[0.62rem] text-gray-600 mt-0.5">{e.category||''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{e.instructorName||'—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-[Montserrat] font-bold ${e.isFree?'text-gray-500':'text-green-400'}`}>
                        {e.isFree ? 'Free' : `AED ${e.price}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-blue-400 font-[Montserrat] font-bold">{e.isFree?'—':`AED ${e.instructorShare}`}</td>
                    <td className="px-4 py-3 text-amber-400 font-[Montserrat] font-bold">{e.isFree?'—':`AED ${e.platformShare}`}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full font-[Montserrat] ${e.status==='completed'?'bg-green-900/30 text-green-300 border border-green-500/25':'bg-blue-900/30 text-blue-300 border border-blue-500/25'}`}>
                        {e.status||'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[0.7rem] whitespace-nowrap">
                      {e.enrolledAt?.toDate?.()?.toLocaleDateString('en-AE',{day:'2-digit',month:'short',year:'numeric'})||'—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REVENUE TAB ── */}
      {tab === 'revenue' && (() => {
        const paid            = enrollments.filter(e => !e.isFree)
        const totalRevenue    = paid.reduce((s,e) => s + (e.price||0), 0)
        const totalInstructor = paid.reduce((s,e) => s + (e.instructorShare||0), 0)
        const totalPlatform   = paid.reduce((s,e) => s + (e.platformShare||0), 0)
        const byInstructor = {}
        paid.forEach(e => {
          const k = e.instructorId||'unknown'
          if (!byInstructor[k]) byInstructor[k] = { name:e.instructorName||'Unknown', enrollments:0, totalRevenue:0, instructorShare:0, platformShare:0 }
          byInstructor[k].enrollments++; byInstructor[k].totalRevenue += e.price||0
          byInstructor[k].instructorShare += e.instructorShare||0; byInstructor[k].platformShare += e.platformShare||0
        })
        const byCourse = {}
        paid.forEach(e => {
          const k = e.courseId
          if (!byCourse[k]) byCourse[k] = { title:e.courseTitle||'Unknown', instructor:e.instructorName||'—', enrollments:0, totalRevenue:0, instructorShare:0, platformShare:0 }
          byCourse[k].enrollments++; byCourse[k].totalRevenue += e.price||0
          byCourse[k].instructorShare += e.instructorShare||0; byCourse[k].platformShare += e.platformShare||0
        })
        return (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { l:'Total Revenue Collected', v:totalRevenue,    c:'text-green-400', sub:`${paid.length} paid enrollments` },
                { l:'Instructor Payouts Owed',  v:totalInstructor, c:'text-blue-400',  sub:'60% of each paid enrollment' },
                { l:'Platform Earnings',         v:totalPlatform,  c:'text-amber-400', sub:'40% of each paid enrollment' },
              ].map(s => (
                <div key={s.l} className="bg-[#0d0d0d] border border-white/[.05] rounded-[12px] p-4">
                  <div className="text-[0.6rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wider mb-1">{s.l}</div>
                  <div className={`font-[Montserrat] font-black text-[1.6rem] ${s.c}`}>AED {s.v.toLocaleString()}</div>
                  {s.sub && <div className="text-[0.65rem] text-gray-600 mt-0.5">{s.sub}</div>}
                </div>
              ))}
            </div>

            <div className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[.05]">
                <h3 className="font-[Montserrat] font-black text-[0.85rem] text-white">Revenue by Instructor</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.75rem]">
                  <thead><tr className="border-b border-white/[.05]">
                    {['Instructor','Enrollments','Total Revenue','Their Share (60%)','Platform (40%)','Payout'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[0.62rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {Object.values(byInstructor).length === 0
                      ? <tr><td colSpan={6} className="text-center py-10 text-gray-600 text-[0.8rem]">No paid enrollments yet</td></tr>
                      : Object.values(byInstructor).sort((a,b)=>b.totalRevenue-a.totalRevenue).map((r,i) => (
                        <tr key={i} className="border-b border-white/[.03] hover:bg-white/[.02] transition-colors">
                          <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                          <td className="px-4 py-3 text-gray-300">{r.enrollments}</td>
                          <td className="px-4 py-3 text-green-400 font-[Montserrat] font-bold">AED {r.totalRevenue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-blue-400 font-[Montserrat] font-bold">AED {r.instructorShare.toLocaleString()}</td>
                          <td className="px-4 py-3 text-amber-400 font-[Montserrat] font-bold">AED {r.platformShare.toLocaleString()}</td>
                          <td className="px-4 py-3"><span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full font-[Montserrat] bg-amber-900/30 text-amber-300 border border-amber-500/25">Pending</span></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[.05]">
                <h3 className="font-[Montserrat] font-black text-[0.85rem] text-white">Revenue by Course</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.75rem]">
                  <thead><tr className="border-b border-white/[.05]">
                    {['Course','Instructor','Enrollments','Total Revenue','Instructor (60%)','Platform (40%)'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[0.62rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {Object.values(byCourse).length === 0
                      ? <tr><td colSpan={6} className="text-center py-10 text-gray-600 text-[0.8rem]">No paid enrollments yet</td></tr>
                      : Object.values(byCourse).sort((a,b)=>b.totalRevenue-a.totalRevenue).map((r,i) => (
                        <tr key={i} className="border-b border-white/[.03] hover:bg-white/[.02] transition-colors">
                          <td className="px-4 py-3 text-white max-w-[200px] leading-snug">{r.title}</td>
                          <td className="px-4 py-3 text-gray-400">{r.instructor}</td>
                          <td className="px-4 py-3 text-gray-300">{r.enrollments}</td>
                          <td className="px-4 py-3 text-green-400 font-[Montserrat] font-bold">AED {r.totalRevenue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-blue-400 font-[Montserrat] font-bold">AED {r.instructorShare.toLocaleString()}</td>
                          <td className="px-4 py-3 text-amber-400 font-[Montserrat] font-bold">AED {r.platformShare.toLocaleString()}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && (
        <div className="flex flex-col gap-5 max-w-[640px]">

          {/* Bank Transfer */}
          <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-[8px] bg-blue-900/20 border border-blue-500/20 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="font-[Montserrat] font-black text-[0.88rem]">Bank Transfer Details</h3>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { k:'bankName',      l:'Bank Name',      p:'e.g. Emirates NBD' },
                { k:'accountName',   l:'Account Name',   p:'e.g. RJ Global Technologies' },
                { k:'accountNumber', l:'Account Number', p:'e.g. 1234567890' },
                { k:'iban',          l:'IBAN',           p:'e.g. AE07 0331 2345 6789 0123 456' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-[0.65rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wider mb-1.5">{f.l}</label>
                  <input type="text" placeholder={f.p}
                    value={settingsForm[f.k] || ''}
                    onChange={e => setSettingsForm(s => ({ ...s, [f.k]: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"/>
                </div>
              ))}
            </div>
          </div>

          {/* InstaPay */}
          <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-[8px] bg-green-900/20 border border-green-500/20 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <h3 className="font-[Montserrat] font-black text-[0.88rem]">InstaPay</h3>
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wider mb-1.5">InstaPay ID / Mobile Number</label>
              <input type="text" placeholder="+971 XX XXX XXXX"
                value={settingsForm.instapayId || ''}
                onChange={e => setSettingsForm(s => ({ ...s, instapayId: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"/>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-[8px] bg-red-900/20 border border-red-500/20 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E5181B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <h3 className="font-[Montserrat] font-black text-[0.88rem]">Contact for Payment Proof</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[0.65rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp Number</label>
                <input type="text" placeholder="+971 506 328 968"
                  value={settingsForm.whatsapp || ''}
                  onChange={e => setSettingsForm(s => ({ ...s, whatsapp: e.target.value }))}
                  className="w-full bg-[#0d0d0d] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"/>
              </div>
              <div>
                <label className="block text-[0.65rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" placeholder="info@redjemie.com"
                  value={settingsForm.email || ''}
                  onChange={e => setSettingsForm(s => ({ ...s, email: e.target.value }))}
                  className="w-full bg-[#0d0d0d] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"/>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-[8px] bg-amber-900/20 border border-amber-500/20 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h3 className="font-[Montserrat] font-black text-[0.88rem]">Additional Notes for Students</h3>
            </div>
            <textarea rows={3}
              placeholder="e.g. Please include your full name as payment reference..."
              value={settingsForm.notes || ''}
              onChange={e => setSettingsForm(s => ({ ...s, notes: e.target.value }))}
              className="w-full bg-[#0d0d0d] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors resize-none"/>
          </div>

          <button
            onClick={async () => {
              setSavingSettings(true)
              try {
                await setDoc(doc(db, 'settings', 'payment'), { ...settingsForm, updatedAt: serverTimestamp() })
                toast.success('Payment settings saved!')
              } catch(e) { toast.error(e.message) }
              finally { setSavingSettings(false) }
            }}
            disabled={savingSettings}
            className="w-full py-3 bg-[#E5181B] hover:bg-[#C01215] disabled:opacity-40 text-white font-[Montserrat] font-black text-[0.88rem] rounded-[12px] transition-all flex items-center justify-center gap-2">
            {savingSettings
              ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : 'Save Payment Settings'}
          </button>

          <p className="text-center text-[0.65rem] text-gray-600">
            Changes are live immediately — students will see updated details on their next enrollment.
          </p>
        </div>
      )}

    </div>
  )
}
