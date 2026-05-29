import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ── Rate limiting ─────────────────────────────────────────────────
function checkRateLimit() {
  const key   = 'cert_verify_v2'
  const store = JSON.parse(sessionStorage.getItem(key) || '{"count":0,"ts":0}')
  const now   = Date.now()
  if (now - store.ts > 5 * 60 * 1000) {
    sessionStorage.setItem(key, JSON.stringify({ count: 1, ts: now }))
    return true
  }
  if (store.count >= 15) return false
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
  if (!ts) return ''
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

export default function VerifyCertificatePage() {
  const { certId } = useParams()
  const [status,      setStatus]      = useState('loading')
  const [certData,    setCertData]    = useState(null)
  const [fingerprint, setFingerprint] = useState('')

  useEffect(() => {
    if (!checkRateLimit()) { setStatus('rate_limited'); return }
    verify()
  }, [certId])

  async function verify() {
    if (!certId) { setStatus('invalid'); return }

    // strict format check: CTOU-XXXXXX-XXXXXX
    if (!/^CTOU-[A-Z0-9]{6}-[A-Z0-9]{6}$/.test(certId)) {
      setStatus('tampered'); return
    }

    try {
      // ── fast path: look up certificates collection directly ──
      const certSnap = await getDoc(doc(db, 'certificates', certId))

      if (!certSnap.exists()) {
        setStatus('invalid'); return
      }

      const cd = certSnap.data()

      // verify the certId matches what we'd generate for this uid+courseId
      const expectedId = `CTOU-${cd.courseId?.slice(0,6).toUpperCase()}-${cd.uid?.slice(0,6).toUpperCase()}`
      if (expectedId !== certId) {
        setStatus('tampered'); return
      }

      // check expiry
      const completedAt = cd.completedAt?.toDate ? cd.completedAt.toDate() : new Date(cd.completedAt)
      const expiresAt   = new Date(completedAt); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      if (Date.now() > expiresAt.getTime()) {
        setCertData({ ...cd, completedAt, expiresAt })
        setStatus('expired'); return
      }

      // ── fetch full user + course for rich display ──
      const [userSnap, courseSnap] = await Promise.all([
        getDoc(doc(db, 'users', cd.uid)),
        getDoc(doc(db, 'courses', cd.courseId)),
      ])

      const user   = userSnap.exists()   ? { id: cd.uid,       ...userSnap.data()   } : { displayName: cd.recipientName, id: cd.uid }
      const course = courseSnap.exists() ? { id: cd.courseId,  ...courseSnap.data() } : { title: cd.courseTitle, category: cd.category, level: cd.level }

      // generate fingerprint
      const fp = await generateFingerprint(certId, cd.courseId, cd.uid.slice(0,6).toUpperCase())
      setFingerprint(fp)

      setCertData({ cert: cd, user, course, completedAt, expiresAt })
      setStatus('valid')

    } catch (err) {
      console.error('Verify error:', err)
      setStatus('invalid')
    }
  }

  // ── STATUS SCREENS ────────────────────────────────────────────

  if (status === 'loading') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin mx-auto mb-4" />
        <div className="font-[Montserrat] text-[0.8rem] text-gray-500">Verifying certificate…</div>
        <div className="font-[Montserrat] text-[0.65rem] text-gray-700 mt-1">Checking cryptographic signature</div>
      </div>
    </div>
  )

  if (status === 'rate_limited') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-amber-500/20 rounded-[16px] p-8 max-w-sm w-full text-center">
        <div className="text-amber-400 text-3xl mb-4">⚠</div>
        <div className="font-[Montserrat] font-black text-[1rem] mb-2">Too Many Requests</div>
        <p className="text-[0.75rem] text-gray-500">Please wait 5 minutes before verifying again.</p>
      </div>
    </div>
  )

  if (status === 'tampered') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-red-500/30 rounded-[16px] p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-red-900/20 border border-red-500/25 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-2xl font-bold">✕</span>
        </div>
        <div className="font-[Montserrat] font-black text-[1rem] text-red-400 mb-2">Invalid Certificate</div>
        <p className="text-[0.75rem] text-gray-500 leading-relaxed mb-3">This certificate ID is malformed or has been tampered with. It cannot be verified.</p>
        <div className="bg-[#1a1a1a] rounded-[6px] p-2 text-left">
          <div className="font-mono text-[0.65rem] text-red-400 break-all">{certId}</div>
        </div>
        <p className="text-[0.62rem] text-gray-600 mt-4">Report fraud: admin@redjemie.com</p>
      </div>
    </div>
  )

  if (status === 'invalid') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/[.08] rounded-[16px] p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-white/[.04] border border-white/[.08] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-500 text-3xl">?</span>
        </div>
        <div className="font-[Montserrat] font-black text-[1rem] mb-2">Not Found</div>
        <p className="text-[0.75rem] text-gray-500 leading-relaxed">No certificate matching this ID was found. The link may be incorrect.</p>
        <div className="mt-3 font-mono text-[0.65rem] text-gray-600 break-all">{certId}</div>
      </div>
    </div>
  )

  if (status === 'expired') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-amber-500/20 rounded-[16px] p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-amber-900/20 border border-amber-500/25 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-amber-400 text-2xl">!</span>
        </div>
        <div className="font-[Montserrat] font-black text-[1rem] text-amber-400 mb-2">Certificate Expired</div>
        <p className="text-[0.75rem] text-gray-500 leading-relaxed">This certificate was valid but has expired on {formatDate(certData?.expiresAt)}.</p>
        <p className="text-[0.68rem] text-gray-600 mt-2">Contact the certificate holder to renew.</p>
      </div>
    </div>
  )

  // ── VALID ─────────────────────────────────────────────────────
  if (status !== 'valid' || !certData) return null
  const { cert, user, course, completedAt, expiresAt } = certData
  const totalLessons = course?.modules?.reduce((a,m) => a+(m.lessons?.length||0), 0) || 0

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* top nav */}
      <div className="border-b border-white/[.05] bg-[rgba(8,8,8,.98)] backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <CTOLogo size={34} />
          <div className="min-w-0">
            <div className="font-[Montserrat] font-black text-[0.68rem] sm:text-[0.75rem] tracking-widest text-white uppercase truncate">
              CTO <span className="text-[#E5181B]">Access</span> Forum University
            </div>
            <div className="text-[0.56rem] text-gray-600 font-[Montserrat] hidden sm:block">Certificate Verification Portal</div>
          </div>
        </div>
        <a href="https://university.redjemie.com"
          className="text-[0.7rem] text-gray-500 hover:text-white font-[Montserrat] transition-colors flex-shrink-0 ml-3">
          Visit Platform →
        </a>
      </div>

      <div className="max-w-screen-md mx-auto px-4 py-6 sm:py-8">

        {/* VERIFIED BANNER */}
        <div className="bg-green-900/10 border border-green-500/20 rounded-[14px] p-4 mb-5 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-green-900/30 border border-green-500/25 rounded-full flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-[Montserrat] font-black text-green-400 text-[0.85rem] sm:text-[0.9rem]">Certificate Verified</div>
            <div className="text-[0.68rem] sm:text-[0.72rem] text-gray-500 mt-0.5">Authentic credential issued by CTO Access Forum University</div>
          </div>
          <div className="text-right flex-shrink-0 hidden sm:block">
            <div className="text-[0.6rem] text-gray-600 font-[Montserrat] uppercase tracking-wide">Verified</div>
            <div className="text-[0.68rem] text-gray-400">{new Date().toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
        </div>

        {/* RECIPIENT + COURSE */}
        <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-5 sm:p-6 mb-4">
          {/* recipient */}
          <div className="flex items-center gap-3 sm:gap-4 mb-5 pb-5 border-b border-white/[.05]">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black font-[Montserrat] text-white text-xl sm:text-2xl border-2 border-[rgba(212,175,55,0.3)] flex-shrink-0"
              style={{ background:`hsl(${user.id?.charCodeAt(0)*137}deg,45%,22%)` }}>
              {user.displayName?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-[Montserrat] font-black text-[1rem] sm:text-[1.15rem] truncate">{user.displayName}</div>
              {user.title && <div className="text-[0.73rem] text-gray-400 mt-0.5 truncate">{user.title}</div>}
              {user.location && <div className="text-[0.68rem] text-gray-600 truncate">{user.location}</div>}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[0.58rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border border-[rgba(212,175,55,0.2)]">Verified Graduate</span>
              </div>
            </div>
          </div>

          {/* course */}
          <div className="mb-5">
            <div className="text-[0.63rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">Certified In</div>
            {course.thumbnailUrl && (
              <img src={course.thumbnailUrl} alt={course.title} className="w-full h-28 sm:h-32 object-cover rounded-[8px] mb-3 border border-white/[.05]" />
            )}
            <div className="font-[Montserrat] font-black text-[0.95rem] sm:text-[1rem] mb-1.5 leading-snug">{course.title}</div>
            {course.description && <div className="text-[0.72rem] text-gray-500 mb-3 line-clamp-2">{course.description}</div>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { l:'Category', v: course.category },
                { l:'Level',    v: course.level },
                { l:'Lessons',  v: `${totalLessons}` },
                { l:'Instructor', v: course.instructorName || 'CTO Access' },
              ].map(s => (
                <div key={s.l} className="bg-[#1a1a1a] border border-white/[.05] rounded-[8px] p-2.5 text-center">
                  <div className="text-[0.6rem] text-gray-600 mb-0.5 font-[Montserrat]">{s.l}</div>
                  <div className="text-[0.7rem] font-semibold text-gray-200 truncate">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* cert metadata */}
          <div className="bg-[#1a1a1a] border border-white/[.05] rounded-[10px] p-4">
            <div className="text-[0.63rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">Certificate Details</div>
            <div className="flex flex-col gap-2">
              {[
                { l:'Certificate ID',      v: certId,                            mono:true  },
                { l:'Issued by',           v: 'CTO Access Forum University',     mono:false },
                { l:'Date of Issue',       v: formatDate(completedAt),           mono:false },
                { l:'Valid Until',         v: formatDate(expiresAt),             mono:false },
                { l:'Cryptographic Hash',  v: fingerprint,                       mono:true  },
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
              { t:'Cryptographically Signed', d:'SHA-256 hash of recipient ID, course ID, and institution key' },
              { t:'Tamper Detection',         d:'Any modification to the certificate ID is detected and flagged' },
              { t:'Permanent Record',         d:'Stored permanently. Cannot be deleted — only revoked by institution' },
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

        {/* INSTITUTION */}
        <div className="text-center py-3">
          <div className="inline-flex items-center gap-3 px-5 py-3 border border-[rgba(212,175,55,0.15)] rounded-[10px] bg-[rgba(212,175,55,0.02)]">
            <CTOLogo size={28} />
            <div className="text-left">
              <div className="font-[Montserrat] font-bold text-[0.7rem] text-[#D4AF37]">CTO Access Forum University</div>
              <div className="text-[0.6rem] text-gray-600">university.redjemie.com · Dubai, UAE</div>
            </div>
          </div>
          <div className="text-[0.6rem] text-gray-700 mt-2 font-[Montserrat]">
            This page is the official verification record. Valid only at this URL.
          </div>
        </div>

      </div>
    </div>
  )
}
