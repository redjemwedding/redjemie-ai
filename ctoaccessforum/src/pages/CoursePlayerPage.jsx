import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { parseVideoUrl } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── format seconds to MM:SS or HH:MM:SS ──────────────────────────
function formatDuration(input) {
  if (!input) return null
  // already formatted like "3:22" or "1:23:45"
  if (typeof input === 'string' && input.includes(':')) return input
  // number = minutes
  const totalSec = Math.round(Number(input) * 60)
  if (isNaN(totalSec)) return input
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

// ── parse duration to seconds ─────────────────────────────────────
function durationToSeconds(input) {
  if (!input) return 0
  if (typeof input === 'number') return Math.round(input * 60)
  if (typeof input === 'string' && input.includes(':')) {
    const parts = input.split(':').map(Number)
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return Math.round(Number(input) * 60) || 0
}

// ── simple markdown renderer ──────────────────────────────────────
function RenderText({ content }) {
  if (!content) return null
  const lines = content.split('\n')
  return (
    <div className="text-[0.82rem] leading-relaxed text-gray-300">
      {lines.map((line, i) => {
        if (line.startsWith('## '))  return <h2 key={i} className="font-[Montserrat] font-black text-[1rem] text-white mt-4 mb-2">{line.slice(3)}</h2>
        if (line.startsWith('# '))   return <h1 key={i} className="font-[Montserrat] font-black text-[1.1rem] text-white mt-4 mb-2">{line.slice(2)}</h1>
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <div key={i} className="flex items-start gap-2 mb-1">
            <span className="text-[#FF4447] flex-shrink-0 mt-1">•</span>
            <span>{line.slice(2)}</span>
          </div>
        )
        if (line.startsWith('```')) return null
        if (!line.trim()) return <div key={i} className="h-2" />
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
        return (
          <p key={i} className="mb-1">
            {parts.map((p, j) => {
              if (p.startsWith('**') && p.endsWith('**')) return <strong key={j} className="text-white font-bold">{p.slice(2,-2)}</strong>
              if (p.startsWith('`') && p.endsWith('`'))   return <code key={j} className="bg-white/[.08] px-1.5 py-0.5 rounded text-[0.78rem] font-mono text-green-300">{p.slice(1,-1)}</code>
              return p
            })}
          </p>
        )
      })}
    </div>
  )
}

// ── content block renderer ────────────────────────────────────────
function ContentBlock({ block, onVideoComplete, onVideoProgress }) {
  const videoRef = useRef(null)

  if (!block) return null

  if (block.type === 'video') {
    const src = block.videoUrl ? parseVideoUrl(block.videoUrl)?.src : null

    // direct upload — HTML5 video with full progress tracking
    if (block.url && !src) return (
      <div className="mb-4 rounded-[10px] overflow-hidden bg-black border border-white/[.06]">
        <video
          ref={videoRef}
          src={block.url}
          controls
          className="w-full max-h-[480px]"
          onTimeUpdate={ev => {
            const v = ev.target
            if (v.duration) {
              const pct = (v.currentTime / v.duration) * 100
              onVideoProgress?.(pct)
              if (pct >= 90) onVideoComplete?.()
            }
          }}
          onEnded={() => onVideoComplete?.()}
        />
      </div>
    )

    // YouTube/Vimeo iframe — can't track progress due to cross-origin
    // We show a timer gate instead
    if (src) return (
      <div className="mb-4">
        <div className="video-wrap rounded-[10px] overflow-hidden">
          <iframe src={src} allowFullScreen className="absolute inset-0 w-full h-full border-0" />
        </div>
        <div className="mt-2 text-[0.67rem] text-gray-600 text-center font-[Montserrat]">
          Watch the full video above, then click Mark Complete when done.
        </div>
      </div>
    )

    return null
  }

  if (block.type === 'text') return (
    <div className="bg-[#1a1a1a] border border-white/[.05] rounded-[10px] p-5 mb-4">
      <RenderText content={block.content} />
    </div>
  )

  if (block.type === 'image') return (
    <div className="mb-4">
      <img src={block.url} alt={block.caption || 'lesson image'}
        className="w-full rounded-[10px] border border-white/[.06]" />
      {block.caption && <p className="text-[0.7rem] text-gray-500 text-center mt-1.5">{block.caption}</p>}
    </div>
  )

  if (block.type === 'pdf') return (
    <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-red-900/20 border border-red-500/20 rounded-[7px] flex items-center justify-center text-[0.65rem] font-bold font-[Montserrat] text-red-400">PDF</div>
        <div>
          <div className="text-[0.78rem] font-semibold">{block.fileName || 'Document'}</div>
          <div className="text-[0.65rem] text-gray-500">Click to view or download</div>
        </div>
        <a href={block.url} target="_blank" rel="noopener noreferrer"
          className="ml-auto px-3 py-1.5 bg-[rgba(229,24,27,.1)] border border-red-500/20 text-[#FF4447] text-[0.7rem] font-bold font-[Montserrat] rounded-[6px] hover:bg-[rgba(229,24,27,.15)] transition-colors">
          Open
        </a>
      </div>
      {block.url && (block.url.endsWith('.pdf') || block.url.includes('cloudinary')) && (
        <iframe src={block.url} className="w-full h-[500px] rounded-[6px] border border-white/[.05]" />
      )}
    </div>
  )

  if (block.type === 'live') return (
    <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4 mb-4">
      <div className="text-[0.67rem] font-bold text-blue-400 uppercase font-[Montserrat] mb-1">Live Session</div>
      {block.date && block.time && <div className="text-[0.78rem] font-semibold mb-2">{block.date} at {block.time}</div>}
      {block.content && <p className="text-[0.75rem] text-gray-400 mb-3">{block.content}</p>}
      {block.url && (
        <a href={block.url} target="_blank" rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-900/20 border border-blue-500/20 text-blue-400 text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-blue-900/30 transition-colors">
          Join Session
        </a>
      )}
    </div>
  )

  return null
}

// ── quiz player ───────────────────────────────────────────────────
function QuizPlayer({ quiz, moduleId, courseId, onPassed }) {
  const { profile } = useAuth()
  const [answers,   setAnswers]   = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score,     setScore]     = useState(null)
  const [passed,    setPassed]    = useState(false)
  const [timeLeft,  setTimeLeft]  = useState(quiz.timeLimit ? quiz.timeLimit * 60 : null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!timeLeft) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  function formatTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

  function gradeText(ans, correct, fuzzy) {
    if (!ans || !correct) return false
    const a = ans.trim().toLowerCase(), c = correct.trim().toLowerCase()
    if (a === c) return true
    if (fuzzy) return a.includes(c) || c.includes(a)
    return false
  }
  function gradeMulti(ans, correct) {
    if (!ans || !correct) return false
    return [...(ans||[])].sort().join(',') === [...(correct||[])].sort().join(',')
  }
  function gradeMatch(ans, pairs) {
    if (!ans || !pairs) return false
    return pairs.every((p, i) => ans[i] === p.right)
  }

  async function handleSubmit() {
    clearInterval(timerRef.current)
    const questions = quiz.questions || []
    let earned = 0, total = 0
    questions.forEach(q => {
      const pts = q.points || 1
      if (q.type === 'essay') return
      total += pts
      const ans = answers[q.id]
      if (q.type === 'mcq'   && ans === q.correct)            earned += pts
      if (q.type === 'tf'    && ans === q.correct)            earned += pts
      if (q.type === 'fill'  && gradeText(ans, q.answer, q.fuzzy)) earned += pts
      if (q.type === 'multi' && gradeMulti(ans, q.correct))   earned += pts
      if (q.type === 'match' && gradeMatch(ans, q.pairs))     earned += pts
    })
    const pct = total > 0 ? Math.round((earned / total) * 100) : 0
    const didPass = pct >= (quiz.passingScore || 70)
    setScore({ earned, total, pct }); setSubmitted(true); setPassed(didPass)
    try {
      const ref = doc(db, 'users', profile.uid, 'progress', courseId)
      await setDoc(ref, {
        [`quizScores.${moduleId}`]: { score: pct, passed: didPass, attemptedAt: serverTimestamp() }
      }, { merge: true })
    } catch (_) {}
    if (didPass) onPassed?.()
  }

  if (submitted && score !== null) return (
    <div className={`rounded-[12px] border p-5 ${passed ? 'bg-green-900/10 border-green-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
      <div className={`font-[Montserrat] font-black text-[1.3rem] mb-1 ${passed ? 'text-green-400' : 'text-red-400'}`}>
        {passed ? 'Quiz Passed!' : 'Not Passed'}
      </div>
      <p className="text-[0.78rem] text-gray-400 mb-3">
        You scored {score.pct}% ({score.earned}/{score.total} points). Passing: {quiz.passingScore || 70}%.
      </p>
      {!passed && (
        <button onClick={() => { setSubmitted(false); setAnswers({}); setScore(null) }}
          className="px-4 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.74rem] font-bold font-[Montserrat] rounded-[7px] transition-colors">
          Try Again
        </button>
      )}
    </div>
  )

  return (
    <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[12px] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-[Montserrat] font-bold text-[0.88rem]">Module Quiz</div>
          <div className="text-[0.67rem] text-gray-500 mt-0.5">
            {quiz.questions?.length} questions · Passing: {quiz.passingScore || 70}%
            {quiz.required && ' · Required to proceed'}
          </div>
        </div>
        {timeLeft !== null && (
          <div className={`font-[Montserrat] font-black text-[1.1rem] ${timeLeft < 60 ? 'text-red-400' : 'text-white'}`}>
            {formatTime(timeLeft)}
          </div>
        )}
      </div>
      {(quiz.questions || []).map((q, qi) => (
        <div key={q.id} className="bg-[#111] border border-white/[.05] rounded-[10px] p-4 mb-3">
          <p className="text-[0.82rem] font-semibold mb-3">
            <span className="text-[#FF4447] font-[Montserrat] mr-2">Q{qi+1}.</span>{q.question}
          </p>
          {q.type === 'mcq' && (q.options||[]).map((opt,oi) => (
            <label key={oi} className={`flex items-center gap-2.5 p-2.5 rounded-[7px] cursor-pointer mb-1.5 transition-all ${answers[q.id]===oi?'bg-[rgba(229,24,27,.08)] border border-red-500/20':'bg-[#1a1a1a] border border-white/[.04] hover:border-white/[.1]'}`}>
              <input type="radio" checked={answers[q.id]===oi} onChange={() => setAnswers(a=>({...a,[q.id]:oi}))} className="accent-red-500" />
              <span className="text-[0.78rem]">{opt}</span>
            </label>
          ))}
          {q.type === 'multi' && (q.options||[]).map((opt,oi) => (
            <label key={oi} className={`flex items-center gap-2.5 p-2.5 rounded-[7px] cursor-pointer mb-1.5 transition-all ${(answers[q.id]||[]).includes(oi)?'bg-[rgba(229,24,27,.08)] border border-red-500/20':'bg-[#1a1a1a] border border-white/[.04] hover:border-white/[.1]'}`}>
              <input type="checkbox" checked={(answers[q.id]||[]).includes(oi)} onChange={ev=>{const c=answers[q.id]||[];setAnswers(a=>({...a,[q.id]:ev.target.checked?[...c,oi]:c.filter(x=>x!==oi)}))}} className="accent-red-500" />
              <span className="text-[0.78rem]">{opt}</span>
            </label>
          ))}
          {q.type === 'tf' && [true,false].map(v => (
            <label key={String(v)} className={`flex items-center gap-2 px-4 py-2.5 rounded-[7px] cursor-pointer flex-1 transition-all mb-1.5 ${answers[q.id]===v?'bg-[rgba(229,24,27,.08)] border border-red-500/20':'bg-[#1a1a1a] border border-white/[.04] hover:border-white/[.1]'}`}>
              <input type="radio" checked={answers[q.id]===v} onChange={() => setAnswers(a=>({...a,[q.id]:v}))} className="accent-red-500" />
              <span className="text-[0.78rem] font-medium">{v?'True':'False'}</span>
            </label>
          ))}
          {q.type === 'fill' && (
            <input value={answers[q.id]||''} onChange={ev=>setAnswers(a=>({...a,[q.id]:ev.target.value}))}
              placeholder="Type your answer…"
              className="w-full bg-[#1a1a1a] border border-white/[.06] rounded-[7px] px-3.5 py-2.5 text-white text-[0.8rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors" />
          )}
          {q.type === 'match' && (
            <div className="flex flex-col gap-2">
              {(q.pairs||[]).map((pair,pi) => (
                <div key={pair.id} className="grid grid-cols-2 gap-3 items-center">
                  <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[7px] px-3 py-2 text-[0.76rem]">{pair.left}</div>
                  <select value={(answers[q.id]||{})[pi]||''} onChange={ev=>setAnswers(a=>({...a,[q.id]:{...(a[q.id]||{}),[pi]:ev.target.value}}))}
                    className="bg-[#1a1a1a] border border-white/[.06] rounded-[7px] px-3 py-2 text-white text-[0.76rem] outline-none font-[Poppins]">
                    <option value="">Select match…</option>
                    {(q.pairs||[]).map((p2,pi2) => <option key={pi2} value={p2.right}>{p2.right}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          {q.type === 'essay' && (
            <div>
              <textarea value={answers[q.id]||''} onChange={ev=>setAnswers(a=>({...a,[q.id]:ev.target.value}))}
                placeholder="Write your answer here…" rows={5}
                className="w-full bg-[#1a1a1a] border border-white/[.06] rounded-[7px] px-3.5 py-2.5 text-white text-[0.8rem] outline-none font-[Poppins] placeholder-gray-600 resize-none" />
              <p className="text-[0.65rem] text-gray-600 mt-1">This will be reviewed and graded manually by your instructor.</p>
            </div>
          )}
        </div>
      ))}
      <button onClick={handleSubmit}
        className="w-full py-3 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.82rem] rounded-[10px] transition-colors mt-2">
        Submit Quiz
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  MAIN COURSE PLAYER
// ══════════════════════════════════════════════════════════════════
export default function CoursePlayerPage() {
  const { courseId, moduleId, lessonId } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [course,       setCourse]       = useState(null)
  const [progress,     setProgress]     = useState({ completedLessons: [], quizScores: {} })
  const [loading,      setLoading]      = useState(true)
  const [marking,      setMarking]      = useState(false)
  const [showQuiz,     setShowQuiz]     = useState(false)
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  // time gate — tracks seconds spent on this lesson
  const [timeSpent,    setTimeSpent]    = useState(0)
  const [videoWatched, setVideoWatched] = useState(false)
  const [videoPct,     setVideoPct]     = useState(0)
  const timeRef = useRef(null)

  const currentModule = course?.modules?.find(m => m.id === moduleId)
  const currentLesson = currentModule?.lessons?.find(l => l.id === lessonId)
  const currentModIdx = course?.modules?.findIndex(m => m.id === moduleId) ?? 0
  const currentLesIdx = currentModule?.lessons?.findIndex(l => l.id === lessonId) ?? 0
  const currentQuiz   = course?.quizzes?.[moduleId]
  const lessonKey     = `${moduleId}__${lessonId}`
  const isCompleted   = progress.completedLessons?.includes(lessonKey)
  const totalLessons  = course?.modules?.reduce((a, m) => a + (m.lessons?.length || 0), 0) || 0
  const completedCount = progress.completedLessons?.length || 0
  const progressPct   = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
  const courseComplete = progressPct === 100

  // lesson duration in seconds
  const lessonDurSec  = currentLesson ? durationToSeconds(currentLesson.duration) : 0
  // has video block
  const hasVideo      = currentLesson?.blocks?.some(b => b.type === 'video')
  // minimum time needed (duration or 10 seconds minimum)
  const minTimeNeeded = lessonDurSec > 0 ? Math.min(lessonDurSec, lessonDurSec * 0.8) : 10
  // can mark complete
  const canComplete   = isCompleted || !hasVideo || videoWatched || timeSpent >= minTimeNeeded

  // reset gate when lesson changes
  useEffect(() => {
    setTimeSpent(0)
    setVideoWatched(false)
    setVideoPct(0)
    clearInterval(timeRef.current)
    // start time tracker
    timeRef.current = setInterval(() => setTimeSpent(t => t + 1), 1000)
    return () => clearInterval(timeRef.current)
  }, [lessonId, moduleId])

  useEffect(() => {
    if (!courseId) return
    getDoc(doc(db, 'courses', courseId)).then(snap => {
      if (snap.exists()) setCourse({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
  }, [courseId])

  useEffect(() => {
    if (!courseId || !profile?.uid) return
    getDoc(doc(db, 'users', profile.uid, 'progress', courseId)).then(snap => {
      if (snap.exists()) setProgress(snap.data())
    })
  }, [courseId, profile?.uid])

  async function markComplete() {
    if (isCompleted || marking) return
    if (!canComplete) {
      toast.error('Please watch the video before marking complete.')
      return
    }
    setMarking(true)
    try {
      const newCompleted = [...(progress.completedLessons || []), lessonKey]
      const newPct = totalLessons > 0 ? Math.round((newCompleted.length / totalLessons) * 100) : 0
      const ref = doc(db, 'users', profile.uid, 'progress', courseId)
      await setDoc(ref, {
        completedLessons: newCompleted,
        totalLessons,
        lastLesson: lessonKey,
        updatedAt: serverTimestamp(),
        ...(newPct === 100 ? { completedAt: serverTimestamp() } : {}),
      }, { merge: true })
      setProgress(p => ({ ...p, completedLessons: newCompleted }))
      toast.success(newPct === 100 ? 'Course complete! Certificate ready.' : 'Lesson complete!')
      if (newPct === 100) setTimeout(() => nav(`/courses/${courseId}/certificate`), 1500)
    } catch (err) { toast.error(err.message) }
    finally { setMarking(false) }
  }

  function goToLesson(modId, lesId) {
    nav(`/courses/${courseId}/learn/${modId}/${lesId}`)
    setShowQuiz(false)
  }

  function nextLesson() {
    const mods = course?.modules || []
    const lessons = currentModule?.lessons || []
    if (currentLesIdx < lessons.length - 1) {
      if (!isCompleted && !canComplete) { toast.error('Complete this lesson first.'); return }
      goToLesson(moduleId, lessons[currentLesIdx + 1].id)
    } else if (currentModIdx < mods.length - 1) {
      if (currentQuiz && !progress.quizScores?.[moduleId]?.passed && currentQuiz.required) {
        setShowQuiz(true)
      } else {
        const nextMod = mods[currentModIdx + 1]
        if (nextMod.lessons?.[0]) goToLesson(nextMod.id, nextMod.lessons[0].id)
      }
    }
  }

  function prevLesson() {
    const mods = course?.modules || []
    const lessons = currentModule?.lessons || []
    if (currentLesIdx > 0) {
      goToLesson(moduleId, lessons[currentLesIdx - 1].id)
    } else if (currentModIdx > 0) {
      const prevMod = mods[currentModIdx - 1]
      const prevLessons = prevMod.lessons || []
      if (prevLessons.length > 0) goToLesson(prevMod.id, prevLessons[prevLessons.length - 1].id)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )
  if (!course || !currentModule || !currentLesson) return (
    <div className="text-center py-24 text-gray-500">Lesson not found.</div>
  )

  const durFormatted = formatDuration(currentLesson.duration)

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* top bar */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <button onClick={() => nav(`/courses/${courseId}`)}
          className="text-[0.73rem] text-gray-500 hover:text-white transition-colors font-[Montserrat]">
          ← {course.title}
        </button>
        <div className="flex-1 h-1.5 bg-white/[.06] rounded-full overflow-hidden mx-2">
          <div className="h-full bg-[#E5181B] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-[0.72rem] text-gray-500 font-[Montserrat] flex-shrink-0">
          {completedCount}/{totalLessons} · {progressPct}%
        </span>
        <button onClick={() => setSidebarOpen(s => !s)}
          className="text-[0.72rem] text-gray-500 hover:text-white font-[Montserrat] transition-colors">
          {sidebarOpen ? 'Hide outline' : 'Show outline'}
        </button>
      </div>

      <div className={`grid gap-5 ${sidebarOpen ? 'grid-cols-1 lg:grid-cols-[1fr_280px]' : 'grid-cols-1'}`}>
        {/* main */}
        <div>
          <div className="mb-4">
            <div className="text-[0.65rem] text-[#FF4447] font-bold font-[Montserrat] uppercase mb-1">
              Module {currentModIdx + 1}: {currentModule.title}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-[Montserrat] font-black text-[1.1rem]">{currentLesson.title}</h1>
              {durFormatted && (
                <span className="text-[0.67rem] text-gray-500 bg-white/[.04] border border-white/[.06] px-2 py-0.5 rounded font-[Montserrat]">
                  {durFormatted}
                </span>
              )}
              {isCompleted && (
                <span className="text-[0.62rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-green-900/20 text-green-400 border border-green-500/20">
                  Completed
                </span>
              )}
            </div>
          </div>

          {/* video progress bar for direct uploads */}
          {hasVideo && !isCompleted && videoPct > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[0.62rem] text-gray-500 mb-1">
                <span>Video progress</span>
                <span>{Math.round(videoPct)}%{videoPct >= 90 ? ' — Ready to complete' : ''}</span>
              </div>
              <div className="h-1 bg-white/[.06] rounded-full overflow-hidden">
                <div className="h-full bg-[#E5181B] rounded-full transition-all" style={{ width: `${videoPct}%` }} />
              </div>
            </div>
          )}

          {showQuiz && currentQuiz ? (
            <QuizPlayer
              quiz={currentQuiz}
              moduleId={moduleId}
              courseId={courseId}
              onPassed={() => {
                setShowQuiz(false)
                const nextMod = course.modules[currentModIdx + 1]
                if (nextMod?.lessons?.[0]) goToLesson(nextMod.id, nextMod.lessons[0].id)
              }}
            />
          ) : (
            <>
              {(currentLesson.blocks || []).map(block => (
                <ContentBlock
                  key={block.id}
                  block={block}
                  onVideoComplete={() => setVideoWatched(true)}
                  onVideoProgress={pct => setVideoPct(pct)}
                />
              ))}
              {(currentLesson.blocks || []).length === 0 && (
                <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-8 text-center text-gray-500 text-[0.82rem]">
                  No content added to this lesson yet.
                </div>
              )}
            </>
          )}

          {/* actions */}
          {!showQuiz && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[.05]">
              <button onClick={prevLesson}
                disabled={currentModIdx === 0 && currentLesIdx === 0}
                className="px-4 py-2 bg-white/[.04] border border-white/[.08] text-white text-[0.75rem] font-bold font-[Montserrat] rounded-[8px] disabled:opacity-30 hover:bg-white/[.07] transition-colors">
                ← Previous
              </button>

              <div className="flex items-center gap-2">
                {/* video gate indicator */}
                {hasVideo && !isCompleted && !canComplete && (
                  <div className="text-[0.67rem] text-amber-400 font-[Montserrat] px-3 py-1.5 bg-amber-900/10 border border-amber-500/20 rounded-[6px]">
                    Watch video to unlock
                  </div>
                )}

                {currentQuiz && !progress.quizScores?.[moduleId]?.passed && currentLesIdx === (currentModule.lessons?.length || 0) - 1 && (
                  <button onClick={() => setShowQuiz(true)}
                    className="px-4 py-2 bg-amber-900/20 border border-amber-500/20 text-amber-300 text-[0.75rem] font-bold font-[Montserrat] rounded-[8px] transition-colors">
                    Take Quiz
                  </button>
                )}

                {!isCompleted ? (
                  <button
                    onClick={markComplete}
                    disabled={marking || !canComplete}
                    title={!canComplete ? 'Watch the video first' : ''}
                    className={`px-4 py-2 text-white text-[0.75rem] font-bold font-[Montserrat] rounded-[8px] disabled:opacity-50 transition-colors flex items-center gap-1.5 ${canComplete ? 'bg-green-700 hover:bg-green-600' : 'bg-white/[.06] cursor-not-allowed'}`}>
                    {marking ? 'Saving…' : canComplete ? 'Mark Complete' : 'Watch Video First'}
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-green-900/20 border border-green-500/20 text-green-400 text-[0.75rem] font-bold font-[Montserrat] rounded-[8px]">
                    Completed
                  </span>
                )}

                <button onClick={nextLesson}
                  disabled={currentModIdx === (course.modules?.length||1)-1 && currentLesIdx === (currentModule.lessons?.length||1)-1}
                  className="px-4 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.75rem] font-bold font-[Montserrat] rounded-[8px] disabled:opacity-30 transition-colors">
                  Next →
                </button>
              </div>
            </div>
          )}

          {courseComplete && !showQuiz && (
            <div className="mt-4 bg-green-900/10 border border-green-500/20 rounded-[12px] p-4 text-center">
              <div className="font-[Montserrat] font-black text-green-400 text-[1rem] mb-1">Course Complete!</div>
              <p className="text-[0.75rem] text-gray-400 mb-3">Congratulations! Your certificate is ready.</p>
              <button onClick={() => nav(`/courses/${courseId}/certificate`)}
                className="px-5 py-2 bg-green-700 hover:bg-green-600 text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] transition-colors">
                Get Certificate
              </button>
            </div>
          )}
        </div>

        {/* sidebar */}
        {sidebarOpen && (
          <div className="sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[.05]">
                <div className="text-[0.67rem] font-bold uppercase text-gray-500 font-[Montserrat]">Course Outline</div>
              </div>
              {(course.modules || []).map((mod, mi) => (
                <div key={mod.id}>
                  <div className="px-4 py-2.5 bg-[#1a1a1a] border-b border-white/[.04]">
                    <div className="text-[0.68rem] font-bold text-[#FF4447] font-[Montserrat]">Module {mi + 1}</div>
                    <div className="text-[0.75rem] font-semibold">{mod.title || 'Untitled'}</div>
                  </div>
                  {(mod.lessons || []).map((lesson, li) => {
                    const key   = `${mod.id}__${lesson.id}`
                    const done  = progress.completedLessons?.includes(key)
                    const active = lesson.id === lessonId && mod.id === moduleId
                    const dur   = formatDuration(lesson.duration)
                    return (
                      <div key={lesson.id}
                        onClick={() => goToLesson(mod.id, lesson.id)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer border-b border-white/[.03] transition-all ${active ? 'bg-[rgba(229,24,27,.08)] border-l-2 border-l-[#E5181B]' : 'hover:bg-white/[.02]'}`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[0.55rem] font-bold ${done ? 'bg-green-700 text-white' : active ? 'bg-[#E5181B] text-white' : 'bg-white/[.06] text-gray-600'}`}>
                          {done ? '✓' : li + 1}
                        </div>
                        <span className={`text-[0.73rem] flex-1 leading-tight ${active ? 'text-white font-medium' : done ? 'text-gray-400' : 'text-gray-500'}`}>
                          {lesson.title || 'Untitled'}
                        </span>
                        {dur && <span className="text-[0.62rem] text-gray-600 flex-shrink-0">{dur}</span>}
                      </div>
                    )
                  })}
                  {course.quizzes?.[mod.id]?.questions?.length > 0 && (
                    <div onClick={() => { if (moduleId === mod.id) setShowQuiz(true) }}
                      className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-white/[.03] ${moduleId === mod.id ? 'cursor-pointer hover:bg-white/[.02]' : 'opacity-40'} transition-colors`}>
                      <div className="w-4 h-4 rounded-full bg-amber-900/30 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-400 text-[0.5rem]">Q</span>
                      </div>
                      <span className="text-[0.73rem] text-amber-400">
                        Quiz · {course.quizzes[mod.id].questions.length} questions
                        {progress.quizScores?.[mod.id]?.passed && ' ✓'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
