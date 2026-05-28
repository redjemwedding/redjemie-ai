import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  doc, collection, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { uploadFile } from '@/lib/cloudinary'
import { parseVideoUrl } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── constants ──────────────────────────────────────────────────────
const CATEGORIES = ['Cloud & Infrastructure','Cybersecurity','AI & Machine Learning','DevOps & CI/CD','Leadership & Management','Digital Transformation','UAE Market & Compliance','Software Engineering','Data & Analytics','Other']
const LEVELS     = ['Beginner','Intermediate','Advanced']
const STEPS      = ['Course Info','Modules & Lessons','Quizzes','Preview & Submit']

const LESSON_TYPES = [
  { id: 'video',    label: 'Video',      desc: 'YouTube, Vimeo, Google Drive, Loom or direct upload' },
  { id: 'pdf',      label: 'PDF / File', desc: 'Upload PDF, DOCX, PPTX — renders inline' },
  { id: 'text',     label: 'Text',       desc: 'Rich formatted text, code blocks, lists' },
  { id: 'image',    label: 'Image',      desc: 'PNG, JPG, SVG with optional caption' },
  { id: 'live',     label: 'Live',       desc: 'Zoom, Meet, Teams link with scheduled time' },
]

const QUIZ_TYPES = [
  { id: 'mcq',      label: 'Multiple Choice',    desc: 'One correct answer from 4 options' },
  { id: 'multi',    label: 'Multiple Select',     desc: 'Select all correct answers' },
  { id: 'tf',       label: 'True / False',        desc: 'Binary true or false question' },
  { id: 'match',    label: 'Match / Connect',     desc: 'Match left column to right column' },
  { id: 'fill',     label: 'Fill in the Blank',   desc: 'Type the missing word or phrase' },
  { id: 'essay',    label: 'Essay / Short Answer', desc: 'Free text — manually graded by instructor' },
]

// ── helpers ────────────────────────────────────────────────────────
const uid8 = () => Math.random().toString(36).slice(2, 10)

const ic = "w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"
const label = "block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]"

