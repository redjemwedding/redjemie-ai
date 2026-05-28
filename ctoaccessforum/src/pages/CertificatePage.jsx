import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

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

  const completedAt   = progress?.completedAt?.toDate?.() || new Date()
  const expiresAt     = new Date(completedAt); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  const dateStr       = completedAt.toLocaleDateString('en-AE', { year: 'numeric', month: 'long', day: 'numeric' })
  const expiryStr     = expiresAt.toLocaleDateString('en-AE', { year: 'numeric', month: 'long', day: 'numeric' })
  const certId        = `CTOU-${courseId?.slice(0,6).toUpperCase()}-${profile?.uid?.slice(0,6).toUpperCase()}`
  const verifyUrl     = `https://university.redjemie.com/verify/${certId}`
  const totalLessons  = course?.modules?.reduce((a, m) => a + (m.lessons?.length || 0), 0) || 0
  const totalHours    = course?.modules?.reduce((a, m) => a + (m.lessons || []).reduce((b, l) => b + (Number(l.duration) || 0), 0), 0) || 0
  const hoursStr      = totalHours > 0 ? `${Math.round(totalHours / 60)} hours` : `${totalLessons} lessons`
  const isComplete    = (progress?.completedLessons?.length || 0) >= totalLessons && totalLessons > 0

  async function downloadPDF() {
    setGenerating(true)
    try {
      const script1 = document.createElement('script')
      script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      const script2 = document.createElement('script')
      script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
      document.head.appendChild(script1)
      document.head.appendChild(script2)
      await new Promise(r => { script1.onload = r })
      await new Promise(r => { script2.onload = r })
      await new Promise(r => setTimeout(r, 500))

      const element = certRef.current
      const canvas  = await window.html2canvas(element, {
        scale: 3, useCORS: true, allowTaint: true,
        backgroundColor: '#0f0a06',
      })
      const imgData = canvas.toDataURL('image/png')
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight())
      pdf.save(`CTO-Certificate-${profile?.displayName?.replace(/\s+/g,'-')}.pdf`)
      toast.success('Certificate downloaded!')
    } catch (err) {
      console.error(err)
      window.print()
    } finally { setGenerating(false) }
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
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
            {generating
              ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Generating PDF…</span></>
              : 'Download PDF'}
          </button>
        </div>
      </div>

      {!isComplete && (
        <div className="bg-amber-900/10 border border-amber-500/20 rounded-[12px] p-4 mb-5 text-center">
          <p className="text-[0.78rem] text-amber-300 font-[Montserrat] font-bold mb-1">Course Not Yet Complete</p>
          <p className="text-[0.72rem] text-gray-500">Complete all {totalLessons} lessons to unlock your certificate.</p>
          <button onClick={() => nav(`/courses/${courseId}`)}
            className="mt-2 px-4 py-1.5 bg-amber-900/20 border border-amber-500/20 text-amber-300 text-[0.72rem] font-bold font-[Montserrat] rounded-[6px]">
            Continue Learning
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PREMIUM CERTIFICATE DESIGN
      ═══════════════════════════════════════════════════════════ */}
      <div ref={certRef}
        style={{
          background: 'linear-gradient(160deg, #0f0a06 0%, #1a0f07 30%, #0f0a06 60%, #12070b 100%)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: '16px',
          padding: '0',
          aspectRatio: '1.414 / 1',
          maxWidth: '860px',
          margin: '0 auto',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>

        {/* ── outer decorative border ── */}
        <div style={{ position:'absolute', inset:'10px', border:'0.5px solid rgba(212,175,55,0.2)', borderRadius:'10px', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:'14px', border:'0.5px solid rgba(212,175,55,0.08)', borderRadius:'8px', pointerEvents:'none' }} />

        {/* ── gold top border ── */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'4px', background:'linear-gradient(90deg, transparent, #D4AF37, #F5D87A, #D4AF37, transparent)', borderRadius:'16px 16px 0 0' }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }} />

        {/* ── corner ornaments (gold) ── */}
        {[
          { top:'18px', left:'18px',  borderTop:'1.5px solid rgba(212,175,55,0.5)', borderLeft:'1.5px solid rgba(212,175,55,0.5)', borderRight:'none', borderBottom:'none' },
          { top:'18px', right:'18px', borderTop:'1.5px solid rgba(212,175,55,0.5)', borderRight:'1.5px solid rgba(212,175,55,0.5)', borderLeft:'none', borderBottom:'none' },
          { bottom:'18px', left:'18px',  borderBottom:'1.5px solid rgba(212,175,55,0.5)', borderLeft:'1.5px solid rgba(212,175,55,0.5)', borderTop:'none', borderRight:'none' },
          { bottom:'18px', right:'18px', borderBottom:'1.5px solid rgba(212,175,55,0.5)', borderRight:'1.5px solid rgba(212,175,55,0.5)', borderTop:'none', borderLeft:'none' },
        ].map((s, i) => (
          <div key={i} style={{ position:'absolute', width:'28px', height:'28px', pointerEvents:'none', ...s }} />
        ))}

        {/* ── watermark ── */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', pointerEvents:'none' }}>
          <div style={{ fontSize:'130px', fontWeight:'900', color:'rgba(212,175,55,0.025)', letterSpacing:'-4px', userSelect:'none', fontFamily:'Georgia, serif', transform:'rotate(-15deg)', whiteSpace:'nowrap' }}>
            CERTIFIED
          </div>
        </div>

        {/* ── subtle geometric bg pattern ── */}
        <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'200px', height:'200px', borderRadius:'50%', background:'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-40px', left:'-40px', width:'200px', height:'200px', borderRadius:'50%', background:'radial-gradient(circle, rgba(229,24,27,0.04) 0%, transparent 70%)', pointerEvents:'none' }} />

        {/* ── MAIN CONTENT ── */}
        <div style={{ position:'relative', zIndex:1, height:'100%', display:'flex', flexDirection:'column', padding:'28px 52px 22px' }}>

          {/* ── HEADER ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
            {/* institution mark */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'36px', height:'36px', border:'1.5px solid rgba(212,175,55,0.5)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <div style={{ fontFamily:'Montserrat, sans-serif', fontWeight:'900', fontSize:'8px', color:'#D4AF37', letterSpacing:'0.5px', textAlign:'center', lineHeight:'1.1', textTransform:'uppercase' }}>
                  CTO<br/>UNIV
                </div>
              </div>
              <div>
                <div style={{ fontFamily:'Montserrat, sans-serif', fontWeight:'900', fontSize:'9px', letterSpacing:'3px', color:'#D4AF37', textTransform:'uppercase' }}>
                  CTO Access Forum University
                </div>
                <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'7.5px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase' }}>
                  university.redjemie.com · Dubai, UAE
                </div>
              </div>
            </div>

            {/* right — cert type */}
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'7.5px', letterSpacing:'3px', color:'rgba(212,175,55,0.6)', textTransform:'uppercase', marginBottom:'2px' }}>
                Official Credential
              </div>
              <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'7px', color:'rgba(255,255,255,0.2)', letterSpacing:'1px' }}>
                ID: {certId}
              </div>
            </div>
          </div>

          {/* ── GOLD DIVIDER ── */}
          <div style={{ height:'0.5px', background:'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), rgba(212,175,55,0.6), rgba(212,175,55,0.4), transparent)', marginBottom:'18px' }} />

          {/* ── BODY ── */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>

            {/* certificate title */}
            <div style={{ fontFamily:'Montserrat, sans-serif', fontWeight:'400', fontSize:'9px', letterSpacing:'5px', color:'rgba(212,175,55,0.7)', textTransform:'uppercase', marginBottom:'6px' }}>
              Certificate of Achievement
            </div>

            {/* presented to */}
            <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'8px', letterSpacing:'3px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', marginBottom:'8px' }}>
              This is to certify that
            </div>

            {/* RECIPIENT NAME */}
            <div style={{ fontFamily:'Georgia, "Palatino Linotype", serif', fontWeight:'400', fontSize:'36px', color:'#FFFFFF', letterSpacing:'1px', marginBottom:'4px', lineHeight:'1.1', textShadow:'0 0 40px rgba(212,175,55,0.1)' }}>
              {profile?.displayName || 'Recipient Name'}
            </div>

            {/* title/role if available */}
            {profile?.title && (
              <div style={{ fontFamily:'Georgia, serif', fontStyle:'italic', fontSize:'11px', color:'rgba(212,175,55,0.5)', marginBottom:'8px' }}>
                {profile.title}
              </div>
            )}

            {/* gold line divider */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'8px 0 10px' }}>
              <div style={{ width:'60px', height:'0.5px', background:'linear-gradient(90deg, transparent, rgba(212,175,55,0.4))' }} />
              <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'rgba(212,175,55,0.4)', transform:'rotate(45deg)' }} />
              <div style={{ width:'60px', height:'0.5px', background:'linear-gradient(90deg, rgba(212,175,55,0.4), transparent)' }} />
            </div>

            {/* achievement text */}
            <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'8px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', marginBottom:'8px' }}>
              has successfully demonstrated proficiency and completed
            </div>

            {/* COURSE TITLE */}
            <div style={{ fontFamily:'Georgia, "Palatino Linotype", serif', fontWeight:'400', fontSize:'18px', color:'rgba(255,255,255,0.92)', maxWidth:'560px', lineHeight:'1.35', marginBottom:'8px' }}>
              {course?.title}
            </div>

            {/* course meta pills */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', marginBottom:'10px', flexWrap:'wrap' }}>
              {[
                course?.category,
                course?.level,
                hoursStr,
                `Issued ${completedAt.toLocaleDateString('en-AE', { month:'short', year:'numeric' })}`,
              ].filter(Boolean).map((item, i, arr) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  {i > 0 && <div style={{ width:'3px', height:'3px', borderRadius:'50%', background:'rgba(212,175,55,0.3)' }} />}
                  <span style={{ fontFamily:'Montserrat, sans-serif', fontSize:'8px', letterSpacing:'1.5px', color:'rgba(212,175,55,0.55)', textTransform:'uppercase' }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* competency statement */}
            <div style={{ maxWidth:'500px', padding:'8px 16px', border:'0.5px solid rgba(212,175,55,0.12)', borderRadius:'4px', background:'rgba(212,175,55,0.02)', marginBottom:'4px' }}>
              <div style={{ fontFamily:'Georgia, serif', fontStyle:'italic', fontSize:'9.5px', color:'rgba(255,255,255,0.35)', lineHeight:'1.6', textAlign:'center' }}>
                "Having fulfilled all academic requirements, demonstrated mastery of the subject matter, and upheld the standards of professional excellence as established by CTO Access Forum University"
              </div>
            </div>
          </div>

          {/* ── GOLD DIVIDER ── */}
          <div style={{ height:'0.5px', background:'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), rgba(212,175,55,0.5), rgba(212,175,55,0.3), transparent)', margin:'14px 0 12px' }} />

          {/* ── FOOTER ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'16px', alignItems:'flex-end' }}>

            {/* left — instructor */}
            <div style={{ textAlign:'center' }}>
              <div style={{ height:'20px', borderBottom:'0.5px solid rgba(212,175,55,0.25)', marginBottom:'6px', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:'4px' }}>
                <div style={{ fontFamily:'Georgia, serif', fontStyle:'italic', fontSize:'12px', color:'rgba(212,175,55,0.5)', letterSpacing:'0.5px' }}>
                  {course?.instructorName || 'CTO Access Forum'}
                </div>
              </div>
              <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'7px', letterSpacing:'2px', color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>
                Course Instructor
              </div>
            </div>

            {/* center — official seal */}
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ width:'70px', height:'70px', position:'relative', margin:'0 auto' }}>
                {/* outer ring */}
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1.5px solid rgba(212,175,55,0.4)' }} />
                {/* inner ring */}
                <div style={{ position:'absolute', inset:'5px', borderRadius:'50%', border:'0.5px solid rgba(212,175,55,0.2)' }} />
                {/* content */}
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontFamily:'Montserrat, sans-serif', fontWeight:'900', fontSize:'7px', color:'#D4AF37', letterSpacing:'0.5px', textTransform:'uppercase', textAlign:'center', lineHeight:'1.4' }}>
                    CTO<br/>ACCESS<br/>FORUM
                  </div>
                  <div style={{ width:'20px', height:'0.5px', background:'rgba(212,175,55,0.3)', margin:'2px 0' }} />
                  <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'5.5px', color:'rgba(212,175,55,0.4)', letterSpacing:'1px', textTransform:'uppercase' }}>
                    UNIVERSITY
                  </div>
                </div>
              </div>
            </div>

            {/* right — date + validity */}
            <div style={{ textAlign:'center' }}>
              <div style={{ height:'20px', borderBottom:'0.5px solid rgba(212,175,55,0.25)', marginBottom:'6px', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:'4px' }}>
                <div style={{ fontFamily:'Georgia, serif', fontStyle:'italic', fontSize:'12px', color:'rgba(212,175,55,0.5)', letterSpacing:'0.5px' }}>
                  Admin RD, CTO Access Forum
                </div>
              </div>
              <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'7px', letterSpacing:'2px', color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>
                Authorized Signatory
              </div>
            </div>
          </div>

          {/* ── BOTTOM ROW — verification + partners ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px', paddingTop:'8px', borderTop:'0.5px solid rgba(255,255,255,0.04)' }}>
            {/* QR-style cert ID */}
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'28px', height:'28px', border:'0.5px solid rgba(212,175,55,0.2)', borderRadius:'3px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(212,175,55,0.03)', flexShrink:0 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1.5px', padding:'4px' }}>
                  {[1,1,1,1,0,1,1,1,1].map((v,i) => (
                    <div key={i} style={{ width:'4px', height:'4px', background: v ? 'rgba(212,175,55,0.5)' : 'transparent', borderRadius:'0.5px' }} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'6.5px', color:'rgba(212,175,55,0.4)', letterSpacing:'1px', textTransform:'uppercase' }}>Verify at</div>
                <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'7px', color:'rgba(255,255,255,0.3)', letterSpacing:'0.5px' }}>university.redjemie.com/verify/{certId}</div>
              </div>
            </div>

            {/* partner badges */}
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'6px', color:'rgba(255,255,255,0.15)', letterSpacing:'1.5px', textTransform:'uppercase' }}>
                Accredited by
              </div>
              {[
                { name: 'UAE Cybersecurity\nCouncil', short: 'UAECSC' },
                { name: 'Dubai Digital\nAuthority', short: 'DDA'    },
                { name: 'Gulf IT\nLeaders Forum', short: 'GITLF'   },
              ].map((p, i) => (
                <div key={i} style={{ padding:'3px 8px', border:'0.5px solid rgba(212,175,55,0.15)', borderRadius:'3px', background:'rgba(212,175,55,0.02)' }}>
                  <div style={{ fontFamily:'Montserrat, sans-serif', fontWeight:'700', fontSize:'7px', color:'rgba(212,175,55,0.35)', letterSpacing:'0.5px', textTransform:'uppercase' }}>
                    {p.short}
                  </div>
                </div>
              ))}
            </div>

            {/* validity */}
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'6.5px', color:'rgba(255,255,255,0.15)', letterSpacing:'1px', textTransform:'uppercase' }}>
                Valid until {expiryStr}
              </div>
              <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'6px', color:'rgba(212,175,55,0.25)', letterSpacing:'0.5px' }}>
                Certificate No. {certId}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── SHARE PANEL ── */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 text-center">
          <div className="font-[Montserrat] font-bold text-[0.75rem] mb-0.5">Certificate ID</div>
          <div className="font-[Montserrat] text-[0.6rem] text-[#D4AF37] tracking-widest break-all">{certId}</div>
        </div>
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 text-center">
          <div className="font-[Montserrat] font-bold text-[0.75rem] mb-0.5">Date Issued</div>
          <div className="text-[0.68rem] text-gray-400">{dateStr}</div>
          <div className="text-[0.62rem] text-gray-600 mt-0.5">Expires {expiryStr}</div>
        </div>
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 text-center">
          <div className="font-[Montserrat] font-bold text-[0.75rem] mb-1">Add to LinkedIn</div>
          <a href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(course?.title||'')}&organizationName=CTO+Access+Forum+University&issueYear=${completedAt.getFullYear()}&issueMonth=${completedAt.getMonth()+1}&expirationYear=${expiresAt.getFullYear()}&expirationMonth=${expiresAt.getMonth()+1}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${certId}`}
            target="_blank" rel="noopener noreferrer"
            className="text-[0.7rem] text-blue-400 hover:underline font-[Montserrat] font-bold">
            Add Credential →
          </a>
        </div>
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 text-center">
          <div className="font-[Montserrat] font-bold text-[0.75rem] mb-1">Verify & Share</div>
          <button onClick={() => { navigator.clipboard?.writeText(verifyUrl); toast.success('Verification link copied!') }}
            className="text-[0.7rem] text-[#E5181B] hover:underline font-[Montserrat] font-bold">
            Copy Verify Link
          </button>
        </div>
      </div>

      {/* ── WHY THIS CERT MATTERS ── */}
      <div className="mt-4 bg-[#111] border border-white/[.06] rounded-[12px] p-5">
        <div className="text-[0.67rem] font-bold tracking-[.08em] uppercase text-gray-600 font-[Montserrat] mb-3">
          What This Certificate Represents
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Verified Achievement', desc: 'Every certificate is digitally issued, uniquely numbered, and permanently verifiable at university.redjemie.com' },
            { title: 'Industry Relevance', desc: 'Curriculum designed by active practitioners in the UAE and GCC tech and IT leadership ecosystem' },
            { title: 'Professional Recognition', desc: 'Add directly to your LinkedIn profile as a verified credential — recognized by employers and peers in the region' },
          ].map(c => (
            <div key={c.title}>
              <div className="font-[Montserrat] font-bold text-[0.78rem] text-[#D4AF37] mb-1">{c.title}</div>
              <p className="text-[0.72rem] text-gray-500 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PARTNER NOTE ── */}
      <div className="mt-3 bg-[#0d0d0d] border border-white/[.04] rounded-[10px] p-4">
        <p className="text-[0.68rem] text-gray-600 leading-relaxed">
          <span className="text-gray-400 font-bold">Partner logos:</span> To add real accreditation partner logos (UAECSC, DDA, etc.), upload partner PNGs to Cloudinary and replace the partner badge divs in <span className="font-mono text-gray-500">CertificatePage.jsx</span> with actual <span className="font-mono text-gray-500">&lt;img&gt;</span> tags. Contact partners for official endorsement before displaying their logos.
        </p>
      </div>
    </div>
  )
}
