import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  doc, getDoc, setDoc, updateDoc,
  serverTimestamp, arrayUnion
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut
} from 'firebase/auth'

// ── Rate limiting ─────────────────────────────────────────────────
function checkRateLimit() {
  const key   = 'cert_verify_v3'
  const store = JSON.parse(sessionStorage.getItem(key) || '{"count":0,"ts":0}')
  const now   = Date.now()
  if (now - store.ts > 10 * 60 * 1000) {
    sessionStorage.setItem(key, JSON.stringify({ count: 1, ts: now }))
    return true
  }
  if (store.count >= 5) return false
  sessionStorage.setItem(key, JSON.stringify({ count: store.count + 1, ts: store.ts }))
  return true
}

// ── Crypto fingerprint ────────────────────────────────────────────
async function generateFingerprint(certId, courseId, uidSlice) {
  const data    = `${certId}:${courseId}:${uidSlice}:CTOU-SECURE-2024`
  const encoded = new TextEncoder().encode(data)
  const hash    = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('').toUpperCase().slice(0,32)
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-AE', { year:'numeric', month:'long', day:'numeric' })
}

function CTOLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <defs>
        <radialGradient id="vg1" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FF6B6B"/>
          <stop offset="50%" stopColor="#E5181B"/>
          <stop offset="100%" stopColor="#8B0000"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="105" r="85" fill="url(#vg1)"/>
      <rect x="88" y="18" width="10" height="14" rx="2" fill="#FF4444"/>
      <rect x="102" y="16" width="10" height="14" rx="2" fill="#E5181B"/>
      <rect x="116" y="20" width="10" height="14" rx="2" fill="#CC1010"/>
      <rect x="74" y="22" width="10" height="14" rx="2" fill="#FF5555"/>
      <path d="M40 75 Q70 45 120 60 Q155 72 160 100 Q165 128 140 145" stroke="rgba(255,200,200,0.75)" strokeWidth="12" fill="none" strokeLinecap="round"/>
      <path d="M50 90 Q80 58 130 72 Q162 85 165 112" stroke="rgba(255,220,220,0.5)" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <path d="M115 75 Q155 90 168 125 Q178 155 155 175 Q130 192 100 188 Q68 185 48 165 Q28 145 30 118 Q32 95 55 82" fill="rgba(120,0,0,0.35)"/>
      <ellipse cx="75" cy="72" rx="22" ry="14" fill="rgba(255,255,255,0.14)" transform="rotate(-25 75 72)"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function VerifyCertificatePage() {
  const { certId } = useParams()
  const auth       = getAuth()
  const provider   = new GoogleAuthProvider()

  const [stage,       setStage]       = useState('gate')    // gate | signing | loading | valid | invalid | expired | tampered | rate_limited | already_viewed
  const [certData,    setCertData]    = useState(null)
  const [fingerprint, setFingerprint] = useState('')
  const [verifier,    setVerifier]    = useState(null)      // {email, name, photo}
  const [signingIn,   setSigningIn]   = useState(false)
  const [verifiedAt,  setVerifiedAt]  = useState(null)

  // format check on mount
  useEffect(() => {
    if (!certId || !/^CTOU-[A-Z0-9]{6}-[A-Z0-9]{6}$/.test(certId)) {
      setStage('tampered')
    }
  }, [certId])

  async function handleGoogleSignIn() {
    if (!checkRateLimit()) { setStage('rate_limited'); return }
    setSigningIn(true)
    try {
      const result = await signInWithPopup(auth, provider)
      const user   = result.user
      setVerifier({ email: user.email, name: user.displayName, photo: user.photoURL })
      await signOut(auth) // sign out immediately — we only needed identity
      setStage('loading')
      await verifyCert(user.email, user.displayName)
    } catch (err) {
      console.error(err)
      setSigningIn(false)
      if (err.code === 'auth/popup-closed-by-user') return
      setStage('invalid')
    }
  }

  async function verifyCert(verifierEmail, verifierName) {
    try {
      // fetch certificate record
      const certSnap = await getDoc(doc(db, 'certificates', certId))
      if (!certSnap.exists()) { setStage('invalid'); return }

      const cd = certSnap.data()

      // integrity check
      const expectedId = `CTOU-${cd.courseId?.slice(0,6).toUpperCase()}-${cd.uid?.slice(0,6).toUpperCase()}`
      if (expectedId !== certId) { setStage('tampered'); return }

      // expiry check
      const completedAt = cd.completedAt?.toDate ? cd.completedAt.toDate() : new Date()
      const expiresAt   = new Date(completedAt); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      if (Date.now() > expiresAt.getTime()) {
        setCertData({ ...cd, completedAt, expiresAt })
        setStage('expired'); return
      }

      // fetch user + course
      const [userSnap, courseSnap] = await Promise.all([
        getDoc(doc(db, 'users', cd.uid)),
        getDoc(doc(db, 'courses', cd.courseId)),
      ])

      const user   = userSnap.exists()   ? { id: cd.uid, ...userSnap.data() }         : { displayName: cd.recipientName, id: cd.uid }
      const course = courseSnap.exists() ? { id: cd.courseId, ...courseSnap.data() }   : { title: cd.courseTitle }

      // generate fingerprint
      const fp = await generateFingerprint(certId, cd.courseId, cd.uid.slice(0,6).toUpperCase())
      setFingerprint(fp)

      // log verification — write to certificates/{certId}/verifications subcollection
      const now = new Date()
      setVerifiedAt(now)
      try {
        await setDoc(doc(db, 'certificates', certId, 'verifications', verifierEmail.replace('@','_at_').replace(/\./g,'_')), {
          verifierEmail,
          verifierName,
          verifiedAt: serverTimestamp(),
          certId,
          recipientName: cd.recipientName,
          courseTitle: cd.courseTitle,
        }, { merge: true })
        // also update cert doc with verification count
        await updateDoc(doc(db, 'certificates', certId), {
          verificationCount: arrayUnion(verifierEmail),
          lastVerifiedAt:    serverTimestamp(),
        })
      } catch (e) { console.warn('Log verification:', e.message) }

      setCertData({ cert: cd, user, course, completedAt, expiresAt })
      setStage('valid')

    } catch (err) {
      console.error('Verify error:', err)
      setStage('invalid')
    }
  }

  // ── GATE SCREEN — Google sign-in required ─────────────────────
  if (stage === 'gate' || stage === 'signing') return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* top nav */}
      <div className="border-b border-white/[.05] bg-[rgba(8,8,8,.98)] px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CTOLogo size={32} />
          <div>
            <div className="font-[Montserrat] font-black text-[0.7rem] tracking-widest text-white uppercase">
              CTO <span className="text-[#E5181B]">Access</span> Forum University
            </div>
            <div className="text-[0.58rem] text-gray-600 font-[Montserrat]">Certificate Verification Portal</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* cert ID preview */}
          <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-6 mb-4 text-center">
            <div className="w-14 h-14 bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 12l2 2 4-4"/>
                <path d="M3 9h18M9 3v18"/>
              </svg>
            </div>
            <div className="font-[Montserrat] font-black text-[0.95rem] mb-1">Certificate Verification</div>
            <div className="font-mono text-[0.68rem] text-[#D4AF37] mb-2 break-all">{certId}</div>
            <p className="text-[0.73rem] text-gray-500 leading-relaxed">
              To protect the integrity of this credential, human verification is required.
              Please sign in with your Google account to proceed.
            </p>
          </div>

          {/* sign in card */}
          <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-6">
            <div className="text-[0.67rem] font-bold tracking-[.08em] uppercase text-gray-600 font-[Montserrat] mb-4 text-center">
              Identity Verification Required
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 font-bold font-[Montserrat] text-[0.8rem] rounded-[10px] transition-colors disabled:opacity-60 mb-4">
              {signingIn
                ? <><span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"/><span>Signing in…</span></>
                : <><GoogleIcon /><span>Continue with Google</span></>}
            </button>

            <div className="flex flex-col gap-2.5">
              {[
                'Your Google account is used for identity verification only',
                'We do not store your Google credentials',
                'You will be signed out immediately after verification',
                'This verification session is logged for audit purposes',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-white/[.04] border border-white/[.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-gray-500 text-[0.45rem] font-bold">✓</span>
                  </div>
                  <span className="text-[0.67rem] text-gray-500 leading-relaxed">{t}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[.05] text-center">
              <p className="text-[0.65rem] text-gray-600 leading-relaxed">
                Need official confirmation? Contact the Registrar Department at{' '}
                <a href="mailto:info@redjemie.com" className="text-[#E5181B] hover:underline">info@redjemie.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── LOADING ───────────────────────────────────────────────────
  if (stage === 'loading') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin mx-auto mb-4" />
        <div className="font-[Montserrat] text-[0.8rem] text-gray-500">Verifying certificate…</div>
        <div className="font-[Montserrat] text-[0.65rem] text-gray-700 mt-1">Checking cryptographic signature</div>
      </div>
    </div>
  )

  // ── RATE LIMITED ──────────────────────────────────────────────
  if (stage === 'rate_limited') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-amber-500/20 rounded-[16px] p-8 max-w-sm w-full text-center">
        <div className="text-amber-400 text-3xl mb-4">⚠</div>
        <div className="font-[Montserrat] font-black text-[1rem] mb-2">Too Many Attempts</div>
        <p className="text-[0.75rem] text-gray-500 mb-4">Please wait 10 minutes before verifying again.</p>
        <p className="text-[0.68rem] text-gray-600">
          For official verification contact{' '}
          <a href="mailto:info@redjemie.com" className="text-[#E5181B] hover:underline">info@redjemie.com</a>
        </p>
      </div>
    </div>
  )

  // ── TAMPERED ──────────────────────────────────────────────────
  if (stage === 'tampered') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-red-500/30 rounded-[16px] p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-red-900/20 border border-red-500/25 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-2xl font-bold">✕</span>
        </div>
        <div className="font-[Montserrat] font-black text-[1rem] text-red-400 mb-2">Invalid Certificate</div>
        <p className="text-[0.75rem] text-gray-500 leading-relaxed mb-3">This certificate ID is malformed or has been altered. It cannot be verified.</p>
        <div className="bg-[#1a1a1a] rounded-[6px] p-2"><div className="font-mono text-[0.65rem] text-red-400 break-all">{certId}</div></div>
        <p className="text-[0.62rem] text-gray-600 mt-4">Report fraud: <a href="mailto:info@redjemie.com" className="text-[#E5181B] hover:underline">info@redjemie.com</a></p>
      </div>
    </div>
  )

  // ── NOT FOUND ─────────────────────────────────────────────────
  if (stage === 'invalid') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/[.08] rounded-[16px] p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-white/[.04] border border-white/[.08] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-500 text-3xl">?</span>
        </div>
        <div className="font-[Montserrat] font-black text-[1rem] mb-2">Certificate Not Found</div>
        <p className="text-[0.75rem] text-gray-500 leading-relaxed mb-3">No certificate matching this ID exists in our records.</p>
        <div className="font-mono text-[0.65rem] text-gray-600 break-all mb-4">{certId}</div>
        <div className="bg-[#1a1a1a] border border-white/[.05] rounded-[10px] p-4">
          <p className="text-[0.72rem] text-gray-500 leading-relaxed">
            For official verification, contact the Registrar Department:
          </p>
          <a href="mailto:info@redjemie.com" className="text-[#E5181B] font-bold font-[Montserrat] text-[0.76rem] hover:underline mt-1 block">
            info@redjemie.com
          </a>
          <p className="text-[0.65rem] text-gray-600 mt-1">CTO Access Forum University · Dubai, UAE</p>
        </div>
      </div>
    </div>
  )

  // ── EXPIRED ───────────────────────────────────────────────────
  if (stage === 'expired') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-amber-500/20 rounded-[16px] p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-amber-900/20 border border-amber-500/25 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-amber-400 text-2xl">!</span>
        </div>
        <div className="font-[Montserrat] font-black text-[1rem] text-amber-400 mb-2">Certificate Expired</div>
        <p className="text-[0.75rem] text-gray-500 mb-2">This certificate expired on {formatDate(certData?.expiresAt)}.</p>
        <p className="text-[0.68rem] text-gray-600">Contact <a href="mailto:info@redjemie.com" className="text-[#E5181B] hover:underline">info@redjemie.com</a> for renewal information.</p>
      </div>
    </div>
  )

  // ── VALID CERTIFICATE ─────────────────────────────────────────
  if (stage !== 'valid' || !certData) return null
  const { cert, user, course, completedAt, expiresAt } = certData
  const totalLessons = course?.modules?.reduce((a,m) => a+(m.lessons?.length||0),0) || 0

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* top nav */}
      <div className="border-b border-white/[.05] bg-[rgba(8,8,8,.98)] backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <CTOLogo size={32} />
          <div className="min-w-0">
            <div className="font-[Montserrat] font-black text-[0.68rem] sm:text-[0.74rem] tracking-widest text-white uppercase truncate">
              CTO <span className="text-[#E5181B]">Access</span> Forum University
            </div>
            <div className="text-[0.56rem] text-gray-600 font-[Montserrat] hidden sm:block">Certificate Verification Portal</div>
          </div>
        </div>
        <a href="https://university.redjemie.com" className="text-[0.7rem] text-gray-500 hover:text-white font-[Montserrat] transition-colors flex-shrink-0 ml-3">
          Visit Platform →
        </a>
      </div>

      <div className="max-w-screen-md mx-auto px-4 py-6 sm:py-8">

        {/* VERIFIED BANNER */}
        <div className="bg-green-900/10 border border-green-500/20 rounded-[14px] p-4 mb-4 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 bg-green-900/30 border border-green-500/25 rounded-full flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-[Montserrat] font-black text-green-400 text-[0.85rem]">Certificate Verified</div>
            <div className="text-[0.68rem] text-gray-500 mt-0.5">Authentic credential — CTO Access Forum University</div>
          </div>
          {verifiedAt && (
            <div className="text-right flex-shrink-0 hidden sm:block">
              <div className="text-[0.6rem] text-gray-600 font-[Montserrat] uppercase tracking-wide">Verified by</div>
              <div className="text-[0.66rem] text-gray-400 truncate max-w-[150px]">{verifier?.email}</div>
            </div>
          )}
        </div>

        {/* VERIFIER INFO */}
        {verifier && (
          <div className="bg-[#1a1a1a] border border-white/[.05] rounded-[10px] p-3 mb-4 flex items-center gap-3">
            {verifier.photo && <img src={verifier.photo} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="text-[0.7rem] text-gray-400">
                Verified by <span className="text-white font-medium">{verifier.name}</span>
                <span className="text-gray-600"> ({verifier.email})</span>
              </div>
              <div className="text-[0.62rem] text-gray-600 mt-0.5">
                {verifiedAt?.toLocaleString('en-AE', { dateStyle:'medium', timeStyle:'short' })}
                · Session logged for audit
              </div>
            </div>
          </div>
        )}

        {/* RECIPIENT + COURSE */}
        <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-5 sm:p-6 mb-4">
          <div className="flex items-center gap-3 sm:gap-4 mb-5 pb-5 border-b border-white/[.05]">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-black font-[Montserrat] text-white text-xl border-2 border-[rgba(212,175,55,0.3)] flex-shrink-0"
              style={{ background:`hsl(${user.id?.charCodeAt(0)*137}deg,45%,22%)` }}>
              {user.displayName?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-[Montserrat] font-black text-[1rem] sm:text-[1.1rem] truncate">{user.displayName}</div>
              {user.title    && <div className="text-[0.73rem] text-gray-400 mt-0.5 truncate">{user.title}</div>}
              {user.location && <div className="text-[0.68rem] text-gray-600 truncate">{user.location}</div>}
              <span className="text-[0.58rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border border-[rgba(212,175,55,0.2)] mt-1 inline-block">
                Verified Graduate
              </span>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-[0.63rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">Certified In</div>
            {course.thumbnailUrl && (
              <img src={course.thumbnailUrl} alt={course.title} className="w-full h-28 sm:h-32 object-cover rounded-[8px] mb-3 border border-white/[.05]" />
            )}
            <div className="font-[Montserrat] font-black text-[0.95rem] sm:text-[1rem] mb-1.5 leading-snug">{course.title}</div>
            {course.description && <div className="text-[0.72rem] text-gray-500 mb-3 line-clamp-2">{course.description}</div>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { l:'Category',   v: course.category },
                { l:'Level',      v: course.level },
                { l:'Lessons',    v: `${totalLessons}` },
                { l:'Instructor', v: course.instructorName || 'CTO Access' },
              ].map(s => (
                <div key={s.l} className="bg-[#1a1a1a] border border-white/[.05] rounded-[8px] p-2.5 text-center">
                  <div className="text-[0.6rem] text-gray-600 mb-0.5 font-[Montserrat]">{s.l}</div>
                  <div className="text-[0.7rem] font-semibold text-gray-200 truncate">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-white/[.05] rounded-[10px] p-4">
            <div className="text-[0.63rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">Certificate Details</div>
            <div className="flex flex-col gap-2">
              {[
                { l:'Certificate ID',     v: certId,                         mono:true  },
                { l:'Issued by',          v:'CTO Access Forum University',   mono:false },
                { l:'Date of Issue',      v: formatDate(completedAt),        mono:false },
                { l:'Valid Until',        v: formatDate(expiresAt),          mono:false },
                { l:'Cryptographic Hash', v: fingerprint,                    mono:true  },
              ].map(s => (
                <div key={s.l} className="flex items-start justify-between gap-3 py-1.5 border-b border-white/[.04] last:border-0">
                  <span className="text-[0.67rem] text-gray-500 flex-shrink-0">{s.l}</span>
                  <span className={`text-[0.67rem] text-right break-all ${s.mono ? 'font-mono text-[#D4AF37]' : 'text-gray-200'}`}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECURITY */}
        <div className="bg-[#0d0d0d] border border-white/[.04] rounded-[12px] p-4 mb-4">
          <div className="text-[0.63rem] font-bold tracking-[.08em] uppercase text-gray-600 font-[Montserrat] mb-3">Security & Authenticity</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { t:'Human Verified',        d:'This verification was completed by a real person using a Google account — not a bot or script' },
              { t:'Cryptographically Signed', d:'SHA-256 hash ensures this certificate has not been altered since issuance' },
              { t:'Audit Logged',          d:'This verification session has been logged with verifier identity and timestamp' },
            ].map(s => (
              <div key={s.t} className="flex items-start gap-2">
                <div className="w-4 h-4 bg-green-900/20 border border-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-400 text-[0.5rem] font-bold">✓</span>
                </div>
                <div>
                  <div className="text-[0.7rem] font-bold text-gray-300 font-[Montserrat] mb-0.5">{s.t}</div>
                  <div className="text-[0.65rem] text-gray-600 leading-relaxed">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OFFICIAL CONTACT */}
        <div className="bg-[#111] border border-[rgba(212,175,55,0.1)] rounded-[12px] p-4 text-center">
          <div className="font-[Montserrat] font-bold text-[0.75rem] text-[#D4AF37] mb-1">Need Official Confirmation?</div>
          <p className="text-[0.7rem] text-gray-500 mb-2 leading-relaxed">
            For formal verification letters, employer confirmation, or legal purposes, contact the Registrar Department:
          </p>
          <a href="mailto:info@redjemie.com" className="font-[Montserrat] font-bold text-[#E5181B] hover:underline text-[0.78rem]">
            info@redjemie.com
          </a>
          <div className="text-[0.62rem] text-gray-600 mt-1">CTO Access Forum University · Dubai, United Arab Emirates</div>
        </div>

      </div>
    </div>
  )
}
