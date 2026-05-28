import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

// ── CTO Access Forum Logo SVG (inline — no external dependency) ───
function CTOLogo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g1" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FF6B6B"/>
          <stop offset="50%" stopColor="#E5181B"/>
          <stop offset="100%" stopColor="#8B0000"/>
        </radialGradient>
        <radialGradient id="g2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8A8A" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#C01215" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* main sphere */}
      <circle cx="100" cy="105" r="85" fill="url(#g1)"/>
      {/* gear teeth top */}
      <rect x="88" y="18" width="10" height="14" rx="2" fill="#FF4444"/>
      <rect x="102" y="16" width="10" height="14" rx="2" fill="#E5181B"/>
      <rect x="116" y="20" width="10" height="14" rx="2" fill="#CC1010"/>
      <rect x="74" y="22" width="10" height="14" rx="2" fill="#FF5555"/>
      {/* swirl 1 — light */}
      <path d="M40 75 Q70 45 120 60 Q155 72 160 100 Q165 128 140 145" stroke="rgba(255,200,200,0.7)" strokeWidth="12" fill="none" strokeLinecap="round"/>
      {/* swirl 2 — lighter */}
      <path d="M50 90 Q80 58 130 72 Q162 85 165 112" stroke="rgba(255,220,220,0.5)" strokeWidth="8" fill="none" strokeLinecap="round"/>
      {/* dark layer bottom right */}
      <path d="M115 75 Q155 90 168 125 Q178 155 155 175 Q130 192 100 188 Q68 185 48 165 Q28 145 30 118 Q32 95 55 82" fill="rgba(120,0,0,0.35)"/>
      {/* shine */}
      <ellipse cx="75" cy="72" rx="22" ry="14" fill="rgba(255,255,255,0.12)" transform="rotate(-25 75 72)"/>
    </svg>
  )
}

