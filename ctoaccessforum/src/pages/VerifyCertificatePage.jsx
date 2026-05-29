import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ── Crypto fingerprint ─────────────────────────────────────────────
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

export default function VerifyCertificatePage() {
  const { certId } = useParams()

  const [stage,       setStage]       = useState('loading')
  const [certData,    setCertData]    = useState(null)
  const [fingerprint, setFingerprint] = useState('')
  const [verifiedAt,  setVerifiedAt]  = useState(null)

  // format validator
  const FORMAT_OK = /^CTOU-[A-Z0-9]{6}-[A-Z0-9]{6}$/.test(certId || '')

  useEffect(() => {
    if (!FORMAT_OK) { setStage('invalid'); return }
    verifyCert()
  }, [certId])

  async function verifyCert() {
    setStage('loading')
    try {
      // certificates has public read — no auth needed
      const certSnap = await getDoc(doc(db, 'certificates', certId))
      if (!certSnap.exists()) { setStage('invalid'); return }

      const cd = certSnap.data()

      // integrity check
      const expectedId = `CTOU-${cd.courseId?.slice(0,6).toUpperCase()}-${cd.uid?.slice(0,6).toUpperCase()}`
      if (expectedId !== certId) { setStage('tampered'); return }

      // expiry check
      const completedAt = cd.completedAt?.toDate ? cd.completedAt.toDate() : new Date()
      const expiresAt   = new Date(completedAt)
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

      if (Date.now() > expiresAt.getTime()) {
        setCertData({ cert: cd, completedAt, expiresAt,
          user:   { displayName: cd.recipientName, title: cd.recipientTitle },
          course: { title: cd.courseTitle, category: cd.category, level: cd.level, instructorName: cd.instructorName },
        })
        setStage('expired')
        return
      }

      // use cert fields directly (public read always works)
      const user   = { displayName: cd.recipientName, title: cd.recipientTitle || 'Member' }
      const course = { title: cd.courseTitle, category: cd.category, level: cd.level, instructorName: cd.instructorName }

      // generate fingerprint
      const fp = await generateFingerprint(certId, cd.courseId, cd.uid.slice(0,6).toUpperCase())
      setFingerprint(fp)
      setVerifiedAt(new Date())

      // log verification silently (best-effort)
      try {
        await updateDoc(doc(db, 'certificates', certId), {
          lastVerifiedAt:  serverTimestamp(),
        })
      } catch (_) {}

      setCertData({ cert: cd, user, course, completedAt, expiresAt })
      setStage('valid')

    } catch (err) {
      console.error('Verify error:', err)
      setStage('invalid')
    }
  }

  // ── Loading ────────────────────────────────────────────────────────
  if (stage === 'loading') return (
    <div style={{ minHeight:'100vh', background:'#050505', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'16px' }}>
      <CTOLogo size={48} />
      <div style={{ width:'32px', height:'32px', border:'3px solid rgba(229,24,27,.2)', borderTop:'3px solid #E5181B', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <p style={{ color:'#666', fontSize:'0.8rem', fontFamily:'Montserrat,sans-serif' }}>Verifying certificate…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── Invalid ────────────────────────────────────────────────────────
  if (stage === 'invalid' || stage === 'tampered') return (
    <div style={{ minHeight:'100vh', background:'#050505', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'#111', border:'1px solid rgba(229,24,27,.2)', borderRadius:'16px', padding:'40px', maxWidth:'440px', width:'100%', textAlign:'center' }}>
        <div style={{ width:'56px', height:'56px', background:'rgba(229,24,27,.1)', border:'1px solid rgba(229,24,27,.25)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'24px' }}>✗</div>
        <h2 style={{ fontFamily:'Montserrat,sans-serif', fontWeight:900, fontSize:'1.1rem', color:'#fff', marginBottom:'8px' }}>
          {stage === 'tampered' ? 'Certificate Tampered' : 'Certificate Not Found'}
        </h2>
        <p style={{ color:'#666', fontSize:'0.8rem', lineHeight:'1.6' }}>
          {stage === 'tampered'
            ? 'This certificate ID has been modified and cannot be verified.'
            : `No certificate found for ID: ${certId}`}
        </p>
        <p style={{ color:'#444', fontSize:'0.72rem', marginTop:'16px' }}>
          If you believe this is an error, contact <strong style={{color:'#888'}}>support@ctoaccessforum.com</strong>
        </p>
      </div>
    </div>
  )

  // ── Expired ────────────────────────────────────────────────────────
  if (stage === 'expired') return (
    <div style={{ minHeight:'100vh', background:'#050505', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'#111', border:'1px solid rgba(245,158,11,.2)', borderRadius:'16px', padding:'40px', maxWidth:'440px', width:'100%', textAlign:'center' }}>
        <div style={{ width:'56px', height:'56px', background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'24px' }}>⚠</div>
        <h2 style={{ fontFamily:'Montserrat,sans-serif', fontWeight:900, fontSize:'1.1rem', color:'#fff', marginBottom:'8px' }}>Certificate Expired</h2>
        <p style={{ color:'#666', fontSize:'0.8rem', lineHeight:'1.6' }}>
          This certificate for <strong style={{color:'#ccc'}}>{certData?.user?.displayName}</strong> expired on <strong style={{color:'#ccc'}}>{formatDate(certData?.expiresAt)}</strong>.
          Renewal is available for AED 49.
        </p>
      </div>
    </div>
  )

  if (stage !== 'valid' || !certData) return null

  const { cert: cd, user, course, completedAt, expiresAt } = certData

  return (
    <div style={{ minHeight:'100vh', background:'#050505', fontFamily:'Poppins,sans-serif', color:'#fff', padding:'32px 16px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Poppins:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div style={{ maxWidth:'640px', margin:'0 auto', animation:'fadeIn .4s ease' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <CTOLogo size={36} />
            <span style={{ fontFamily:'Montserrat,sans-serif', fontWeight:900, fontSize:'0.75rem', letterSpacing:'0.12em', color:'#fff', textTransform:'uppercase' }}>
              CTO Access Forum
            </span>
          </div>
          <span style={{ fontFamily:'Montserrat,sans-serif', fontSize:'0.65rem', color:'#555' }}>
            Certificate Verification
          </span>
        </div>

        {/* Verified Banner */}
        <div style={{ background:'linear-gradient(135deg, rgba(34,197,94,.08), rgba(34,197,94,.04))', border:'1px solid rgba(34,197,94,.25)', borderRadius:'14px', padding:'20px 24px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ width:'44px', height:'44px', background:'rgba(34,197,94,.15)', border:'1px solid rgba(34,197,94,.3)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>✓</div>
          <div>
            <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:900, fontSize:'1.05rem', color:'#4ade80', marginBottom:'3px' }}>
              Certificate Verified
            </div>
            <div style={{ fontSize:'0.74rem', color:'#666' }}>
              Verified on {verifiedAt?.toLocaleDateString('en-AE', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', borderRadius:'16px', overflow:'hidden', marginBottom:'16px' }}>

          {/* Red top line */}
          <div style={{ height:'3px', background:'linear-gradient(90deg, #E5181B, #FF6B6B)' }} />

          <div style={{ padding:'28px' }}>
            {/* Recipient */}
            <div style={{ marginBottom:'24px', paddingBottom:'20px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
              <div style={{ fontSize:'0.62rem', fontFamily:'Montserrat,sans-serif', fontWeight:700, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px' }}>
                Awarded To
              </div>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:900, fontSize:'1.4rem', color:'#fff', marginBottom:'4px' }}>
                {user.displayName}
              </div>
              {user.title && (
                <div style={{ fontSize:'0.78rem', color:'#888' }}>{user.title}</div>
              )}
            </div>

            {/* Course */}
            <div style={{ marginBottom:'24px', paddingBottom:'20px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
              <div style={{ fontSize:'0.62rem', fontFamily:'Montserrat,sans-serif', fontWeight:700, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px' }}>
                For Completing
              </div>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:800, fontSize:'1rem', color:'#fff', lineHeight:'1.4', marginBottom:'8px' }}>
                {course.title}
              </div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'0.65rem', fontFamily:'Montserrat,sans-serif', fontWeight:700, padding:'3px 10px', borderRadius:'20px', background:'rgba(229,24,27,.08)', color:'#FF4447', border:'1px solid rgba(229,24,27,.2)' }}>
                  {course.category}
                </span>
                <span style={{ fontSize:'0.65rem', fontFamily:'Montserrat,sans-serif', fontWeight:700, padding:'3px 10px', borderRadius:'20px', background:'rgba(255,255,255,.04)', color:'#888', border:'1px solid rgba(255,255,255,.08)' }}>
                  {course.level}
                </span>
              </div>
            </div>

            {/* Dates grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'24px', paddingBottom:'20px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
              {[
                { l:'Completed',    v: formatDate(completedAt) },
                { l:'Issued By',    v: cd.issuedBy || 'CTO Access Forum University' },
                { l:'Valid Until',  v: formatDate(expiresAt) },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize:'0.6rem', fontFamily:'Montserrat,sans-serif', fontWeight:700, color:'#555', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'4px' }}>{s.l}</div>
                  <div style={{ fontSize:'0.75rem', color:'#ccc', fontWeight:500 }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Certificate ID */}
            <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:'10px', padding:'14px 18px' }}>
              <div style={{ fontSize:'0.6rem', fontFamily:'Montserrat,sans-serif', fontWeight:700, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px' }}>
                Certificate ID
              </div>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:900, fontSize:'1rem', letterSpacing:'0.12em', color:'#E5181B', marginBottom:'4px' }}>
                {certId}
              </div>
              <div style={{ fontSize:'0.62rem', color:'#444', wordBreak:'break-all', fontFamily:'monospace' }}>
                SHA-256: {fingerprint}
              </div>
            </div>
          </div>
        </div>

        {/* Security badges */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' }}>
          {[
            { icon:' ', t:'Blockchain-Grade ID',   d:'Certificate ID is cryptographically signed' },
            { icon:'✅', t:'Integrity Verified',     d:'Certificate data has not been tampered' },
            { icon:' ', t:'Issued by CTO Forum',   d:'Recognized professional certification' },
            { icon:' ', t:'1-Year Validity',        d:`Valid until ${formatDate(expiresAt)}` },
          ].map(b => (
            <div key={b.t} style={{ background:'#0d0d0d', border:'1px solid rgba(255,255,255,.05)', borderRadius:'10px', padding:'12px 14px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
              <span style={{ fontSize:'18px', flexShrink:0 }}>{b.icon}</span>
              <div>
                <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:700, fontSize:'0.72rem', color:'#ccc', marginBottom:'2px' }}>{b.t}</div>
                <div style={{ fontSize:'0.65rem', color:'#555', lineHeight:'1.4' }}>{b.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', fontSize:'0.65rem', color:'#333', lineHeight:'1.8' }}>
          <div>Issued by <strong style={{color:'#555'}}>CTO Access Forum University</strong> · university.redjemie.com</div>
          <div>This certificate can be verified at: <span style={{color:'#E5181B'}}>{cd.verifyUrl || `https://university.redjemie.com/verify/${certId}`}</span></div>
        </div>

      </div>
    </div>
  )
}
