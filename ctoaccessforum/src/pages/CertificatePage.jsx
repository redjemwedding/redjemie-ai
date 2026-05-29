import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

function CTOLogo({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cg1" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FF6B6B"/>
          <stop offset="50%" stopColor="#E5181B"/>
          <stop offset="100%" stopColor="#8B0000"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="105" r="85" fill="url(#cg1)"/>
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

export default function CertificatePage() {
  const { courseId }   = useParams()
  const nav            = useNavigate()
  const { profile, isAdmin } = useAuth()
  const certRef        = useRef(null)
  const [course,      setCourse]     = useState(null)
  const [progress,    setProgress]   = useState(null)
  const [loading,     setLoading]    = useState(true)
  const [generating,  setGenerating] = useState(false)
  const [regStatus,   setRegStatus]  = useState('idle') // idle|registering|done|error
  const [regError,    setRegError]   = useState('')

  useEffect(() => {
    if (!courseId || !profile?.uid) return
    Promise.all([
      getDoc(doc(db, 'courses', courseId)),
      getDoc(doc(db, 'users', profile.uid, 'progress', courseId)),
    ]).then(async ([courseSnap, progressSnap]) => {
      const courseData   = courseSnap.exists()   ? { id: courseSnap.id,   ...courseSnap.data()   } : null
      const progressData = progressSnap.exists() ? progressSnap.data() : null
      setCourse(courseData)
      setProgress(progressData)
      setLoading(false)
      // auto-register
      if (courseData && profile?.uid) {
        await forceRegister(courseData, progressData, profile)
      }
    }).catch(e => { console.error(e); setLoading(false) })
  }, [courseId, profile?.uid])

  async function forceRegister(courseData, progressData, profileData) {
    const cId = `CTOU-${courseId.slice(0,6).toUpperCase()}-${profileData.uid.slice(0,6).toUpperCase()}`
    setRegStatus('registering')
    setRegError('')
    try {
      await setDoc(doc(db, 'certificates', cId), {
        certId:         cId,
        uid:            profileData.uid,
        courseId,
        courseTitle:    courseData?.title          || '',
        category:       courseData?.category       || '',
        level:          courseData?.level          || '',
        instructorName: courseData?.instructorName || 'CTO Access Forum',
        recipientName:  profileData.displayName    || '',
        recipientTitle: profileData.title          || '',
        completedAt:    progressData?.completedAt  || serverTimestamp(),
        issuedBy:       'CTO Access Forum University',
        verifyUrl:      `https://university.redjemie.com/verify/${cId}`,
        updatedAt:      serverTimestamp(),
      }, { merge: true })
      setRegStatus('done')
    } catch (e) {
      console.error('Cert registration error:', e)
      setRegError(e.message)
      setRegStatus('error')
    }
  }

  const completedAt  = progress?.completedAt?.toDate?.() || new Date()
  const expiresAt    = new Date(completedAt); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  const dateStr      = completedAt.toLocaleDateString('en-AE', { year:'numeric', month:'long', day:'numeric' })
  const expiryStr    = expiresAt.toLocaleDateString('en-AE', { year:'numeric', month:'long', day:'numeric' })
  const certId       = `CTOU-${courseId?.slice(0,6).toUpperCase()}-${profile?.uid?.slice(0,6).toUpperCase()}`
  const verifyUrl    = `https://university.redjemie.com/verify/${certId}`
  const totalLessons = course?.modules?.reduce((a,m) => a+(m.lessons?.length||0), 0) || 0
  const totalMin     = course?.modules?.reduce((a,m) => a+(m.lessons||[]).reduce((b,l) => b+(Number(l.duration)||0),0),0) || 0
  const durationStr  = totalMin >= 60 ? `${Math.round(totalMin/60)} Hours of Learning` : `${totalLessons} Lessons Completed`
  const isComplete   = isAdmin || (progress?.completedLessons?.length||0) >= totalLessons && totalLessons > 0

  const linkedInUrl  = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(course?.title||'')}&organizationName=CTO+Access+Forum+University&issueYear=${completedAt.getFullYear()}&issueMonth=${completedAt.getMonth()+1}&expirationYear=${expiresAt.getFullYear()}&expirationMonth=${expiresAt.getMonth()+1}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${certId}`

  async function downloadPDF() {
    setGenerating(true)
    try {
      await Promise.all([
        new Promise(r => { const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload=r; document.head.appendChild(s) }),
        new Promise(r => { const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; s.onload=r; document.head.appendChild(s) }),
      ])
      await new Promise(r => setTimeout(r, 700))
      const canvas = await window.html2canvas(certRef.current, { scale:3, useCORS:true, backgroundColor:'#FFFFF8' })
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
    <div className="max-w-screen-lg mx-auto px-4">
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
            {generating ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Generating…</span></> : 'Download PDF'}
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

      {/* registration status bar */}
      <div className={`mb-4 px-4 py-2.5 rounded-[8px] flex items-center justify-between gap-3 text-[0.72rem] font-[Montserrat] ${
        regStatus === 'done'         ? 'bg-green-900/10 border border-green-500/20 text-green-400'
        : regStatus === 'error'      ? 'bg-red-900/10 border border-red-500/20 text-red-400'
        : regStatus === 'registering'? 'bg-amber-900/10 border border-amber-500/20 text-amber-400'
        : 'bg-white/[.02] border border-white/[.06] text-gray-500'}`}>
        <span>
          {regStatus === 'done'         && '✓ Certificate registered — verify link is active'}
          {regStatus === 'registering'  && '⟳ Registering certificate in system…'}
          {regStatus === 'error'        && `✗ Registration failed: ${regError}`}
          {regStatus === 'idle'         && 'Connecting to certificate registry…'}
        </span>
        {regStatus === 'error' && (
          <button onClick={() => forceRegister(course, progress, profile)}
            className="px-3 py-1 bg-red-900/20 border border-red-500/20 rounded-[6px] text-[0.68rem] font-bold hover:bg-red-900/30 transition-colors">
            Retry
          </button>
        )}
        {regStatus === 'done' && (
          <button onClick={() => { navigator.clipboard?.writeText(verifyUrl); toast.success('Copied!') }}
            className="px-3 py-1 bg-green-900/20 border border-green-500/20 rounded-[6px] text-[0.68rem] font-bold hover:bg-green-900/30 transition-colors whitespace-nowrap">
            Copy Verify Link
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          CERTIFICATE — CREAM / IVORY PROFESSIONAL DESIGN
      ════════════════════════════════════════════════════ */}
      <div ref={certRef} style={{
        background: 'linear-gradient(165deg, #FFFFF8 0%, #FAF8F0 40%, #FFFFF8 70%, #FAF5EE 100%)',
        border: '1px solid #C8B87A',
        borderRadius: '12px',
        aspectRatio: '1.414/1',
        maxWidth: '860px',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Georgia, "Times New Roman", serif',
        boxShadow: '0 4px 40px rgba(0,0,0,0.18)',
      }}>
        {/* outer gold border */}
        <div style={{ position:'absolute', inset:'8px', border:'1.5px solid #C8B87A', borderRadius:'8px', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:'12px', border:'0.5px solid rgba(180,150,60,0.3)', borderRadius:'6px', pointerEvents:'none' }} />
        {/* top bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'5px', background:'linear-gradient(90deg, #8B0000, #C01215, #E5181B, #C01215, #8B0000)', borderRadius:'12px 12px 0 0' }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'3px', background:'linear-gradient(90deg, #8B0000, #C01215, #8B0000)', borderRadius:'0 0 12px 12px' }} />
        {/* corners */}
        {[
          { top:'16px', left:'16px',   borderTop:'2px solid #8B7340', borderLeft:'2px solid #8B7340' },
          { top:'16px', right:'16px',  borderTop:'2px solid #8B7340', borderRight:'2px solid #8B7340' },
          { bottom:'16px', left:'16px', borderBottom:'2px solid #8B7340', borderLeft:'2px solid #8B7340' },
          { bottom:'16px', right:'16px', borderBottom:'2px solid #8B7340', borderRight:'2px solid #8B7340' },
        ].map((s,i) => <div key={i} style={{ position:'absolute', width:'28px', height:'28px', pointerEvents:'none', ...s }} />)}
        {/* dot texture */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(180,150,60,0.06) 1px, transparent 1px)', backgroundSize:'24px 24px', pointerEvents:'none' }} />
        {/* watermark */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', overflow:'hidden' }}>
          <div style={{ fontSize:'130px', fontWeight:'900', color:'rgba(180,140,60,0.04)', letterSpacing:'-2px', userSelect:'none', fontFamily:'Georgia,serif', transform:'rotate(-10deg)', whiteSpace:'nowrap' }}>CERTIFIED</div>
        </div>

        {/* CONTENT */}
        <div style={{ position:'relative', zIndex:1, height:'100%', display:'flex', flexDirection:'column', padding:'24px 52px 20px' }}>
          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <CTOLogo size={44} />
              <div>
                <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:'900', fontSize:'10.5px', letterSpacing:'3px', color:'#1a1a1a', textTransform:'uppercase' }}>CTO Access Forum University</div>
                <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7.5px', letterSpacing:'2px', color:'#6B5A2A', textTransform:'uppercase', marginTop:'1px' }}>university.redjemie.com · Dubai, United Arab Emirates</div>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7px', letterSpacing:'2px', color:'#8B7340', textTransform:'uppercase', marginBottom:'2px' }}>Official Academic Credential</div>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7px', color:'#9A8A6A', letterSpacing:'0.5px' }}>Ref: {certId}</div>
            </div>
          </div>
          {/* divider */}
          <div style={{ display:'flex', height:'2px', marginBottom:'14px' }}>
            <div style={{ flex:1, background:'linear-gradient(90deg, #C01215, #E5181B, #C01215)' }} />
            <div style={{ width:'4px', background:'#8B7340' }} />
            <div style={{ flex:1, background:'linear-gradient(90deg, #8B7340, #C8B87A, #8B7340)' }} />
          </div>
          {/* BODY */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
            <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:'400', fontSize:'8.5px', letterSpacing:'5px', color:'#8B7340', textTransform:'uppercase', marginBottom:'5px' }}>Certificate of Achievement</div>
            <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'10px', color:'#5A4A2A', marginBottom:'10px' }}>This is to certify that</div>
            <div style={{ fontFamily:'Georgia,"Palatino Linotype",serif', fontSize:'40px', color:'#1A1A1A', letterSpacing:'1px', marginBottom:'2px', lineHeight:'1', fontWeight:'400' }}>{profile?.displayName}</div>
            {profile?.title && <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'11px', color:'#6B5A2A', marginBottom:'4px' }}>{profile.title}</div>}
            <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:'9px 0' }}>
              <div style={{ width:'80px', height:'0.5px', background:'linear-gradient(90deg, transparent, #C8B87A)' }} />
              <div style={{ width:'5px', height:'5px', background:'#C01215', transform:'rotate(45deg)' }} />
              <div style={{ width:'5px', height:'5px', background:'#C8B87A', transform:'rotate(45deg)' }} />
              <div style={{ width:'5px', height:'5px', background:'#C01215', transform:'rotate(45deg)' }} />
              <div style={{ width:'80px', height:'0.5px', background:'linear-gradient(90deg, #C8B87A, transparent)' }} />
            </div>
            <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'10px', color:'#5A4A2A', marginBottom:'9px' }}>has successfully completed</div>
            <div style={{ fontFamily:'Georgia,"Palatino Linotype",serif', fontSize:'20px', color:'#1A1A1A', maxWidth:'560px', lineHeight:'1.35', marginBottom:'7px', fontWeight:'400' }}>{course?.title}</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', marginBottom:'10px', flexWrap:'wrap' }}>
              {[course?.category, course?.level, durationStr].filter(Boolean).map((item,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  {i > 0 && <div style={{ width:'3px', height:'3px', borderRadius:'50%', background:'#C8B87A' }} />}
                  <span style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7.5px', letterSpacing:'1.5px', color:'#6B5A2A', textTransform:'uppercase' }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ maxWidth:'530px', padding:'7px 18px', border:'0.5px solid rgba(180,150,60,0.25)', borderRadius:'3px', background:'rgba(180,150,60,0.03)' }}>
              <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'9px', color:'#7A6A4A', lineHeight:'1.7' }}>
                "Having fulfilled all requirements, demonstrated mastery of the subject matter, and upheld the standards of professional excellence established by CTO Access Forum University"
              </div>
            </div>
          </div>
          {/* divider */}
          <div style={{ height:'1px', margin:'12px 0 10px', background:'linear-gradient(90deg, transparent, #C8B87A, #8B7340, #C8B87A, transparent)' }} />
          {/* FOOTER */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'20px', alignItems:'flex-end', marginBottom:'10px' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'11.5px', color:'#3A3020', marginBottom:'5px' }}>{course?.instructorName || 'CTO Access Forum'}</div>
              <div style={{ height:'0.5px', background:'#C8B87A', marginBottom:'4px' }} />
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7px', letterSpacing:'2px', color:'#7A6A4A', textTransform:'uppercase' }}>Course Instructor</div>
            </div>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ width:'70px', height:'70px', position:'relative', margin:'0 auto' }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid #C8B87A' }} />
                <div style={{ position:'absolute', inset:'5px', borderRadius:'50%', border:'1px solid rgba(180,150,60,0.3)' }} />
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px' }}>
                  <CTOLogo size={30} />
                  <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'5px', color:'#8B7340', letterSpacing:'1.5px', textTransform:'uppercase' }}>VERIFIED</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'11.5px', color:'#3A3020', marginBottom:'5px' }}>Admin RD, CTO Access Forum</div>
              <div style={{ height:'0.5px', background:'#C8B87A', marginBottom:'4px' }} />
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'7px', letterSpacing:'2px', color:'#7A6A4A', textTransform:'uppercase' }}>Authorized Signatory</div>
            </div>
          </div>
          {/* BOTTOM BAR */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'8px', borderTop:'0.5px solid rgba(180,150,60,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
              <div style={{ width:'22px', height:'22px', border:'1px solid #C8B87A', borderRadius:'2px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1px', padding:'3px', background:'rgba(180,150,60,0.05)', flexShrink:0 }}>
                {[1,1,1,1,0,1,1,1,1].map((v,i) => <div key={i} style={{ background:v?'#8B7340':'transparent', borderRadius:'0.5px' }} />)}
              </div>
              <div>
                <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'6px', color:'#8B7340', letterSpacing:'1px', textTransform:'uppercase' }}>Verify online</div>
                <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'6.5px', color:'#9A8A6A' }}>university.redjemie.com/verify/{certId}</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'5.5px', color:'#9A8A6A', letterSpacing:'1px', textTransform:'uppercase' }}>Recognized by</div>
              {['UAECSC','DDA','GITLF'].map(p => (
                <div key={p} style={{ padding:'2px 6px', border:'0.5px solid #C8B87A', borderRadius:'2px', background:'rgba(180,150,60,0.06)' }}>
                  <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:'700', fontSize:'6px', color:'#8B7340', letterSpacing:'0.5px' }}>{p}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'6px', color:'#9A8A6A' }}>Valid until {expiryStr}</div>
              <div style={{ fontFamily:'Montserrat,sans-serif', fontSize:'6px', color:'#8B7340' }}>Certificate No. {certId}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SHARE PANEL */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Certificate ID',  value: <span className="font-mono text-[0.6rem] text-[#D4AF37] break-all">{certId}</span> },
          { label:'Date Issued',     value: <span className="text-[0.68rem] text-gray-400">{dateStr}</span> },
          { label:'Add to LinkedIn', value: <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-[0.7rem] text-blue-400 hover:underline font-[Montserrat] font-bold">Add Credential →</a> },
          { label:'Registration',    value: (
            <div className="flex flex-col items-center gap-1">
              <span className={`text-[0.65rem] font-bold font-[Montserrat] ${regStatus==='done'?'text-green-400':regStatus==='error'?'text-red-400':regStatus==='registering'?'text-amber-400':'text-gray-500'}`}>
                {regStatus==='done'?'✓ Active':regStatus==='error'?'✗ Error':regStatus==='registering'?'⟳ Saving…':'—'}
              </span>
              {regStatus==='done' && <button onClick={() => { navigator.clipboard?.writeText(verifyUrl); toast.success('Copied!') }} className="text-[0.65rem] text-[#E5181B] hover:underline font-[Montserrat]">Copy verify link</button>}
              {regStatus==='error' && <button onClick={() => forceRegister(course, progress, profile)} className="text-[0.65rem] text-amber-400 hover:underline font-[Montserrat]">Retry</button>}
            </div>
          )},
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 text-center">
            <div className="font-[Montserrat] font-bold text-[0.72rem] text-gray-500 mb-1.5">{s.label}</div>
            {s.value}
          </div>
        ))}
      </div>

      <div className="mt-3 bg-[#0d0d0d] border border-white/[.04] rounded-[10px] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { t:'Cryptographically Verified', d:'SHA-256 signed unique ID — tamper detection built in.' },
            { t:'Publicly Verifiable',        d:'Anyone can verify at university.redjemie.com/verify' },
            { t:'Print Ready',                d:'Download as A4 PDF — suitable for framing and portfolios.' },
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
