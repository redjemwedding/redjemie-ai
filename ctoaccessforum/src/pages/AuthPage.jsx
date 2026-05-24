import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [tab,      setTab]      = useState('signin')
  const [loading,  setLoading]  = useState(false)
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [code,     setCode]     = useState('')
  const [resetEm,  setResetEm]  = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [needsCode, setNeedsCode] = useState(false)

  async function handleSignIn() {
    if (Date.now() < lockedUntil) { toast.error(`Too many attempts. Try again in ${Math.ceil((lockedUntil-Date.now())/60000)} min.`); return }
    if (!email || !password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      await signIn(email, password)
    } catch(e) {
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
    try {
      await signUp(name.trim(), email.trim(), password, code.trim())
      setTab('check-email')
    } catch(e) {
      const msgs = {'auth/email-already-in-use':'An account with this email already exists.'}
      toast.error(msgs[e.code] || e.message)
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setLoading(true)
    try {
      await signInWithGoogle(null)
    } catch(e) {
      if (e.message === 'NEEDS_INVITE_CODE') { setNeedsCode(true); setTab('google-code') }
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

  const Inp = ({value,onChange,...p}) => (
    <input value={value} onChange={e=>onChange(e.target.value)}
      className="w-full bg-[#1E1E1E] border border-white/[.06] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-all" {...p}/>
  )
  const Btn = ({children,onClick,className=''}) => (
    <button onClick={onClick} disabled={loading}
      className={`w-full py-2.5 font-[Montserrat] font-bold text-[0.82rem] rounded-[10px] transition-all disabled:opacity-50 ${className}`}>
      {loading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> : children}
    </button>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808] p-5">
      <div className="w-full max-w-[420px]">
        {/* Brand */}
        <div className="text-center mb-8 animate-fadeUp">
          <div className="w-12 h-12 bg-[#E5181B] rounded-[10px] flex items-center justify-center font-[Montserrat] font-black text-sm text-white mx-auto mb-4">CTO</div>
          <div className="font-[Montserrat] text-xl font-black tracking-wide">ACCESS <span className="text-[#E5181B]">FORUM</span></div>
          <div className="text-[0.52rem] font-bold tracking-[.22em] text-gray-500 uppercase mt-1">University Platform</div>
        </div>

        {/* Card */}
        <div className="bg-[#161616] border border-white/[.06] rounded-[18px] p-8 red-topline animate-fadeUp" style={{boxShadow:'0 24px 60px rgba(0,0,0,.6)'}}>

          {/* SIGN IN */}
          {tab === 'signin' && (
            <div className="animate-fadeIn">
              <div className="flex bg-[#1E1E1E] border border-white/[.06] rounded-[10px] p-0.5 gap-0.5 mb-6">
                <button onClick={()=>setTab('signin')} className="flex-1 py-2 rounded-[8px] text-[0.76rem] font-bold font-[Montserrat] bg-[#E5181B] text-white">Sign In</button>
                <button onClick={()=>setTab('signup')} className="flex-1 py-2 rounded-[8px] text-[0.76rem] font-bold font-[Montserrat] text-gray-500 hover:text-white transition-all">Create Account</button>
              </div>
              <div className="flex flex-col gap-4">
                <Inp type="email" placeholder="Email address" value={email} onChange={setEmail} autoComplete="email"/>
                <div>
                  <Inp type="password" placeholder="Password" value={password} onChange={setPassword} autoComplete="current-password"/>
                  <button onClick={()=>setTab('reset')} className="text-[0.68rem] text-gray-500 hover:text-gray-300 mt-1.5 float-right">Forgot password?</button>
                </div>
                <Btn onClick={handleSignIn} className="bg-[#E5181B] hover:bg-[#C01215] text-white mt-1">Sign In</Btn>
                <div className="relative my-1 text-center"><div className="absolute top-1/2 left-0 right-0 h-px bg-white/[.06]"/><span className="relative bg-[#161616] px-2.5 text-[0.7rem] text-gray-500">or</span></div>
                <Btn onClick={handleGoogle} className="bg-white/[.04] border border-white/[.08] text-white hover:bg-white/[.07]">
                  <span className="flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/></svg>
                    Continue with Google
                  </span>
                </Btn>
              </div>
            </div>
          )}

          {/* SIGN UP */}
          {tab === 'signup' && (
            <div className="animate-fadeIn">
              <div className="flex bg-[#1E1E1E] border border-white/[.06] rounded-[10px] p-0.5 gap-0.5 mb-6">
                <button onClick={()=>setTab('signin')} className="flex-1 py-2 rounded-[8px] text-[0.76rem] font-bold font-[Montserrat] text-gray-500 hover:text-white transition-all">Sign In</button>
                <button onClick={()=>setTab('signup')} className="flex-1 py-2 rounded-[8px] text-[0.76rem] font-bold font-[Montserrat] bg-[#E5181B] text-white">Create Account</button>
              </div>
              <div className="flex flex-col gap-3.5">
                <Inp type="text" placeholder="Full name" value={name} onChange={setName}/>
                <Inp type="email" placeholder="Email address" value={email} onChange={setEmail} autoComplete="email"/>
                <Inp type="password" placeholder="Password (min 8 characters)" value={password} onChange={setPassword}/>
                <div>
                  <Inp type="text" placeholder="Invite code e.g. CTOADMIN1" value={code} onChange={v=>setCode(v.toUpperCase())} className="tracking-widest"/>
                  <p className="text-[0.67rem] text-gray-500 mt-1.5">Required to join — get your code from the admin.</p>
                </div>
                <Btn onClick={handleSignUp} className="bg-[#E5181B] hover:bg-[#C01215] text-white mt-1">🚀 Create Account</Btn>
                <div className="relative my-1 text-center"><div className="absolute top-1/2 left-0 right-0 h-px bg-white/[.06]"/><span className="relative bg-[#161616] px-2.5 text-[0.7rem] text-gray-500">or</span></div>
                <Btn onClick={handleGoogle} className="bg-white/[.04] border border-white/[.08] text-white hover:bg-white/[.07]">
                  <span className="flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/></svg>
                    Sign up with Google
                  </span>
                </Btn>
              </div>
            </div>
          )}

          {/* GOOGLE NEEDS INVITE CODE */}
          {tab === 'google-code' && (
            <div className="animate-fadeIn text-center">
              <div className="text-4xl mb-3">🔑</div>
              <h2 className="font-[Montserrat] font-black text-[1rem] mb-2">One more step</h2>
              <p className="text-[0.8rem] text-gray-400 mb-5">Enter your invite code to join.</p>
              <div className="flex flex-col gap-3">
                <Inp type="text" placeholder="Invite code" value={code} onChange={v=>setCode(v.toUpperCase())} className="tracking-widest"/>
                <Btn onClick={handleGoogleWithCode} className="bg-[#E5181B] hover:bg-[#C01215] text-white">Continue →</Btn>
                <Btn onClick={()=>setTab('signin')} className="bg-white/[.04] border border-white/[.08] text-white">← Back</Btn>
              </div>
            </div>
          )}

          {/* RESET */}
          {tab === 'reset' && (
            <div className="animate-fadeIn text-center">
              <div className="text-4xl mb-3">🔐</div>
              <h2 className="font-[Montserrat] font-black text-[1rem] mb-2">Reset Password</h2>
              <p className="text-[0.8rem] text-gray-400 mb-5">Enter your email and we'll send a reset link.</p>
              <div className="flex flex-col gap-3">
                <Inp type="email" placeholder="Email address" value={resetEm} onChange={setResetEm}/>
                <Btn onClick={handleReset} className="bg-[#E5181B] hover:bg-[#C01215] text-white">Send Reset Link</Btn>
                <Btn onClick={()=>setTab('signin')} className="bg-white/[.04] border border-white/[.08] text-white">← Back</Btn>
              </div>
            </div>
          )}

          {/* CHECK EMAIL */}
          {tab === 'check-email' && (
            <div className="animate-fadeIn text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="font-[Montserrat] font-black text-[1.05rem] mb-2">Check your email</h2>
              <p className="text-[0.8rem] text-gray-400 leading-relaxed mb-4">We sent a verification link to <strong className="text-white">{email}</strong>. Click it to verify, then wait for admin approval.</p>
              <div className="bg-amber-900/20 border border-amber-500/25 rounded-[10px] p-4 text-left mb-4">
                <div className="font-[Montserrat] text-[0.73rem] font-bold text-amber-300 mb-1">⏳ Pending Approval</div>
                <p className="text-[0.71rem] text-amber-200/70 leading-relaxed">After verifying your email, the admin will review and approve your account. You'll be notified.</p>
              </div>
              <Btn onClick={()=>setTab('signin')} className="bg-white/[.04] border border-white/[.08] text-white">Back to Sign In</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
