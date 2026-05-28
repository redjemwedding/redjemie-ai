import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, arrayUnion, arrayRemove, getDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { notify } from '@/lib/notifications'
import toast from 'react-hot-toast'

const FILTERS = ['All', 'Upcoming', 'Live', 'Past']

function formatDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-AE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })
}

function getStatus(event) {
  if (!event.startTime) return 'upcoming'
  const now   = Date.now()
  const start = event.startTime.toMillis?.() || new Date(event.startTime).getTime()
  const end   = event.endTime?.toMillis?.() || (start + 2 * 60 * 60 * 1000)
  if (now >= start && now <= end) return 'live'
  if (now > end)                  return 'past'
  return 'upcoming'
}

// ── ics calendar download ─────────────────────────────────────────
function downloadICS(event) {
  if (!event.startTime) { toast.error('No event time set'); return }
  const start = event.startTime.toDate ? event.startTime.toDate() : new Date(event.startTime)
  const end   = event.endTime?.toDate  ? event.endTime.toDate()   : new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const fmt   = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'')
  const ics   = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CTO Access Forum//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@university.redjemie.com`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description||'').replace(/\n/g,'\\n')}`,
    event.location ? `LOCATION:${event.location}` : '',
    event.link     ? `URL:${event.link}`           : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${event.title.replace(/\s+/g,'-')}.ics`; a.click()
  URL.revokeObjectURL(url)
  toast.success('Calendar file downloaded!')
}

// ── RSVP confirmation modal ───────────────────────────────────────
function RSVPModal({ event, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[900] flex items-center justify-center p-4"
      onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div className="bg-[#161616] border border-white/[.06] rounded-[16px] p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-900/30 border border-green-500/25 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-green-400 text-sm">✓</span>
          </div>
          <div>
            <div className="font-[Montserrat] font-black text-[0.95rem]">RSVP Confirmed!</div>
            <div className="text-[0.72rem] text-gray-500">You're registered for this event.</div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-white/[.06] rounded-[10px] p-4 mb-4">
          <div className="font-[Montserrat] font-bold text-[0.9rem] mb-3">{event.title}</div>
          <div className="flex flex-col gap-2 text-[0.75rem]">
            {event.startTime && (
              <div className="flex items-center gap-2.5 text-gray-400">
                <span className="text-gray-600 w-16 font-[Montserrat] text-[0.65rem] uppercase">Date</span>
                <span>{formatDate(event.startTime)} at {formatTime(event.startTime)}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2.5 text-gray-400">
                <span className="text-gray-600 w-16 font-[Montserrat] text-[0.65rem] uppercase">Location</span>
                <span>{event.location}</span>
              </div>
            )}
            {event.link && (
              <div className="flex items-start gap-2.5 text-gray-400">
                <span className="text-gray-600 w-16 font-[Montserrat] text-[0.65rem] uppercase">Link</span>
                <a href={event.link} target="_blank" rel="noopener noreferrer"
                  className="text-[#FF4447] hover:underline break-all">{event.link}</a>
              </div>
            )}
            {event.description && (
              <div className="flex items-start gap-2.5 text-gray-400 pt-2 mt-1 border-t border-white/[.05]">
                <span className="text-gray-600 w-16 font-[Montserrat] text-[0.65rem] uppercase flex-shrink-0">Details</span>
                <span className="leading-relaxed">{event.description}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => downloadICS(event)}
            className="flex-1 py-2.5 bg-white/[.04] border border-white/[.08] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] hover:bg-white/[.07] transition-colors">
            Add to Calendar
          </button>
          {event.link && (
            <a href={event.link} target="_blank" rel="noopener noreferrer"
              className="flex-1 py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] transition-colors text-center">
              Join Event
            </a>
          )}
          <button onClick={onClose}
            className="px-4 py-2.5 bg-white/[.04] border border-white/[.08] text-gray-400 text-[0.76rem] font-bold font-[Montserrat] rounded-[8px]">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── admin create/edit modal ───────────────────────────────────────
function AdminEventModal({ event, onClose, onSave }) {
  const [form, setForm] = useState({
    title:       event?.title       || '',
    description: event?.description || '',
    location:    event?.location    || '',
    link:        event?.link        || '',
    type:        event?.type        || 'online',
    capacity:    event?.capacity    || 50,
    startDate:   event?.startTime ? new Date(event.startTime.toDate()).toISOString().slice(0,16) : '',
    endDate:     event?.endTime   ? new Date(event.endTime.toDate()).toISOString().slice(0,16)   : '',
    thumbnail:   event?.thumbnail   || '',
  })
  const ic = "w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"
  const lbl = "block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]"

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[900] flex items-center justify-center p-4"
      onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div className="bg-[#161616] border border-white/[.06] rounded-[16px] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-[Montserrat] font-black text-[1rem]">{event ? 'Edit Event' : 'Create Event'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">✕</button>
        </div>
        <div className="flex flex-col gap-3">
          <div><label className={lbl}>Title *</label><input value={form.title} onChange={ev => setForm(f=>({...f,title:ev.target.value}))} placeholder="Event title" className={ic} /></div>
          <div><label className={lbl}>Description</label><textarea value={form.description} onChange={ev => setForm(f=>({...f,description:ev.target.value}))} placeholder="Event details…" rows={3} className={`${ic} resize-none`} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Start Date & Time</label><input type="datetime-local" value={form.startDate} onChange={ev => setForm(f=>({...f,startDate:ev.target.value}))} className={ic} /></div>
            <div><label className={lbl}>End Date & Time</label><input type="datetime-local" value={form.endDate} onChange={ev => setForm(f=>({...f,endDate:ev.target.value}))} className={ic} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Type</label>
              <select value={form.type} onChange={ev => setForm(f=>({...f,type:ev.target.value}))} className={ic}>
                <option value="online">Online</option>
                <option value="in-person">In-Person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div><label className={lbl}>Max Capacity</label><input type="number" min={1} value={form.capacity} onChange={ev => setForm(f=>({...f,capacity:+ev.target.value}))} className={ic} /></div>
          </div>
          <div><label className={lbl}>Location (physical address)</label><input value={form.location} onChange={ev => setForm(f=>({...f,location:ev.target.value}))} placeholder="e.g. Dubai World Trade Centre" className={ic} /></div>
          <div><label className={lbl}>Join Link (Zoom, Meet, etc.)</label><input value={form.link} onChange={ev => setForm(f=>({...f,link:ev.target.value}))} placeholder="https://zoom.us/j/..." type="url" className={ic} /></div>
          <div><label className={lbl}>Thumbnail URL</label><input value={form.thumbnail} onChange={ev => setForm(f=>({...f,thumbnail:ev.target.value}))} placeholder="https://..." className={ic} /></div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="px-5 py-2.5 bg-white/[.04] border border-white/[.08] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px]">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.title.trim()}
            className="flex-1 py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px] disabled:opacity-50 transition-colors">
            {event ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EventsPage() {
  const { profile, isAdmin } = useAuth()
  const [events,    setEvents]    = useState([])
  const [filter,    setFilter]    = useState('All')
  const [loading,   setLoading]   = useState(true)
  const [showAdmin, setShowAdmin] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [rsvpEvent, setRsvpEvent] = useState(null) // confirmation modal

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startTime', 'asc'))
    return onSnapshot(q,
      s => { setEvents(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
  }, [])

  const shown = events.filter(ev => {
    if (filter === 'All')      return true
    if (filter === 'Live')     return getStatus(ev) === 'live'
    if (filter === 'Upcoming') return getStatus(ev) === 'upcoming'
    if (filter === 'Past')     return getStatus(ev) === 'past'
    return true
  })

  async function handleRSVP(event) {
    if (!profile?.uid) return
    const rsvps    = event.rsvps || []
    const capacity = event.capacity || 999
    const hasRSVP  = rsvps.includes(profile.uid)

    // cancel RSVP
    if (hasRSVP) {
      if (!confirm('Cancel your RSVP for this event?')) return
      try {
        await updateDoc(doc(db, 'events', event.id), { rsvps: arrayRemove(profile.uid) })
        toast.success('RSVP cancelled.')
      } catch (err) { toast.error(err.message) }
      return
    }

    // check capacity
    if (rsvps.length >= capacity) {
      toast.error(`This event is full (${capacity} spots). You've been added to the waitlist.`)
      // add to waitlist
      try {
        await updateDoc(doc(db, 'events', event.id), {
          waitlist: arrayUnion(profile.uid)
        })
      } catch (_) {}
      return
    }

    // confirm RSVP
    try {
      await updateDoc(doc(db, 'events', event.id), {
        rsvps: arrayUnion(profile.uid)
      })
      // notify user
      await notify(profile.uid, {
        type:    'event',
        message: `RSVP confirmed for: ${event.title}`,
        preview: event.startTime ? `${formatDate(event.startTime)} at ${formatTime(event.startTime)}` : null,
        link:    '/events',
      })
      setRsvpEvent({ ...event, rsvps: [...rsvps, profile.uid] })
    } catch (err) { toast.error(err.message) }
  }

  async function handleSave(form) {
    try {
      const data = {
        title:       form.title.trim(),
        description: form.description.trim(),
        location:    form.location.trim(),
        link:        form.link.trim(),
        type:        form.type,
        capacity:    form.capacity || 50,
        thumbnail:   form.thumbnail.trim(),
        startTime:   form.startDate ? new Date(form.startDate) : null,
        endTime:     form.endDate   ? new Date(form.endDate)   : null,
      }
      if (editEvent) {
        await updateDoc(doc(db, 'events', editEvent.id), { ...data, updatedAt: serverTimestamp() })
        toast.success('Event updated.')
      } else {
        await addDoc(collection(db, 'events'), { ...data, rsvps: [], waitlist: [], createdAt: serverTimestamp() })
        toast.success('Event created.')
      }
      setShowAdmin(false); setEditEvent(null)
    } catch (err) { toast.error(err.message) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this event?')) return
    try { await deleteDoc(doc(db, 'events', id)); toast.success('Event deleted.') }
    catch (err) { toast.error(err.message) }
  }

  return (
    <div className="max-w-screen-lg mx-auto">
      {rsvpEvent && <RSVPModal event={rsvpEvent} onClose={() => setRsvpEvent(null)} />}
      {(showAdmin || editEvent) && (
        <AdminEventModal
          event={editEvent}
          onClose={() => { setShowAdmin(false); setEditEvent(null) }}
          onSave={handleSave}
        />
      )}

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-[Montserrat] text-[1.3rem] font-black">Events</h1>
          <p className="text-[0.76rem] text-gray-500 mt-0.5">Webinars, workshops, and live sessions.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-[6px] text-[0.73rem] font-bold font-[Montserrat] border transition-all ${filter === f ? 'bg-[rgba(229,24,27,.1)] border-red-500/25 text-[#FF4447]' : 'border-white/[.08] text-gray-500 hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={() => setShowAdmin(true)}
              className="px-4 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[8px] transition-colors">
              Create Event
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-[0.85rem]">No events found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map(ev => {
            const status   = getStatus(ev)
            const rsvps    = ev.rsvps    || []
            const waitlist = ev.waitlist || []
            const capacity = ev.capacity || 999
            const hasRSVP  = rsvps.includes(profile?.uid)
            const onWaitlist = waitlist.includes(profile?.uid)
            const isFull   = rsvps.length >= capacity
            const spotsLeft = Math.max(0, capacity - rsvps.length)

            return (
              <div key={ev.id} className="bg-[#111] border border-white/[.06] rounded-[12px] overflow-hidden hover:border-white/[.1] transition-all">
                {/* thumbnail */}
                {ev.thumbnail ? (
                  <img src={ev.thumbnail} alt={ev.title} className="w-full h-32 object-cover" />
                ) : (
                  <div className={`h-32 flex items-center justify-center font-[Montserrat] font-black text-white text-[0.8rem] relative
                    ${status==='live' ? 'bg-gradient-to-br from-red-900 to-red-950' : status==='past' ? 'bg-[#0d0d0d]' : 'bg-gradient-to-br from-[#1a0505] to-[#3d0a0a]'}`}>
                    {ev.type === 'online' ? 'Online Event' : ev.type === 'in-person' ? 'In-Person Event' : 'Hybrid Event'}
                    {status === 'live' && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-[0.6rem] font-bold font-[Montserrat]">LIVE</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4">
                  {/* badges */}
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <span className={`text-[0.58rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${
                      status==='live'     ? 'bg-red-900/20 text-red-400 border-red-500/20' :
                      status==='upcoming' ? 'bg-blue-900/20 text-blue-400 border-blue-500/20' :
                                           'bg-gray-900/20 text-gray-500 border-gray-500/20'}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    <span className="text-[0.58rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full bg-white/[.04] border border-white/[.06] text-gray-500 capitalize">
                      {ev.type || 'online'}
                    </span>
                    {capacity < 999 && (
                      <span className={`text-[0.58rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${isFull ? 'bg-red-900/20 text-red-400 border-red-500/20' : 'bg-green-900/20 text-green-400 border-green-500/20'}`}>
                        {isFull ? 'Full' : `${spotsLeft} spots left`}
                      </span>
                    )}
                  </div>

                  <div className="font-[Montserrat] font-bold text-[0.88rem] mb-1.5 leading-snug">{ev.title}</div>

                  {ev.startTime && (
                    <div className="text-[0.68rem] text-gray-500 mb-1">
                      {formatDate(ev.startTime)} · {formatTime(ev.startTime)}
                    </div>
                  )}

                  {ev.location && (
                    <div className="text-[0.68rem] text-gray-600 mb-2 truncate">{ev.location}</div>
                  )}

                  {ev.description && (
                    <p className="text-[0.73rem] text-gray-500 leading-relaxed mb-3 line-clamp-2">{ev.description}</p>
                  )}

                  {/* attendees count */}
                  <div className="text-[0.65rem] text-gray-600 mb-3 font-[Montserrat]">
                    {rsvps.length} attending{capacity < 999 ? ` · ${capacity} max` : ''}
                    {waitlist.length > 0 && ` · ${waitlist.length} waitlisted`}
                  </div>

                  <div className="flex gap-2">
                    {/* RSVP button */}
                    {status !== 'past' && (
                      <button onClick={() => handleRSVP(ev)}
                        className={`flex-1 py-2 text-[0.73rem] font-bold font-[Montserrat] rounded-[7px] transition-colors ${
                          hasRSVP   ? 'bg-green-900/20 border border-green-500/20 text-green-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-500/20' :
                          onWaitlist ? 'bg-amber-900/20 border border-amber-500/20 text-amber-400' :
                          isFull    ? 'bg-white/[.04] border border-white/[.08] text-gray-500 hover:bg-amber-900/10 hover:text-amber-400' :
                          'bg-[rgba(229,24,27,.1)] border border-red-500/20 text-[#FF4447] hover:bg-[rgba(229,24,27,.15)]'}`}>
                        {hasRSVP    ? 'RSVP\'d — Cancel?' :
                         onWaitlist ? 'Waitlisted' :
                         isFull     ? 'Join Waitlist' :
                         'RSVP'}
                      </button>
                    )}

                    {/* view details if RSVP'd */}
                    {hasRSVP && (
                      <button onClick={() => setRsvpEvent(ev)}
                        className="px-3 py-2 bg-white/[.04] border border-white/[.08] text-gray-400 text-[0.72rem] font-bold font-[Montserrat] rounded-[7px] hover:bg-white/[.07] transition-colors">
                        Details
                      </button>
                    )}

                    {/* live join */}
                    {status === 'live' && ev.link && (
                      <a href={ev.link} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-[0.73rem] font-bold font-[Montserrat] rounded-[7px] text-center transition-colors">
                        Join Now
                      </a>
                    )}

                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => setEditEvent(ev)}
                          className="px-2.5 py-2 bg-white/[.04] border border-white/[.08] text-gray-500 hover:text-white text-[0.68rem] font-bold font-[Montserrat] rounded-[6px]">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(ev.id)}
                          className="px-2.5 py-2 bg-red-900/20 border border-red-500/20 text-red-400 text-[0.68rem] font-bold font-[Montserrat] rounded-[6px]">
                          Del
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
