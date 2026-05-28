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
  const [course,    setCourse]    = useState(null)
  const [progress,  setProgress]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)

  // partner logos — add your partner logos here as URLs
  // To customise: replace with actual logo URLs from Cloudinary
  const PARTNERS = [
    { name: 'UAE Cybersecurity Council', short: 'UAECSC' },
    { name: 'Dubai Digital Authority',   short: 'DDA'    },
    { name: 'CTO Access Forum',          short: 'CTO'    },
  ]

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
  const dateStr      = completedAt.toLocaleDateString('en-AE', { year: 'numeric', month: 'long', day: 'numeric' })
  const certId       = `CTOU-${courseId?.slice(0, 6).toUpperCase()}-${profile?.uid?.slice(0, 6).toUpperCase()}`
  const totalLessons = course?.modules?.reduce((a, m) => a + (m.lessons?.length || 0), 0) || 0

  async function downloadPDF() {
    setGenerating(true)
    try {
      // Load jsPDF and html2canvas from CDN
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js').then(m => ({ default: m.jsPDF || window.jspdf?.jsPDF })),
        import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js').then(m => ({ default: m.default || window.html2canvas })),
      ])

      const element = certRef.current
      const canvas  = await html2canvas(element, {
        scale: 3, useCORS: true, allowTaint: true,
        backgroundColor: '#0a0a0a',
        width: element.offsetWidth,
        height: element.offsetHeight,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf     = new (jsPDF || window.jspdf.jsPDF)({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const w       = pdf.internal.pageSize.getWidth()
      const h       = pdf.internal.pageSize.getHeight()
      pdf.addImage(imgData, 'PNG', 0, 0, w, h)
      pdf.save(`Certificate-${profile?.displayName?.replace(/\s+/g, '-')}-${course?.title?.slice(0,30).replace(/\s+/g, '-')}.pdf`)
    } catch (err) {
      console.error(err)
      // fallback — print to PDF
      window.print()
    } finally { setGenerating(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )

  if (!course) return <div className="text-center py-24 text-gray-500">Course not found.</div>

  const totalLessonsCompleted = progress?.completedLessons?.length || 0
  const isComplete = totalLessonsCompleted >= totalLessons && totalLessons > 0

  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button onClick={() => nav(`/courses/${courseId}`)}
          className="text-[0.73rem] text-gray-500 hover:text-white transition-colors font-[Montserrat]">
          ← Back to Course
        </button>
        <div className="flex gap-2">
          <button onClick={() => nav('/my-courses')}
            className="px-4 py-2 bg-white/[.04] border border-white/[.08] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] hover:bg-white/[.07] transition-colors">
            My Courses
          </button>
          <button onClick={downloadPDF} disabled={generating || !isComplete}
            className="px-5 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] disabled:opacity-50 transition-colors flex items-center gap-2">
            {generating
              ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Generating…</span></>
              : 'Download Certificate'}
          </button>
        </div>
      </div>

      {!isComplete && (
        <div className="bg-amber-900/10 border border-amber-500/20 rounded-[12px] p-4 mb-5 text-center">
          <div className="text-[0.78rem] text-amber-300 font-[Montserrat] font-bold mb-1">Course Not Yet Complete</div>
          <p className="text-[0.72rem] text-gray-500">Complete all {totalLessons} lessons to unlock your certificate.</p>
          <button onClick={() => nav(`/courses/${courseId}`)}
            className="mt-2 px-4 py-1.5 bg-amber-900/20 border border-amber-500/20 text-amber-300 text-[0.72rem] font-bold font-[Montserrat] rounded-[6px]">
            Continue Learning
          </button>
        </div>
      )}

      {/* ── CERTIFICATE DESIGN ── */}
      <div ref={certRef}
        className="relative overflow-hidden print:shadow-none"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111 40%, #0a0505 100%)',
          border: '1px solid rgba(229,24,27,0.2)',
          borderRadius: '16px',
          padding: '0',
          aspectRatio: '1.414 / 1',
          maxWidth: '800px',
          margin: '0 auto',
          fontFamily: 'Georgia, serif',
        }}>

        {/* decorative border lines */}
        <div style={{ position:'absolute', inset:'12px', border:'0.5px solid rgba(229,24,27,0.15)', borderRadius:'10px', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:'16px', border:'0.5px solid rgba(255,255,255,0.04)', borderRadius:'8px', pointerEvents:'none' }} />

        {/* top red accent bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'4px', background:'linear-gradient(90deg, #E5181B, #FF6B6B, #E5181B)', borderRadius:'16px 16px 0 0' }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'2px', background:'rgba(229,24,27,0.3)', borderRadius:'0 0 16px 16px' }} />

        {/* corner ornaments */}
        {[['top-5','left-5'],['top-5','right-5'],['bottom-5','left-5'],['bottom-5','right-5']].map(([v,h], i) => (
          <div key={i} style={{ position:'absolute', [v.split('-')[0]]:v.split('-')[1]+'px', [h.split('-')[0]]:h.split('-')[1]+'px', width:'24px', height:'24px', borderTop: v.startsWith('top') ? '1.5px solid rgba(229,24,27,0.4)' : 'none', borderBottom: v.startsWith('bottom') ? '1.5px solid rgba(229,24,27,0.4)' : 'none', borderLeft: h.startsWith('left') ? '1.5px solid rgba(229,24,27,0.4)' : 'none', borderRight: h.startsWith('right') ? '1.5px solid rgba(229,24,27,0.4)' : 'none' }} />
        ))}

        {/* background watermark text */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', pointerEvents:'none' }}>
          <div style={{ fontSize:'120px', fontWeight:'900', color:'rgba(229,24,27,0.03)', letterSpacing:'-4px', userSelect:'none', fontFamily:'Montserrat, sans-serif', textTransform:'uppercase' }}>
            CERTIFIED
          </div>
        </div>

        {/* main content */}
        <div style={{ position:'relative', zIndex:1, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', padding:'32px 48px 24px' }}>

          {/* header */}
          <div style={{ textAlign:'center', width:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', marginBottom:'8px' }}>
              <div style={{ width:'2px', height:'20px', background:'linear-gradient(to bottom, transparent, #E5181B, transparent)' }} />
              <div style={{ fontFamily:'Montserrat, sans-serif', fontWeight:'900', fontSize:'11px', letterSpacing:'6px', color:'#E5181B', textTransform:'uppercase' }}>
                CTO Access Forum University
              </div>
              <div style={{ width:'2px', height:'20px', background:'linear-gradient(to bottom, transparent, #E5181B, transparent)' }} />
            </div>
            <div style={{ fontSize:'10px', letterSpacing:'4px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', fontFamily:'Montserrat, sans-serif' }}>
              Certificate of Completion
            </div>
          </div>

          {/* center content */}
          <div style={{ textAlign:'center', width:'100%' }}>
            <div style={{ fontSize:'11px', letterSpacing:'3px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', fontFamily:'Montserrat, sans-serif', marginBottom:'10px' }}>
              This is to certify that
            </div>

            {/* recipient name */}
            <div style={{ fontSize:'38px', fontWeight:'400', color:'#FFFFFF', letterSpacing:'1px', marginBottom:'4px', fontFamily:'Georgia, serif', lineHeight:'1.1' }}>
              {profile?.displayName || 'Student Name'}
            </div>
            <div style={{ width:'120px', height:'1px', background:'linear-gradient(90deg, transparent, rgba(229,24,27,0.6), transparent)', margin:'10px auto' }} />

            <div style={{ fontSize:'10px', letterSpacing:'3px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', fontFamily:'Montserrat, sans-serif', marginBottom:'10px' }}>
              has successfully completed
            </div>

            {/* course title */}
            <div style={{ fontSize:'17px', fontWeight:'400', color:'rgba(255,255,255,0.9)', maxWidth:'560px', margin:'0 auto 8px', lineHeight:'1.4', fontFamily:'Georgia, serif' }}>
              {course.title}
            </div>

            {/* course meta */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'16px', marginTop:'8px' }}>
              {[
                course.category,
                course.level,
                `${totalLessons} Lessons`,
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                  {i > 0 && <div style={{ width:'3px', height:'3px', borderRadius:'50%', background:'rgba(229,24,27,0.5)' }} />}
                  <span style={{ fontSize:'9px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', fontFamily:'Montserrat, sans-serif' }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* bottom section */}
          <div style={{ width:'100%' }}>
            {/* signatures row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'24px', alignItems:'flex-end', marginBottom:'16px' }}>
              {/* instructor signature */}
              <div style={{ textAlign:'center' }}>
                <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.15)', paddingTop:'8px' }}>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.7)', fontFamily:'Georgia, serif', marginBottom:'2px' }}>
                    {course.instructorName || 'CTO Access Forum'}
                  </div>
                  <div style={{ fontSize:'8px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', fontFamily:'Montserrat, sans-serif' }}>
                    Course Instructor
                  </div>
                </div>
              </div>

              {/* center seal */}
              <div style={{ textAlign:'center', flexShrink:0 }}>
                <div style={{ width:'64px', height:'64px', borderRadius:'50%', border:'1.5px solid rgba(229,24,27,0.4)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(229,24,27,0.06)', margin:'0 auto' }}>
                  <div style={{ fontFamily:'Montserrat, sans-serif', fontWeight:'900', fontSize:'9px', color:'#E5181B', letterSpacing:'1px', textAlign:'center', lineHeight:'1.2', textTransform:'uppercase' }}>
                    CTO<br/>ACCESS<br/>FORUM
                  </div>
                </div>
              </div>

              {/* date */}
              <div style={{ textAlign:'center' }}>
                <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.15)', paddingTop:'8px' }}>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.7)', fontFamily:'Georgia, serif', marginBottom:'2px' }}>
                    {dateStr}
                  </div>
                  <div style={{ fontSize:'8px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', fontFamily:'Montserrat, sans-serif' }}>
                    Date of Completion
                  </div>
                </div>
              </div>
            </div>

            {/* partners row */}
            <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.06)', paddingTop:'12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              {/* cert ID */}
              <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'8px', color:'rgba(255,255,255,0.2)', letterSpacing:'1.5px' }}>
                CERT ID: {certId}
              </div>

              {/* partner logos */}
              <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                <div style={{ fontSize:'7px', letterSpacing:'2px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase', fontFamily:'Montserrat, sans-serif' }}>
                  In partnership with
                </div>
                {PARTNERS.slice(0, 2).map((p, i) => (
                  <div key={i} style={{ padding:'4px 10px', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'4px', background:'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize:'8px', fontWeight:'700', color:'rgba(255,255,255,0.4)', letterSpacing:'1px', fontFamily:'Montserrat, sans-serif', textTransform:'uppercase' }}>
                      {p.short}
                    </div>
                  </div>
                ))}
              </div>

              {/* verify URL */}
              <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:'8px', color:'rgba(255,255,255,0.2)', letterSpacing:'1px' }}>
                university.redjemie.com
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* share + info */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 text-center">
          <div className="font-[Montserrat] font-bold text-[0.8rem] mb-1">Certificate ID</div>
          <div className="font-[Montserrat] text-[0.68rem] text-[#FF4447] tracking-widest">{certId}</div>
        </div>
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 text-center">
          <div className="font-[Montserrat] font-bold text-[0.8rem] mb-1">Date Earned</div>
          <div className="text-[0.72rem] text-gray-400">{dateStr}</div>
        </div>
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 text-center">
          <div className="font-[Montserrat] font-bold text-[0.8rem] mb-1">Verify</div>
          <button onClick={() => { navigator.clipboard?.writeText(`https://university.redjemie.com/verify/${certId}`); toast.success('Link copied!') }}
            className="text-[0.7rem] text-[#FF4447] hover:underline font-[Montserrat]">
            Copy verification link
          </button>
        </div>
        <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-4 text-center">
          <div className="font-[Montserrat] font-bold text-[0.8rem] mb-1">LinkedIn</div>
          <a href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(course?.title || '')}&organizationName=CTO+Access+Forum+University&issueYear=${completedAt.getFullYear()}&issueMonth=${completedAt.getMonth()+1}&certUrl=${encodeURIComponent('https://university.redjemie.com/verify/'+certId)}&certId=${certId}`}
            target="_blank" rel="noopener noreferrer"
            className="text-[0.7rem] text-blue-400 hover:underline font-[Montserrat]">
            Add to LinkedIn
          </a>
        </div>
      </div>

      {/* partner note */}
      <div className="mt-4 bg-[#111] border border-white/[.06] rounded-[12px] p-4">
        <div className="text-[0.67rem] font-bold tracking-[.08em] uppercase text-gray-600 font-[Montserrat] mb-2">About Partner Logos</div>
        <p className="text-[0.73rem] text-gray-500 leading-relaxed">
          To add real partner logos to the certificate, upload your partner logo images to Cloudinary and replace the partner badge placeholders in <span className="text-gray-300 font-mono text-[0.68rem]">CertificatePage.jsx</span> with actual <span className="text-gray-300 font-mono text-[0.68rem]">&lt;img&gt;</span> tags using the Cloudinary URLs. Current placeholders show abbreviated partner names.
        </p>
      </div>
    </div>
  )
}