// ══════════════════════════════════════════════════════════════════
//  LESSON BUILDER
// ══════════════════════════════════════════════════════════════════
function LessonBuilder({ lesson, onChange, onDelete }) {
  const [uploading, setUploading] = useState(false)
  const [upPct,     setUpPct]     = useState(0)

  function addBlock(type) {
    onChange({ ...lesson, blocks: [...(lesson.blocks || []), { id: uid8(), type, content: '', caption: '', url: '', videoUrl: '' }] })
  }

  function updateBlock(id, data) {
    onChange({ ...lesson, blocks: lesson.blocks.map(b => b.id === id ? { ...b, ...data } : b) })
  }

  function removeBlock(id) {
    onChange({ ...lesson, blocks: lesson.blocks.filter(b => b.id !== id) })
  }

  async function uploadBlock(id, file) {
    setUploading(true)
    try {
      const res = await uploadFile(file, p => setUpPct(p))
      updateBlock(id, { url: res.url, fileName: file.name, fileSize: res.bytes })
      toast.success('Uploaded!')
    } catch (e) { toast.error(e.message) }
    finally { setUploading(false); setUpPct(0) }
  }

  return (
    <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4 mb-3">
      {/* lesson header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <input value={lesson.title} onChange={ev => onChange({ ...lesson, title: ev.target.value })}
            placeholder="Lesson title…" className={ic} />
          <div className="flex gap-2">
            <input type="number" value={lesson.duration} onChange={ev => onChange({ ...lesson, duration: ev.target.value })}
              placeholder="Duration (min)" className={ic} min={1} />
            <select value={lesson.isFree ? 'free' : 'locked'} onChange={ev => onChange({ ...lesson, isFree: ev.target.value === 'free' })}
              className={ic}>
              <option value="locked">Enrolled only</option>
              <option value="free">Free preview</option>
            </select>
          </div>
        </div>
        <button onClick={onDelete} className="text-gray-600 hover:text-red-400 text-sm transition-colors flex-shrink-0">Delete</button>
      </div>

      {/* content blocks */}
      {(lesson.blocks || []).map((block, idx) => (
        <div key={block.id} className="bg-[#111] border border-white/[.05] rounded-[8px] p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.67rem] font-bold text-[#FF4447] uppercase font-[Montserrat]">{LESSON_TYPES.find(t => t.id === block.type)?.label}</span>
            <button onClick={() => removeBlock(block.id)} className="text-gray-600 hover:text-red-400 text-xs">Remove</button>
          </div>

          {block.type === 'video' && (
            <div className="flex flex-col gap-2">
              <input value={block.videoUrl} onChange={ev => updateBlock(block.id, { videoUrl: ev.target.value })}
                placeholder="YouTube, Vimeo, Google Drive, or Loom URL" type="url" className={ic} />
              {block.videoUrl && parseVideoUrl(block.videoUrl) && (
                <div className="text-[0.67rem] text-green-400">Valid video link detected</div>
              )}
              <div className="text-[0.65rem] text-gray-600">— or —</div>
              <div className="border border-dashed border-white/[.08] rounded-[8px] p-3 text-center cursor-pointer hover:border-red-500/25 transition-colors"
                onClick={() => document.getElementById(`vid-${block.id}`).click()}>
                {block.url ? (
                  <span className="text-[0.75rem] text-green-400">Uploaded: {block.fileName}</span>
                ) : (
                  <span className="text-[0.72rem] text-gray-500">Upload video file (MP4, MOV — max 500MB)</span>
                )}
                {uploading && upPct > 0 && (
                  <div className="h-1 bg-white/[.06] rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[#E5181B] rounded-full transition-all" style={{ width: `${upPct}%` }} />
                  </div>
                )}
              </div>
              <input id={`vid-${block.id}`} type="file" className="hidden" accept=".mp4,.mov,.webm,.avi"
                onChange={ev => uploadBlock(block.id, ev.target.files[0])} />
            </div>
          )}

          {block.type === 'pdf' && (
            <div>
              <div className="border border-dashed border-white/[.08] rounded-[8px] p-3 text-center cursor-pointer hover:border-red-500/25 transition-colors"
                onClick={() => document.getElementById(`pdf-${block.id}`).click()}>
                {block.url ? (
                  <span className="text-[0.75rem] text-green-400">Uploaded: {block.fileName}</span>
                ) : (
                  <span className="text-[0.72rem] text-gray-500">Upload PDF, DOCX, or PPTX</span>
                )}
              </div>
              <input id={`pdf-${block.id}`} type="file" className="hidden" accept=".pdf,.doc,.docx,.pptx,.ppt"
                onChange={ev => uploadBlock(block.id, ev.target.files[0])} />
            </div>
          )}

          {block.type === 'text' && (
            <textarea value={block.content} onChange={ev => updateBlock(block.id, { content: ev.target.value })}
              placeholder="Write your lesson content here. Use markdown: **bold**, `code`, ## heading, - bullet"
              rows={6} maxLength={20000}
              className={`${ic} resize-y font-mono text-[0.78rem]`} />
          )}

          {block.type === 'image' && (
            <div className="flex flex-col gap-2">
              <div className="border border-dashed border-white/[.08] rounded-[8px] p-3 text-center cursor-pointer hover:border-red-500/25 transition-colors"
                onClick={() => document.getElementById(`img-${block.id}`).click()}>
                {block.url ? (
                  <img src={block.url} alt={block.caption} className="max-h-[200px] object-contain mx-auto rounded" />
                ) : (
                  <span className="text-[0.72rem] text-gray-500">Upload image (PNG, JPG, SVG, GIF)</span>
                )}
              </div>
              <input id={`img-${block.id}`} type="file" className="hidden" accept=".png,.jpg,.jpeg,.gif,.svg,.webp"
                onChange={ev => uploadBlock(block.id, ev.target.files[0])} />
              <input value={block.caption} onChange={ev => updateBlock(block.id, { caption: ev.target.value })}
                placeholder="Image caption (optional)" className={ic} />
            </div>
          )}

          {block.type === 'live' && (
            <div className="flex flex-col gap-2">
              <input value={block.url} onChange={ev => updateBlock(block.id, { url: ev.target.value })}
                placeholder="Zoom, Google Meet, or Teams link" type="url" className={ic} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={block.date} onChange={ev => updateBlock(block.id, { date: ev.target.value })} className={ic} />
                <input type="time" value={block.time} onChange={ev => updateBlock(block.id, { time: ev.target.value })} className={ic} />
              </div>
              <input value={block.content} onChange={ev => updateBlock(block.id, { content: ev.target.value })}
                placeholder="Session description" className={ic} />
            </div>
          )}
        </div>
      ))}

      {/* add block buttons */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className="text-[0.65rem] text-gray-600 flex items-center mr-1">Add content:</span>
        {LESSON_TYPES.map(t => (
          <button key={t.id} onClick={() => addBlock(t.id)}
            className="text-[0.68rem] font-bold font-[Montserrat] px-2.5 py-1 rounded-[6px] bg-white/[.04] border border-white/[.06] text-gray-400 hover:text-white hover:border-red-500/20 transition-all">
            + {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  QUIZ BUILDER
// ══════════════════════════════════════════════════════════════════
function QuizBuilder({ quiz, onChange }) {
  function addQuestion(type) {
    const base = { id: uid8(), type, question: '', points: 1, explanation: '' }
    const extra = type === 'mcq'   ? { options: ['','','',''], correct: 0 }
                : type === 'multi' ? { options: ['','','',''], correct: [] }
                : type === 'tf'    ? { correct: true }
                : type === 'match' ? { pairs: [{ id: uid8(), left: '', right: '' }] }
                : type === 'fill'  ? { answer: '', fuzzy: false }
                : type === 'essay' ? { rubric: '', maxScore: 10 }
                : {}
    onChange({ ...quiz, questions: [...(quiz.questions || []), { ...base, ...extra }] })
  }

  function updateQ(id, data) {
    onChange({ ...quiz, questions: quiz.questions.map(q => q.id === id ? { ...q, ...data } : q) })
  }

  function removeQ(id) {
    onChange({ ...quiz, questions: quiz.questions.filter(q => q.id !== id) })
  }

  return (
    <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4">
      {/* quiz settings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className={label}>Passing Score %</label>
          <input type="number" min={0} max={100} value={quiz.passingScore || 70}
            onChange={ev => onChange({ ...quiz, passingScore: +ev.target.value })} className={ic} />
        </div>
        <div>
          <label className={label}>Retry Attempts</label>
          <select value={quiz.retries ?? 3} onChange={ev => onChange({ ...quiz, retries: ev.target.value === 'unlimited' ? 99 : +ev.target.value })} className={ic}>
            {[1,2,3,5,10].map(n => <option key={n} value={n}>{n}</option>)}
            <option value="unlimited">Unlimited</option>
          </select>
        </div>
        <div>
          <label className={label}>Time Limit</label>
          <select value={quiz.timeLimit || 0} onChange={ev => onChange({ ...quiz, timeLimit: +ev.target.value })} className={ic}>
            <option value={0}>No limit</option>
            {[5,10,15,20,30,45,60].map(n => <option key={n} value={n}>{n} min</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Required to Pass</label>
          <select value={quiz.required ? 'yes' : 'no'} onChange={ev => onChange({ ...quiz, required: ev.target.value === 'yes' })} className={ic}>
            <option value="yes">Yes — must pass</option>
            <option value="no">No — optional</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <label className="flex items-center gap-2 text-[0.73rem] text-gray-400 cursor-pointer">
          <input type="checkbox" checked={!!quiz.randomizeQuestions} onChange={ev => onChange({ ...quiz, randomizeQuestions: ev.target.checked })} />
          Randomize question order
        </label>
        <label className="flex items-center gap-2 text-[0.73rem] text-gray-400 cursor-pointer">
          <input type="checkbox" checked={!!quiz.showAnswers} onChange={ev => onChange({ ...quiz, showAnswers: ev.target.checked })} />
          Show correct answers after submit
        </label>
      </div>

      {/* questions */}
      {(quiz.questions || []).map((q, qi) => (
        <div key={q.id} className="bg-[#111] border border-white/[.05] rounded-[8px] p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[0.62rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-[rgba(229,24,27,.08)] text-[#FF4447] border border-red-500/15">
                {QUIZ_TYPES.find(t => t.id === q.type)?.label}
              </span>
              <span className="text-[0.67rem] text-gray-500">Q{qi + 1}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-[0.65rem] text-gray-500">Points:</label>
                <input type="number" min={1} max={100} value={q.points}
                  onChange={ev => updateQ(q.id, { points: +ev.target.value })}
                  className="w-14 bg-[#1a1a1a] border border-white/[.06] rounded-[6px] px-2 py-1 text-white text-[0.72rem] outline-none font-[Poppins]" />
              </div>
              <button onClick={() => removeQ(q.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">Remove</button>
            </div>
          </div>

          {/* question text */}
          <textarea value={q.question} onChange={ev => updateQ(q.id, { question: ev.target.value })}
            placeholder="Enter your question…" rows={2}
            className={`${ic} resize-none mb-3`} />

          {/* MCQ */}
          {q.type === 'mcq' && (
            <div className="flex flex-col gap-2">
              {(q.options || ['','','','']).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" checked={q.correct === oi} onChange={() => updateQ(q.id, { correct: oi })}
                    className="flex-shrink-0 accent-red-500" />
                  <input value={opt} onChange={ev => { const opts = [...q.options]; opts[oi] = ev.target.value; updateQ(q.id, { options: opts }) }}
                    placeholder={`Option ${oi + 1}`} className={ic} />
                </div>
              ))}
              <p className="text-[0.65rem] text-gray-600">Select the radio button for the correct answer</p>
            </div>
          )}

          {/* Multiple Select */}
          {q.type === 'multi' && (
            <div className="flex flex-col gap-2">
              {(q.options || ['','','','']).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="checkbox"
                    checked={(q.correct || []).includes(oi)}
                    onChange={ev => {
                      const c = q.correct || []
                      updateQ(q.id, { correct: ev.target.checked ? [...c, oi] : c.filter(x => x !== oi) })
                    }}
                    className="flex-shrink-0 accent-red-500" />
                  <input value={opt} onChange={ev => { const opts = [...q.options]; opts[oi] = ev.target.value; updateQ(q.id, { options: opts }) }}
                    placeholder={`Option ${oi + 1}`} className={ic} />
                </div>
              ))}
              <p className="text-[0.65rem] text-gray-600">Check all correct answers</p>
            </div>
          )}

          {/* True/False */}
          {q.type === 'tf' && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-[0.78rem] cursor-pointer">
                <input type="radio" checked={q.correct === true} onChange={() => updateQ(q.id, { correct: true })} className="accent-red-500" />
                True
              </label>
              <label className="flex items-center gap-2 text-[0.78rem] cursor-pointer">
                <input type="radio" checked={q.correct === false} onChange={() => updateQ(q.id, { correct: false })} className="accent-red-500" />
                False
              </label>
            </div>
          )}

          {/* Match / Connect */}
          {q.type === 'match' && (
            <div className="flex flex-col gap-2">
              {(q.pairs || []).map((pair, pi) => (
                <div key={pair.id} className="grid grid-cols-2 gap-2 items-center">
                  <input value={pair.left} onChange={ev => { const p = [...q.pairs]; p[pi] = { ...p[pi], left: ev.target.value }; updateQ(q.id, { pairs: p }) }}
                    placeholder={`Left ${pi + 1}`} className={ic} />
                  <div className="flex gap-2">
                    <input value={pair.right} onChange={ev => { const p = [...q.pairs]; p[pi] = { ...p[pi], right: ev.target.value }; updateQ(q.id, { pairs: p }) }}
                      placeholder={`Right ${pi + 1} (match)`} className={ic} />
                    <button onClick={() => updateQ(q.id, { pairs: q.pairs.filter(p => p.id !== pair.id) })}
                      className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0">✕</button>
                  </div>
                </div>
              ))}
              <button onClick={() => updateQ(q.id, { pairs: [...q.pairs, { id: uid8(), left: '', right: '' }] })}
                className="text-[0.7rem] text-[#FF4447] hover:underline font-[Montserrat] text-left">
                + Add pair
              </button>
            </div>
          )}

          {/* Fill in the Blank */}
          {q.type === 'fill' && (
            <div className="flex flex-col gap-2">
              <input value={q.answer} onChange={ev => updateQ(q.id, { answer: ev.target.value })}
                placeholder="Correct answer (exact match)" className={ic} />
              <label className="flex items-center gap-2 text-[0.73rem] text-gray-400 cursor-pointer">
                <input type="checkbox" checked={!!q.fuzzy} onChange={ev => updateQ(q.id, { fuzzy: ev.target.checked })} />
                Allow fuzzy matching (ignores case and minor typos)
              </label>
            </div>
          )}

          {/* Essay */}
          {q.type === 'essay' && (
            <div className="flex flex-col gap-2">
              <textarea value={q.rubric} onChange={ev => updateQ(q.id, { rubric: ev.target.value })}
                placeholder="Grading rubric — what should a good answer include? (shown to instructor when grading)"
                rows={3} className={`${ic} resize-none`} />
              <div className="flex items-center gap-2">
                <label className="text-[0.67rem] text-gray-500">Max score:</label>
                <input type="number" min={1} max={100} value={q.maxScore || 10}
                  onChange={ev => updateQ(q.id, { maxScore: +ev.target.value })}
                  className="w-20 bg-[#1a1a1a] border border-white/[.06] rounded-[7px] px-3 py-2 text-white text-[0.78rem] outline-none font-[Poppins]" />
                <span className="text-[0.67rem] text-gray-500">Manual grading — not auto-graded</span>
              </div>
            </div>
          )}

          {/* explanation */}
          <div className="mt-3 pt-3 border-t border-white/[.04]">
            <input value={q.explanation} onChange={ev => updateQ(q.id, { explanation: ev.target.value })}
              placeholder="Explanation shown after answer (optional)" className={`${ic} text-[0.75rem]`} />
          </div>
        </div>
      ))}

      {/* add question buttons */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className="text-[0.65rem] text-gray-600 flex items-center mr-1">Add question:</span>
        {QUIZ_TYPES.map(t => (
          <button key={t.id} onClick={() => addQuestion(t.id)}
            className="text-[0.68rem] font-bold font-[Montserrat] px-2.5 py-1 rounded-[6px] bg-white/[.04] border border-white/[.06] text-gray-400 hover:text-white hover:border-red-500/20 transition-all">
            + {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  MAIN COURSE BUILDER PAGE
// ══════════════════════════════════════════════════════════════════
export default function CourseBuilderPage() {
  const { courseId } = useParams()
  const nav = useNavigate()
  const { profile, isAdmin, isInstructor } = useAuth()
  const [step,    setStep]    = useState(0)
  const [saving,  setSaving]  = useState(false)
  const [cid,     setCid]     = useState(courseId || null)

  // ── Step 1: course info ──
  const [info, setInfo] = useState({
    title: '', description: '', category: '', level: 'Beginner',
    price: 0, isFree: true, thumbnail: '', thumbnailUrl: '',
    trailerUrl: '', whatYouLearn: '', requirements: '',
  })

  // ── Step 2: modules ──
  const [modules, setModules] = useState([])

  // ── Step 3: quizzes per module ──
  const [quizzes, setQuizzes] = useState({}) // { moduleId: quiz }

  const [thumbUploading, setThumbUploading] = useState(false)

  // load existing course if editing
  useEffect(() => {
    if (!courseId) return
    getDoc(doc(db, 'courses', courseId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setInfo({
          title: d.title || '', description: d.description || '',
          category: d.category || '', level: d.level || 'Beginner',
          price: d.price || 0, isFree: d.isFree ?? true,
          thumbnail: d.thumbnail || '', thumbnailUrl: d.thumbnailUrl || '',
          trailerUrl: d.trailerUrl || '',
          whatYouLearn: d.whatYouLearn || '', requirements: d.requirements || '',
        })
        setModules(d.modules || [])
        setQuizzes(d.quizzes || {})
        setCid(courseId)
      }
    })
  }, [courseId])

  if (!isInstructor && !isAdmin) return (
    <div className="flex items-center justify-center min-h-[50vh] text-gray-500 text-[0.85rem]">
      Instructor or Admin access required.
    </div>
  )

  // ── auto-save draft ───────────────────────────────────────────
  async function saveDraft() {
    if (!info.title.trim()) return
    setSaving(true)
    try {
      const data = {
        ...info,
        modules,
        quizzes,
        instructorId:   profile.uid,
        instructorName: profile.displayName,
        status:         'draft',
        lessons:        modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0),
        updatedAt:      serverTimestamp(),
      }
      if (cid) {
        await updateDoc(doc(db, 'courses', cid), data)
      } else {
        const ref = await addDoc(collection(db, 'courses'), { ...data, createdAt: serverTimestamp() })
        setCid(ref.id)
      }
      toast.success('Draft saved.')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function submitForReview() {
    if (!cid) { toast.error('Save draft first'); return }
    if (!modules.length) { toast.error('Add at least one module'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'courses', cid), { status: 'pending_review', submittedAt: serverTimestamp() })
      toast.success('Submitted for admin review!')
      nav('/dashboard')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function uploadThumbnail(file) {
    setThumbUploading(true)
    try {
      const res = await uploadFile(file, () => {})
      setInfo(i => ({ ...i, thumbnailUrl: res.url }))
      toast.success('Thumbnail uploaded.')
    } catch (e) { toast.error(e.message) }
    finally { setThumbUploading(false) }
  }

  // ── module helpers ─────────────────────────────────────────────
  function addModule() {
    setModules(m => [...m, { id: uid8(), title: '', description: '', lessons: [], order: m.length }])
  }

  function updateModule(id, data) {
    setModules(m => m.map(mod => mod.id === id ? { ...mod, ...data } : mod))
  }

  function removeModule(id) {
    setModules(m => m.filter(mod => mod.id !== id))
    setQuizzes(q => { const n = { ...q }; delete n[id]; return n })
  }

  function addLesson(modId) {
    setModules(m => m.map(mod => mod.id === modId ? {
      ...mod,
      lessons: [...(mod.lessons || []), { id: uid8(), title: '', duration: '', isFree: false, blocks: [], order: mod.lessons?.length || 0 }]
    } : mod))
  }

  function updateLesson(modId, lessonId, data) {
    setModules(m => m.map(mod => mod.id === modId ? {
      ...mod,
      lessons: mod.lessons.map(l => l.id === lessonId ? { ...l, ...data } : l)
    } : mod))
  }

  function removeLesson(modId, lessonId) {
    setModules(m => m.map(mod => mod.id === modId ? {
      ...mod,
      lessons: mod.lessons.filter(l => l.id !== lessonId)
    } : mod))
  }

  function initQuiz(modId) {
    if (!quizzes[modId]) {
      setQuizzes(q => ({ ...q, [modId]: { questions: [], passingScore: 70, retries: 3, timeLimit: 0, required: true, randomizeQuestions: false, showAnswers: true } }))
    }
  }

  const totalLessons = modules.reduce((a, m) => a + (m.lessons?.length || 0), 0)
  const totalQuizzes = Object.keys(quizzes).filter(k => quizzes[k]?.questions?.length > 0).length

  return (
    <div className="max-w-screen-lg mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => nav(-1)} className="text-[0.73rem] text-gray-500 hover:text-white font-[Montserrat] mb-1 transition-colors">← Back</button>
          <h1 className="font-[Montserrat] text-[1.3rem] font-black">
            {courseId ? 'Edit Course' : 'Create Course'}
          </h1>
          <p className="text-[0.73rem] text-gray-500 mt-0.5">
            {cid ? `Saved as draft · ${totalLessons} lessons · ${totalQuizzes} quizzes` : 'New course — not saved yet'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={saveDraft} disabled={saving || !info.title.trim()}
            className="px-4 py-2 bg-white/[.04] border border-white/[.08] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] hover:bg-white/[.07] disabled:opacity-40 transition-colors">
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          {step === 3 && (
            <button onClick={submitForReview} disabled={saving}
              className="px-4 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] disabled:opacity-50 transition-colors">
              Submit for Review
            </button>
          )}
        </div>
      </div>

      {/* step tabs */}
      <div className="flex gap-1 bg-[#111] border border-white/[.06] rounded-[12px] p-1 mb-6">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={`flex-1 py-2 px-3 rounded-[9px] text-[0.73rem] font-bold font-[Montserrat] whitespace-nowrap transition-all ${step === i ? 'bg-[#E5181B] text-white' : 'text-gray-500 hover:text-white'}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* ── STEP 0: Course Info ── */}
      {step === 0 && (
        <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className={label}>Course Title *</label>
              <input value={info.title} onChange={ev => setInfo(i => ({ ...i, title: ev.target.value }))}
                placeholder="e.g. Zero Trust Architecture Masterclass" maxLength={120} className={ic} />
            </div>
            <div>
              <label className={label}>Description *</label>
              <textarea value={info.description} onChange={ev => setInfo(i => ({ ...i, description: ev.target.value }))}
                placeholder="What is this course about? Who is it for? What will students achieve?" rows={4} maxLength={2000}
                className={`${ic} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Category *</label>
                <select value={info.category} onChange={ev => setInfo(i => ({ ...i, category: ev.target.value }))} className={ic}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Level</label>
                <select value={info.level} onChange={ev => setInfo(i => ({ ...i, level: ev.target.value }))} className={ic}>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Pricing</label>
                <div className="flex gap-2">
                  <select value={info.isFree ? 'free' : 'paid'}
                    onChange={ev => setInfo(i => ({ ...i, isFree: ev.target.value === 'free', price: ev.target.value === 'free' ? 0 : i.price }))}
                    className={ic}>
                    <option value="free">Free</option>
                    <option value="paid">Paid (AED)</option>
                  </select>
                  {!info.isFree && (
                    <input type="number" min={1} value={info.price}
                      onChange={ev => setInfo(i => ({ ...i, price: +ev.target.value }))}
                      placeholder="AED" className={ic} />
                  )}
                </div>
                {!info.isFree && (
                  <p className="text-[0.65rem] text-gray-600 mt-1">You earn 60% · Platform earns 40%</p>
                )}
              </div>
              <div>
                <label className={label}>Course Trailer (optional)</label>
                <input value={info.trailerUrl} onChange={ev => setInfo(i => ({ ...i, trailerUrl: ev.target.value }))}
                  placeholder="YouTube or Vimeo preview link" type="url" className={ic} />
              </div>
            </div>
            <div>
              <label className={label}>Thumbnail Image</label>
              <div className="flex gap-3 items-start">
                <div className="border border-dashed border-white/[.08] rounded-[8px] p-3 flex-1 text-center cursor-pointer hover:border-red-500/25 transition-colors"
                  onClick={() => document.getElementById('thumb-upload').click()}>
                  {info.thumbnailUrl ? (
                    <img src={info.thumbnailUrl} alt="thumbnail" className="h-24 object-cover mx-auto rounded" />
                  ) : (
                    <span className="text-[0.72rem] text-gray-500">{thumbUploading ? 'Uploading…' : 'Upload thumbnail (1280×720 recommended)'}</span>
                  )}
                </div>
                <input id="thumb-upload" type="file" className="hidden" accept=".png,.jpg,.jpeg,.webp"
                  onChange={ev => uploadThumbnail(ev.target.files[0])} />
              </div>
            </div>
            <div>
              <label className={label}>What Students Will Learn</label>
              <textarea value={info.whatYouLearn} onChange={ev => setInfo(i => ({ ...i, whatYouLearn: ev.target.value }))}
                placeholder="List key outcomes, one per line. e.g.&#10;Design a Zero Trust network&#10;Implement IAM policies&#10;Pass the ZTNA certification" rows={4}
                className={`${ic} resize-none`} />
            </div>
            <div>
              <label className={label}>Requirements / Prerequisites</label>
              <textarea value={info.requirements} onChange={ev => setInfo(i => ({ ...i, requirements: ev.target.value }))}
                placeholder="e.g. Basic networking knowledge, familiarity with cloud concepts" rows={2}
                className={`${ic} resize-none`} />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1: Modules & Lessons ── */}
      {step === 1 && (
        <div>
          {modules.length === 0 ? (
            <div className="bg-[#111] border border-white/[.06] rounded-[14px] px-6 py-12 text-center mb-4">
              <p className="text-[0.82rem] text-gray-500 mb-4">No modules yet. A module is a chapter or topic group.</p>
              <button onClick={addModule}
                className="px-5 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] transition-colors">
                Add First Module
              </button>
            </div>
          ) : modules.map((mod, mi) => (
            <div key={mod.id} className="bg-[#111] border border-white/[.06] rounded-[14px] p-5 mb-4">
              {/* module header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[0.67rem] font-bold text-[#FF4447] font-[Montserrat] flex-shrink-0">Module {mi + 1}</span>
                <input value={mod.title} onChange={ev => updateModule(mod.id, { title: ev.target.value })}
                  placeholder="Module title e.g. Introduction to Zero Trust" className={ic} />
                <button onClick={() => removeModule(mod.id)} className="text-gray-600 hover:text-red-400 text-sm transition-colors flex-shrink-0">Remove</button>
              </div>
              <div className="mb-4">
                <input value={mod.description} onChange={ev => updateModule(mod.id, { description: ev.target.value })}
                  placeholder="Module description (optional)" className={ic} />
              </div>

              {/* lessons */}
              <div className="mb-3">
                <div className="text-[0.65rem] font-bold tracking-[.08em] uppercase text-gray-600 font-[Montserrat] mb-2">
                  Lessons ({mod.lessons?.length || 0})
                </div>
                {(mod.lessons || []).map((lesson, li) => (
                  <LessonBuilder
                    key={lesson.id}
                    lesson={lesson}
                    onChange={data => updateLesson(mod.id, lesson.id, data)}
                    onDelete={() => removeLesson(mod.id, lesson.id)}
                  />
                ))}
                <button onClick={() => addLesson(mod.id)}
                  className="w-full py-2 bg-white/[.03] border border-dashed border-white/[.08] text-gray-500 hover:text-white text-[0.73rem] font-[Montserrat] rounded-[8px] hover:border-red-500/20 transition-all">
                  + Add Lesson
                </button>
              </div>
            </div>
          ))}
          <button onClick={addModule}
            className="w-full py-2.5 bg-[rgba(229,24,27,.08)] border border-red-500/20 text-[#FF4447] text-[0.76rem] font-bold font-[Montserrat] rounded-[10px] hover:bg-[rgba(229,24,27,.12)] transition-colors">
            + Add Module
          </button>
        </div>
      )}

      {/* ── STEP 2: Quizzes ── */}
      {step === 2 && (
        <div>
          {modules.length === 0 ? (
            <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-8 text-center text-gray-500 text-[0.85rem]">
              Add modules first before creating quizzes.
            </div>
          ) : modules.map((mod, mi) => (
            <div key={mod.id} className="bg-[#111] border border-white/[.06] rounded-[14px] p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-[Montserrat] font-bold text-[0.88rem]">Module {mi + 1}: {mod.title || 'Untitled'}</div>
                  <div className="text-[0.68rem] text-gray-500 mt-0.5">{mod.lessons?.length || 0} lessons</div>
                </div>
                {!quizzes[mod.id] ? (
                  <button onClick={() => initQuiz(mod.id)}
                    className="px-3 py-1.5 bg-[rgba(229,24,27,.08)] border border-red-500/20 text-[#FF4447] text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-[rgba(229,24,27,.12)] transition-colors">
                    + Add Quiz
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[0.67rem] text-gray-500">{quizzes[mod.id]?.questions?.length || 0} questions</span>
                    <button onClick={() => setQuizzes(q => { const n = { ...q }; delete n[mod.id]; return n })}
                      className="text-[0.67rem] text-gray-600 hover:text-red-400 font-[Montserrat] transition-colors">
                      Remove quiz
                    </button>
                  </div>
                )}
              </div>
              {quizzes[mod.id] && (
                <QuizBuilder
                  quiz={quizzes[mod.id]}
                  onChange={q => setQuizzes(qz => ({ ...qz, [mod.id]: q }))}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 3: Preview & Submit ── */}
      {step === 3 && (
        <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-6">
          <div className="text-[0.67rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-4">Course Summary</div>

          <div className="flex gap-4 mb-5">
            {info.thumbnailUrl && (
              <img src={info.thumbnailUrl} alt="thumbnail" className="w-32 h-20 object-cover rounded-[8px] flex-shrink-0" />
            )}
            <div>
              <h2 className="font-[Montserrat] font-black text-[1.1rem] mb-1">{info.title || 'Untitled Course'}</h2>
              <div className="flex gap-2 flex-wrap text-[0.67rem] text-gray-500">
                <span>{info.category}</span>
                <span>·</span>
                <span>{info.level}</span>
                <span>·</span>
                <span>{info.isFree ? 'Free' : `AED ${info.price}`}</span>
                <span>·</span>
                <span>{modules.length} modules</span>
                <span>·</span>
                <span>{totalLessons} lessons</span>
                <span>·</span>
                <span>{totalQuizzes} quizzes</span>
              </div>
            </div>
          </div>

          {/* module summary */}
          <div className="flex flex-col gap-2 mb-5">
            {modules.map((mod, mi) => (
              <div key={mod.id} className="bg-[#1a1a1a] border border-white/[.05] rounded-[8px] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[0.78rem] font-semibold">Module {mi + 1}: {mod.title || 'Untitled'}</span>
                  <div className="flex gap-2 text-[0.67rem] text-gray-500">
                    <span>{mod.lessons?.length || 0} lessons</span>
                    {quizzes[mod.id]?.questions?.length > 0 && (
                      <span>· {quizzes[mod.id].questions.length} quiz questions</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* checklist */}
          <div className="mb-5">
            <div className="text-[0.65rem] font-bold tracking-[.08em] uppercase text-gray-600 font-[Montserrat] mb-2">Checklist</div>
            {[
              { label: 'Course title', ok: !!info.title.trim() },
              { label: 'Description', ok: !!info.description.trim() },
              { label: 'Category selected', ok: !!info.category },
              { label: 'Thumbnail uploaded', ok: !!info.thumbnailUrl },
              { label: 'At least one module', ok: modules.length > 0 },
              { label: 'At least one lesson', ok: totalLessons > 0 },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-2 py-1">
                <span className={`text-[0.65rem] font-bold ${c.ok ? 'text-green-400' : 'text-red-400'}`}>{c.ok ? '✓' : '✗'}</span>
                <span className={`text-[0.73rem] ${c.ok ? 'text-gray-300' : 'text-gray-500'}`}>{c.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[8px] p-4 mb-5">
            <p className="text-[0.75rem] text-gray-400 leading-relaxed">
              Once submitted, admin will review your course within 1–3 business days. You'll receive a notification when it's approved or if changes are requested. The course will go live immediately after admin approval.
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={saveDraft} disabled={saving}
              className="px-5 py-2.5 bg-white/[.04] border border-white/[.08] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px] hover:bg-white/[.07] transition-colors">
              Save Draft
            </button>
            <button
              onClick={submitForReview}
              disabled={saving || !info.title.trim() || modules.length === 0 || totalLessons === 0}
              className="flex-1 py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px] disabled:opacity-40 transition-colors">
              Submit for Admin Review
            </button>
          </div>
        </div>
      )}

      {/* step navigation */}
      <div className="flex justify-between mt-5">
        {step > 0 ? (
          <button onClick={() => setStep(s => s - 1)}
            className="px-5 py-2 bg-white/[.04] border border-white/[.08] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] hover:bg-white/[.07] transition-colors">
            ← Previous
          </button>
        ) : <div />}
        {step < STEPS.length - 1 && (
          <button onClick={() => { saveDraft(); setStep(s => s + 1) }}
            className="px-5 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] transition-colors">
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
