import { useState } from 'react'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import toast from 'react-hot-toast'

const LOGO = 'https://www.redjemie.com/cafu-logo.png'

const STATS = [
  { n: '500+', l: 'Members' },
  { n: '30+',  l: 'Courses' },
  { n: '15+',  l: 'Instructors' },
  { n: 'UAE',  l: 'Focused Content' },
]

const FEATURES = [
  { icon: '🎓', t: 'Expert-Led Courses',      d: 'Learn from active CTOs, VPs, and senior IT leaders across the UAE and GCC.' },
  { icon: '🏆', t: 'Verified Certificates',   d: 'Earn digitally verifiable certificates recognised by top employers in the region.' },
  { icon: '🤝', t: 'Exclusive Community',      d: 'Invite-only network of IT decision-makers, innovators, and business leaders.' },
  { icon: '📱', t: 'Learn Anywhere',           d: 'Full mobile experience — study on the go, track your progress, resume any time.' },
  { icon: '🇦🇪', t: 'UAE & GCC Compliance',   d: 'Curriculum built for UAE regulatory standards, Vision 2031, and local business context.' },
  { icon: '⚡', t: 'Live Events & Webinars',   d: 'Join live sessions, ask questions, and network with peers in real time.' },
]

const COURSES = [
  { cat: 'UAE Market & Compliance', color: '#E5181B', title: 'Data Protection & Privacy for IT Leaders: UAE & Global Standards', level: 'Intermediate', modules: 6, lessons: 22 },
  { cat: 'Cloud & Infrastructure',  color: '#3B82F6', title: 'Cloud Architecture Strategy for Enterprise Leaders', level: 'Advanced', modules: 5, lessons: 18 },
  { cat: 'AI & Automation',         color: '#8B5CF6', title: 'Generative AI Implementation Roadmap for CTOs', level: 'Advanced', modules: 7, lessons: 24 },
  { cat: 'Leadership',              color: '#F59E0B', title: 'Digital Transformation Leadership in the GCC', level: 'Intermediate', modules: 4, lessons: 16 },
]