export default function CertificatePage() {
  const { courseId }  = useParams()
  const nav           = useNavigate()
  const { profile }   = useAuth()
  const certRef       = useRef(null)
  const [course,     setCourse]     = useState(null)
  const [progress,   setProgress]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!courseId || !profile?.uid) return
    Promise.all([
      getDoc(doc(db, 'courses', courseId)),
      getDoc(doc(db, 'users', profile.uid, 'progress', courseId)),
    ]).then(([courseSnap, progressSnap]) => {
      if (courseSnap.exists()) setCourse({ id: courseSnap.id, ...courseSnap.data() })
      if (progressSnap.exists()) setProgress(progressSnap.data())
      setLoading(false)
    })
  }, [courseId, profile?.uid])

  const completedAt  = progress?.completedAt?.toDate?.() || new Date()
  const expiresAt    = new Date(completedAt); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  const dateStr      = completedAt.toLocaleDateString('en-AE', { year:'numeric', month:'long', day:'numeric' })
  const expiryStr    = expiresAt.toLocaleDateString('en-AE', { year:'numeric', month:'long', day:'numeric' })
  const certId       = `CTOU-${courseId?.slice(0,6).toUpperCase()}-${profile?.uid?.slice(0,6).toUpperCase()}`
  const verifyUrl    = `https://university.redjemie.com/verify/${certId}`
  const totalLessons = course?.modules?.reduce((a,m) => a + (m.lessons?.length||0), 0) || 0
  const totalMinutes = course?.modules?.reduce((a,m) => a + (m.lessons||[]).reduce((b,l) => b + (Number(l.duration)||0), 0), 0) || 0
  const durationStr  = totalMinutes >= 60 ? `${Math.round(totalMinutes/60)} Hours` : `${totalLessons} Lessons`
  const isComplete   = (progress?.completedLessons?.length||0) >= totalLessons && totalLessons > 0

  async function downloadPDF() {
    setGenerating(true)
    try {
      await Promise.all([
        new Promise(r => { const s = document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload=r; document.head.appendChild(s) }),
        new Promise(r => { const s = document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; s.onload=r; document.head.appendChild(s) }),
      ])
      await new Promise(r => setTimeout(r, 600))
      const canvas  = await window.html2canvas(certRef.current, { scale:3, useCORS:true, allowTaint:true, backgroundColor:'#0f0a06' })
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight())
      pdf.save(`CTOU-Certificate-${profile?.displayName?.replace(/\s+/g,'-')}.pdf`)
      toast.success('Certificate downloaded!')
    } catch { window.print() }
    finally { setGenerating(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )
  if (!course) return <div className="text-center py-24 text-gray-500">Course not found.</div>

  return (
    <div className="max-w-screen-lg mx-auto">
      {/* action bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <button onClick={() => nav(`/courses/${courseId}`)}
          className="text-[0.73rem] text-gray-500 hover:text-white transition-colors font-[Montserrat]">
          ← Back to Course
        </button>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => nav('/my-certificates')}
            className="px-4 py-2 bg-white/[.04] border border-white/[.08] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] hover:bg-white/[.07] transition-colors">
            My Certificates
          </button>
          <button onClick={downloadPDF} disabled={generating || !isComplete}
            className="px-5 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] disabled:opacity-50 transition-colors flex items-center gap-2">
            {generating ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Generating…</span></> : 'Download PDF'}
          </button>
        </div>
      </div>

      {!isComplete && (
        <div className="bg-amber-900/10 border border-amber-500/20 rounded-[12px] p-4 mb-5 text-center">
          <p className="text-[0.78rem] text-amber-300 font-[Montserrat] font-bold mb-1">Course Not Yet Complete</p>
          <p className="text-[0.72rem] text-gray-500 mb-2">Complete all {totalLessons} lessons to unlock your certificate.</p>
          <button onClick={() => nav(`/courses/${courseId}`)} className="px-4 py-1.5 bg-amber-900/20 border border-amber-500/20 text-amber-300 text-[0.72rem] font-bold font-[Montserrat] rounded-[6px]">Continue Learning</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          CERTIFICATE
      ════════════════════════════════════════════════════════ */}
      <div ref={certRef} style={{
        background: 'linear-gradient(160deg, #0f0a06 0%, #180d08 35%, #0f0a06 65%, #12070a 100%)',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: '16px',
        aspectRatio: '1.414/1',
        maxWidth: '860px',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>

        {/* decorative borders */}
        <div style={{ position:'absolute', inset:'10px', border:'0.5px solid rgba(212,175,55,0.2)', borderRadius:'10px', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:'15px', border:'0.5px solid rgba(212,175,55,0.07)', borderRadius:'8px', pointerEvents:'none' }} />

        {/* gold top + bottom bars */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'4px', background:'linear-gradient(90deg,transparent,#D4AF37,#F5D87A,#D4AF37,transparent)', borderRadius:'16px 16px 0 0' }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.35),transparent)' }} />

        {/* corner ornaments */}
        {[{t:'20px',l:'20px',bT:'1.5px solid rgba(212,175,55,0.45)',bL:'1.5px solid rgba(212,175,55,0.45)'},
          {t:'20px',r:'20px',bT:'1.5px solid rgba(212,175,55,0.45)',bR:'1.5px solid rgba(212,175,55,0.45)'},
          {b:'20px',l:'20px',bB:'1.5px solid rgba(212,175,55,0.45)',bL:'1.5px solid rgba(212,175,55,0.45)'},
          {b:'20px',r:'20px',bB:'1.5px solid rgba(212,175,55,0.45)',bR:'1.5px solid rgba(212,175,55,0.45)'},
        ].map(({t,b,l,r,bT,bB,bL,bR},i) => (
          <div key={i} style={{ position:'absolute', width:'30px', height:'30px', top:t, bottom:b, left:l, right:r, borderTop:bT, borderBottom:bB, borderLeft:bL, borderRight:bR, pointerEvents:'none' }} />
        ))}

        {/* background glow spots */}
        <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'220px', height:'220px', borderRadius:'50%', background:'radial-gradient(circle,rgba(212,175,55,0.05) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-60px', left:'-60px', width:'220px', height:'220px', borderRadius:'50%', background:'radial-gradient(circle,rgba(229,24,27,0.05) 0%,transparent 70%)', pointerEvents:'none' }} />

        {/* watermark */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', overflow:'hidden' }}>
          <div style={{ fontSize:'110px', fontWeight:'900', color:'rgba(212,175,55,0.022)', letterSpacing:'-2px', userSelect:'none', fontFamily:'Georgia,serif', transform:'rotate(-12deg)', whiteSpace:'nowrap' }}>
            CERTIFIED
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ position:'relative', zIndex:1, height:'100%', display:'flex', flexDirection:'column', padding:'26px 50px 20px' }}>

          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
            {/* logo + name */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <CTOLogo size={46} />
              <div>
                <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:'900', fontSize:'11px', letterSpacing:'3px', color:'#D4AF37', textTransform:'uppercase', lineHeight:'1.2' }}>
                  CTO Access Forum
                </div>
                <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:'700', fontSize:'9px', letterSpacing:'2px', color:'rgba(212,175,55,0.5)', textTransform:'uppercase' }}>
                  University
                </div>
                <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7px', letterSpacing:'1px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase', marginTop:'1px' }}>
                  university.redjemie.com · Dubai, UAE
                </div>
              </div>
            </div>
            {/* cert ref right */}
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7px', letterSpacing:'2px', color:'rgba(212,175,55,0.5)', textTransform:'uppercase', marginBottom:'2px' }}>
                Official Academic Credential
              </div>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7px', color:'rgba(255,255,255,0.2)', letterSpacing:'0.5px', fontStyle:'normal' }}>
                Ref: {certId}
              </div>
            </div>
          </div>

          {/* gold rule */}
          <div style={{ height:'0.5px', background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.5),rgba(212,175,55,0.7),rgba(212,175,55,0.5),transparent)', marginBottom:'16px' }} />

          {/* BODY */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>

            <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:'300', fontSize:'8.5px', letterSpacing:'5px', color:'rgba(212,175,55,0.65)', textTransform:'uppercase', marginBottom:'5px' }}>
              Certificate of Achievement
            </div>
            <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7.5px', letterSpacing:'3px', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', marginBottom:'10px' }}>
              This is to proudly certify that
            </div>

            {/* RECIPIENT */}
            <div style={{ fontFamily:'Georgia,"Palatino Linotype",serif', fontSize:'38px', color:'#FFFFFF', letterSpacing:'1.5px', marginBottom:'2px', lineHeight:'1', textShadow:'0 2px 30px rgba(212,175,55,0.08)' }}>
              {profile?.displayName}
            </div>
            {profile?.title && (
              <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'11px', color:'rgba(212,175,55,0.45)', marginBottom:'4px' }}>{profile.title}</div>
            )}

            {/* ornamental divider */}
            <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:'9px 0' }}>
              <div style={{ width:'80px', height:'0.5px', background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.35))' }} />
              <div style={{ width:'4px', height:'4px', background:'rgba(212,175,55,0.45)', transform:'rotate(45deg)' }} />
              <div style={{ width:'4px', height:'4px', background:'rgba(229,24,27,0.5)', transform:'rotate(45deg)' }} />
              <div style={{ width:'4px', height:'4px', background:'rgba(212,175,55,0.45)', transform:'rotate(45deg)' }} />
              <div style={{ width:'80px', height:'0.5px', background:'linear-gradient(90deg,rgba(212,175,55,0.35),transparent)' }} />
            </div>

            <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7.5px', letterSpacing:'2.5px', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', marginBottom:'9px' }}>
              has successfully demonstrated mastery and completed
            </div>

            {/* COURSE TITLE */}
            <div style={{ fontFamily:'Georgia,"Palatino Linotype",serif', fontSize:'19px', color:'rgba(255,255,255,0.93)', maxWidth:'560px', lineHeight:'1.35', marginBottom:'9px' }}>
              {course?.title}
            </div>

            {/* meta pills */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
              {[course?.category, course?.level, durationStr].filter(Boolean).map((item, i, arr) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  {i > 0 && <div style={{ width:'2px', height:'2px', borderRadius:'50%', background:'rgba(212,175,55,0.4)' }} />}
                  <span style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7.5px', letterSpacing:'2px', color:'rgba(212,175,55,0.5)', textTransform:'uppercase' }}>{item}</span>
                </div>
              ))}
            </div>

            {/* formal statement */}
            <div style={{ maxWidth:'520px', padding:'8px 18px', border:'0.5px solid rgba(212,175,55,0.1)', borderRadius:'3px', background:'rgba(212,175,55,0.018)' }}>
              <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'9px', color:'rgba(255,255,255,0.28)', lineHeight:'1.7', textAlign:'center' }}>
                "Having fulfilled all academic and professional requirements, demonstrated proficiency in the subject matter,
                and upheld the standards of excellence established by CTO Access Forum University"
              </div>
            </div>
          </div>

          {/* gold rule */}
          <div style={{ height:'0.5px', background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.3),rgba(212,175,55,0.5),rgba(212,175,55,0.3),transparent)', margin:'13px 0 11px' }} />

          {/* FOOTER */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'20px', alignItems:'flex-end', marginBottom:'10px' }}>
            {/* instructor */}
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'12px', color:'rgba(212,175,55,0.45)', letterSpacing:'0.5px', marginBottom:'5px' }}>
                {course?.instructorName || 'CTO Access Forum'}
              </div>
              <div style={{ height:'0.5px', background:'rgba(212,175,55,0.2)', marginBottom:'5px' }} />
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7px', letterSpacing:'2px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase' }}>Course Instructor</div>
            </div>

            {/* seal */}
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ width:'68px', height:'68px', position:'relative', margin:'0 auto' }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1.5px solid rgba(212,175,55,0.4)' }} />
                <div style={{ position:'absolute', inset:'5px', borderRadius:'50%', border:'0.5px solid rgba(212,175,55,0.15)' }} />
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px' }}>
                  <CTOLogo size={28} />
                  <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'5px', color:'rgba(212,175,55,0.35)', letterSpacing:'1px', textTransform:'uppercase' }}>VERIFIED</div>
                </div>
              </div>
            </div>

            {/* signatory */}
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'12px', color:'rgba(212,175,55,0.45)', letterSpacing:'0.5px', marginBottom:'5px' }}>
                Admin RD, CTO Access Forum
              </div>
              <div style={{ height:'0.5px', background:'rgba(212,175,55,0.2)', marginBottom:'5px' }} />
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7px', letterSpacing:'2px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase' }}>Authorized Signatory</div>
            </div>
          </div>

          {/* BOTTOM BAR */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'8px', borderTop:'0.5px solid rgba(255,255,255,0.04)' }}>
            {/* verify */}
            <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
              <div style={{ width:'24px', height:'24px', border:'0.5px solid rgba(212,175,55,0.2)', borderRadius:'3px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1px', padding:'4px', background:'rgba(212,175,55,0.02)', flexShrink:0 }}>
                {[1,1,1,1,0,1,1,1,1].map((v,i) => <div key={i} style={{ background:v?'rgba(212,175,55,0.45)':'transparent', borderRadius:'0.5px' }} />)}
              </div>
              <div>
                <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'6px', color:'rgba(212,175,55,0.4)', letterSpacing:'1px', textTransform:'uppercase' }}>Verify online</div>
                <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'6.5px', color:'rgba(255,255,255,0.25)' }}>university.redjemie.com/verify/{certId}</div>
              </div>
            </div>

            {/* partners */}
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'5.5px', color:'rgba(255,255,255,0.12)', letterSpacing:'1.5px', textTransform:'uppercase' }}>Recognized by</div>
              {['UAECSC','DDA','GITLF'].map(p => (
                <div key={p} style={{ padding:'2px 7px', border:'0.5px solid rgba(212,175,55,0.15)', borderRadius:'3px', background:'rgba(212,175,55,0.02)' }}>
                  <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:'700', fontSize:'6.5px', color:'rgba(212,175,55,0.3)', letterSpacing:'0.5px' }}>{p}</div>
                </div>
              ))}
            </div>

            {/* validity */}
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'6px', color:'rgba(255,255,255,0.15)', letterSpacing:'1px', textTransform:'uppercase' }}>Valid until {expiryStr}</div>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'6px', color:'rgba(212,175,55,0.25)' }}>No. {certId}</div>
            </div>
          </div>

        </div>
      </div>

      {/* SHARE PANEL */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Certificate ID',  value: <span className="font-mono text-[0.62rem] text-[#D4AF37] break-all">{certId}</span> },
          { label:'Issued',          value: <span className="text-[0.68rem] text-gray-400">{dateStr}</span> },
          { label:'LinkedIn',        value: <a href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(course?.title||'')}&organizationName=CTO+Access+Forum+University&issueYear=${completedAt.getFullYear()}&issueMonth=${completedAt.getMonth()+1}&expirationYear=${expiresAt.getFullYear()}&expirationMonth=${expiresAt.getMonth()+1}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${certId}`} target="_blank" rel="noopener noreferrer" className="text-[0.7rem] text-blue-400 hover:underline font-[Montserrat] font-bold">Add to LinkedIn →</a> },
          { label:'Verify Link',     value: <button onClick={() => { navigator.clipboard?.writeText(verifyUrl); toast.success('Copied!') }} className="text-[0.7rem] text-[#E5181B] hover:underline font-[Montserrat] font-bold">Copy Link</button> },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 text-center">
            <div className="font-[Montserrat] font-bold text-[0.72rem] text-gray-500 mb-1">{s.label}</div>
            {s.value}
          </div>
        ))}
      </div>

      {/* credibility note */}
      <div className="mt-3 bg-[#0d0d0d] border border-white/[.04] rounded-[10px] p-4">
        <div className="text-[0.67rem] font-bold tracking-[.08em] uppercase text-gray-600 font-[Montserrat] mb-2">This Certificate Represents</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { t:'Cryptographically Verified', d:'Unique SHA-256 signed ID — tamper detection built in. Any modification immediately invalidates the certificate.' },
            { t:'Publicly Verifiable',        d:'Anyone can verify this credential at university.redjemie.com/verify — employers, clients, LinkedIn connections.' },
            { t:'Industry Relevant',          d:'Curriculum built for UAE and GCC IT leaders. Recognized across the regional tech and digital transformation community.' },
          ].map(c => (
            <div key={c.t}>
              <div className="font-[Montserrat] font-bold text-[0.74rem] text-[#D4AF37] mb-1">{c.t}</div>
              <p className="text-[0.68rem] text-gray-600 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
