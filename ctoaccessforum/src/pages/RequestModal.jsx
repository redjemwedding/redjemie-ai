// ── Shared RequestModal — used in AuthPage + LandingPage ──────────────
import { useState, useRef, useEffect } from 'react'

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjHDZ_LV1clOsRD1tI7uFAyHYf0R9HU84rt9v4qHCCL0HvUlsgawFKNP_HrS7n_yJW/exec'

// ── Drag Captcha ──────────────────────────────────────────────────────
function DragCaptcha({ onVerified }) {
  const [solved,   setSolved]   = useState(false)
  const [pieceX,   setPieceX]   = useState(14)
  const [wrong,    setWrong]    = useState(false)
  const areaRef  = useRef(null)
  const dragging = useRef(false)
  const startX   = useRef(0)
  const startPX  = useRef(14)
  const SLOT_RIGHT_OFFSET = 66 // distance from right edge to slot left

  function getClientX(e) { return e.touches ? e.touches[0].clientX : e.clientX }

  function onDown(e) {
    if (solved) return
    dragging.current = true
    startX.current   = getClientX(e)
    startPX.current  = pieceX
    e.preventDefault()
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragging.current) return
      if (e.cancelable) e.preventDefault()
      const area   = areaRef.current
      if (!area) return
      const areaW  = area.getBoundingClientRect().width
      const slotX  = areaW - SLOT_RIGHT_OFFSET
      const dx     = getClientX(e) - startX.current
      const newX   = Math.max(14, Math.min(startPX.current + dx, slotX))
      setPieceX(newX)
    }
    function onUp() {
      if (!dragging.current) return
      dragging.current = false
      const area  = areaRef.current
      if (!area) return
      const areaW = area.getBoundingClientRect().width
      const slotX = areaW - SLOT_RIGHT_OFFSET
      setPieceX(prev => {
        if (Math.abs(prev - slotX) <= 22) {
          setSolved(true)
          onVerified()
          return slotX
        } else {
          setWrong(true)
          setTimeout(() => setWrong(false), 400)
          return 14
        }
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchend',  onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchend',  onUp)
    }
  }, [solved])

  return (
    <div>
      <p className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-2">Security Check *</p>
      <div ref={areaRef}
        style={{
          position:'relative', height:'64px', borderRadius:'10px', overflow:'hidden',
          background:'rgba(255,255,255,.03)',
          border: solved ? '1px solid #25d366' : '1px solid rgba(255,255,255,.07)',
          userSelect:'none', transition:'border-color .3s'
        }}>
        {/* track */}
        <div style={{ position:'absolute', top:'50%', left:'14px', right:'14px', height:'2px',
          background:'rgba(255,255,255,.07)', transform:'translateY(-50%)', borderRadius:'2px' }}/>
        {/* slot */}
        <div style={{
          position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)',
          width:'44px', height:'44px',
          border: solved ? '2px solid #25d366' : '2px dashed rgba(255,255,255,.15)',
          borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'1.1rem', transition:'border-color .3s'
        }}>
          {solved ? '✅' : '🔒'}
        </div>
        {/* piece */}
        {!solved && (
          <div
            onMouseDown={onDown}
            onTouchStart={onDown}
            style={{
              position:'absolute', left:`${pieceX}px`, top:'50%', transform:'translateY(-50%)',
              width:'44px', height:'44px', borderRadius:'10px', cursor: solved ? 'default' : 'grab',
              background: wrong
                ? 'linear-gradient(135deg,#c0392b,#e74c3c)'
                : 'linear-gradient(135deg,#1E5BFF,#E5181B)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'1.1rem', boxShadow:'0 4px 16px rgba(229,24,27,.3)',
              transition: wrong ? 'background .25s' : 'none', userSelect:'none',
              touchAction:'none'
            }}>
            🧩
          </div>
        )}
      </div>
      <p style={{ fontSize:'.72rem', marginTop:'.4rem',
        color: solved ? '#25d366' : 'rgba(255,255,255,.3)' }}>
        {solved ? '✅ Verified!' : 'Drag the puzzle piece into the slot to verify you\'re human'}
      </p>
    </div>
  )
}

