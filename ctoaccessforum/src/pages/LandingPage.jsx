import { useState } from 'react'
import RequestModal from '@/pages/RequestModal'

const LOGO = 'https://www.redjemie.com/cafu-logo.png'

const STATS = [
  { n: '500+', l: 'Members' },
  { n: '30+',  l: 'Courses' },
  { n: '15+',  l: 'Instructors' },
  { n: 'UAE',  l: 'Focused Content' },
]

// ── SVG Icons ─────────────────────────────────────────────────────────
const Icons = {
  GraduationCap: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5"/>
    </svg>
  ),
  Award: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  ),
  Users: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Mobile: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  Shield: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Zap: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  BookOpen: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Layers: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  Video: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  Target: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Rocket: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
}

const FEATURES = [
  { Icon: Icons.GraduationCap, color: '#E5181B', bg: 'rgba(229,24,27,.08)', t: 'Expert-Led Courses',    d: 'Learn from active CTOs, VPs, and senior IT leaders across the UAE and GCC.' },
  { Icon: Icons.Award,         color: '#F59E0B', bg: 'rgba(245,158,11,.08)', t: 'Verified Certificates', d: 'Earn digitally verifiable certificates recognised by top employers in the region.' },
  { Icon: Icons.Users,         color: '#3B82F6', bg: 'rgba(59,130,246,.08)', t: 'Exclusive Community',   d: 'Invite-only network of IT decision-makers, innovators, and business leaders.' },
  { Icon: Icons.Mobile,        color: '#8B5CF6', bg: 'rgba(139,92,246,.08)', t: 'Learn Anywhere',        d: 'Full mobile experience — study on the go, track your progress, resume any time.' },
  { Icon: Icons.Shield,        color: '#10B981', bg: 'rgba(16,185,129,.08)', t: 'UAE & GCC Compliance',  d: 'Curriculum built for UAE regulatory standards, Vision 2031, and local business context.' },
  { Icon: Icons.Zap,           color: '#06B6D4', bg: 'rgba(6,182,212,.08)',  t: 'Live Events & Webinars',d: 'Join live sessions, ask questions, and network with peers in real time.' },
]

