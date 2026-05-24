import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [tab,         setTab]         = useState('signin')
  const [loading,     setLoading]     = useState(false)
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [code,        setCode]        = useState('')
  const [resetEm,     setResetEm]     = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [showPass2,   setShowPass2]   = useState(false)
  const [attempts,    setAttempts]    = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)

  async function handleSignIn() {
    if (Date.now() < lockedUntil) { toast.error(`Too many attempts. Try again in ${Math.ceil((lockedUntil-Date.now())/60000)} min.`); return }
    if (!email || !password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try { await signIn(email, password) }
    catch(e) {
      const n = attempts + 1; setAttempts(n)
      if (n >= 5) { setLockedUntil(Date.now()+900000); setAttempts(0) }
      const msgs = {'auth/user-not-found':'No account with this email.','auth/wrong-password':'Incorrect password.','auth/invalid-credential':'Invalid email or password.'}
      toast.error(msgs[e.code] || e.message)
    } finally { setLoading(false) }
  }

  async function handleSignUp() {
    if (!name||!email||!password||!code) { toast.error('All fields including invite code are required'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try { await signUp(name.trim(), email.trim(), password, code.trim()); setTab('check-email') }
    catch(e) {
      const msgs = {'auth/email-already-in-use':'An account with this email already exists.'}
      toast.error(msgs[e.code] || e.message)
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setLoading(true)
    try { await signInWithGoogle(null) }
    catch(e) {
      if (e.message === 'NEEDS_INVITE_CODE') setTab('google-code')
      else if (e.code !== 'auth/popup-closed-by-user') toast.error(e.message)
    } finally { setLoading(false) }
  }

  async function handleGoogleWithCode() {
    if (!code) { toast.error('Enter your invite code'); return }
    setLoading(true)
    try { await signInWithGoogle(code.trim()) }
    catch(e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function handleReset() {
    if (!resetEm) { toast.error('Enter your email'); return }
    setLoading(true)
    try { await resetPassword(resetEm); toast.success('Reset link sent!'); setTab('signin') }
    catch(e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const ic = "w-full bg-[#1E1E1E] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-all"
  const bc = "w-full py-2.5 font-[Montserrat] font-bold text-[0.82rem] rounded-[10px] transition-all disabled:opacity-50 cursor-pointer border-0"

  const Eye = ({show}) => show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  )

  const PwdInput = ({id, name, value, onChange, placeholder, autoComplete, show, toggle}) => (
    <div className="relative">
      <input id={id} name={name} type={show?'text':'password'} placeholder={placeholder}
        value={value} onChange={onChange} autoComplete={autoComplete}
        className={`${ic} pr-11`}/>
      <button type="button" onClick={toggle} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
        <Eye show={show}/>
      </button>
    </div>
  )

  const GBtn = ({label='Continue with Google'}) => (
    <button type="button" onClick={handleGoogle} disabled={loading}
      className={`${bc} bg-white/[.04] border border-white/[.08] text-white hover:bg-white/[.07] flex items-center justify-center gap-2.5`}>
      <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/></svg>
      {label}
    </button>
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

  const Spinner = () => <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808] p-5">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8 animate-fadeUp">
          <div className="w-12 h-12 bg-[#E5181B] rounded-[10px] flex items-center justify-center font-[Montserrat] font-black text-sm text-white mx-auto mb-4">CTO</div>
          <div className="font-[Montserrat] text-xl font-black tracking-wide">ACCESS <span className="text-[#E5181B]">FORUM</span></div>
          <div className="text-[0.52rem] font-bold tracking-[.22em] text-gray-500 uppercase mt-1">University Platform</div>
        </div>

        <div className="bg-[#161616] border border-white/[.06] rounded-[18px] p-8 red-topline animate-fadeUp" style={{boxShadow:'0 24px 60px rgba(0,0,0,.6)'}}>

          {tab==='signin' && (
            <div className="animate-fadeIn">
              <TabBar active="signin"/>
              <div className="flex flex-col gap-4">
                <input id="si-email" name="email" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className={ic}/>
                <div>
                  <PwdInput id="si-pass" name="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" show={showPass} toggle={()=>setShowPass(!showPass)}/>
                  <button type="button" onClick={()=>setTab('reset')} className="text-[0.68rem] text-gray-500 hover:text-gray-300 mt-1.5 float-right">Forgot password?</button>
                </div>
                <button type="button" onClick={handleSignIn} disabled={loading} className={`${bc} bg-[#E5181B] hover:bg-[#C01215] text-white mt-1`}>{loading?<Spinner/>:'Sign In'}</button>
                <Divider/>
                <GBtn/>
              </div>
            </div>
          )}

          {tab==='signup' && (
            <div className="animate-fadeIn">
              <TabBar active="signup"/>
              <div className="flex flex-col gap-3.5">
                <input id="su-name" name="fullname" type="text" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className={ic}/>
                <input id="su-email" name="email" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className={ic}/>
                <PwdInput id="su-pass" name="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min 8 characters)" autoComplete="new-password" show={showPass2} toggle={()=>setShowPass2(!showPass2)}/>
                <div>
                  <input id="su-code" name="invitecode" type="text" placeholder="Invite code e.g. CTOADMIN1" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} autoComplete="off" className={`${ic} tracking-widest`}/>
                  <p className="text-[0.67rem] text-gray-500 mt-1.5">Required to join — get your code from the admin.</p>
                </div>
                <button type="button" onClick={handleSignUp} disabled={loading} className={`${bc} bg-[#E5181B] hover:bg-[#C01215] text-white mt-1`}>{loading?<Spinner/>:'🚀 Create Account'}</button>
                <Divider/>
                <GBtn label="Sign up with Google"/>
              </div>
            </div>
          )}

          {tab==='google-code' && (
            <div className="animate-fadeIn text-center">
              <div className="text-4xl mb-3">🔑</div>
              <h2 className="font-[Montserrat] font-black text-[1rem] mb-2">One more step</h2>
              <p className="text-[0.8rem] text-gray-400 mb-5">Enter your invite code to join.</p>
              <div className="flex flex-col gap-3">
                <input id="gc-code" name="googlecode" type="text" placeholder="Invite code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} className={`${ic} tracking-widest`}/>
                <button type="button" onClick={handleGoogleWithCode} disabled={loading} className={`${bc} bg-[#E5181B] hover:bg-[#C01215] text-white`}>{loading?<Spinner/>:'Continue →'}</button>
                <button type="button" onClick={()=>setTab('signin')} className={`${bc} bg-white/[.04] border border-white/[.08] text-white`}>← Back</button>
              </div>
            </div>
          )}

          {tab==='reset' && (
            <div className="animate-fadeIn text-center">
              <div className="text-4xl mb-3">🔐</div>
              <h2 className="font-[Montserrat] font-black text-[1rem] mb-2">Reset Password</h2>
              <p className="text-[0.8rem] text-gray-400 mb-5">Enter your email and we'll send a reset link.</p>
              <div className="flex flex-col gap-3">
                <input id="re-email" name="resetemail" type="email" placeholder="Email address" value={resetEm} onChange={e=>setResetEm(e.target.value)} autoComplete="email" className={ic}/>
                <button type="button" onClick={handleReset} disabled={loading} className={`${bc} bg-[#E5181B] hover:bg-[#C01215] text-white`}>{loading?<Spinner/>:'Send Reset Link'}</button>
                <button type="button" onClick={()=>setTab('signin')} className={`${bc} bg-white/[.04] border border-white/[.08] text-white`}>← Back</button>
              </div>
            </div>
          )}

          {tab==='check-email' && (
            <div className="animate-fadeIn text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="font-[Montserrat] font-black text-[1.05rem] mb-2">Check your email</h2>
              <p className="text-[0.8rem] text-gray-400 leading-relaxed mb-4">We sent a verification link to <strong className="text-white">{email}</strong>. Click it to verify, then wait for admin approval.</p>
              <div className="bg-amber-900/20 border border-amber-500/25 rounded-[10px] p-4 text-left mb-4">
                <div className="font-[Montserrat] text-[0.73rem] font-bold text-amber-300 mb-1">⏳ Pending Approval</div>
                <p className="text-[0.71rem] text-amber-200/70 leading-relaxed">After verifying your email, the admin will review and approve your account.</p>
              </div>
              <button type="button" onClick={()=>setTab('signin')} className={`${bc} bg-white/[.04] border border-white/[.08] text-white`}>Back to Sign In</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
