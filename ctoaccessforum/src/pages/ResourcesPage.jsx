import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, increment
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { uploadFile } from '@/lib/cloudinary'
import { timeAgo, bytesToSize } from '@/lib/utils'
import toast from 'react-hot-toast'

const CATS = ['All', 'Cloud', 'Security', 'AI', 'DevOps', 'Leadership', 'UAE Market']

function getExt(name = '') {
  return name.split('.').pop()?.toLowerCase() || ''
}

function UploadModal({ onClose }) {
  const { profile } = useAuth()
  const [form,      setForm]      = useState({ title: '', category: 'Cloud', isFree: true, description: '' })
  const [file,      setFile]      = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!file)              { toast.error('Please select a file'); return }
    setUploading(true)
    try {
      const res = await uploadFile(file, p => setProgress(p))
      await addDoc(collection(db, 'resources'), {
        title:       form.title.trim(),
        description: form.description.trim(),
        category:    form.category,
        isFree:      form.isFree,
        fileUrl:     res.url,
        fileName:    file.name,
        fileSize:    res.bytes || file.size,
        publicId:    res.publicId,
        uploadedBy:  profile.uid,
        authorName:  profile.displayName,
        authorRole:  profile.role,
        downloads:   0,
        createdAt:   serverTimestamp(),
      })
      toast.success('Resource uploaded successfully.')
      onClose()
    } catch (e) { toast.error(e.message) }
    finally { setUploading(false) }
  }

  const ic = "w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.81rem] outline-none font-[Poppins] placeholder-gray-600 focus:border-[rgba(229,24,27,.3)] transition-colors"

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[900] flex items-center justify-center p-5"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161616] border border-white/[.06] rounded-[16px] p-7 w-full max-w-lg red-topline max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-[Montserrat] font-black text-[1rem]">Upload Resource</h2>
            <p className="text-[0.72rem] text-gray-500 mt-0.5">Share documents, templates, and guides with the community.</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-[6px] bg-white/5 border border-white/[.06] flex items-center justify-center text-gray-500 hover:text-white text-sm">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[0.7rem] font-semibold text-gray-400 mb-1.5 font-[Montserrat] tracking-wide uppercase">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Zero Trust Implementation Checklist" maxLength={150} className={ic} />
          </div>

          <div>
            <label className="block text-[0.7rem] font-semibold text-gray-400 mb-1.5 font-[Montserrat] tracking-wide uppercase">Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this resource..." rows={2} maxLength={500}
              className={`${ic} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.7rem] font-semibold text-gray-400 mb-1.5 font-[Montserrat] tracking-wide uppercase">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={ic}>
                {CATS.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[0.7rem] font-semibold text-gray-400 mb-1.5 font-[Montserrat] tracking-wide uppercase">Access</label>
              <button type="button"
                onClick={() => setForm(f => ({ ...f, isFree: !f.isFree }))}
                className={`w-full py-2.5 rounded-[8px] text-[0.78rem] font-bold font-[Montserrat] border transition-all ${form.isFree ? 'bg-green-900/20 text-green-300 border-green-500/20' : 'bg-[rgba(229,24,27,.08)] text-[#FF4447] border-red-500/20'}`}>
                {form.isFree ? 'Free for all' : 'Pro only'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[0.7rem] font-semibold text-gray-400 mb-1.5 font-[Montserrat] tracking-wide uppercase">File</label>
            <div onClick={() => document.getElementById('res-file').click()}
              className="border border-dashed border-white/[.1] rounded-[8px] p-5 text-center cursor-pointer hover:border-red-500/30 hover:bg-red-900/5 transition-all">
              {file ? (
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-9 h-9 rounded-[6px] bg-white/[.04] border border-white/[.06] flex items-center justify-center text-[0.65rem] font-bold text-gray-400 uppercase font-[Montserrat]">
                    {getExt(file.name)}
                  </div>
                  <div className="text-left">
                    <div className="text-[0.8rem] font-semibold text-white">{file.name}</div>
                    <div className="text-[0.68rem] text-gray-500">{bytesToSize(file.size)}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-[0.78rem] text-gray-400 mb-1">Click to select a file</div>
                  <div className="text-[0.67rem] text-gray-600">PDF, DOCX, XLSX, PPTX, ZIP — max 50MB</div>
                </>
              )}
              {uploading && progress > 0 && (
                <div className="h-1 bg-white/[.06] rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-[#E5181B] rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
            <input id="res-file" type="file" className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.pptx,.zip"
              onChange={e => setFile(e.target.files[0] || null)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="px-5 py-2.5 bg-white/[.04] border border-white/[.08] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px]">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={uploading}
              className="flex-1 py-2.5 bg-[#E5181B] hover:bg-[#C01215] text-white font-bold font-[Montserrat] text-[0.78rem] rounded-[8px] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {uploading
                ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>{progress}% uploading…</span></>
                : 'Upload Resource'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResourcesPage() {
  const { profile, isPro, isAdmin } = useAuth()
  const [resources,  setResources]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('All')
  const [search,     setSearch]     = useState('')
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'))
    return onSnapshot(q,
      s => { setResources(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
  }, [])

  const shown = resources.filter(r => {
    const matchCat    = filter === 'All' || r.category === filter
    const matchSearch = !search || `${r.title} ${r.authorName} ${r.category}`.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  async function handleDownload(r) {
    if (!r.isFree && !isPro && !isAdmin) {
      toast.error('Pro membership required to download this resource.')
      return
    }
    try {
      await updateDoc(doc(db, 'resources', r.id), { downloads: increment(1) })
      window.open(r.fileUrl, '_blank')
    } catch (e) { toast.error(e.message) }
  }

  async function handleDelete(r) {
    if (!isAdmin && r.uploadedBy !== profile?.uid) return
    if (!confirm(`Delete "${r.title}"?`)) return
    try { await deleteDoc(doc(db, 'resources', r.id)); toast.success('Resource deleted.') }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className="max-w-screen-lg mx-auto">
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}

      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[Montserrat] text-[1.3rem] font-black">Resource Library</h1>
          <p className="text-[0.78rem] text-gray-500 mt-0.5">Templates, guides, and frameworks shared by the community.</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="bg-[#E5181B] hover:bg-[#C01215] text-white px-4 py-2 rounded-[8px] text-[0.76rem] font-bold font-[Montserrat] transition-colors">
          Upload Resource
        </button>
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources…"
            className="w-full bg-[#161616] border border-white/[.06] rounded-[8px] pl-3.5 pr-3.5 py-2 text-white text-[0.78rem] outline-none font-[Poppins] placeholder-gray-600" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATS.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-[6px] text-[0.72rem] font-bold font-[Montserrat] border transition-all ${filter === c ? 'bg-[rgba(229,24,27,.1)] border-red-500/25 text-[#FF4447]' : 'border-white/[.08] text-gray-500 hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* count */}
      <div className="flex items-center gap-3 mb-4 text-[0.71rem] text-gray-600 font-[Montserrat]">
        <span>{shown.length} result{shown.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span className="text-green-500">{resources.filter(r => r.isFree).length} free</span>
        <span>·</span>
        <span className="text-gray-500">{resources.filter(r => !r.isFree).length} pro</span>
      </div>

      {/* list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-[0.85rem]">
          {resources.length === 0
            ? <span>No resources yet. <button onClick={() => setShowUpload(true)} className="text-[#FF4447] hover:underline">Be the first to upload.</button></span>
            : 'No resources match your search.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map(r => (
            <div key={r.id}
              className="bg-[#111] border border-white/[.05] rounded-[10px] px-5 py-4 flex items-center gap-4 hover:border-white/[.1] transition-colors group">
              {/* file type badge */}
              <div className="w-10 h-10 rounded-[6px] bg-white/[.03] border border-white/[.06] flex items-center justify-center text-[0.62rem] font-bold text-gray-500 uppercase font-[Montserrat] flex-shrink-0 tracking-wide">
                {getExt(r.fileName || '') || 'FILE'}
              </div>

              {/* info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[0.84rem] mb-0.5 text-white">{r.title}</div>
                {r.description && (
                  <div className="text-[0.7rem] text-gray-500 mb-1 line-clamp-1">{r.description}</div>
                )}
                <div className="flex items-center gap-2 text-[0.67rem] text-gray-600">
                  <span>{r.authorName}</span>
                  <span>·</span>
                  <span>{r.category}</span>
                  <span>·</span>
                  <span>{bytesToSize(r.fileSize)}</span>
                  <span>·</span>
                  <span>{timeAgo(r.createdAt)}</span>
                </div>
              </div>

              {/* right side */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-[0.62rem] font-bold font-[Montserrat] px-2 py-0.5 rounded border ${r.isFree ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-[rgba(229,24,27,.06)] text-[#FF4447] border-red-500/15'}`}>
                  {r.isFree ? 'Free' : 'Pro'}
                </span>
                <span className="text-[0.67rem] text-gray-600">{r.downloads || 0} downloads</span>
                {r.isFree || isPro || isAdmin ? (
                  <button onClick={() => handleDownload(r)}
                    className="px-3 py-1.5 bg-white/[.04] border border-white/[.08] text-white text-[0.7rem] font-bold font-[Montserrat] rounded-[6px] hover:bg-white/[.07] transition-colors">
                    Download
                  </button>
                ) : (
                  <span className="px-3 py-1.5 border border-white/[.06] text-gray-600 text-[0.7rem] font-bold font-[Montserrat] rounded-[6px]">
                    Pro only
                  </span>
                )}
                {(isAdmin || r.uploadedBy === profile?.uid) && (
                  <button onClick={() => handleDelete(r)}
                    className="opacity-0 group-hover:opacity-100 text-[0.7rem] text-gray-600 hover:text-red-400 transition-all">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
