import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export default function VerifyPage() {
  const { user, signOut } = useAuth()
  const resend = async () => {
    try { await user.sendEmailVerification(); toast.success('Verification email resent!') }
    catch(e) { toast.error(e.message) }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808] p-5">
      <div className="bg-[#161616] border border-white/[.06] rounded-[18px] p-10 w-full max-w-md text-center red-topline" style={{boxShadow:'0 24px 60px rgba(0,0,0,.6)'}}>
        <div className="text-5xl mb-5">📧</div>
        <h2 className="font-[Montserrat] font-black text-[1.15rem] mb-3">Verify Your Email</h2>
        <p className="text-[0.82rem] text-gray-400 leading-relaxed mb-6">
          We sent a link to <strong className="text-white">{user?.email}</strong>. Click it to continue.
        </p>
        <button onClick={resend} className="w-full py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.82rem] rounded-[10px] transition-all mb-3">Resend Email</button>
        <button onClick={() => location.reload()} className="w-full py-2.5 bg-white/[.04] border border-white/[.08] text-gray-300 font-bold font-[Montserrat] text-[0.82rem] rounded-[10px] transition-all mb-3">I've Verified — Continue</button>
        <button onClick={signOut} className="text-[0.75rem] text-gray-600 hover:text-gray-400 transition-colors">Sign Out</button>
      </div>
    </div>
  )
}
