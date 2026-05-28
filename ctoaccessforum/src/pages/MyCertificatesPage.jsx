import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

function addOneYear(date) {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + 1)
  return d
}

function daysUntil(date) {
  return Math.ceil((new Date(date) - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function MyCertificatesPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [certs,   setCerts]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.uid) return
    async function load() {
      try {
        // get all progress docs for this user
        const progressSnap = await getDocs(collection(db, 'users', profile.uid, 'progress'))
        const completed = progressSnap.docs.filter(d => d.data().completedAt)
        // fetch course details for each
        const results = await Promise.all(
          completed.map(async p => {
            const courseSnap = await getDoc(doc(db, 'courses', p.id))
            if (!courseSnap.exists()) return null
            return {
              courseId:    p.id,
              course:      { id: p.id, ...courseSnap.data() },
              completedAt: p.data().completedAt?.toDate?.() || new Date(),
            }
          })
        )
        setCerts(results.filter(Boolean))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [profile?.uid])

  function certId(courseId) {
    return `CTOU-${courseId?.slice(0,6).toUpperCase()}-${profile?.uid?.slice(0,6).toUpperCase()}`
  }

  function verifyUrl(courseId) {
    return `https://university.redjemie.com/verify/${certId(courseId)}`
  }

  function linkedInUrl(cert) {
    const params = new URLSearchParams({
      startTask:         'CERTIFICATION_NAME',
      name:              cert.course.title,
      organizationName:  'CTO Access Forum University',
      issueYear:         cert.completedAt.getFullYear(),
      issueMonth:        cert.completedAt.getMonth() + 1,
      expirationYear:    addOneYear(cert.completedAt).getFullYear(),
      expirationMonth:   addOneYear(cert.completedAt).getMonth() + 1,
      certUrl:           verifyUrl(cert.courseId),
      certId:            certId(cert.courseId),
    })
    return `https://www.linkedin.com/profile/add?${params.toString()}`
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )

  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[Montserrat] text-[1.3rem] font-black">My Certificates</h1>
          <p className="text-[0.76rem] text-gray-500 mt-0.5">
            {certs.length} certificate{certs.length !== 1 ? 's' : ''} earned · Valid for 1 year from issue date
          </p>
        </div>
        <button onClick={() => nav('/courses')}
          className="px-4 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] transition-colors">
          Earn More
        </button>
      </div>

      {certs.length === 0 ? (
        <div className="bg-[#111] border border-white/[.06] rounded-[14px] px-6 py-14 text-center">
          <div className="font-[Montserrat] text-[0.95rem] font-bold mb-2">No certificates yet</div>
          <p className="text-[0.78rem] text-gray-500 mb-5">Complete a course to earn your first certificate.</p>
          <button onClick={() => nav('/courses')}
            className="px-5 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] transition-colors">
            Browse Courses
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certs.map(cert => {
            const expiresAt  = addOneYear(cert.completedAt)
            const daysLeft   = daysUntil(expiresAt)
            const isExpired  = daysLeft <= 0
            const expiringSoon = daysLeft > 0 && daysLeft <= 30
            const id         = certId(cert.courseId)
            const vUrl       = verifyUrl(cert.courseId)

            return (
              <div key={cert.courseId}
                className={`bg-[#111] border rounded-[14px] overflow-hidden ${isExpired ? 'border-red-500/20' : expiringSoon ? 'border-amber-500/20' : 'border-white/[.06]'}`}>
                {/* certificate mini preview */}
                <div className="relative h-28 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 40%, #0a0505 100%)' }}>
                  {/* decorative */}
                  <div style={{ position:'absolute', inset:'6px', border:'0.5px solid rgba(229,24,27,0.15)', borderRadius:'6px', pointerEvents:'none' }} />
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg, #E5181B, #FF6B6B, #E5181B)' }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="font-[Montserrat] text-[0.55rem] font-black tracking-[4px] text-[#E5181B] uppercase mb-1">CTO Access Forum University</div>
                    <div className="font-[Georgia,serif] text-[1rem] text-white mb-0.5">{profile?.displayName}</div>
                    <div className="text-[0.6rem] text-gray-500 text-center px-4 leading-tight">{cert.course.title}</div>
                  </div>
                  {/* status badge */}
                  <div className={`absolute top-2 right-2 text-[0.55rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-900/60 text-red-400' : expiringSoon ? 'bg-amber-900/60 text-amber-400' : 'bg-green-900/60 text-green-400'}`}>
                    {isExpired ? 'Expired' : expiringSoon ? `Expires in ${daysLeft}d` : 'Valid'}
                  </div>
                </div>

                <div className="p-4">
                  <div className="font-[Montserrat] font-bold text-[0.85rem] mb-1 leading-snug">{cert.course.title}</div>
                  <div className="text-[0.67rem] text-gray-500 mb-3">
                    {cert.course.category} · {cert.course.level}
                  </div>

                  {/* cert details */}
                  <div className="bg-[#1a1a1a] border border-white/[.05] rounded-[8px] p-3 mb-3">
                    {[
                      { l: 'Certificate ID', v: id },
                      { l: 'Issued',         v: cert.completedAt.toLocaleDateString('en-AE', { year:'numeric', month:'short', day:'numeric' }) },
                      { l: 'Expires',        v: expiresAt.toLocaleDateString('en-AE', { year:'numeric', month:'short', day:'numeric' }) },
                      { l: 'Issued by',      v: 'CTO Access Forum University' },
                    ].map(s => (
                      <div key={s.l} className="flex justify-between items-center py-1 border-b border-white/[.04] last:border-0">
                        <span className="text-[0.65rem] text-gray-500">{s.l}</span>
                        <span className="text-[0.65rem] text-gray-300 font-[Montserrat] font-bold">{s.v}</span>
                      </div>
                    ))}
                  </div>

                  {/* action buttons */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => nav(`/courses/${cert.courseId}/certificate`)}
                      className="py-2 bg-[rgba(229,24,27,.1)] border border-red-500/20 text-[#FF4447] text-[0.7rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-[rgba(229,24,27,.15)] transition-colors">
                      View Certificate
                    </button>
                    <a href={linkedInUrl(cert)} target="_blank" rel="noopener noreferrer"
                      className="py-2 bg-blue-900/20 border border-blue-500/20 text-blue-400 text-[0.7rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-blue-900/30 transition-colors text-center">
                      Add to LinkedIn
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { navigator.clipboard?.writeText(vUrl); alert('Verification link copied!') }}
                      className="py-2 bg-white/[.04] border border-white/[.08] text-gray-400 text-[0.7rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-white/[.07] transition-colors">
                      Copy Verify Link
                    </button>
                    <a href={`https://twitter.com/intent/tweet?text=I just earned a certificate in "${cert.course.title}" from CTO Access Forum University! Verify: ${vUrl}&hashtags=CTOAccessForum,Certificate`}
                      target="_blank" rel="noopener noreferrer"
                      className="py-2 bg-white/[.04] border border-white/[.08] text-gray-400 text-[0.7rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-white/[.07] transition-colors text-center">
                      Share on X
                    </a>
                  </div>

                  {/* renewal */}
                  {(isExpired || expiringSoon) && (
                    <div className={`mt-3 p-3 rounded-[8px] border ${isExpired ? 'bg-red-900/10 border-red-500/20' : 'bg-amber-900/10 border-amber-500/20'}`}>
                      <div className={`text-[0.7rem] font-bold font-[Montserrat] mb-1 ${isExpired ? 'text-red-400' : 'text-amber-400'}`}>
                        {isExpired ? 'Certificate Expired' : `Expires in ${daysLeft} days`}
                      </div>
                      <p className="text-[0.67rem] text-gray-500 mb-2">
                        Renew to keep your certification valid and maintain access to course updates.
                      </p>
                      <button className="w-full py-1.5 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.7rem] font-bold font-[Montserrat] rounded-[6px] transition-colors">
                        Renew — AED 49
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
