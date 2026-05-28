import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

export default function MyCoursesPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [courses,  setCourses]  = useState([])
  const [progress, setProgress] = useState({}) // { courseId: { completed, total, pct } }
  const [loading,  setLoading]  = useState(true)

  // fetch enrolled courses
  useEffect(() => {
    if (!profile?.enrolledCourses?.length) { setLoading(false); return }
    const q = query(
      collection(db, 'courses'),
      where('__name__', 'in', profile.enrolledCourses.slice(0, 10))
    )
    return onSnapshot(q,
      s => { setCourses(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
  }, [profile?.enrolledCourses?.join(',')])

  // fetch progress for each course
  useEffect(() => {
    if (!profile?.uid || !profile?.enrolledCourses?.length) return
    const uid = profile.uid
    const fetchProgress = async () => {
      const prog = {}
      for (const cid of profile.enrolledCourses.slice(0, 10)) {
        try {
          const snap = await getDoc(doc(db, 'users', uid, 'progress', cid))
          if (snap.exists()) {
            prog[cid] = snap.data()
          } else {
            prog[cid] = { completedLessons: [], totalLessons: 0, pct: 0 }
          }
        } catch (_) {
          prog[cid] = { completedLessons: [], totalLessons: 0, pct: 0 }
        }
      }
      setProgress(prog)
    }
    fetchProgress()
  }, [profile?.uid, profile?.enrolledCourses?.join(',')])

  function getProgress(courseId, course) {
    const p   = progress[courseId]
    const total = p?.totalLessons || course?.lessons || 0
    const done  = p?.completedLessons?.length || 0
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0
    return { done, total, pct }
  }

  if (!profile) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )

  const enrolled = profile?.enrolledCourses || []

  return (
    <div className="max-w-screen-lg mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[Montserrat] text-[1.3rem] font-black">My Courses</h1>
          <p className="text-[0.76rem] text-gray-500 mt-0.5">
            {enrolled.length} enrolled · {courses.filter(c => (getProgress(c.id, c).pct === 100)).length} completed
          </p>
        </div>
        <button onClick={() => nav('/courses')}
          className="px-4 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] transition-colors">
          Browse Courses
        </button>
      </div>

      {/* empty state */}
      {!loading && enrolled.length === 0 && (
        <div className="bg-[#111] border border-white/[.06] rounded-[14px] px-6 py-14 text-center">
          <div className="font-[Montserrat] text-[0.95rem] font-bold mb-2">No courses yet</div>
          <p className="text-[0.78rem] text-gray-500 mb-5">Enroll in a course to start learning.</p>
          <button onClick={() => nav('/courses')}
            className="px-5 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] transition-colors">
            Browse Course Library
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
        </div>
      ) : courses.length > 0 && (
        <>
          {/* in progress */}
          {courses.filter(c => {
            const { pct } = getProgress(c.id, c)
            return pct < 100
          }).length > 0 && (
            <div className="mb-6">
              <div className="text-[0.67rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">
                In Progress
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.filter(c => getProgress(c.id, c).pct < 100).map(c => {
                  const { done, total, pct } = getProgress(c.id, c)
                  return (
                    <div key={c.id}
                      className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden hover:border-red-500/20 hover:-translate-y-0.5 transition-all cursor-pointer"
                      onClick={() => nav(`/courses/${c.id}`)}>
                      {/* thumbnail */}
                      <div className="h-24 flex items-center justify-center relative font-black text-white font-[Montserrat]"
                        style={{ background: c.thumbnail || 'linear-gradient(135deg,#1a0505,#3d0a0a)' }}>
                        <span className="text-2xl">{c.emoji || c.title?.charAt(0) || 'C'}</span>
                        {/* progress overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                          <div className="h-full bg-[#E5181B] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="absolute top-2 right-2 text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-black/50 text-white">
                          {pct}%
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="text-[0.59rem] text-[#FF4447] font-bold font-[Montserrat] uppercase tracking-wide mb-1">{c.category}</div>
                        <div className="font-[Montserrat] font-bold text-[0.85rem] mb-1 leading-snug">{c.title}</div>
                        <div className="text-[0.67rem] text-gray-500 mb-3">{c.instructorName || 'CTO Access'}</div>

                        {/* progress bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[0.62rem] text-gray-500 mb-1">
                            <span>{done} of {total || '?'} lessons</span>
                            <span className="font-bold text-[#FF4447]">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-white/[.06] rounded-full overflow-hidden">
                            <div className="h-full bg-[#E5181B] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        <button
                          onClick={ev => { ev.stopPropagation(); nav(`/courses/${c.id}`) }}
                          className="w-full py-2 bg-[rgba(229,24,27,.1)] border border-red-500/20 text-[#FF4447] text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-[rgba(229,24,27,.15)] transition-colors">
                          {pct === 0 ? 'Start Course' : 'Continue'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* completed */}
          {courses.filter(c => getProgress(c.id, c).pct === 100).length > 0 && (
            <div>
              <div className="text-[0.67rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">
                Completed
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.filter(c => getProgress(c.id, c).pct === 100).map(c => (
                  <div key={c.id}
                    className="bg-[#111] border border-green-500/20 rounded-[12px] overflow-hidden hover:-translate-y-0.5 transition-all cursor-pointer"
                    onClick={() => nav(`/courses/${c.id}`)}>
                    <div className="h-24 flex items-center justify-center relative font-black text-white font-[Montserrat]"
                      style={{ background: c.thumbnail || 'linear-gradient(135deg,#0a1a0a,#1a3d1a)' }}>
                      <span className="text-2xl">{c.emoji || c.title?.charAt(0) || 'C'}</span>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500" />
                      <span className="absolute top-2 right-2 text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-green-900/60 text-green-300">
                        Done
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="text-[0.59rem] text-green-400 font-bold font-[Montserrat] uppercase tracking-wide mb-1">{c.category}</div>
                      <div className="font-[Montserrat] font-bold text-[0.85rem] mb-1 leading-snug">{c.title}</div>
                      <div className="text-[0.67rem] text-gray-500 mb-3">{c.instructorName || 'CTO Access'}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={ev => { ev.stopPropagation(); nav(`/courses/${c.id}`) }}
                          className="flex-1 py-2 bg-green-900/20 border border-green-500/20 text-green-400 text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] transition-colors">
                          Review
                        </button>
                        <button
                          onClick={ev => { ev.stopPropagation(); nav(`/courses/${c.id}/certificate`) }}
                          className="flex-1 py-2 bg-white/[.04] border border-white/[.08] text-gray-300 text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-white/[.07] transition-colors">
                          Certificate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* overall stats */}
      {enrolled.length > 0 && !loading && (
        <div className="mt-6 bg-[#111] border border-white/[.06] rounded-[12px] p-5">
          <div className="text-[0.67rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-4">Learning Stats</div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { l: 'Enrolled',   v: enrolled.length },
              { l: 'In Progress', v: courses.filter(c => { const { pct } = getProgress(c.id, c); return pct > 0 && pct < 100 }).length },
              { l: 'Completed',  v: courses.filter(c => getProgress(c.id, c).pct === 100).length },
            ].map(s => (
              <div key={s.l} className="text-center">
                <div className="font-[Montserrat] text-[1.5rem] font-black text-[#FF4447]">{s.v}</div>
                <div className="text-[0.65rem] text-gray-500 mt-0.5 font-[Montserrat]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
