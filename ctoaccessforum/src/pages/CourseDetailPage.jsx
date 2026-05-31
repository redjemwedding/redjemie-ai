import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  doc, getDoc, collection, getDocs, setDoc, addDoc,
  updateDoc, arrayUnion, increment, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { parseVideoUrl } from '@/lib/utils'
import { notify } from '@/lib/notifications'
import toast from 'react-hot-toast'

// ── Payment Modal ─────────────────────────────────────────────────────
function PaymentModal({ course, profile, onClose, onSubmitted }) {
  const [method,     setMethod]     = useState('')
  const [reference,  setReference]  = useState('')
  const [submitting, setSubmitting]  = useState(false)
  const [settings,   setSettings]   = useState(null)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'payment')).then(snap => {
      setSettings(snap.exists() ? snap.data() : {
        bankName: '', accountName: '', accountNumber: '', iban: '',
        instapayId: '+971 506 328 968',
        whatsapp: '+971506328968',
        email: 'info@redjemie.com',
        notes: ''
      })
    }).catch(() => setSettings({
      bankName: '', accountName: '', accountNumber: '', iban: '',
      instapayId: '+971 506 328 968',
      whatsapp: '+971506328968',
      email: 'info@redjemie.com',
      notes: ''
    }))
  }, [])

  async function handleSubmit() {
    if (!method) { toast.error('Please select a payment method'); return }
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'pendingPayments'), {
        courseId:      course.id,
        courseTitle:   course.title,
        price:         course.price,
        studentId:     profile.uid,
        studentName:   profile.displayName,
        studentEmail:  profile.email,
        method,
        reference:     reference.trim(),
        status:        'pending',
        submittedAt:   serverTimestamp(),
        instructorId:  course.instructorId || '',
        instructorName: course.instructorName || '',
      })
      onSubmitted()
    } catch(e) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  const methods = [
    { id: 'bank',     label: 'Bank Transfer' },
    { id: 'instapay', label: 'InstaPay'       },
    { id: 'whatsapp', label: 'WhatsApp'       },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,.85)', backdropFilter:'blur(8px)' }}>
      <div className="bg-[#111] border border-white/[.07] rounded-[20px] w-full max-w-[460px] overflow-hidden shadow-2xl"
        style={{ animation:'fadeUp .2s ease' }}>
        <div style={{ height:'3px', background:'linear-gradient(90deg,#E5181B,#FF6B6B)' }}/>
        <div className="p-7">

          {/* header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="font-[Montserrat] font-black text-[1.05rem] text-white">Complete Your Enrollment</h2>
              <p className="text-[0.72rem] text-gray-500 mt-1">Manual payment — activated within 24 hours.</p>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl">✕</button>
          </div>

          {/* course + amount */}
          <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[12px] p-4 mb-5">
            <div className="text-[0.62rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wider mb-1">Course</div>
            <div className="font-[Montserrat] font-black text-[0.9rem] text-white mb-3 leading-snug">{course.title}</div>
            <div className="flex items-center justify-between border-t border-white/[.05] pt-3">
              <span className="text-[0.72rem] text-gray-500">Amount Due</span>
              <span className="font-[Montserrat] font-black text-[1.3rem] text-[#E5181B]">AED {course.price}</span>
            </div>
          </div>

          {/* payment method */}
          <div className="mb-5">
            <div className="text-[0.65rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wider mb-2">Pay Via</div>
            <div className="grid grid-cols-3 gap-2">
              {methods.map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={`py-2.5 rounded-[10px] text-[0.75rem] font-bold font-[Montserrat] border transition-all ${
                    method === m.id
                      ? 'bg-[#E5181B]/10 border-[#E5181B]/40 text-[#E5181B]'
                      : 'bg-[#1a1a1a] border-white/[.06] text-gray-400 hover:text-white hover:border-white/[.12]'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* bank details — shown based on method */}
          {method === 'bank' && settings && (
            <div className="bg-[#0d0d0d] border border-blue-500/20 rounded-[12px] p-4 mb-5">
              <div className="text-[0.65rem] font-bold font-[Montserrat] text-blue-400 uppercase tracking-wider mb-3">Bank Transfer Details</div>
              {settings.bankName || settings.accountName || settings.accountNumber || settings.iban ? (
                <div className="flex flex-col gap-2">
                  {[
                    { l: 'Bank Name',      v: settings.bankName },
                    { l: 'Account Name',   v: settings.accountName },
                    { l: 'Account Number', v: settings.accountNumber },
                    { l: 'IBAN',           v: settings.iban },
                    { l: 'Reference',      v: `CAFU-${profile?.displayName?.split(' ')[0]?.toUpperCase() || 'STUDENT'}` },
                  ].filter(r => r.v).map(r => (
                    <div key={r.l} className="flex items-center justify-between">
                      <span className="text-[0.68rem] text-gray-500">{r.l}</span>
                      <span className="text-[0.75rem] font-bold font-[Montserrat] text-white cursor-pointer"
                        onClick={() => { navigator.clipboard?.writeText(r.v); toast.success(`${r.l} copied!`) }}>
                        {r.v}
                      </span>
                    </div>
                  ))}
                  <p className="text-[0.62rem] text-gray-600 mt-2">Tap any value to copy.</p>
                </div>
              ) : (
                <p className="text-[0.75rem] text-gray-500">Bank details not set yet. Please contact us directly.</p>
              )}
              {settings.notes && (
                <div className="mt-3 pt-3 border-t border-white/[.05]">
                  <p className="text-[0.72rem] text-amber-300/70">{settings.notes}</p>
                </div>
              )}
            </div>
          )}

          {method === 'instapay' && settings && (
            <div className="bg-[#0d0d0d] border border-green-500/20 rounded-[12px] p-4 mb-5">
              <div className="text-[0.65rem] font-bold font-[Montserrat] text-green-400 uppercase tracking-wider mb-3">InstaPay Details</div>
              <div className="flex flex-col gap-2">
                {[
                  { l: 'InstaPay ID / Mobile', v: settings.instapayId || settings.whatsapp },
                  { l: 'Account Name',         v: settings.accountName },
                  { l: 'Reference',            v: `CAFU-${profile?.displayName?.split(' ')[0]?.toUpperCase() || 'STUDENT'}` },
                ].filter(r => r.v).map(r => (
                  <div key={r.l} className="flex items-center justify-between">
                    <span className="text-[0.68rem] text-gray-500">{r.l}</span>
                    <span className="text-[0.75rem] font-bold font-[Montserrat] text-white cursor-pointer"
                      onClick={() => { navigator.clipboard?.writeText(r.v); toast.success(`${r.l} copied!`) }}>
                      {r.v}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[0.62rem] text-gray-600 mt-2">Tap any value to copy.</p>
            </div>
          )}

          {method === 'whatsapp' && settings && (
            <div className="bg-[#0d0d0d] border border-green-500/20 rounded-[12px] p-4 mb-5">
              <div className="text-[0.65rem] font-bold font-[Montserrat] text-green-400 uppercase tracking-wider mb-3">WhatsApp Payment</div>
              <p className="text-[0.78rem] text-gray-300 leading-relaxed mb-3">
                Send <strong className="text-white">AED {course.price}</strong> via WhatsApp Pay or contact us to arrange payment.
              </p>
              <a href={`https://wa.me/${(settings.whatsapp||'971506328968').replace(/[^0-9]/g,'')}?text=Hi, I'd like to enroll in ${encodeURIComponent(course.title)} (AED ${course.price}). My name is ${encodeURIComponent(profile?.displayName || '')}.`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-900/20 border border-green-500/25 text-green-300 font-[Montserrat] font-bold text-[0.8rem] rounded-[10px] hover:bg-green-900/30 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.552 4.105 1.518 5.829L0 24l6.335-1.518A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.372l-.359-.214-3.723.976.993-3.631-.234-.373A9.818 9.818 0 1112 21.818z"/>
                </svg>
                Open WhatsApp Chat
              </a>
            </div>
          )}

          {/* contact info */}
          <div className="bg-[#0d0d0d] border border-white/[.05] rounded-[12px] p-4 mb-5">
            <div className="text-[0.65rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wider mb-3">
              After Payment, Send Proof To
            </div>
            <div className="flex flex-col gap-2">
              <a href="https://wa.me/971506328968" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-[0.78rem] text-gray-300 hover:text-white transition-colors">
                <div className="w-7 h-7 rounded-[7px] bg-green-900/20 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.552 4.105 1.518 5.829L0 24l6.335-1.518A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.372l-.359-.214-3.723.976.993-3.631-.234-.373A9.818 9.818 0 1112 21.818z"/>
                  </svg>
                </div>
                +971 506 328 968
              </a>
              <a href="mailto:info@redjemie.com"
                className="flex items-center gap-2.5 text-[0.78rem] text-gray-300 hover:text-white transition-colors">
                <div className="w-7 h-7 rounded-[7px] bg-red-900/20 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E5181B]">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                info@redjemie.com
              </a>
            </div>
          </div>

          {/* reference */}
          <div className="mb-5">
            <label className="text-[0.65rem] font-bold font-[Montserrat] text-gray-500 uppercase tracking-wider mb-1.5 block">
              Transaction Reference (optional)
            </label>
            <input type="text" placeholder="e.g. TXN123456 or last 4 digits"
              value={reference} onChange={e => setReference(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/[.07] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"/>
          </div>

          <button onClick={handleSubmit} disabled={submitting || !method}
            className="w-full py-3 bg-[#E5181B] hover:bg-[#C01215] disabled:opacity-40 text-white font-[Montserrat] font-black text-[0.85rem] rounded-[12px] transition-all flex items-center justify-center gap-2">
            {submitting
              ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : 'I Have Paid — Submit for Approval →'}
          </button>

          <p className="text-center text-[0.65rem] text-gray-600 mt-3">
            Your enrollment will be activated within 24 hours after payment verification.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Payment Submitted Confirmation ────────────────────────────────────
function PaymentSubmitted({ course, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,.85)', backdropFilter:'blur(8px)' }}>
      <div className="bg-[#111] border border-white/[.07] rounded-[20px] w-full max-w-[400px] overflow-hidden shadow-2xl text-center">
        <div style={{ height:'3px', background:'linear-gradient(90deg,#E5181B,#FF6B6B)' }}/>
        <div className="p-8">
          <div className="w-14 h-14 rounded-full bg-green-900/20 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="font-[Montserrat] font-black text-[1.1rem] text-white mb-2">Payment Submitted!</h2>
          <p className="text-[0.78rem] text-gray-400 leading-relaxed mb-2">
            Thank you! Your payment proof has been submitted for <strong className="text-white">{course.title}</strong>.
          </p>
          <p className="text-[0.73rem] text-gray-500 mb-6">
            Your enrollment will be activated within <strong className="text-white">24 hours</strong> once we verify your payment.
          </p>
          <button onClick={onClose}
            className="w-full py-2.5 bg-white/[.05] border border-white/[.08] text-white font-[Montserrat] font-bold text-[0.82rem] rounded-[10px] hover:bg-white/[.08] transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [course,      setCourse]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [enrolling,   setEnrolling]   = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

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
    // paid course → show payment modal
    if (!course?.isFree && course?.price > 0) {
      setShowPayment(true)
      return
    }
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
      {/* Payment modals */}
      {showPayment && !showSuccess && (
        <PaymentModal
          course={course}
          profile={profile}
          onClose={() => setShowPayment(false)}
          onSubmitted={() => { setShowPayment(false); setShowSuccess(true) }}
        />
      )}
      {showSuccess && (
        <PaymentSubmitted
          course={course}
          onClose={() => setShowSuccess(false)}
        />
      )}

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
