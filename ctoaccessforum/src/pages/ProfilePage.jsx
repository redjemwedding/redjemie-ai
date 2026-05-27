import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { strToColor, initials, ROLE_META } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { profile, isInstructor, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({
    displayName: profile?.displayName || '',
    title:       profile?.title       || '',
    location:    profile?.location    || '',
    bio:         profile?.bio         || '',
  })

  const rm = ROLE_META[profile?.role] || ROLE_META.member_free

  if (!profile) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )

  function startEdit() {
    setForm({
      displayName: profile.displayName || '',
      title:       profile.title       || '',
      location:    profile.location    || '',
      bio:         profile.bio         || '',
    })
    setEditing(true)
  }

  async function saveProfile() {
    if (!form.displayName.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: form.displayName.trim(),
        title:       form.title.trim(),
        location:    form.location.trim(),
        bio:         form.bio.trim(),
      })
      await refreshProfile()
      setEditing(false)
      toast.success('Profile updated.')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const ic = "w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"

  const stats = [
    { l: 'XP Points', v: (profile.xp    || 0).toLocaleString() },
    { l: 'Courses',   v: profile.enrolledCourses?.length || 0   },
    { l: 'Posts',     v: profile.posts   || 0                   },
    { l: 'Streak',    v: `${profile.streak || 0} days`          },
  ]

  return (
    <div className="max-w-screen-sm mx-auto">

      {/* profile card */}
      <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-6 mb-4 red-topline relative">
        {/* edit / save buttons */}
        <div className="absolute top-5 right-5 flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-[0.72rem] font-bold font-[Montserrat] bg-white/[.04] border border-white/[.08] text-gray-400 hover:text-white rounded-[7px] transition-colors">
                Cancel
              </button>
              <button onClick={saveProfile} disabled={saving}
                className="px-3 py-1.5 text-[0.72rem] font-bold font-[Montserrat] bg-[#E5181B] hover:bg-[#C01215] text-white rounded-[7px] disabled:opacity-50 transition-colors flex items-center gap-1.5">
                {saving && <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
                Save
              </button>
            </>
          ) : (
            <button onClick={startEdit}
              className="px-3 py-1.5 text-[0.72rem] font-bold font-[Montserrat] bg-white/[.04] border border-white/[.08] text-gray-400 hover:text-white rounded-[7px] transition-colors">
              Edit Profile
            </button>
          )}
        </div>

        {/* avatar + name */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-black font-[Montserrat] text-white text-lg border-2 border-white/[.08] flex-shrink-0"
            style={{ background: strToColor(profile.uid || '') }}>
            {initials(profile.displayName || '?')}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                maxLength={60}
                className="w-full bg-[#1a1a1a] border border-white/[.06] rounded-[7px] px-3 py-1.5 text-white text-[1rem] font-black font-[Montserrat] outline-none focus:border-[rgba(229,24,27,.3)] transition-colors mb-1"
              />
            ) : (
              <div className="font-[Montserrat] text-[1.1rem] font-black mb-1">{profile.displayName}</div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full border ${rm.cls}`}>
                {rm.badge}
              </span>
              {profile.status === 'approved' && (
                <span className="text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 border border-green-500/20">
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* editable fields */}
        {editing ? (
          <div className="flex flex-col gap-3 mb-5">
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Job Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. CTO at Acme Corp" maxLength={80} className={ic} />
            </div>
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Dubai, UAE" maxLength={60} className={ic} />
            </div>
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Bio</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="A short bio about yourself…" rows={3} maxLength={400}
                className={`${ic} resize-none`} />
              <div className="text-right text-[0.62rem] text-gray-700 mt-1">{form.bio.length}/400</div>
            </div>
          </div>
        ) : (
          <div className="mb-5 space-y-2">
            {profile.title && (
              <div className="flex items-center gap-2.5 text-[0.78rem]">
                <span className="text-gray-600 w-16 flex-shrink-0 font-[Montserrat] text-[0.67rem] uppercase tracking-wide">Title</span>
                <span className="text-gray-200">{profile.title}</span>
              </div>
            )}
            {profile.location && (
              <div className="flex items-center gap-2.5 text-[0.78rem]">
                <span className="text-gray-600 w-16 flex-shrink-0 font-[Montserrat] text-[0.67rem] uppercase tracking-wide">Location</span>
                <span className="text-gray-200">{profile.location}</span>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-2.5 text-[0.78rem]">
                <span className="text-gray-600 w-16 flex-shrink-0 font-[Montserrat] text-[0.67rem] uppercase tracking-wide">Email</span>
                <span className="text-gray-400">{profile.email}</span>
              </div>
            )}
            {profile.bio && (
              <div className="pt-2 mt-2 border-t border-white/[.05]">
                <p className="text-[0.78rem] text-gray-400 leading-relaxed">{profile.bio}</p>
              </div>
            )}
            {!profile.title && !profile.location && !profile.bio && (
              <p className="text-[0.78rem] text-gray-600">
                No profile info yet.{' '}
                <button onClick={startEdit} className="text-[#FF4447] hover:underline">Add your details.</button>
              </p>
            )}
          </div>
        )}

        {/* stats grid */}
        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/[.05]">
          {stats.map(s => (
            <div key={s.l} className="bg-white/[.02] border border-white/[.04] rounded-[8px] p-2.5 text-center">
              <div className="font-[Montserrat] text-[1rem] font-black text-[#FF4447]">{s.v}</div>
              <div className="text-[0.58rem] text-gray-600 mt-0.5 font-[Montserrat]">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* membership card */}
      <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-5 mb-4">
        <div className="text-[0.65rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">Membership</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-[Montserrat] text-[0.95rem] font-black mb-0.5">
              {profile.plan === 'pro' ? 'Pro Member' : isInstructor ? 'Instructor' : 'Free Plan'}
            </div>
            <div className="text-[0.72rem] text-gray-500">
              {profile.plan !== 'pro' && !isInstructor
                ? 'Upgrade to access all courses and certificates.'
                : 'Full platform access.'}
            </div>
          </div>
          {!isInstructor && profile.plan !== 'pro' && (
            <button className="px-3.5 py-1.5 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.74rem] font-bold font-[Montserrat] rounded-[7px] transition-colors flex-shrink-0">
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* instructor apply card */}
      {!isInstructor && (
        <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-5">
          <div className="text-[0.65rem] font-bold tracking-[.1em] uppercase text-gray-600 font-[Montserrat] mb-3">Teach on the Platform</div>
          <p className="text-[0.78rem] text-gray-400 leading-relaxed mb-3">
            Share your expertise with the CTO Access Forum community. Applications are reviewed within 3–5 business days.
          </p>
          <button className="px-4 py-2 bg-white/[.04] border border-white/[.08] text-white text-[0.74rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-white/[.07] transition-colors">
            Apply as Instructor
          </button>
        </div>
      )}

    </div>
  )
}
