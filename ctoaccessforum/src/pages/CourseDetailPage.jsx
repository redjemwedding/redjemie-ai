import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  doc, getDoc, collection, getDocs, setDoc,
  updateDoc, arrayUnion, increment, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { parseVideoUrl } from '@/lib/utils'
import { notify } from '@/lib/notifications'
import toast from 'react-hot-toast'

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [course,   setCourse]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  const enrolled = profile?.enrolledCourses?.includes(courseId)

  useEffect(() => {
    if (!courseId) return
    getDoc(doc(db, 'courses', courseId)).then(snap => {
      if (snap.exists()) setCourse({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
  }, [courseId])

  async function handleEnroll() {
    if (!profile?.uid) return
    setEnrolling(true)
    try {
      const price           = course?.isFree ? 0 : (course?.price || 0)
      const instructorShare = Math.round(price * 0.6 * 100) / 100
      const platformShare   = Math.round(price * 0.4 * 100) / 100
      const enrollmentId    = `${profile.uid}_${courseId}`

      // 1. Write enrollment record
      await setDoc(doc(db, 'enrollments', enrollmentId), {
        enrollmentId,
        courseId,
        courseTitle:      course?.title || '',
        category:         course?.category || '',
        level:            course?.level || '',
        instructorId:     course?.instructorId || '',
        instructorName:   course?.instructorName || '',
        studentId:        profile.uid,
        studentName:      profile.displayName || '',
        studentEmail:     profile.email || '',
        price,
        instructorShare,
        platformShare,
        isFree:           course?.isFree || price === 0,
        enrolledAt:       serverTimestamp(),
        status:           'active',
        completedAt:      null,
        payoutStatus:     price === 0 ? 'n/a' : 'pending',
      }, { merge: true })

      // 2. Update user enrolledCourses + XP
      await updateDoc(doc(db, 'users', profile.uid), {
        enrolledCourses: arrayUnion(courseId),
        xp: increment(10),
      })

      // 3. Update course enrollment count
      await updateDoc(doc(db, 'courses', courseId), {
        enrollmentCount: increment(1),
      })

      toast.success('Enrolled! Starting your first lesson…')

      // notify admin
      try {
        await notify({
          userId:  course?.instructorId || 'admin',
          type:    'enrollment',
          title:   'New Enrollment',
          message: `${profile.displayName} enrolled in "${course?.title}"`,
          link:    `/admin`,
        })
      } catch(_) {}
      const firstModule = course?.modules?.[0]
      const firstLesson = firstModule?.lessons?.[0]
      if (firstModule && firstLesson) {
        nav(`/courses/${courseId}/learn/${firstModule.id}/${firstLesson.id}`)
      }
    } catch (err) { toast.error(err.message) }
    finally { setEnrolling(false) }
  }

  function continueCourse() {
    const firstModule = course?.modules?.[0]
    const firstLesson = firstModule?.lessons?.[0]
    if (firstModule && firstLesson) {
      nav(`/courses/${courseId}/learn/${firstModule.id}/${firstLesson.id}`)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )

  if (!course) return (
    <div className="text-center py-24 text-gray-500">Course not found.</div>
  )

  const totalLessons  = (course.modules || []).reduce((a, m) => a + (m.lessons?.length || 0), 0)
  const totalModules  = (course.modules || []).length
  const totalQuizzes  = Object.keys(course.quizzes || {}).filter(k => course.quizzes[k]?.questions?.length > 0).length
  const trailer       = course.trailerUrl ? parseVideoUrl(course.trailerUrl) : null

  return (
    <div className="max-w-screen-lg mx-auto">
      <button onClick={() => nav('/courses')}
        className="text-[0.73rem] text-gray-500 hover:text-white mb-4 transition-colors font-[Montserrat]">
        ← Back to Courses
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* left */}
        <div>
          {/* hero */}
          <div className="bg-[#111] border border-white/[.06] rounded-[14px] overflow-hidden mb-4">
            {trailer ? (
              <div className="video-wrap">
                <iframe src={trailer.src} allowFullScreen className="absolute inset-0 w-full h-full border-0" />
              </div>
            ) : course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course.title}
                className="w-full h-52 object-cover" />
            ) : (
              <div className="h-52 flex items-center justify-center font-black text-white font-[Montserrat] text-4xl"
                style={{ background: 'linear-gradient(135deg,#1a0505,#3d0a0a)' }}>
                {course.title?.charAt(0)}
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[0.62rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-[rgba(229,24,27,.08)] text-[#FF4447] border border-red-500/15">
                  {course.category}
                </span>
                <span className={`text-[0.62rem] font-bold font-[Montserrat] px-2 py-0.5 rounded border ${course.level === 'Beginner' ? 'bg-green-900/20 text-green-400 border-green-500/20' : course.level === 'Advanced' ? 'bg-red-900/20 text-red-400 border-red-500/20' : 'bg-yellow-900/20 text-yellow-400 border-yellow-500/20'}`}>
                  {course.level}
                </span>
                {course.isFree && (
                  <span className="text-[0.62rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-green-900/20 text-green-400 border border-green-500/20">Free</span>
                )}
              </div>
              <h1 className="font-[Montserrat] text-[1.3rem] font-black leading-snug mb-2">{course.title}</h1>
              <p className="text-[0.8rem] text-gray-400 leading-relaxed mb-3">{course.description}</p>
              <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-500">
                <div className="w-6 h-6 rounded-full bg-[#E5181B] flex items-center justify-center text-white font-bold font-[Montserrat] text-[0.54rem] flex-shrink-0">
                  {course.instructorName?.charAt(0) || 'I'}
                </div>
                <span>{course.instructorName || 'CTO Access'}</span>
              </div>
            </div>
          </div>

          {/* what you learn */}
          {course.whatYouLearn && (
            <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-5 mb-4">
              <h2 className="font-[Montserrat] font-black text-[0.88rem] mb-3">What You Will Learn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {course.whatYouLearn.split('\n').filter(Boolean).map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-[0.76rem] text-gray-300">
                    <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                    <span>{item.replace(/^[-•*]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* requirements */}
          {course.requirements && (
            <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-5 mb-4">
              <h2 className="font-[Montserrat] font-black text-[0.88rem] mb-2">Requirements</h2>
              <p className="text-[0.78rem] text-gray-400 leading-relaxed">{course.requirements}</p>
            </div>
          )}

          {/* curriculum */}
          <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-5">
            <h2 className="font-[Montserrat] font-black text-[0.88rem] mb-4">
              Course Curriculum
              <span className="text-gray-500 font-normal text-[0.72rem] ml-2">{totalModules} modules · {totalLessons} lessons · {totalQuizzes} quizzes</span>
            </h2>
            <div className="flex flex-col gap-2">
              {(course.modules || []).map((mod, mi) => (
                <details key={mod.id} className="bg-[#1a1a1a] border border-white/[.05] rounded-[8px] overflow-hidden group">
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
                    <div className="flex items-center gap-3">
                      <span className="text-[0.65rem] font-bold font-[Montserrat] text-[#FF4447]">M{mi + 1}</span>
                      <span className="text-[0.8rem] font-semibold">{mod.title || 'Untitled Module'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[0.67rem] text-gray-500">
                      <span>{mod.lessons?.length || 0} lessons</span>
                      {course.quizzes?.[mod.id]?.questions?.length > 0 && (
                        <span>+ quiz</span>
                      )}
                      <span className="text-gray-600">▼</span>
                    </div>
                  </summary>
                  <div className="border-t border-white/[.05]">
                    {(mod.lessons || []).map((lesson, li) => (
                      <div key={lesson.id}
                        onClick={() => enrolled && nav(`/courses/${courseId}/learn/${mod.id}/${lesson.id}`)}
                        className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/[.03] last:border-0 ${enrolled || lesson.isFree ? 'cursor-pointer hover:bg-white/[.02]' : 'opacity-50'} transition-colors`}>
                        <span className="text-[0.65rem] text-gray-600 w-5">{li + 1}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[0.76rem]">{lesson.title || 'Untitled Lesson'}</span>
                          {lesson.isFree && (
                            <span className="ml-2 text-[0.58rem] font-bold text-purple-400 font-[Montserrat]">Free preview</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[0.63rem] text-gray-600">
                          {lesson.duration && <span>{lesson.duration} min</span>}
                          {!enrolled && !lesson.isFree && <span>🔒</span>}
                        </div>
                      </div>
                    ))}
                    {course.quizzes?.[mod.id]?.questions?.length > 0 && (
                      <div className="flex items-center gap-3 px-4 py-2.5 text-[0.73rem] text-amber-400">
                        <span className="text-[0.65rem] text-gray-600 w-5">Q</span>
                        <span>Module Quiz · {course.quizzes[mod.id].questions.length} questions</span>
                        {course.quizzes[mod.id].required && (
                          <span className="text-[0.58rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded bg-amber-900/20 border border-amber-500/20">Required</span>
                        )}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* right — sticky enroll card */}
        <div>
          <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-5 sticky top-20">
            {course.thumbnailUrl && !trailer && (
              <img src={course.thumbnailUrl} alt={course.title}
                className="w-full h-36 object-cover rounded-[8px] mb-4" />
            )}
            <div className="font-[Montserrat] text-[1.6rem] font-black mb-1">
              {course.isFree ? 'Free' : `AED ${course.price}`}
            </div>
            {!course.isFree && (
              <p className="text-[0.67rem] text-gray-500 mb-3">You earn 60% as instructor · Platform 40%</p>
            )}

            {enrolled ? (
              <button onClick={continueCourse}
                className="w-full py-3 bg-green-700 hover:bg-green-600 text-white font-bold font-[Montserrat] text-[0.82rem] rounded-[10px] transition-colors mb-3">
                Continue Learning
              </button>
            ) : (
              <button onClick={handleEnroll} disabled={enrolling}
                className="w-full py-3 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.82rem] rounded-[10px] disabled:opacity-50 transition-colors mb-3 flex items-center justify-center gap-2">
                {enrolling
                  ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Enrolling…</span></>
                  : course.isFree ? 'Enroll for Free' : `Enroll — AED ${course.price}`}
              </button>
            )}

            <div className="flex flex-col gap-2 text-[0.72rem] text-gray-500 border-t border-white/[.05] pt-3">
              {[
                { l: 'Modules',   v: totalModules },
                { l: 'Lessons',   v: totalLessons },
                { l: 'Quizzes',   v: totalQuizzes },
                { l: 'Level',     v: course.level },
                { l: 'Certificate', v: 'On completion' },
                { l: 'Instructor', v: course.instructorName || 'CTO Access' },
              ].map(s => (
                <div key={s.l} className="flex justify-between">
                  <span>{s.l}</span>
                  <span className="text-gray-300 font-medium">{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
