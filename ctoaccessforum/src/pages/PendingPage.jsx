import { useAuth } from '@/context/AuthContext'

export default function PendingPage() {
  const { user, profile, signOut } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808] p-5">
      <div className="bg-[#161616] border border-white/[.06] rounded-[18px] p-10 w-full max-w-md text-center red-topline" style={{boxShadow:'0 24px 60px rgba(0,0,0,.6)'}}>
        <div className="text-5xl mb-5">⏳</div>
        <h2 className="font-[Montserrat] font-black text-[1.15rem] mb-3">Account Pending Approval</h2>
        <p className="text-[0.82rem] text-gray-400 leading-relaxed mb-5">
          Hi <strong className="text-white">{profile?.displayName}</strong>! Your account is in the approval queue. The admin will review it and you'll receive an email once approved — usually within 24 hours.
        </p>
        <div className="bg-amber-900/20 border border-amber-500/25 rounded-[10px] p-4 text-left mb-6">
          <div className="font-[Montserrat] text-[0.73rem] font-bold text-amber-300 mb-1.5">What happens next?</div>
          <ul className="text-[0.72rem] text-amber-200/70 leading-relaxed space-y-1">
            <li>✓ Invite code <strong className="text-amber-200">{profile?.inviteCode}</strong> accepted</li>
            <li>✓ Email {user?.emailVerified ? 'verified' : 'needs verification (check inbox)'}</li>
            <li>⏳ Admin review — usually within 24h</li>
            <li>📧 Email notification when approved</li>
          </ul>
        </div>
        <div className="text-[0.72rem] text-gray-500 mb-5">Signed in as <strong className="text-gray-300">{user?.email}</strong></div>
        <button onClick={signOut} className="text-[0.78rem] text-gray-500 hover:text-red-300 transition-colors">Sign Out</button>
      </div>
    </div>
  )
}