// ── Request Modal ─────────────────────────────────────────────────────
export default function RequestModal({ onClose }) {
  const [loading,  setLoading]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [verified, setVerified] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)
  const [lastSubmit,  setLastSubmit]  = useState(0)
  const [form, setForm] = useState({ name:'', phone:'', email:'', message:'' })
  const honeypot = useRef('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const ic = "w-full bg-[#1a1a1a] border border-white/[.07] rounded-[10px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"

  async function handleSubmit() {
    if (honeypot.current) return // bot trap
    if (!form.name || !form.email || !form.phone) {
      alert('Please fill in name, phone, and email.'); return
    }
    if (!verified) { alert('Please complete the security check.'); return }
    const now = Date.now()
    if (now - lastSubmit < 30000) { alert('Please wait before submitting again.'); return }
    if (submitCount >= 3) { alert('Too many submissions. Email us at info@ctoaccessforum.com'); return }

    setLoading(true)
    try {
      await fetch(SCRIPT_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:      form.name,
          phone:     form.phone,
          email:     form.email,
          service:   'CTO Access Forum University — Membership Request',
          message:   form.message,
          _hp:       '',
          timestamp: new Date().toISOString(),
        }),
      })
      setLastSubmit(now)
      setSubmitCount(c => c + 1)
      setSent(true)
    } catch {
      alert('Something went wrong. Email us at info@ctoaccessforum.com')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = verified && form.name && form.phone && form.email && !loading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background:'rgba(0,0,0,.88)', backdropFilter:'blur(10px)' }}>
      <div className="bg-[#111] border border-white/[.07] rounded-[20px] w-full max-w-[460px] overflow-hidden shadow-2xl my-auto"
        style={{ animation:'fadeUp .25s ease' }}>
        {/* top accent line */}
        <div style={{ height:'3px', background:'linear-gradient(90deg,#E5181B,#FF6B6B)' }}/>

        <div className="p-7">
          {!sent ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-[Montserrat] font-black text-[1.05rem] text-white">Send Us an Inquiry</h2>
                  <p className="text-[0.72rem] text-gray-500 mt-1">We'll reply to your email within 24 hours.</p>
                </div>
                <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl leading-none mt-0.5">✕</button>
              </div>

              {/* Honeypot — hidden */}
              <input type="text" style={{ display:'none', position:'absolute', left:'-9999px' }}
                tabIndex={-1} autoComplete="off"
                onChange={e => { honeypot.current = e.target.value }}/>

              <div className="flex flex-col gap-3.5">
                {/* Name + Phone row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Full Name *</label>
                    <input type="text" placeholder="Your full name" className={ic}
                      value={form.name} onChange={e => set('name', e.target.value)}/>
                  </div>
                  <div>
                    <label className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Phone *</label>
                    <input type="tel" placeholder="+971 XX XXX XXXX" className={ic}
                      value={form.phone} onChange={e => set('phone', e.target.value)}/>
                  </div>
                </div>

                <div>
                  <label className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email Address *</label>
                  <input type="email" placeholder="your@email.com" className={ic}
                    value={form.email} onChange={e => set('email', e.target.value)}/>
                </div>

                {/* Auto-filled service */}
                <div>
                  <label className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Service / Interest</label>
                  <input type="text" className={ic} readOnly
                    value="CTO Access Forum University — Membership Request"
                    style={{ color:'#666', cursor:'default' }}/>
                </div>

                <div>
                  <label className="text-[0.65rem] font-[Montserrat] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Message</label>
                  <textarea rows={3} placeholder="Tell us about yourself and why you'd like to join..."
                    className={`${ic} resize-none`}
                    value={form.message} onChange={e => set('message', e.target.value)}/>
                </div>

                {/* Drag Captcha */}
                <DragCaptcha onVerified={() => setVerified(true)} />

                <button onClick={handleSubmit} disabled={!canSubmit}
                  className="w-full py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-[Montserrat] font-bold text-[0.82rem] rounded-[10px] transition-all disabled:opacity-40 flex items-center justify-center gap-2 mt-1">
                  {loading
                    ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : 'Send Inquiry →'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="font-[Montserrat] font-black text-[1.1rem] text-white mb-2">Inquiry Received!</h2>
              <p className="text-[0.78rem] text-gray-400 leading-relaxed mb-2">
                Thank you, <strong className="text-white">{form.name}</strong>. Our team will review your request.
              </p>
              <p className="text-[0.73rem] text-gray-500 mb-6">
                We'll reply to <strong className="text-white">{form.email}</strong> within 24 hours.
              </p>
              <button onClick={onClose}
                className="w-full py-2.5 bg-white/[.05] border border-white/[.08] text-white font-[Montserrat] font-bold text-[0.82rem] rounded-[10px] hover:bg-white/[.08] transition-all">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