const COURSES = [
  { cat: 'UAE Market & Compliance', color: '#E5181B', title: 'Data Protection & Privacy for IT Leaders: UAE & Global Standards',    level: 'Intermediate', modules: 6,  lessons: 22 },
  { cat: 'Cloud & Infrastructure',  color: '#3B82F6', title: 'Cloud Architecture Strategy for Enterprise Leaders',                    level: 'Advanced',     modules: 5,  lessons: 18 },
  { cat: 'AI & Automation',         color: '#8B5CF6', title: 'Generative AI Implementation Roadmap for CTOs',                        level: 'Advanced',     modules: 7,  lessons: 24 },
  { cat: 'Leadership',              color: '#F59E0B', title: 'Digital Transformation Leadership in the GCC',                         level: 'Intermediate', modules: 4,  lessons: 16 },
]

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
          .delay-4  { animation-delay:.45s }
          .red-glow { box-shadow: 0 0 80px rgba(229,24,27,.1) }
          .card-hover { transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease }
          .card-hover:hover { transform: translateY(-4px); border-color: rgba(255,255,255,.1) !important; box-shadow: 0 16px 40px rgba(0,0,0,.4) }
        `}</style>

        {/* ── Navbar ── */}
        <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4"
          style={{background:'rgba(8,8,8,.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,.04)'}}>
          <img src={LOGO} alt="CTO Access Forum University" className="h-8 w-auto object-contain"/>
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
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
            style={{background:'radial-gradient(ellipse, rgba(229,24,27,.06) 0%, transparent 70%)'}}/>

          <div className="relative z-10 max-w-[720px] mx-auto">
            <div className="fade-up">
              <img src={LOGO} alt="CTO Access Forum University"
                className="h-20 w-auto object-contain mx-auto mb-8"
                style={{animation:'float 4s ease-in-out infinite'}}/>
            </div>
            <div className="fade-up delay-1 inline-flex items-center gap-2 bg-[#E5181B]/10 border border-[#E5181B]/20 rounded-full px-4 py-1.5 mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5181B] animate-pulse"/>
              <span className="text-[0.68rem] font-[Montserrat] font-bold text-[#E5181B] tracking-widest uppercase">Invite-Only Platform</span>
            </div>
            <h1 className="fade-up delay-2 font-[Montserrat] font-black mb-6 tracking-tight"
              style={{fontSize:'clamp(2rem,5vw,2.8rem)', lineHeight:'1.1'}}>
              Where UAE's Top<br/>
              <span className="text-[#E5181B]">Technology Leaders</span><br/>
              Come to Grow
            </h1>
            <p className="fade-up delay-3 text-[0.9rem] text-gray-400 leading-relaxed max-w-[500px] mx-auto mb-10">
              An exclusive learning community for CTOs, IT Directors, and technology executives in the UAE and GCC. Courses built for real decision-makers.
            </p>
            <div className="fade-up delay-4 flex items-center justify-center gap-4 flex-wrap">
              <button onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 font-[Montserrat] font-black text-[0.85rem] bg-[#E5181B] hover:bg-[#C01215] text-white px-8 py-3.5 rounded-[12px] transition-all red-glow">
                Request Access <Icons.ArrowRight />
              </button>
              <button onClick={onEnter}
                className="font-[Montserrat] font-bold text-[0.85rem] bg-white/[.05] border border-white/[.09] hover:bg-white/[.08] text-white px-8 py-3.5 rounded-[12px] transition-all">
                Sign In
              </button>
            </div>
          </div>
        </section>

        {/* ── Stats bar ── */}
        <section className="py-14 px-6 border-t border-b border-white/[.04]">
          <div className="max-w-[860px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(s => (
              <div key={s.n} className="text-center">
                <div className="font-[Montserrat] font-black text-[2rem] text-white">{s.n}</div>
                <div className="text-[0.68rem] text-gray-500 font-[Montserrat] font-bold uppercase tracking-widest mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-24 px-6">
          <div className="max-w-[960px] mx-auto">
            <div className="text-center mb-16">
              <div className="text-[0.62rem] font-[Montserrat] font-bold text-[#E5181B] tracking-[.22em] uppercase mb-3">Why Join</div>
              <h2 className="font-[Montserrat] font-black text-[1.9rem] text-white">Built for Leaders.<br/>Not just learners.</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map(({ Icon, color, bg, t, d }) => (
                <div key={t} className="card-hover bg-[#0d0d0d] border border-white/[.06] rounded-[16px] p-6">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-5 flex-shrink-0"
                    style={{ background: bg, color }}>
                    <Icon />
                  </div>
                  <h3 className="font-[Montserrat] font-black text-[0.88rem] text-white mb-2">{t}</h3>
                  <p className="text-[0.75rem] text-gray-500 leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Courses preview ── */}
        <section className="py-24 px-6 border-t border-white/[.04]" style={{background:'#0a0a0a'}}>
          <div className="max-w-[960px] mx-auto">
            <div className="text-center mb-16">
              <div className="text-[0.62rem] font-[Montserrat] font-bold text-[#E5181B] tracking-[.22em] uppercase mb-3">Curriculum</div>
              <h2 className="font-[Montserrat] font-black text-[1.9rem] text-white">Courses Made for<br/><span className="text-[#E5181B]">Real-World Impact</span></h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {COURSES.map(c => (
                <div key={c.title} className="card-hover bg-[#0d0d0d] border border-white/[.06] rounded-[16px] p-6 flex flex-col gap-4">
                  <span className="inline-flex self-start text-[0.6rem] font-[Montserrat] font-black px-2.5 py-1 rounded-full uppercase tracking-wider"
                    style={{background:`${c.color}15`, color:c.color, border:`1px solid ${c.color}25`}}>
                    {c.cat}
                  </span>
                  <h3 className="font-[Montserrat] font-black text-[0.88rem] text-white leading-snug">{c.title}</h3>
                  <div className="flex items-center gap-5 mt-auto pt-3 border-t border-white/[.04]">
                    <span className="flex items-center gap-1.5 text-[0.68rem] text-gray-500">
                      <span style={{color:c.color}}><Icons.Target /></span> {c.level}
                    </span>
                    <span className="flex items-center gap-1.5 text-[0.68rem] text-gray-500">
                      <span className="text-gray-600"><Icons.Layers /></span> {c.modules} Modules
                    </span>
                    <span className="flex items-center gap-1.5 text-[0.68rem] text-gray-500">
                      <span className="text-gray-600"><Icons.Video /></span> {c.lessons} Lessons
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-[0.72rem] text-gray-600 mt-8">
              + many more courses across Cloud, Security, AI, and Leadership
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-6">
          <div className="max-w-[580px] mx-auto text-center">
            <div className="bg-[#0d0d0d] border border-white/[.06] rounded-[24px] p-12 red-glow">
              <div className="w-14 h-14 rounded-[14px] bg-[#E5181B]/10 border border-[#E5181B]/20 flex items-center justify-center mx-auto mb-6 text-[#E5181B]">
                <Icons.Rocket />
              </div>
              <h2 className="font-[Montserrat] font-black text-[1.65rem] text-white mb-4">Ready to Level Up?</h2>
              <p className="text-[0.82rem] text-gray-400 leading-relaxed mb-8">
                Join an exclusive community of UAE technology leaders. Apply for membership and get your invite code within 24 hours.
              </p>
              <div className="flex flex-col items-center gap-4">
                <button onClick={() => setShowModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 font-[Montserrat] font-black text-[0.85rem] bg-[#E5181B] hover:bg-[#C01215] text-white px-8 py-3.5 rounded-[12px] transition-all">
                  Request Access <Icons.ArrowRight />
                </button>
                <button onClick={onEnter}
                  className="inline-flex items-center gap-1.5 font-[Montserrat] font-bold text-[0.78rem] text-gray-500 hover:text-white transition-colors">
                  Already a member? Sign In
                </button>
              </div>

              {/* Trust signals */}
              <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-white/[.05]">
                {['Invite-Only', 'UAE Focused', 'Free to Apply'].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-[0.65rem] text-gray-500">
                    <span className="text-green-500"><Icons.CheckCircle /></span> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/[.04] py-10 px-6 text-center">
          <img src={LOGO} alt="CTO Access Forum University" className="h-7 w-auto object-contain mx-auto mb-4"/>
          <p className="text-[0.65rem] text-gray-600">© {new Date().getFullYear()} CTO Access Forum University · university.redjemie.com</p>
          <p className="text-[0.62rem] text-gray-700 mt-1">An RJ Global Technologies Platform</p>
        </footer>
      </div>
    </>
  )
}
