import { useState, useCallback, useRef } from 'react'
import RequestModal from '@/pages/RequestModal'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

// ── Main AuthPage ─────────────────────────────────────────────────────
export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [tab,           setTab]           = useState('signin')
  const [loading,       setLoading]       = useState(false)
  const [showPass,      setShowPass]      = useState(false)
  const [showPass2,     setShowPass2]     = useState(false)
  const [attempts,      setAttempts]      = useState(0)
  const [lockedUntil,   setLockedUntil]   = useState(0)
  const [showRequest,   setShowRequest]   = useState(false)

  const [nameVal,  setNameVal]  = useState('')
  const [emailVal, setEmailVal] = useState('')
  const [passVal,  setPassVal]  = useState('')
  const [codeVal,  setCodeVal]  = useState('')
  const [resetVal, setResetVal] = useState('')

  const togglePass  = useCallback(() => setShowPass(v => !v),  [])
  const togglePass2 = useCallback(() => setShowPass2(v => !v), [])

  async function handleSignIn() {
    if (Date.now() < lockedUntil) { toast.error(`Too many attempts. Try again in ${Math.ceil((lockedUntil-Date.now())/60000)} min.`); return }
    if (!emailVal || !passVal) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try { await signIn(emailVal, passVal) }
    catch(e) {
      const n = attempts + 1; setAttempts(n)
      if (n >= 5) { setLockedUntil(Date.now()+900000); setAttempts(0) }
      const msgs = {'auth/user-not-found':'No account with this email.','auth/wrong-password':'Incorrect password.','auth/invalid-credential':'Invalid email or password.'}
      toast.error(msgs[e.code] || e.message)
    } finally { setLoading(false) }
  }

  async function handleSignUp() {
    if (!nameVal||!emailVal||!passVal||!codeVal) { toast.error('All fields including invite code are required'); return }
    if (passVal.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try { await signUp(nameVal.trim(), emailVal.trim(), passVal, codeVal.trim()); setTab('check-email') }
    catch(e) {
      const msgs = {'auth/email-already-in-use':'An account with this email already exists.'}
      toast.error(msgs[e.code] || e.message)
    } finally { setLoading(false) }
  }

  async function handleReset() {
    if (!resetVal) { toast.error('Enter your email'); return }
    setLoading(true)
    try { await resetPassword(resetVal); toast.success('Reset link sent!'); setTab('signin') }
    catch(e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const ic = "w-full bg-[#1E1E1E] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"
  const bc = "w-full py-2.5 font-[Montserrat] font-bold text-[0.82rem] rounded-[10px] transition-all disabled:opacity-50 cursor-pointer border-0"

  const EyeIcon = ({show}) => show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  )

  const Divider = () => (
    <div className="relative my-1 text-center">
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[.06]"/>
      <span className="relative bg-[#161616] px-2.5 text-[0.7rem] text-gray-500">or</span>
    </div>
  )

  const TabBar = ({active}) => (
    <div className="flex bg-[#1E1E1E] border border-white/[.06] rounded-[10px] p-0.5 gap-0.5 mb-6">
      <button type="button" onClick={()=>setTab('signin')} className={`flex-1 py-2 rounded-[8px] text-[0.76rem] font-bold font-[Montserrat] transition-all ${active==='signin'?'bg-[#E5181B] text-white':'text-gray-500 hover:text-white'}`}>Sign In</button>
      <button type="button" onClick={()=>setTab('signup')} className={`flex-1 py-2 rounded-[8px] text-[0.76rem] font-bold font-[Montserrat] transition-all ${active==='signup'?'bg-[#E5181B] text-white':'text-gray-500 hover:text-white'}`}>Create Account</button>
    </div>
  )

  const Spin = () => <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>

  return (
    <>
      {showRequest && <RequestModal onClose={() => setShowRequest(false)} />}

      <div className="min-h-screen flex items-center justify-center bg-[#080808] p-5">
        <div className="w-full max-w-[420px]">

          {/* ── Logo ── */}
          <div className="text-center mb-8 animate-fadeUp">
            <img
              src="https://www.redjemie.com/cafu-logo.png"
              alt="CTO Access Forum University"
              className="h-14 w-auto object-contain mx-auto mb-3"
            />
            <div className="font-[Montserrat] text-[0.95rem] font-black tracking-wide text-white">
              CTO ACCESS <span className="text-[#E5181B]">FORUM</span>
            </div>
            <div className="text-[0.52rem] font-bold tracking-[.22em] text-gray-500 uppercase mt-0.5">
              University Platform
            </div>
          </div>

          <div className="bg-[#161616] border border-white/[.06] rounded-[18px] p-8 red-topline animate-fadeUp" style={{boxShadow:'0 24px 60px rgba(0,0,0,.6)'}}>

            {tab==='signin' && (
              <div className="animate-fadeIn">
                <TabBar active="signin"/>
                <div className="flex flex-col gap-4">
                  <input id="si-email" name="email" type="email" placeholder="Email address"
                    defaultValue="" autoComplete="email" className={ic}
                    onChange={e => setEmailVal(e.target.value)}/>
                  <div>
                    <div className="relative">
                      <input id="si-pass" name="password" type={showPass?'text':'password'}
                        placeholder="Password" defaultValue="" autoComplete="current-password"
                        className={`${ic} pr-11`}
                        onChange={e => setPassVal(e.target.value)}/>
                      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={togglePass} tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1">
                        <EyeIcon show={showPass}/>
                      </button>
                    </div>
                    <button type="button" onClick={()=>setTab('reset')} className="text-[0.68rem] text-gray-500 hover:text-gray-300 mt-1.5 float-right">Forgot password?</button>
                  </div>
                  <button type="button" onClick={handleSignIn} disabled={loading}
                    className={`${bc} bg-[#E5181B] hover:bg-[#C01215] text-white mt-1`}>
                    {loading?<Spin/>:'Sign In'}
                  </button>
                  <Divider/>
                  {/* Request Access replaces Google */}
                  <button type="button" onClick={() => setShowRequest(true)}
                    className={`${bc} bg-white/[.04] border border-white/[.08] text-white hover:bg-white/[.07] flex items-center justify-center gap-2`}>
                    <span className="text-base">🎓</span> Request Access
                  </button>
                </div>
              </div>
            )}

            {tab==='signup' && (
              <div className="animate-fadeIn">
                <TabBar active="signup"/>
                <div className="flex flex-col gap-3.5">
                  <input id="su-name" name="fullname" type="text" placeholder="Full name"
                    defaultValue="" autoComplete="name" className={ic}
                    onChange={e => setNameVal(e.target.value)}/>
                  <input id="su-email" name="email" type="email" placeholder="Email address"
                    defaultValue="" autoComplete="email" className={ic}
                    onChange={e => setEmailVal(e.target.value)}/>
                  <div className="relative">
                    <input id="su-pass" name="password" type={showPass2?'text':'password'}
                      placeholder="Password (min 8 characters)" defaultValue=""
                      autoComplete="new-password" className={`${ic} pr-11`}
                      onChange={e => setPassVal(e.target.value)}/>
                    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={togglePass2} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1">
                      <EyeIcon show={showPass2}/>
                    </button>
                  </div>
                  <div>
                    <input id="su-code" name="invitecode" type="text" placeholder="Invite Code"
                      defaultValue="" autoComplete="off" className={`${ic} tracking-widest uppercase`}
                      onChange={e => setCodeVal(e.target.value.toUpperCase())}/>
                    <p className="text-[0.67rem] text-gray-500 mt-1.5">Have an invite code? Enter it above to join.</p>
                  </div>
                  <button type="button" onClick={handleSignUp} disabled={loading}
                    className={`${bc} bg-[#E5181B] hover:bg-[#C01215] text-white mt-1`}>
                    {loading?<Spin/>:'🚀 Create Account'}
                  </button>
                  <Divider/>
                  <button type="button" onClick={() => setShowRequest(true)}
                    className={`${bc} bg-white/[.04] border border-white/[.08] text-white hover:bg-white/[.07] flex items-center justify-center gap-2`}>
                    <span className="text-base">🎓</span> Request Access
                  </button>
                </div>
              </div>
            )}

            {tab==='reset' && (
              <div className="animate-fadeIn text-center">
                <div className="text-4xl mb-3">🔐</div>
                <h2 className="font-[Montserrat] font-black text-[1rem] mb-2">Reset Password</h2>
                <p className="text-[0.8rem] text-gray-400 mb-5">Enter your email and we'll send a reset link.</p>
                <div className="flex flex-col gap-3">
                  <input id="re-email" name="resetemail" type="email" placeholder="Email address"
                    defaultValue="" autoComplete="email" className={ic}
                    onChange={e => setResetVal(e.target.value)}/>
                  <button type="button" onClick={handleReset} disabled={loading}
                    className={`${bc} bg-[#E5181B] hover:bg-[#C01215] text-white`}>
                    {loading?<Spin/>:'Send Reset Link'}
                  </button>
                  <button type="button" onClick={()=>setTab('signin')}
                    className={`${bc} bg-white/[.04] border border-white/[.08] text-white`}>← Back</button>
                </div>
              </div>
            )}

            {tab==='check-email' && (
              <div className="animate-fadeIn text-center">
                <div className="text-5xl mb-4">📧</div>
                <h2 className="font-[Montserrat] font-black text-[1.05rem] mb-2">Check your email</h2>
                <p className="text-[0.8rem] text-gray-400 leading-relaxed mb-4">
                  We sent a verification link to <strong className="text-white">{emailVal}</strong>. Click it to verify, then wait for admin approval.
                </p>
                <div className="bg-amber-900/20 border border-amber-500/25 rounded-[10px] p-4 text-left mb-4">
                  <div className="font-[Montserrat] text-[0.73rem] font-bold text-amber-300 mb-1">⏳ Pending Approval</div>
                  <p className="text-[0.71rem] text-amber-200/70 leading-relaxed">After verifying your email, the admin will review and approve your account.</p>
                </div>
                <button type="button" onClick={()=>setTab('signin')}
                  className={`${bc} bg-white/[.04] border border-white/[.08] text-white`}>Back to Sign In</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
