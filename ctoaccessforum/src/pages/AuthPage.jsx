import { useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import RequestModal from '@/pages/RequestModal'
import toast from 'react-hot-toast'

// ── SVG Icons ─────────────────────────────────────────────────────────
const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const KeyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
)
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const TicketIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
  </svg>
)
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const Spinner = () => (
  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
)

// ── Input with left icon ──────────────────────────────────────────────
function Input({ icon: Icon, type = 'text', placeholder, autoComplete, onChange, className = '', rightSlot }) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3.5 text-gray-600 pointer-events-none"><Icon /></span>
      <input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={onChange}
        className={`w-full bg-[#1E1E1E] border border-white/[.06] rounded-[10px] pl-10 pr-${rightSlot ? '11' : '4'} py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors ${className}`}
      />
      {rightSlot}
    </div>
  )
}

// ── Main AuthPage ─────────────────────────────────────────────────────
export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth()

  const [tab,         setTab]         = useState('signin')
  const [loading,     setLoading]     = useState(false)
  const [showPass,    setShowPass]    = useState(false)
  const [showPass2,   setShowPass2]   = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [attempts,    setAttempts]    = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)

  const [nameVal,  setNameVal]  = useState('')
  const [emailVal, setEmailVal] = useState('')
  const [passVal,  setPassVal]  = useState('')
  const [codeVal,  setCodeVal]  = useState('')
  const [resetVal, setResetVal] = useState('')

  const togglePass  = useCallback(() => setShowPass(v => !v),  [])
  const togglePass2 = useCallback(() => setShowPass2(v => !v), [])

  async function handleSignIn() {
    if (Date.now() < lockedUntil) { toast.error(`Too many attempts. Try again in ${Math.ceil((lockedUntil - Date.now()) / 60000)} min.`); return }
    if (!emailVal || !passVal) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try { await signIn(emailVal, passVal) }
    catch (e) {
      const n = attempts + 1; setAttempts(n)
      if (n >= 5) { setLockedUntil(Date.now() + 900000); setAttempts(0) }
      const msgs = { 'auth/user-not-found': 'No account with this email.', 'auth/wrong-password': 'Incorrect password.', 'auth/invalid-credential': 'Invalid email or password.' }
      toast.error(msgs[e.code] || e.message)
    } finally { setLoading(false) }
  }

  async function handleSignUp() {
    if (!nameVal || !emailVal || !passVal || !codeVal) { toast.error('All fields including invite code are required'); return }
    if (passVal.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try { await signUp(nameVal.trim(), emailVal.trim(), passVal, codeVal.trim()); setTab('check-email') }
    catch (e) {
      const msgs = { 'auth/email-already-in-use': 'An account with this email already exists.' }
      toast.error(msgs[e.code] || e.message)
    } finally { setLoading(false) }
  }

  async function handleReset() {
    if (!resetVal) { toast.error('Enter your email'); return }
    setLoading(true)
    try { await resetPassword(resetVal); toast.success('Reset link sent!'); setTab('signin') }
    catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const bc = "w-full py-2.5 font-[Montserrat] font-bold text-[0.82rem] rounded-[10px] transition-all disabled:opacity-50 cursor-pointer border-0"

  const TabBar = ({ active }) => (
    <div className="flex bg-[#1E1E1E] border border-white/[.06] rounded-[10px] p-0.5 gap-0.5 mb-6">
      {['signin', 'signup'].map((t, i) => (
        <button key={t} type="button" onClick={() => setTab(t)}
          className={`flex-1 py-2 rounded-[8px] text-[0.76rem] font-bold font-[Montserrat] transition-all ${active === t ? 'bg-[#E5181B] text-white' : 'text-gray-500 hover:text-white'}`}>
          {i === 0 ? 'Sign In' : 'Create Account'}
        </button>
      ))}
    </div>
  )

  const EyeBtn = ({ show, toggle }) => (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={toggle} tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1">
      {show ? <EyeOpen /> : <EyeOff />}
    </button>
  )

  return (
    <>
      {showRequest && <RequestModal onClose={() => setShowRequest(false)} />}

      <div className="min-h-screen flex items-center justify-center bg-[#080808] p-5">
        <div className="w-full max-w-[420px]">

          {/* ── Logo ── */}
          <div className="text-center mb-8">
            <img
              src="https://www.redjemie.com/cafu-logo.png"
              alt="CTO Access Forum University"
              className="h-14 w-auto object-contain mx-auto mb-3"
            />
            <div className="font-[Montserrat] text-[0.95rem] font-black tracking-wide text-white">
              CTO ACCESS <span className="text-[#E5181B]">FORUM</span>
            </div>
            <div className="text-[0.5rem] font-bold tracking-[.24em] text-gray-500 uppercase mt-0.5">
              University Platform
            </div>
          </div>

          <div className="bg-[#161616] border border-white/[.06] rounded-[18px] p-8"
            style={{ boxShadow: '0 24px 60px rgba(0,0,0,.6)', borderTop: '3px solid #E5181B' }}>

            {/* ── Sign In ── */}
            {tab === 'signin' && (
              <div>
                <TabBar active="signin" />
                <div className="flex flex-col gap-4">
                  <Input icon={MailIcon} type="email" placeholder="Email address"
                    autoComplete="email" onChange={e => setEmailVal(e.target.value)} />
                  <div className="relative">
                    <Input icon={LockIcon} type={showPass ? 'text' : 'password'}
                      placeholder="Password" autoComplete="current-password"
                      onChange={e => setPassVal(e.target.value)}
                      rightSlot={<EyeBtn show={showPass} toggle={togglePass} />} />
                    <button type="button" onClick={() => setTab('reset')}
                      className="text-[0.68rem] text-gray-500 hover:text-gray-300 mt-1.5 float-right transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <button type="button" onClick={handleSignIn} disabled={loading}
                    className={`${bc} bg-[#E5181B] hover:bg-[#C01215] text-white mt-1`}>
                    {loading ? <Spinner /> : 'Sign In'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Create Account ── */}
            {tab === 'signup' && (
              <div>
                <TabBar active="signup" />
                <div className="flex flex-col gap-3.5">
                  <Input icon={UserIcon} type="text" placeholder="Full name"
                    autoComplete="name" onChange={e => setNameVal(e.target.value)} />
                  <Input icon={MailIcon} type="email" placeholder="Email address"
                    autoComplete="email" onChange={e => setEmailVal(e.target.value)} />
                  <div className="relative">
                    <Input icon={LockIcon} type={showPass2 ? 'text' : 'password'}
                      placeholder="Password (min 8 characters)" autoComplete="new-password"
                      onChange={e => setPassVal(e.target.value)}
                      rightSlot={<EyeBtn show={showPass2} toggle={togglePass2} />} />
                  </div>
                  <div>
                    <Input icon={TicketIcon} type="text" placeholder="Invite Code"
                      autoComplete="off"
                      onChange={e => setCodeVal(e.target.value.toUpperCase())}
                      className="tracking-widest uppercase" />
                    <p className="text-[0.65rem] text-gray-600 mt-1.5 leading-relaxed">
                      An invite code is required to register.{' '}
                      <button type="button" onClick={() => setShowRequest(true)}
                        className="text-[#E5181B] hover:underline font-medium">
                        Request access →
                      </button>
                    </p>
                  </div>
                  <button type="button" onClick={handleSignUp} disabled={loading}
                    className={`${bc} bg-[#E5181B] hover:bg-[#C01215] text-white mt-1`}>
                    {loading ? <Spinner /> : 'Create Account'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Reset Password ── */}
            {tab === 'reset' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-[9px] bg-[#E5181B]/10 border border-[#E5181B]/20 flex items-center justify-center text-[#E5181B] flex-shrink-0">
                    <LockIcon />
                  </div>
                  <div>
                    <h2 className="font-[Montserrat] font-black text-[0.95rem] text-white">Reset Password</h2>
                    <p className="text-[0.7rem] text-gray-500 mt-0.5">We'll send a reset link to your email.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Input icon={MailIcon} type="email" placeholder="Email address"
                    autoComplete="email" onChange={e => setResetVal(e.target.value)} />
                  <button type="button" onClick={handleReset} disabled={loading}
                    className={`${bc} bg-[#E5181B] hover:bg-[#C01215] text-white flex items-center justify-center gap-2`}>
                    {loading ? <Spinner /> : <><SendIcon /> Send Reset Link</>}
                  </button>
                  <button type="button" onClick={() => setTab('signin')}
                    className={`${bc} bg-white/[.04] border border-white/[.08] text-gray-400 hover:text-white`}>
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* ── Check Email ── */}
            {tab === 'check-email' && (
              <div className="text-center">
                <div className="w-12 h-12 rounded-[12px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                  <MailIcon />
                </div>
                <h2 className="font-[Montserrat] font-black text-[1rem] mb-2">Check your email</h2>
                <p className="text-[0.78rem] text-gray-400 leading-relaxed mb-4">
                  We sent a verification link to <strong className="text-white">{emailVal}</strong>.
                  Click it to verify your email, then wait for admin approval.
                </p>
                <div className="bg-amber-900/10 border border-amber-500/20 rounded-[10px] p-4 text-left mb-5">
                  <div className="font-[Montserrat] text-[0.7rem] font-bold text-amber-400 mb-1 uppercase tracking-wide">Pending Approval</div>
                  <p className="text-[0.7rem] text-amber-200/60 leading-relaxed">After email verification, the admin will review and approve your account before you can log in.</p>
                </div>
                <button type="button" onClick={() => setTab('signin')}
                  className={`${bc} bg-white/[.04] border border-white/[.08] text-gray-400 hover:text-white`}>
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
