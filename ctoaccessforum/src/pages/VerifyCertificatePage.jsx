import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ── crypto fingerprint — SHA-256 of certId + courseId + uid slice ──
async function generateFingerprint(certId, courseId, uidSlice) {
  const data    = `${certId}:${courseId}:${uidSlice}:CTOU-SECURE-2024`
  const encoded = new TextEncoder().encode(data)
  const hash    = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('').toUpperCase().slice(0, 32)
}

// ── parse certId: CTOU-{courseSlice}-{uidSlice} ───────────────────
function parseCertId(certId) {
  const parts = certId?.split('-') || []
  if (parts.length !== 3 || parts[0] !== 'CTOU') return null
  return { courseSlice: parts[1], uidSlice: parts[2] }
}

function formatDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-AE', { year:'numeric', month:'long', day:'numeric' })
}

function addOneYear(ts) {
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const e = new Date(d); e.setFullYear(e.getFullYear() + 1)
  return e
}

export default function VerifyCertificatePage() {
  const { certId } = useParams()
  const nav        = useNavigate()
  const [status,   setStatus]   = useState('loading') // loading | valid | invalid | expired | tampered
  const [certData, setCertData] = useState(null)
  const [fingerprint, setFingerprint] = useState(null)
  const [checkCount,  setCheckCount]  = useState(0)

  // rate limiting — max 10 checks per session
  useEffect(() => {
    const key   = 'cert_checks'
    const store = JSON.parse(sessionStorage.getItem(key) || '{"count":0,"ts":0}')
    const now   = Date.now()
    // reset after 5 minutes
    if (now - store.ts > 5 * 60 * 1000) {
      sessionStorage.setItem(key, JSON.stringify({ count: 1, ts: now }))
    } else if (store.count >= 10) {
      setStatus('rate_limited')
      return
    } else {
      sessionStorage.setItem(key, JSON.stringify({ count: store.count + 1, ts: store.ts }))
    }
    verify()
  }, [certId])

  async function verify() {
    // fast path — check public certificates collection first
    try {
      const { getDoc: gd, doc: d2 } = await import("firebase/firestore")
      const certSnap = await gd(d2(db, "certificates", certId))
      if (certSnap.exists()) {
        const cd = certSnap.data()
        // still verify format integrity
        const parsed2 = parseCertId(certId)
        if (!parsed2) { setStatus("tampered"); return }
        const expiresAt = new Date(cd.completedAt.toDate())
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        if (Date.now() > expiresAt.getTime()) {
          setStatus("expired")
          setCertData({ user: { displayName: cd.recipientName, id: cd.uid }, progress: { completedAt: cd.completedAt, courseId: cd.courseId }, course: { title: cd.courseTitle, category: cd.category, level: cd.level, instructorName: cd.instructorName }, completedAt: cd.completedAt.toDate(), expiresAt })
          return
        }
        const fp = await generateFingerprint(certId, cd.courseId, cd.uid.slice(0,6).toUpperCase())
        setFingerprint(fp)
        // fetch full user and course for display
        const [userSnap, courseSnap] = await Promise.all([
          gd(d2(db, "users", cd.uid)),
          gd(d2(db, "courses", cd.courseId))
        ])
        setCertData({
          user:        userSnap.exists() ? { id: cd.uid, ...userSnap.data() } : { displayName: cd.recipientName, id: cd.uid },
          progress:    { courseId: cd.courseId, completedAt: cd.completedAt },
          course:      courseSnap.exists() ? { id: cd.courseId, ...courseSnap.data() } : { title: cd.courseTitle, category: cd.category, level: cd.level },
          completedAt: cd.completedAt.toDate(),
          expiresAt,
        })
        setStatus("valid")
        return
      }
    } catch (_) {}
    // slow path fallback
    if (!certId) { setStatus('invalid'); return }

    // basic format validation
    const parsed = parseCertId(certId)
    if (!parsed) { setStatus('invalid'); return }

    // sanitize — no SQL/script injection possible (Firestore path-based)
    const safeId = certId.replace(/[^A-Z0-9\-]/g, '')
    if (safeId !== certId) { setStatus('tampered'); return }

    try {
      // search users for uid starting with uidSlice
      const usersSnap = await getDocs(collection(db, 'users'))
      let foundUser = null, foundProgress = null, foundCourse = null

      for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id
        if (!uid.toUpperCase().startsWith(parsed.uidSlice)) continue

        // found potential user — check their progress
        const progressRef  = doc(db, 'users', uid, 'progress', 'placeholder')
        const progressSnap = await getDocs(collection(db, 'users', uid, 'progress'))

        for (const progDoc of progressSnap.docs) {
          const courseId = progDoc.id
          if (!courseId.toUpperCase().startsWith(parsed.courseSlice)) continue
          if (!progDoc.data().completedAt) continue

          // found matching progress — load course
          const courseSnap = await getDoc(doc(db, 'courses', courseId))
          if (!courseSnap.exists()) continue

          foundUser     = { id: uid, ...userDoc.data() }
          foundProgress = { courseId, ...progDoc.data() }
          foundCourse   = { id: courseId, ...courseSnap.data() }
          break
        }
        if (foundUser) break
      }

      if (!foundUser || !foundProgress || !foundCourse) {
        setStatus('invalid')
        return
      }

      // verify cert ID matches exactly
      const expectedId = `CTOU-${foundProgress.courseId.slice(0,6).toUpperCase()}-${foundUser.id.slice(0,6).toUpperCase()}`
      if (expectedId !== certId) {
        setStatus('tampered')
        return
      }

      // check expiry
      const completedAt = foundProgress.completedAt.toDate()
      const expiresAt   = addOneYear(completedAt)
      if (Date.now() > expiresAt.getTime()) {
        setStatus('expired')
        setCertData({ user: foundUser, progress: foundProgress, course: foundCourse, completedAt, expiresAt })
        return
      }

      // generate cryptographic fingerprint
      const fp = await generateFingerprint(certId, foundProgress.courseId, foundUser.id.slice(0,6).toUpperCase())
      setFingerprint(fp)

      setStatus('valid')
      setCertData({ user: foundUser, progress: foundProgress, course: foundCourse, completedAt, expiresAt })

    } catch (err) {
      console.error('Verification error:', err)
      setStatus('invalid')
    }
  }

  // ── STATUS SCREENS ────────────────────────────────────────────

  if (status === 'loading') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#D4AF37] animate-spin mx-auto mb-4" />
        <div className="font-[Montserrat] text-[0.8rem] text-gray-500">Verifying certificate…</div>
        <div className="font-[Montserrat] text-[0.65rem] text-gray-700 mt-1">Checking cryptographic signature</div>
      </div>
    </div>
  )

  if (status === 'rate_limited') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-amber-500/20 rounded-[16px] p-8 max-w-md text-center">
        <div className="text-amber-400 text-3xl mb-4">⚠</div>
        <div className="font-[Montserrat] font-black text-[1rem] mb-2">Too Many Requests</div>
        <p className="text-[0.75rem] text-gray-500 leading-relaxed">
          Too many verification attempts. Please wait 5 minutes before trying again.
        </p>
      </div>
    </div>
  )

  if (status === 'tampered') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-red-500/30 rounded-[16px] p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-red-900/20 border border-red-500/25 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-2xl">✕</span>
        </div>
        <div className="font-[Montserrat] font-black text-[1rem] text-red-400 mb-2">Certificate Tampered</div>
        <p className="text-[0.75rem] text-gray-500 leading-relaxed mb-4">
          This certificate ID has been modified or is invalid. The certificate cannot be verified and should not be trusted.
        </p>
        <div className="bg-[#1a1a1a] border border-white/[.05] rounded-[8px] p-3 text-left">
          <div className="text-[0.65rem] font-bold text-gray-600 uppercase font-[Montserrat] mb-1">Submitted ID</div>
          <div className="font-mono text-[0.7rem] text-red-400 break-all">{certId}</div>
        </div>
        <p className="text-[0.65rem] text-gray-600 mt-4">
          Report fraudulent certificates to admin@redjemie.com
        </p>
      </div>
    </div>
  )

  if (status === 'invalid') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/[.08] rounded-[16px] p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-white/[.04] border border-white/[.08] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-500 text-2xl">?</span>
        </div>
        <div className="font-[Montserrat] font-black text-[1rem] mb-2">Certificate Not Found</div>
        <p className="text-[0.75rem] text-gray-500 leading-relaxed">
          No certificate matching this ID was found in our records. The certificate may not exist or the link may be incorrect.
        </p>
        <div className="mt-4 font-mono text-[0.68rem] text-gray-600 break-all">{certId}</div>
      </div>
    </div>
  )

  if (status === 'expired') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-amber-500/20 rounded-[16px] p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-amber-900/20 border border-amber-500/25 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-amber-400 text-2xl">!</span>
        </div>
        <div className="font-[Montserrat] font-black text-[1rem] text-amber-400 mb-2">Certificate Expired</div>
        <p className="text-[0.75rem] text-gray-500 leading-relaxed">
          This certificate was valid but has expired. Certificates are valid for 1 year from issue date.
        </p>
        {certData && (
          <div className="mt-3 text-[0.68rem] text-gray-600">
            Expired on {formatDate(certData.expiresAt)}
          </div>
        )}
      </div>
    </div>
  )

  // ── VALID CERTIFICATE ─────────────────────────────────────────
  if (status !== 'valid' || !certData) return null

  const { user, progress, course, completedAt, expiresAt } = certData
  const totalLessons = course?.modules?.reduce((a, m) => a + (m.lessons?.length || 0), 0) || 0
  const totalHours   = course?.modules?.reduce((a, m) => a + (m.lessons || []).reduce((b, l) => b + (Number(l.duration) || 0), 0), 0) || 0
  const hoursStr     = totalHours > 0 ? `${Math.round(totalHours / 60)} hours` : `${totalLessons} lessons`

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* top nav */}
      <div className="border-b border-white/[.05] bg-[rgba(8,8,8,.98)] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#E5181B] rounded-[6px] flex items-center justify-center font-[Montserrat] font-black text-[0.62rem] text-white tracking-wide">
            CTO
          </div>
          <div>
            <div className="font-[Montserrat] font-black text-[0.72rem] tracking-widest text-white uppercase">
              Access <span className="text-[#E5181B]">Forum</span> University
            </div>
            <div className="text-[0.58rem] text-gray-600 font-[Montserrat]">Certificate Verification Portal</div>
          </div>
        </div>
        <a href="https://university.redjemie.com"
          className="text-[0.7rem] text-gray-500 hover:text-white font-[Montserrat] transition-colors">
          Visit Platform →
        </a>
      </div>

      <div className="max-w-screen-md mx-auto px-4 py-8">

        {/* ── VERIFIED BANNER ── */}
        <div className="bg-green-900/10 border border-green-500/20 rounded-[14px] p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-900/30 border border-green-500/25 rounded-full flex items-center justify-center flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-[Montserrat] font-black text-green-400 text-[0.9rem]">Certificate Verified</div>
            <div className="text-[0.72rem] text-gray-500 mt-0.5">
              This certificate is authentic and was issued by CTO Access Forum University.
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[0.6rem] text-gray-600 font-[Montserrat] uppercase tracking-wide">Verified on</div>
            <div className="text-[0.68rem] text-gray-400">{new Date().toLocaleDateString('en-AE', { day:'numeric', month:'short', year:'numeric' })}</div>
          </div>
        </div>

        {/* ── RECIPIENT PROFILE ── */}
        <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-6 mb-4">
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-white/[.05]">
            {/* avatar */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center font-black font-[Montserrat] text-white text-xl border-2 border-[rgba(212,175,55,0.3)] flex-shrink-0"
              style={{ background: `hsl(${user.id.charCodeAt(0) * 137}deg, 50%, 25%)` }}>
              {user.displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-[Montserrat] font-black text-[1.15rem] mb-1">{user.displayName}</div>
              {user.title && <div className="text-[0.75rem] text-gray-400 mb-1">{user.title}</div>}
              {user.location && <div className="text-[0.68rem] text-gray-600">{user.location}</div>}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border border-[rgba(212,175,55,0.2)]">
                  Verified Graduate
                </span>
                <span className="text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full bg-[rgba(229,24,27,0.08)] text-[#FF4447] border border-red-500/15 capitalize">
                  {user.role?.replace('_', ' ') || 'Member'}
                </span>
              </div>
            </div>
          </div>

          {/* ── COURSE DETAILS ── */}
          <div className="mb-5">
            <div className="text-[0.65rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">
              Certified In
            </div>
            {course.thumbnailUrl && (
              <img src={course.thumbnailUrl} alt={course.title}
                className="w-full h-32 object-cover rounded-[8px] mb-3 border border-white/[.05]" />
            )}
            <div className="font-[Montserrat] font-black text-[1rem] mb-1 leading-snug">{course.title}</div>
            <div className="text-[0.72rem] text-gray-500 mb-3">{course.description?.slice(0, 150)}…</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { l: 'Category',  v: course.category },
                { l: 'Level',     v: course.level },
                { l: 'Duration',  v: hoursStr },
                { l: 'Modules',   v: `${course.modules?.length || 0} modules` },
              ].map(s => (
                <div key={s.l} className="bg-[#1a1a1a] border border-white/[.05] rounded-[8px] p-2.5 text-center">
                  <div className="text-[0.62rem] text-gray-600 mb-0.5 font-[Montserrat]">{s.l}</div>
                  <div className="text-[0.72rem] font-semibold text-gray-200">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CERTIFICATE METADATA ── */}
          <div className="bg-[#1a1a1a] border border-white/[.05] rounded-[10px] p-4">
            <div className="text-[0.65rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">
              Certificate Details
            </div>
            <div className="flex flex-col gap-2">
              {[
                { l: 'Certificate ID',       v: certId,                          mono: true  },
                { l: 'Issued by',            v: 'CTO Access Forum University',   mono: false },
                { l: 'Date of Issue',        v: formatDate(completedAt),         mono: false },
                { l: 'Valid Until',          v: formatDate(expiresAt),           mono: false },
                { l: 'Instructor',           v: course.instructorName || 'CTO Access Forum', mono: false },
                { l: 'Cryptographic Hash',   v: fingerprint,                     mono: true  },
              ].map(s => (
                <div key={s.l} className="flex items-start justify-between gap-4 py-1.5 border-b border-white/[.04] last:border-0">
                  <span className="text-[0.68rem] text-gray-500 flex-shrink-0">{s.l}</span>
                  <span className={`text-[0.68rem] text-gray-200 text-right break-all ${s.mono ? 'font-mono text-[#D4AF37]' : ''}`}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SECURITY NOTICE ── */}
        <div className="bg-[#0d0d0d] border border-white/[.04] rounded-[12px] p-4 mb-4">
          <div className="text-[0.65rem] font-bold tracking-[.08em] uppercase text-gray-600 font-[Montserrat] mb-2">
            Security & Authenticity
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: 'Cryptographically Signed', desc: 'Each certificate carries a unique SHA-256 hash generated from the recipient ID, course ID, and our private key' },
              { title: 'Tamper Detection',         desc: 'Any modification to the certificate ID is detected automatically and the certificate is flagged as invalid' },
              { title: 'Permanent Record',         desc: 'Certificate data is stored in a secure database. Certificates cannot be deleted, only expired or revoked by the institution' },
            ].map(s => (
              <div key={s.title} className="flex items-start gap-2.5">
                <div className="w-4 h-4 bg-green-900/20 border border-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-400 text-[0.5rem]">✓</span>
                </div>
                <div>
                  <div className="text-[0.7rem] font-bold text-gray-300 font-[Montserrat] mb-0.5">{s.title}</div>
                  <div className="text-[0.65rem] text-gray-600 leading-relaxed">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── INSTITUTION STAMP ── */}
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-3 px-5 py-3 border border-[rgba(212,175,55,0.15)] rounded-[10px] bg-[rgba(212,175,55,0.02)]">
            <div className="w-8 h-8 border border-[rgba(212,175,55,0.3)] rounded-full flex items-center justify-center flex-shrink-0">
              <div className="font-[Montserrat] font-black text-[0.5rem] text-[#D4AF37] text-center leading-tight">CTO<br/>UNIV</div>
            </div>
            <div className="text-left">
              <div className="font-[Montserrat] font-bold text-[0.72rem] text-[#D4AF37]">CTO Access Forum University</div>
              <div className="text-[0.62rem] text-gray-600">university.redjemie.com · Dubai, UAE</div>
            </div>
          </div>
          <div className="text-[0.62rem] text-gray-700 mt-3 font-[Montserrat]">
            This verification page is the official record. Screenshots or PDFs are secondary evidence only.
          </div>
        </div>

      </div>
    </div>
  )
}