// ── Request Access Modal ──────────────────────────────────────────────
function RequestModal({ onClose }) {
  const [loading,  setLoading]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [verified, setVerified] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', email:'', message:'' })
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }))

  const ic = "w-full bg-[#1a1a1a] border border-white/[.07] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"

  async function submit() {
    if (!form.name || !form.email || !form.phone) { toast.error('Please fill in all required fields'); return }
    if (!verified) { toast.error('Please complete the security check'); return }
    setLoading(true)
    try {
      await addDoc(collection(db, 'membershipRequests'), {
        ...form,
        service: 'CTO Access Forum University — Membership Request',
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setSent(true)
    } catch { toast.error('Failed to send. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{background:'rgba(0,0,0,.88)', backdropFilter:'blur(10px)'}}>
      <div className="bg-[#111] border border-white/[.07] rounded-[20px] w-full max-w-[460px] overflow-hidden shadow-2xl my-auto" style={{animation:'fadeUp .25s ease'}}>
        <div style={{height:'3px', background:'linear-gradient(90deg,#E5181B,#FF6B6B)'}}/>
        <div className="p-7">
          {!sent ? (
            <>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-[Montserrat] font-black text-[1.05rem] text-white">Request Access</h2>
                  <p className="text-[0.72rem] text-gray-500 mt-1">We'll reply to your email within 24 hours.</p>
                </div>
                <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl leading-none mt-0.5">✕</button>
              </div>
              <div className="flex flex-col gap-3.5">
                <div>
                  <label className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Full Name *</label>
                  <input type="text" placeholder="Your full name" className={ic} value={form.name} onChange={e=>set('name',e.target.value)}/>
                </div>
                <div>
                  <label className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Phone Number *</label>
                  <input type="tel" placeholder="+971 XX XXX XXXX" className={ic} value={form.phone} onChange={e=>set('phone',e.target.value)}/>
                </div>
                <div>
                  <label className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email Address *</label>
                  <input type="email" placeholder="your@email.com" className={ic} value={form.email} onChange={e=>set('email',e.target.value)}/>
                </div>
                <div>
                  <label className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Service / Interest</label>
                  <input type="text" className={ic} readOnly value="CTO Access Forum University — Membership Request"
                    style={{color:'#888', cursor:'default'}}/>
                </div>
                <div>
                  <label className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Message</label>
                  <textarea rows={3} placeholder="Tell us about yourself and why you'd like to join..." className={`${ic} resize-none`}
                    value={form.message} onChange={e=>set('message',e.target.value)}/>
                </div>
                {/* Security check */}
                <div className="bg-[#1a1a1a] border border-white/[.07] rounded-[10px] p-3">
                  <p className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-2">Security Check *</p>
                  {!verified ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-9 bg-[#222] rounded-lg border border-white/[.06] flex items-center px-3 gap-2">
                        <div className="h-px flex-1 border-t border-dashed border-white/10"/>
                        <span className="text-[0.65rem] text-gray-600">drag to verify</span>
                      </div>
                      <button onClick={()=>setVerified(true)}
                        className="text-[0.72rem] text-[#E5181B] font-[Montserrat] font-bold hover:underline whitespace-nowrap">
                        ✓ I'm human
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-400">
                      <span>✓</span>
                      <span className="text-[0.75rem] font-[Montserrat] font-bold">Verified</span>
                    </div>
                  )}
                </div>
                <button onClick={submit} disabled={loading}
                  className="w-full py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-[Montserrat] font-bold text-[0.82rem] rounded-[10px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1">
                  {loading
                    ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : 'Send Request →'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="font-[Montserrat] font-black text-[1.05rem] text-white mb-2">Request Sent!</h2>
              <p className="text-[0.78rem] text-gray-400 leading-relaxed mb-2">
                Thank you, <strong className="text-white">{form.name}</strong>. We've received your membership request.
              </p>
              <p className="text-[0.73rem] text-gray-500 mb-6">We'll reply to <strong className="text-white">{form.email}</strong> within 24 hours.</p>
              <button onClick={onClose} className="w-full py-2.5 bg-white/[.05] border border-white/[.08] text-white font-[Montserrat] font-bold text-[0.82rem] rounded-[10px] hover:bg-white/[.08] transition-all">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Landing Page ──────────────────────────────────────────────────────
export default function LandingPage({ onEnter }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      {showModal && <RequestModal onClose={() => setShowModal(false)} />}

      <div className="min-h-screen bg-[#080808] text-white font-[Poppins] overflow-x-hidden">
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
          @keyframes float  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-8px) } }
          .fade-up  { animation: fadeUp .55s ease both }
          .delay-1  { animation-delay:.1s }
          .delay-2  { animation-delay:.2s }
          .delay-3  { animation-delay:.3s }
          .delay-4  { animation-delay:.4s }
          .red-glow { box-shadow: 0 0 60px rgba(229,24,27,.12) }
          .card-hover { transition: transform .2s, border-color .2s }
          .card-hover:hover { transform: translateY(-3px); border-color: rgba(229,24,27,.2) !important }
        `}</style>

        {/* ── Navbar ── */}
        <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4"
          style={{background:'rgba(8,8,8,.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,.04)'}}>
          <img src={LOGO} alt="CAFU" className="h-8 w-auto object-contain"/>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowModal(true)}
              className="text-[0.75rem] font-[Montserrat] font-bold text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Request Access
            </button>
            <button onClick={onEnter}
              className="text-[0.75rem] font-[Montserrat] font-bold bg-[#E5181B] hover:bg-[#C01215] text-white px-4 py-1.5 rounded-[8px] transition-all">
              Sign In
            </button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="relative min-h-screen flex items-center justify-center text-center px-6 pt-20">
          {/* Background glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
            style={{background:'radial-gradient(ellipse, rgba(229,24,27,.07) 0%, transparent 70%)'}}/>

          <div className="relative z-10 max-w-[720px] mx-auto">
            <div className="fade-up">
              <img src={LOGO} alt="CTO Access Forum University" className="h-20 w-auto object-contain mx-auto mb-6" style={{animation:'float 4s ease-in-out infinite'}}/>
            </div>
            <div className="fade-up delay-1 inline-flex items-center gap-2 bg-[#E5181B]/10 border border-[#E5181B]/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5181B] animate-pulse"/>
              <span className="text-[0.68rem] font-[Montserrat] font-bold text-[#E5181B] tracking-widest uppercase">Invite-Only Platform</span>
            </div>
            <h1 className="fade-up delay-2 font-[Montserrat] font-black text-[2.6rem] leading-[1.1] mb-6 tracking-tight" style={{lineHeight:'1.12'}}>
              Where UAE's Top <br/>
              <span className="text-[#E5181B]">Technology Leaders</span><br/>
              Come to Grow
            </h1>
            <p className="fade-up delay-3 text-[0.92rem] text-gray-400 leading-relaxed max-w-[520px] mx-auto mb-10">
              An exclusive learning community for CTOs, IT Directors, and technology executives in the UAE and GCC. Courses built for real decision-makers.
            </p>
            <div className="fade-up delay-4 flex items-center justify-center gap-4 flex-wrap">
              <button onClick={() => setShowModal(true)}
                className="font-[Montserrat] font-black text-[0.85rem] bg-[#E5181B] hover:bg-[#C01215] text-white px-8 py-3.5 rounded-[12px] transition-all red-glow">
                Request Access →
              </button>
              <button onClick={onEnter}
                className="font-[Montserrat] font-bold text-[0.85rem] bg-white/[.05] border border-white/[.09] hover:bg-white/[.08] text-white px-8 py-3.5 rounded-[12px] transition-all">
                Sign In
              </button>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-14 px-6 border-t border-b border-white/[.04]">
          <div className="max-w-[900px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(s => (
              <div key={s.n} className="text-center">
                <div className="font-[Montserrat] font-black text-[2rem] text-white">{s.n}</div>
                <div className="text-[0.72rem] text-gray-500 font-[Montserrat] font-bold uppercase tracking-widest mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-20 px-6">
          <div className="max-w-[960px] mx-auto">
            <div className="text-center mb-14">
              <div className="text-[0.65rem] font-[Montserrat] font-bold text-[#E5181B] tracking-[.2em] uppercase mb-3">Why Join</div>
              <h2 className="font-[Montserrat] font-black text-[1.8rem] text-white">Built for Leaders.<br/>Not just learners.</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map(f => (
                <div key={f.t} className="card-hover bg-[#0f0f0f] border border-white/[.06] rounded-[16px] p-6">
                  <div className="text-2xl mb-4">{f.icon}</div>
                  <h3 className="font-[Montserrat] font-black text-[0.9rem] text-white mb-2">{f.t}</h3>
                  <p className="text-[0.76rem] text-gray-500 leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Courses preview ── */}
        <section className="py-20 px-6 border-t border-white/[.04]">
          <div className="max-w-[960px] mx-auto">
            <div className="text-center mb-14">
              <div className="text-[0.65rem] font-[Montserrat] font-bold text-[#E5181B] tracking-[.2em] uppercase mb-3">Curriculum</div>
              <h2 className="font-[Montserrat] font-black text-[1.8rem] text-white">Courses Made for<br/><span className="text-[#E5181B]">Real-World Impact</span></h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {COURSES.map(c => (
                <div key={c.title} className="card-hover bg-[#0f0f0f] border border-white/[.06] rounded-[16px] p-6 flex flex-col gap-4">
                  <span className="inline-flex self-start text-[0.62rem] font-[Montserrat] font-black px-2.5 py-1 rounded-full uppercase tracking-wider"
                    style={{background:`${c.color}18`, color: c.color, border:`1px solid ${c.color}30`}}>
                    {c.cat}
                  </span>
                  <h3 className="font-[Montserrat] font-black text-[0.88rem] text-white leading-snug">{c.title}</h3>
                  <div className="flex items-center gap-4 text-[0.7rem] text-gray-500 mt-auto">
                    <span>🎯 {c.level}</span>
                    <span>📚 {c.modules} Modules</span>
                    <span>🎬 {c.lessons} Lessons</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <p className="text-[0.75rem] text-gray-600">+ many more courses across Cloud, Security, AI, and Leadership</p>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-6">
          <div className="max-w-[620px] mx-auto text-center">
            <div className="bg-[#0f0f0f] border border-white/[.06] rounded-[24px] p-12 red-glow">
              <div className="text-4xl mb-5">🚀</div>
              <h2 className="font-[Montserrat] font-black text-[1.7rem] text-white mb-4">Ready to Level Up?</h2>
              <p className="text-[0.82rem] text-gray-400 leading-relaxed mb-8">
                Join an exclusive community of UAE technology leaders. Apply for membership and get your invite code within 24 hours.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button onClick={() => setShowModal(true)}
                  className="font-[Montserrat] font-black text-[0.85rem] bg-[#E5181B] hover:bg-[#C01215] text-white px-8 py-3.5 rounded-[12px] transition-all">
                  Request Access →
                </button>
                <button onClick={onEnter}
                  className="font-[Montserrat] font-bold text-[0.82rem] text-gray-500 hover:text-white transition-colors">
                  Already a member? Sign In
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/[.04] py-8 px-6 text-center">
          <img src={LOGO} alt="CAFU" className="h-7 w-auto object-contain mx-auto mb-3"/>
          <p className="text-[0.65rem] text-gray-600">© {new Date().getFullYear()} CTO Access Forum University · university.redjemie.com</p>
          <p className="text-[0.62rem] text-gray-700 mt-1">An RJ Global Technologies Platform</p>
        </footer>
      </div>
    </>
  )
}
