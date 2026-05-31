import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const randCode = () => Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')

export default function InstructorEarningsPage() {
  const { profile } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [myCodes,     setMyCodes]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [generating,  setGenerating]  = useState(false)
  const [tab,         setTab]         = useState('overview')

  useEffect(() => {
    if (!profile?.uid) return

    // my course enrollments
    const unsub1 = onSnapshot(
      query(collection(db, 'enrollments'), where('instructorId', '==', profile.uid)),
      s => { setEnrollments(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )

    // my generated invite codes
    const unsub2 = onSnapshot(
      query(collection(db, 'inviteCodes'), where('createdByUid', '==', profile.uid)),
      s => setMyCodes(s.docs.map(d => ({ id: d.id, ...d.data() })))
    )

    return () => { unsub1(); unsub2() }
  }, [profile?.uid])

  // ── stats ──────────────────────────────────────────────────────
  const paid           = enrollments.filter(e => !e.isFree)
  const totalStudents  = new Set(enrollments.map(e => e.studentId)).size
  const totalEarnings  = paid.reduce((s, e) => s + (e.instructorShare || 0), 0)
  const totalRevenue   = paid.reduce((s, e) => s + (e.price || 0), 0)

  // group by course
  const byCourse = {}
  enrollments.forEach(e => {
    if (!byCourse[e.courseId]) byCourse[e.courseId] = {
      title: e.courseTitle, enrollments: 0, paid: 0, earnings: 0, revenue: 0
    }
    byCourse[e.courseId].enrollments++
    if (!e.isFree) {
      byCourse[e.courseId].paid++
      byCourse[e.courseId].earnings += e.instructorShare || 0
      byCourse[e.courseId].revenue  += e.price || 0
    }
  })

  async function generateCode() {
    const myUnused = myCodes.filter(c => !c.used)
    if (myUnused.length >= 10) {
      toast.error('You have 10 unused codes already. Use or share them first.'); return
    }
    setGenerating(true)
    try {
      const code = randCode()
      await setDoc(doc(db, 'inviteCodes', code), {
        code,
        used:         false,
        usedBy:       null,
        usedAt:       null,
        plan:         'free',
        createdAt:    serverTimestamp(),
        createdBy:    profile.displayName || 'Instructor',
        createdByUid: profile.uid,
      })
      toast.success(`Code ${code} generated!`)
    } catch (e) { toast.error(e.message) }
    finally { setGenerating(false) }
  }

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'students',  label: `Students (${enrollments.length})` },
    { id: 'codes',     label: `My Invite Codes (${myCodes.filter(c=>!c.used).length} available)` },
  ]

  const fmt = (n) => `AED ${Number(n).toLocaleString('en-AE', { minimumFractionDigits: 0 })}`

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="font-[Montserrat] font-black text-[1.25rem]">My Instructor Dashboard</h1>
          <p className="text-[0.72rem] text-gray-500 mt-0.5">Your courses, students, and earnings</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-[#111] border border-white/[.06] rounded-[12px] p-1 mb-5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-[9px] text-[0.73rem] font-bold font-[Montserrat] whitespace-nowrap transition-all ${tab === t.id ? 'bg-[#E5181B] text-white' : 'text-gray-500 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: 'Total Students',    v: totalStudents,            c: 'text-white',      sub: 'across all courses' },
              { l: 'Paid Enrollments',  v: paid.length,              c: 'text-green-400',  sub: `${enrollments.length} total incl. free` },
              { l: 'My Earnings (60%)', v: fmt(totalEarnings),       c: 'text-blue-400',   sub: 'your share of revenue' },
              { l: 'Total Revenue',     v: fmt(totalRevenue),        c: 'text-amber-400',  sub: 'before platform split' },
            ].map(s => (
              <div key={s.l} className="bg-[#111] border border-white/[.06] rounded-[12px] p-4">
                <div className="text-[0.6rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wider mb-1">{s.l}</div>
                <div className={`font-[Montserrat] font-black text-[1.3rem] leading-none ${s.c}`}>{s.v}</div>
                <div className="text-[0.62rem] text-gray-600 mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* by course */}
          <div className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[.05]">
              <h3 className="font-[Montserrat] font-black text-[0.85rem]">Performance by Course</h3>
            </div>
            {Object.values(byCourse).length === 0 ? (
              <div className="text-center py-12 text-gray-600 text-[0.8rem]">No enrollments yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[0.75rem]">
                  <thead>
                    <tr className="border-b border-white/[.05]">
                      {['Course','Total Students','Paid','Your Earnings (60%)','Total Revenue'].map(h => (
                        <th key={h} className="text-left px-5 py-2.5 text-[0.6rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(byCourse).map((c, i) => (
                      <tr key={i} className="border-b border-white/[.03] hover:bg-white/[.02]">
                        <td className="px-5 py-3 text-white font-medium max-w-[220px] leading-snug">{c.title}</td>
                        <td className="px-5 py-3 text-gray-300">{c.enrollments}</td>
                        <td className="px-5 py-3 text-green-400">{c.paid}</td>
                        <td className="px-5 py-3 text-blue-400 font-[Montserrat] font-bold">{fmt(c.earnings)}</td>
                        <td className="px-5 py-3 text-amber-400 font-[Montserrat] font-bold">{fmt(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* earnings note */}
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-[12px] p-4 text-[0.75rem] text-blue-300/70 leading-relaxed">
            <strong className="text-blue-300">Revenue Split:</strong> You earn <strong className="text-blue-300">60%</strong> of every paid enrollment.
            The platform retains 40% for hosting, support, and marketing. Payouts are processed monthly.
            Contact admin for payout requests.
          </div>
        </div>
      )}

      {/* ── STUDENTS ── */}
      {tab === 'students' && (
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[0.75rem]">
              <thead>
                <tr className="border-b border-white/[.05]">
                  {['Student','Course','Enrolled','Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[0.6rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrollments.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-gray-600 text-[0.8rem]">No students yet</td></tr>
                ) : enrollments.map(e => (
                  <tr key={e.id} className="border-b border-white/[.03] hover:bg-white/[.02]">
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">{e.studentName || '—'}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-400 max-w-[200px] leading-snug">{e.courseTitle || '—'}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {e.enrolledAt?.toDate?.()?.toLocaleDateString('en-AE', { day:'2-digit', month:'short', year:'numeric' }) || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full font-[Montserrat] ${
                        e.status === 'completed'
                          ? 'bg-green-900/30 text-green-300 border border-green-500/25'
                          : 'bg-blue-900/30 text-blue-300 border border-blue-500/25'}`}>
                        {e.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── INVITE CODES ── */}
      {tab === 'codes' && (
        <div className="flex flex-col gap-5">
          <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
            <h3 className="font-[Montserrat] font-black text-[0.88rem] mb-1">Generate Invite Codes</h3>
            <p className="text-[0.72rem] text-gray-500 mb-4 leading-relaxed">
              Share these codes with students you want to invite. Each code can only be used once.
              You can generate up to <strong className="text-white">10 unused codes</strong> at a time.
            </p>
            <div className="flex items-center gap-3">
              <button onClick={generateCode} disabled={generating || myCodes.filter(c=>!c.used).length >= 10}
                className="bg-[#E5181B] hover:bg-[#C01215] disabled:opacity-40 text-white px-5 py-2.5 rounded-[9px] text-[0.78rem] font-bold font-[Montserrat] transition-all flex items-center gap-2">
                {generating
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating…</>
                  : '+ Generate Code'}
              </button>
              <span className="text-[0.72rem] text-gray-500">
                {myCodes.filter(c=>!c.used).length}/10 unused codes
              </span>
            </div>
          </div>

          {/* available codes */}
          {myCodes.filter(c => !c.used).length > 0 && (
            <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
              <div className="text-[0.65rem] font-bold tracking-[.1em] uppercase text-green-500 font-[Montserrat] mb-3">
                Available — click to copy
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {myCodes.filter(c => !c.used).map(c => (
                  <button key={c.id}
                    onClick={() => { navigator.clipboard?.writeText(c.code); toast.success('Copied!') }}
                    className="font-[Montserrat] font-bold text-[0.82rem] tracking-widest bg-[#1a1a1a] border border-green-500/20 text-green-300 rounded-[8px] py-2.5 px-3 hover:bg-green-900/10 transition-all text-center">
                    {c.code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* used codes */}
          {myCodes.filter(c => c.used).length > 0 && (
            <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-5">
              <div className="text-[0.65rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">Used Codes</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.72rem]">
                  <thead>
                    <tr className="border-b border-white/[.05]">
                      {['Code','Used By','Used At'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[0.6rem] font-bold font-[Montserrat] text-gray-600 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myCodes.filter(c => c.used).map(c => (
                      <tr key={c.id} className="border-b border-white/[.03]">
                        <td className="px-3 py-2 font-[Montserrat] font-bold text-gray-600 tracking-widest line-through">{c.code}</td>
                        <td className="px-3 py-2 text-gray-500">{c.usedBy || '—'}</td>
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
  )
}
