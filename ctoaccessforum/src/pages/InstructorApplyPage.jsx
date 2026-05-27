import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

const STEPS = ['Your Background', 'Course Plan', 'Revenue & Terms', 'Review & Submit']

const EXPERTISE_AREAS = [
  'Cloud & Infrastructure', 'Cybersecurity', 'AI & Machine Learning',
  'DevOps & CI/CD', 'Leadership & Management', 'Digital Transformation',
  'UAE Market & Compliance', 'Software Engineering', 'Data & Analytics', 'Other'
]

const COURSE_TYPES = [
  { id: 'free',        label: 'Free',        desc: 'No charge — builds reputation and community reach' },
  { id: 'short',       label: 'Short Course', desc: '1–3 hours · AED 49–149 · Instructor earns 60%' },
  { id: 'full',        label: 'Full Course',  desc: '4–10 hours · AED 199–499 · Instructor earns 60%' },
  { id: 'masterclass', label: 'Masterclass',  desc: '10+ hours · AED 499–999 · Instructor earns 60%' },
]

export default function InstructorApplyPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [step,       setStep]       = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)

  const [form, setForm] = useState({
    // Step 1
    fullName:       profile?.displayName || '',
    currentRole:    profile?.title       || '',
    linkedin:       '',
    expertise:      '',
    yearsExp:       '',
    bio:            '',
    // Step 2
    proposedTitle:  '',
    courseType:     '',
    targetAudience: '',
    outline:        '',
    // Step 3
    agreedRevenue:  false,
    agreedQuality:  false,
    agreedReview:   false,
  })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function canNext() {
    if (step === 0) return form.fullName && form.currentRole && form.expertise && form.yearsExp && form.bio.length >= 100
    if (step === 1) return form.proposedTitle && form.courseType && form.targetAudience && form.outline.length >= 80
    if (step === 2) return form.agreedRevenue && form.agreedQuality && form.agreedReview
    return true
  }

  async function submit() {
    setSubmitting(true)
    try {
      // check no pending application
      const existing = await getDocs(
        query(collection(db, 'applications'), where('uid', '==', profile.uid), where('status', '==', 'pending'))
      )
      if (!existing.empty) {
        toast.error('You already have a pending application.')
        setSubmitting(false)
        return
      }

      await addDoc(collection(db, 'applications'), {
        uid:            profile.uid,
        name:           form.fullName,
        email:          profile.email,
        currentRole:    form.currentRole,
        linkedin:       form.linkedin,
        expertise:      form.expertise,
        yearsExp:       form.yearsExp,
        bio:            form.bio,
        proposedTitle:  form.proposedTitle,
        courseType:     form.courseType,
        targetAudience: form.targetAudience,
        outline:        form.outline,
        revenueSplit:   '60% instructor / 40% platform',
        membershipFee:  'Free (waived for now)',
        agreedTerms:    true,
        status:         'pending',
        appliedAt:      serverTimestamp(),
      })
      setSubmitted(true)
    } catch (err) { toast.error(err.message) }
    finally { setSubmitting(false) }
  }

  const ic = "w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"
  const label = "block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]"

  if (submitted) return (
    <div className="max-w-screen-sm mx-auto">
      <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-8 text-center">
        <div className="w-14 h-14 bg-green-900/30 border border-green-500/25 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="font-[Montserrat] font-black text-[1.1rem] mb-2">Application Submitted</h2>
        <p className="text-[0.8rem] text-gray-400 leading-relaxed mb-6">
          Your instructor application has been received. The admin will review it within 3–5 business days. You'll receive a notification when a decision is made.
        </p>
        <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4 text-left mb-6">
          <div className="text-[0.67rem] font-bold text-gray-500 uppercase tracking-wide font-[Montserrat] mb-2">What happens next</div>
          {[
            'Admin reviews your background and proposed course',
            'You receive a notification with the decision',
            'If approved, your role upgrades to Instructor',
            'You gain access to the course creation dashboard',
            'Admin reviews your first course before it goes live',
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-white/[.04] last:border-0">
              <span className="text-[0.62rem] font-bold font-[Montserrat] text-[#FF4447] w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
              <span className="text-[0.76rem] text-gray-400">{s}</span>
            </div>
          ))}
        </div>
        <button onClick={() => nav('/dashboard')}
          className="px-6 py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.78rem] font-bold font-[Montserrat] rounded-[8px] transition-colors">
          Back to Dashboard
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-screen-sm mx-auto">
      {/* header */}
      <div className="mb-6">
        <button onClick={() => nav(-1)}
          className="text-[0.75rem] text-gray-500 hover:text-white mb-4 transition-colors font-[Montserrat]">
          ← Back
        </button>
        <h1 className="font-[Montserrat] text-[1.3rem] font-black">Instructor Application</h1>
        <p className="text-[0.76rem] text-gray-500 mt-0.5">
          Share your expertise with the CTO Access Forum community.
        </p>
      </div>

      {/* progress */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold font-[Montserrat] text-[0.6rem] border transition-all ${i < step ? 'bg-green-900/30 border-green-500/25 text-green-400' : i === step ? 'bg-[rgba(229,24,27,.15)] border-red-500/30 text-[#FF4447]' : 'bg-white/[.03] border-white/[.08] text-gray-600'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <div className="flex-1 mx-1.5">
              <div className={`text-[0.6rem] font-bold font-[Montserrat] uppercase tracking-wide ${i === step ? 'text-[#FF4447]' : i < step ? 'text-green-400' : 'text-gray-700'}`}>
                {s}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px flex-shrink-0 ${i < step ? 'bg-green-500/30' : 'bg-white/[.06]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* form card */}
      <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-6 red-topline">

        {/* ── STEP 0: Background ── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="text-[0.68rem] font-bold text-gray-500 uppercase tracking-wide font-[Montserrat] mb-1">
              Tell us about yourself
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Full Name</label>
                <input value={form.fullName} onChange={ev => set('fullName', ev.target.value)}
                  placeholder="Your full name" className={ic} />
              </div>
              <div>
                <label className={label}>Current Role</label>
                <input value={form.currentRole} onChange={ev => set('currentRole', ev.target.value)}
                  placeholder="e.g. CTO at Acme" className={ic} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Area of Expertise</label>
                <select value={form.expertise} onChange={ev => set('expertise', ev.target.value)} className={ic}>
                  <option value="">Select area…</option>
                  {EXPERTISE_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Years of Experience</label>
                <select value={form.yearsExp} onChange={ev => set('yearsExp', ev.target.value)} className={ic}>
                  <option value="">Select…</option>
                  {['1–3 years','3–5 years','5–10 years','10–15 years','15+ years'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>LinkedIn or Portfolio URL (optional)</label>
              <input value={form.linkedin} onChange={ev => set('linkedin', ev.target.value)}
                placeholder="https://linkedin.com/in/yourname" type="url" className={ic} />
            </div>
            <div>
              <label className={label}>Professional Bio <span className="text-gray-700 normal-case">(min 100 chars)</span></label>
              <textarea value={form.bio} onChange={ev => set('bio', ev.target.value)}
                placeholder="Describe your background, achievements, and what makes you qualified to teach on this platform…"
                rows={4} maxLength={1000} className={`${ic} resize-none`} />
              <div className={`text-right text-[0.62rem] mt-1 ${form.bio.length >= 100 ? 'text-green-500' : 'text-gray-700'}`}>
                {form.bio.length}/1000 {form.bio.length < 100 && `(${100 - form.bio.length} more needed)`}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Course Plan ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="text-[0.68rem] font-bold text-gray-500 uppercase tracking-wide font-[Montserrat] mb-1">
              Your proposed course
            </div>
            <div>
              <label className={label}>Proposed Course Title</label>
              <input value={form.proposedTitle} onChange={ev => set('proposedTitle', ev.target.value)}
                placeholder="e.g. Zero Trust Architecture for IT Leaders" maxLength={120} className={ic} />
            </div>
            <div>
              <label className={label}>Course Type</label>
              <div className="grid grid-cols-2 gap-2">
                {COURSE_TYPES.map(ct => (
                  <button key={ct.id} type="button"
                    onClick={() => set('courseType', ct.id)}
                    className={`text-left px-3.5 py-3 rounded-[8px] border transition-all ${form.courseType === ct.id ? 'bg-[rgba(229,24,27,.08)] border-red-500/25' : 'bg-[#1a1a1a] border-white/[.06] hover:border-white/[.12]'}`}>
                    <div className={`text-[0.76rem] font-bold font-[Montserrat] mb-0.5 ${form.courseType === ct.id ? 'text-[#FF4447]' : 'text-white'}`}>
                      {ct.label}
                    </div>
                    <div className="text-[0.65rem] text-gray-500">{ct.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>Target Audience</label>
              <input value={form.targetAudience} onChange={ev => set('targetAudience', ev.target.value)}
                placeholder="e.g. Mid-level IT managers, CTOs at SMEs, cloud architects" maxLength={150} className={ic} />
            </div>
            <div>
              <label className={label}>Course Outline <span className="text-gray-700 normal-case">(min 80 chars)</span></label>
              <textarea value={form.outline} onChange={ev => set('outline', ev.target.value)}
                placeholder="Describe the modules, topics, and key learning outcomes. What will students know or be able to do after completing your course?"
                rows={5} maxLength={2000} className={`${ic} resize-none`} />
              <div className={`text-right text-[0.62rem] mt-1 ${form.outline.length >= 80 ? 'text-green-500' : 'text-gray-700'}`}>
                {form.outline.length}/2000 {form.outline.length < 80 && `(${80 - form.outline.length} more needed)`}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Revenue & Terms ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="text-[0.68rem] font-bold text-gray-500 uppercase tracking-wide font-[Montserrat] mb-1">
              Revenue split & terms
            </div>

            {/* revenue breakdown */}
            <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4">
              <div className="text-[0.72rem] font-bold font-[Montserrat] text-white mb-3">Revenue Split</div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-8 rounded-[6px] overflow-hidden flex">
                  <div className="bg-[#E5181B] flex items-center justify-center text-white text-[0.68rem] font-bold font-[Montserrat]" style={{width:'60%'}}>60% You</div>
                  <div className="bg-white/[.08] flex items-center justify-center text-gray-400 text-[0.68rem] font-bold font-[Montserrat]" style={{width:'40%'}}>40% Platform</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[0.72rem]">
                {[
                  { type: 'Short course (AED 99)', you: 'AED 59', platform: 'AED 40' },
                  { type: 'Full course (AED 299)', you: 'AED 179', platform: 'AED 120' },
                  { type: 'Masterclass (AED 599)', you: 'AED 359', platform: 'AED 240' },
                  { type: 'Free course', you: 'AED 0', platform: 'AED 0' },
                ].map(r => (
                  <div key={r.type} className="bg-[#111] rounded-[6px] p-2.5">
                    <div className="text-gray-500 mb-1">{r.type}</div>
                    <div className="text-green-400 font-bold">{r.you} <span className="text-gray-600 font-normal">you</span></div>
                    <div className="text-gray-600">{r.platform} platform</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[0.68rem] text-gray-600">
                Membership fee is currently waived. Payouts processed monthly by admin.
              </div>
            </div>

            {/* agreements */}
            <div className="flex flex-col gap-3">
              {[
                {
                  key: 'agreedRevenue',
                  title: 'Revenue split agreement',
                  desc: 'I agree to the 60/40 revenue split. I understand payouts are processed monthly and I am responsible for my own tax obligations.',
                },
                {
                  key: 'agreedQuality',
                  title: 'Quality commitment',
                  desc: 'I commit to delivering high-quality, accurate, and professionally produced course content. I will respond to student questions within 48 hours.',
                },
                {
                  key: 'agreedReview',
                  title: 'Admin review process',
                  desc: 'I understand all courses require admin approval before going live. The platform reserves the right to request revisions or reject content that does not meet quality standards.',
                },
              ].map(a => (
                <label key={a.key}
                  className={`flex items-start gap-3 p-3.5 rounded-[8px] border cursor-pointer transition-all ${form[a.key] ? 'bg-[rgba(229,24,27,.05)] border-red-500/20' : 'bg-[#1a1a1a] border-white/[.06]'}`}>
                  <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${form[a.key] ? 'bg-[#E5181B] border-[#E5181B]' : 'border-white/[.2] bg-transparent'}`}
                    onClick={() => set(a.key, !form[a.key])}>
                    {form[a.key] && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="text-[0.76rem] font-bold font-[Montserrat] mb-0.5">{a.title}</div>
                    <div className="text-[0.72rem] text-gray-500 leading-relaxed">{a.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="text-[0.68rem] font-bold text-gray-500 uppercase tracking-wide font-[Montserrat] mb-1">
              Review your application
            </div>
            {[
              { section: 'Background', items: [
                { l: 'Name',       v: form.fullName },
                { l: 'Role',       v: form.currentRole },
                { l: 'Expertise',  v: form.expertise },
                { l: 'Experience', v: form.yearsExp },
              ]},
              { section: 'Course Plan', items: [
                { l: 'Title',     v: form.proposedTitle },
                { l: 'Type',      v: COURSE_TYPES.find(c => c.id === form.courseType)?.label },
                { l: 'Audience',  v: form.targetAudience },
              ]},
              { section: 'Terms', items: [
                { l: 'Revenue split', v: '60% instructor / 40% platform' },
                { l: 'Membership fee', v: 'Waived (free for now)' },
                { l: 'All terms agreed', v: 'Yes' },
              ]},
            ].map(s => (
              <div key={s.section} className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4">
                <div className="text-[0.67rem] font-bold text-gray-500 uppercase tracking-wide font-[Montserrat] mb-2">{s.section}</div>
                {s.items.map(item => (
                  <div key={item.l} className="flex items-start justify-between gap-4 py-1.5 border-b border-white/[.04] last:border-0">
                    <span className="text-[0.72rem] text-gray-500 flex-shrink-0">{item.l}</span>
                    <span className="text-[0.72rem] text-gray-200 text-right">{item.v || '—'}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4">
              <div className="text-[0.67rem] font-bold text-gray-500 uppercase tracking-wide font-[Montserrat] mb-2">Bio preview</div>
              <p className="text-[0.76rem] text-gray-400 leading-relaxed line-clamp-4">{form.bio}</p>
            </div>
            <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4">
              <div className="text-[0.67rem] font-bold text-gray-500 uppercase tracking-wide font-[Montserrat] mb-2">Course outline preview</div>
              <p className="text-[0.76rem] text-gray-400 leading-relaxed line-clamp-4">{form.outline}</p>
            </div>
          </div>
        )}

        {/* navigation */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-white/[.05]">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-5 py-2.5 bg-white/[.04] border border-white/[.08] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px] hover:bg-white/[.07] transition-colors">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className="flex-1 py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px] disabled:opacity-40 transition-colors">
              Continue
            </button>
          ) : (
            <button onClick={submit} disabled={submitting}
              className="flex-1 py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {submitting
                ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Submitting…</span></>
                : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
