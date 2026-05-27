import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { fmtDate, timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'

const EVENT_TYPES = ['Webinar', 'AMA', 'Workshop', 'Summit', 'Masterclass']

function isLive(e) {
  if (!e.date || !e.time) return false
  try {
    const start = new Date(`${e.date}T${e.time}`)
    const end   = new Date(start.getTime() + (e.duration || 60) * 60000)
    const now   = new Date()
    return now >= start && now <= end
  } catch { return false }
}

function isPast(e) {
  if (!e.date || !e.time) return false
  try {
    const end = new Date(`${e.date}T${e.time}`)
    end.setMinutes(end.getMinutes() + (e.duration || 60))
    return new Date() > end
  } catch { return false }
}

function formatEventDate(dateStr) {
  if (!dateStr) return { day: '--', month: '--', full: '' }
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return {
      day:   d.getDate(),
      month: d.toLocaleString('en', { month: 'short' }).toUpperCase(),
      full:  d.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    }
  } catch { return { day: '--', month: '--', full: '' } }
}

function EventModal({ event, onClose }) {
  const { profile } = useAuth()
  const editing = !!event?.id
  const [form, setForm] = useState({
    title:       event?.title       || '',
    description: event?.description || '',
    date:        event?.date        || '',
    time:        event?.time        || '18:00',
    duration:    event?.duration    || 60,
    type:        event?.type        || 'Webinar',
    access:      event?.access      || 'free',
    meetingUrl:  event?.meetingUrl  || '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.title.trim()) { toast.error('Title required'); return }
    if (!form.date)         { toast.error('Date required');  return }
    setSaving(true)
    try {
      const data = {
        ...form,
        duration: Number(form.duration),
        hostId:   profile.uid,
        hostName: profile.displayName,
        rsvp:     event?.rsvp || 0,
        updatedAt: serverTimestamp(),
      }
      if (editing) {
        await updateDoc(doc(db, 'events', event.id), data)
        toast.success('Event updated.')
      } else {
        await addDoc(collection(db, 'events'), { ...data, createdAt: serverTimestamp() })
        toast.success('Event created.')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const ic = "w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[900] flex items-center justify-center p-5"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161616] border border-white/[.06] rounded-[16px] p-7 w-full max-w-lg red-topline max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-[Montserrat] font-black text-[1rem]">{editing ? 'Edit Event' : 'Create Event'}</h2>
            <p className="text-[0.72rem] text-gray-500 mt-0.5">Schedule a live session for the community.</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-[6px] bg-white/5 border border-white/[.06] flex items-center justify-center text-gray-500 hover:text-white text-sm">✕</button>
        </div>

        <div className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. AI Strategy for CTOs" maxLength={120} className={ic} />
          </div>
          <div>
            <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What will be covered in this session?" rows={3} maxLength={600}
              className={`${ic} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={ic} />
            </div>
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Time (GST)</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className={ic} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Duration (min)</label>
              <input type="number" min={15} max={480} value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className={ic} />
            </div>
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={ic}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Access</label>
              <select value={form.access} onChange={e => setForm(f => ({ ...f, access: e.target.value }))} className={ic}>
                <option value="free">Free</option>
                <option value="pro">Pro only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[0.67rem] font-bold text-gray-500 mb-1.5 uppercase tracking-wide font-[Montserrat]">Meeting URL (optional)</label>
            <input value={form.meetingUrl} onChange={e => setForm(f => ({ ...f, meetingUrl: e.target.value }))}
              placeholder="Zoom, Google Meet, or Teams link" type="url" className={ic} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="px-5 py-2.5 bg-white/[.04] border border-white/[.08] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px]">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {saving
                ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Saving…</span></>
                : editing ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EventsPage() {
  const { isAdmin, isPro } = useAuth()
  const [events,     setEvents]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editEvent,  setEditEvent]  = useState(null)
  const [filter,     setFilter]     = useState('upcoming')

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'))
    return onSnapshot(q,
      s => { setEvents(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
  }, [])

  async function handleRSVP(e) {
    if (!e.access === 'free' && !isPro && !isAdmin) {
      toast.error('Pro membership required for this event.')
      return
    }
    try {
      await updateDoc(doc(db, 'events', e.id), { rsvp: (e.rsvp || 0) + 1 })
      toast.success('RSVP confirmed.')
    } catch (err) { toast.error(err.message) }
  }

  async function handleDelete(e) {
    if (!confirm(`Delete "${e.title}"?`)) return
    try { await deleteDoc(doc(db, 'events', e.id)); toast.success('Event deleted.') }
    catch (err) { toast.error(err.message) }
  }

  const filtered = events.filter(e => {
    if (filter === 'live')     return isLive(e)
    if (filter === 'past')     return isPast(e)
    if (filter === 'upcoming') return !isPast(e) && !isLive(e)
    return true
  })

  const liveCount = events.filter(isLive).length

  return (
    <div className="max-w-screen-lg mx-auto">
      {(showModal || editEvent) && (
        <EventModal
          event={editEvent}
          onClose={() => { setShowModal(false); setEditEvent(null) }}
        />
      )}

      {/* header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-[Montserrat] text-[1.3rem] font-black">Events & Live Sessions</h1>
          <p className="text-[0.76rem] text-gray-500 mt-0.5">
            Webinars, AMAs, and workshops from the community.
            {liveCount > 0 && <span className="ml-2 text-red-400 font-semibold">{liveCount} live now</span>}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)}
            className="bg-[#E5181B] hover:bg-[#C01215] text-white px-4 py-2 rounded-[8px] text-[0.76rem] font-bold font-[Montserrat] transition-colors">
            Create Event
          </button>
        )}
      </div>

      {/* filter tabs */}
      <div className="flex gap-1 bg-[#111] border border-white/[.05] rounded-[10px] p-1 mb-5 w-fit">
        {[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'live',     label: `Live${liveCount > 0 ? ` (${liveCount})` : ''}` },
          { id: 'past',     label: 'Past' },
          { id: 'all',      label: 'All' },
        ].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`px-4 py-1.5 rounded-[8px] text-[0.73rem] font-bold font-[Montserrat] transition-all ${filter === t.id ? 'bg-[#E5181B] text-white' : 'text-gray-500 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-[0.85rem]">
          {filter === 'live' ? 'No live sessions right now.' : 'No events found.'}
          {isAdmin && filter === 'upcoming' && (
            <> <button onClick={() => setShowModal(true)} className="text-[#FF4447] hover:underline">Create one.</button></>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(e => {
            const { day, month } = formatEventDate(e.date)
            const live = isLive(e)
            const past = isPast(e)
            return (
              <div key={e.id}
                className={`bg-[#111] border rounded-[12px] p-5 flex flex-col transition-all hover:-translate-y-0.5 group ${live ? 'border-red-500/30' : past ? 'border-white/[.03] opacity-60' : 'border-white/[.05] hover:border-white/[.1]'}`}>

                {/* date + badges */}
                <div className="flex items-start justify-between mb-3">
                  <div className="text-center bg-[rgba(229,24,27,.08)] border border-red-500/15 rounded-[7px] px-3 py-2 min-w-[44px]">
                    <div className="font-[Montserrat] text-[1.05rem] font-black text-[#E5181B] leading-none">{day}</div>
                    <div className="text-[0.52rem] text-gray-500 uppercase tracking-wide mt-0.5">{month}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {live && (
                      <span className="text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-red-900/30 text-red-300 border border-red-500/25 animate-blink">
                        Live
                      </span>
                    )}
                    {past && (
                      <span className="text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-white/[.04] text-gray-500 border border-white/[.06]">
                        Ended
                      </span>
                    )}
                    <span className={`text-[0.6rem] font-bold font-[Montserrat] px-2 py-0.5 rounded border ${e.access === 'free' ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-[rgba(229,24,27,.06)] text-[#FF4447] border-red-500/15'}`}>
                      {e.access === 'free' ? 'Free' : 'Pro'}
                    </span>
                  </div>
                </div>

                {/* type */}
                <div className="text-[0.62rem] font-bold font-[Montserrat] text-gray-600 uppercase tracking-wide mb-1">{e.type}</div>

                {/* title */}
                <div className="font-[Montserrat] font-bold text-[0.88rem] leading-snug mb-2 flex-1">{e.title}</div>

                {/* description */}
                {e.description && (
                  <p className="text-[0.74rem] text-gray-500 leading-relaxed mb-3 line-clamp-2">{e.description}</p>
                )}

                {/* meta */}
                <div className="flex items-center gap-3 text-[0.67rem] text-gray-600 mb-3">
                  <span>{e.time} GST</span>
                  <span>·</span>
                  <span>{e.duration} min</span>
                  <span>·</span>
                  <span>{e.rsvp || 0} attending</span>
                </div>

                {/* host */}
                <div className="text-[0.67rem] text-gray-600 mb-3">
                  Hosted by <span className="text-gray-400 font-medium">{e.hostName}</span>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[.04]">
                  {live && e.meetingUrl ? (
                    <a href={e.meetingUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 py-2 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.72rem] font-bold font-[Montserrat] rounded-[6px] text-center transition-colors">
                      Join Now
                    </a>
                  ) : !past ? (
                    <button onClick={() => handleRSVP(e)}
                      className="flex-1 py-2 bg-white/[.04] border border-white/[.08] text-white text-[0.72rem] font-bold font-[Montserrat] rounded-[6px] hover:bg-white/[.07] transition-colors">
                      RSVP
                    </button>
                  ) : (
                    <span className="flex-1 py-2 text-center text-[0.72rem] text-gray-600 font-[Montserrat]">Session ended</span>
                  )}
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setEditEvent(e)}
                        className="px-2.5 py-2 bg-white/[.04] border border-white/[.06] text-gray-400 hover:text-white text-[0.7rem] font-[Montserrat] rounded-[6px] transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(e)}
                        className="px-2.5 py-2 bg-white/[.04] border border-white/[.06] text-gray-600 hover:text-red-400 text-[0.7rem] font-[Montserrat] rounded-[6px] transition-colors">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
