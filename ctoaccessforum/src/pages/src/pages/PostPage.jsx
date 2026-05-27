import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, collection, query, orderBy,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  serverTimestamp, increment
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { uploadFile } from '@/lib/cloudinary'
import { timeAgo, strToColor, initials, CHANNELS, ROLE_META, parseVideoUrl, bytesToSize } from '@/lib/utils'
import toast from 'react-hot-toast'

function Avatar({ name, uid, size = 8 }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center font-bold font-[Montserrat] text-white flex-shrink-0`}
      style={{ background: strToColor(uid || ''), fontSize: size <= 7 ? '0.58rem' : '0.68rem' }}>
      {initials(name || '?')}
    </div>
  )
}

function RoleBadge({ role }) {
  const rm = ROLE_META[role] || ROLE_META.member_free
  return (
    <span className={`text-[0.58rem] font-bold font-[Montserrat] px-1.5 py-0.5 rounded-full border ${rm.cls}`}>
      {rm.label}
    </span>
  )
}

function FileAttachment({ url, name }) {
  if (!url) return null
  const ext = name?.split('.').pop()?.toUpperCase() || 'FILE'
  return (
    <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-4 py-3">
      <div className="w-8 h-8 rounded-[5px] bg-white/[.04] border border-white/[.06] flex items-center justify-center text-[0.6rem] font-bold text-gray-500 font-[Montserrat]">
        {ext}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.75rem] font-medium truncate">{name || 'Attachment'}</div>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-[0.7rem] font-bold font-[Montserrat] text-[#FF4447] hover:underline flex-shrink-0">
        Download
      </a>
    </div>
  )
}

function VideoEmbed({ url }) {
  if (!url) return null
  const e = parseVideoUrl(url)
  if (!e) return null
  return (
    <div className="video-wrap rounded-[10px] overflow-hidden">
      <iframe src={e.src} allowFullScreen className="absolute inset-0 w-full h-full border-0" />
    </div>
  )
}

function ReplyComposer({ postId, onPosted }) {
  const { profile } = useAuth()
  const [body,      setBody]      = useState('')
  const [videoUrl,  setVideoUrl]  = useState('')
  const [file,      setFile]      = useState(null)
  const [posting,   setPosting]   = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [showExtra, setShowExtra] = useState(false)
  const textRef = useRef(null)

  async function submit() {
    if (!body.trim()) { toast.error('Reply cannot be empty'); return }
    setPosting(true)
    try {
      let fileUrl = null, fileName = null, fileSize = null
      if (file) {
        const res = await uploadFile(file, p => setProgress(p))
        fileUrl = res.url; fileName = file.name; fileSize = res.bytes || file.size
      }
      await addDoc(collection(db, 'posts', postId, 'replies'), {
        body:       body.trim(),
        videoUrl:   videoUrl || null,
        fileUrl, fileName, fileSize,
        authorId:   profile.uid,
        authorName: profile.displayName,
        authorRole: profile.role,
        likes:      0,
        likedBy:    [],
        createdAt:  serverTimestamp(),
      })
      await updateDoc(doc(db, 'posts', postId), { replies: increment(1) })
      setBody(''); setVideoUrl(''); setFile(null); setProgress(0); setShowExtra(false)
      toast.success('Reply posted.')
      onPosted?.()
    } catch (e) { toast.error(e.message) }
    finally { setPosting(false) }
  }

  return (
    <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-4">
      <div className="flex gap-3">
        <Avatar name={profile?.displayName} uid={profile?.uid} size={8} />
        <div className="flex-1 min-w-0">
          <textarea
            ref={textRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write a reply…"
            rows={3}
            maxLength={5000}
            className="w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.8rem] outline-none font-[Poppins] placeholder-gray-600 resize-none focus:border-[rgba(229,24,27,.3)] transition-colors"
          />

          {/* extra fields */}
          {showExtra && (
            <div className="flex flex-col gap-2.5 mt-2.5">
              {/* video url */}
              <input
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="Video link — YouTube, Vimeo, Google Drive"
                type="url"
                className="w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2 text-white text-[0.78rem] outline-none font-[Poppins] placeholder-gray-600"
              />
              {/* file */}
              <div
                onClick={() => document.getElementById('reply-file').click()}
                className="border border-dashed border-white/[.08] rounded-[8px] px-4 py-3 cursor-pointer hover:border-red-500/25 transition-colors text-center">
                {file ? (
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-[0.7rem] font-medium text-white">{file.name}</span>
                    <span className="text-[0.65rem] text-gray-500">({bytesToSize(file.size)})</span>
                    <button onClick={e => { e.stopPropagation(); setFile(null) }}
                      className="text-gray-600 hover:text-red-400 text-xs ml-1">✕</button>
                  </div>
                ) : (
                  <span className="text-[0.73rem] text-gray-500">Click to attach a file (PDF, DOCX, ZIP — max 50MB)</span>
                )}
                {progress > 0 && posting && (
                  <div className="h-1 bg-white/[.06] rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[#E5181B] rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              <input id="reply-file" type="file" className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.pptx"
                onChange={e => setFile(e.target.files[0] || null)} />
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setShowExtra(s => !s)}
              className="text-[0.7rem] text-gray-500 hover:text-gray-300 font-[Montserrat] transition-colors">
              {showExtra ? 'Hide attachments' : '+ Add video / file'}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] text-gray-700">{body.length}/5000</span>
              <button
                onClick={submit}
                disabled={posting || !body.trim()}
                className="px-4 py-1.5 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[7px] disabled:opacity-40 transition-colors flex items-center gap-2">
                {posting
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Posting…</span></>
                  : 'Post Reply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReplyCard({ reply, postId, isAdmin, currentUid }) {
  const canDelete = isAdmin || reply.authorId === currentUid
  const liked     = reply.likedBy?.includes(currentUid)

  async function toggleLike() {
    if (!currentUid) return
    const ref = doc(db, 'posts', postId, 'replies', reply.id)
    await updateDoc(ref, {
      likes:   increment(liked ? -1 : 1),
      likedBy: liked
        ? (reply.likedBy || []).filter(id => id !== currentUid)
        : [...(reply.likedBy || []), currentUid],
    })
  }

  async function handleDelete() {
    if (!confirm('Delete this reply?')) return
    try {
      await deleteDoc(doc(db, 'posts', postId, 'replies', reply.id))
      await updateDoc(doc(db, 'posts', postId), { replies: increment(-1) })
      toast.success('Reply deleted.')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="flex gap-3 py-4 border-b border-white/[.04] last:border-0 group">
      <Avatar name={reply.authorName} uid={reply.authorId} size={8} />
      <div className="flex-1 min-w-0">
        {/* author row */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[0.8rem] font-semibold">{reply.authorName}</span>
          <RoleBadge role={reply.authorRole} />
          <span className="text-[0.65rem] text-gray-600">{timeAgo(reply.createdAt)}</span>
        </div>
        {/* body */}
        <p className="text-[0.8rem] text-gray-300 leading-relaxed whitespace-pre-wrap mb-3">{reply.body}</p>
        {/* attachments */}
        {reply.videoUrl && <div className="mb-3"><VideoEmbed url={reply.videoUrl} /></div>}
        {reply.fileUrl  && <div className="mb-3"><FileAttachment url={reply.fileUrl} name={reply.fileName} /></div>}
        {/* actions */}
        <div className="flex items-center gap-4 text-[0.7rem] text-gray-600">
          <button onClick={toggleLike}
            className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-[#FF4447]' : 'hover:text-gray-300'}`}>
            <span>{liked ? '♥' : '♡'}</span>
            <span>{reply.likes || 0}</span>
          </button>
          {canDelete && (
            <button onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all ml-auto">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PostPage() {
  const { postId }              = useParams()
  const nav                     = useNavigate()
  const { profile, isAdmin }    = useAuth()
  const [post,    setPost]      = useState(null)
  const [replies, setReplies]   = useState([])
  const [loading, setLoading]   = useState(true)
  const repliesEndRef           = useRef(null)

  // fetch post
  useEffect(() => {
    if (!postId) return
    getDoc(doc(db, 'posts', postId)).then(snap => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() })
      else { toast.error('Post not found'); nav(-1) }
      setLoading(false)
    })
  }, [postId])

  // live replies
  useEffect(() => {
    if (!postId) return
    const q = query(
      collection(db, 'posts', postId, 'replies'),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, s => setReplies(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {})
  }, [postId])

  // like post toggle
  async function togglePostLike() {
    if (!profile?.uid || !post) return
    const liked = post.likedBy?.includes(profile.uid)
    const ref   = doc(db, 'posts', postId)
    await updateDoc(ref, {
      likes:   increment(liked ? -1 : 1),
      likedBy: liked
        ? (post.likedBy || []).filter(id => id !== profile.uid)
        : [...(post.likedBy || []), profile.uid],
    })
    setPost(p => ({
      ...p,
      likes:   (p.likes || 0) + (liked ? -1 : 1),
      likedBy: liked
        ? (p.likedBy || []).filter(id => id !== profile.uid)
        : [...(p.likedBy || []), profile.uid],
    }))
  }

  // pin toggle (admin only)
  async function togglePin() {
    if (!isAdmin || !post) return
    await updateDoc(doc(db, 'posts', postId), { pinned: !post.pinned })
    setPost(p => ({ ...p, pinned: !p.pinned }))
    toast.success(post.pinned ? 'Post unpinned.' : 'Post pinned.')
  }

  // delete post
  async function deletePost() {
    if (!confirm('Delete this post and all replies?')) return
    try {
      await deleteDoc(doc(db, 'posts', postId))
      toast.success('Post deleted.')
      nav('/forum')
    } catch (e) { toast.error(e.message) }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )

  if (!post) return null

  const channel    = CHANNELS.find(c => c.id === post.channel)
  const postLiked  = post.likedBy?.includes(profile?.uid)
  const canDelete  = isAdmin || post.authorId === profile?.uid

  return (
    <div className="max-w-screen-md mx-auto">
      {/* back */}
      <button onClick={() => nav(-1)}
        className="flex items-center gap-2 text-[0.75rem] text-gray-500 hover:text-white mb-5 transition-colors font-[Montserrat]">
        ← Back to Forum
      </button>

      {/* post card */}
      <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-6 mb-4">
        {/* meta row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {channel && (
            <span className="text-[0.62rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-[rgba(229,24,27,.08)] text-[#FF4447] border border-red-500/15">
              {channel.label}
            </span>
          )}
          {post.pinned && (
            <span className="text-[0.62rem] font-bold font-[Montserrat] px-2 py-0.5 rounded bg-amber-900/20 text-amber-300 border border-amber-500/20">
              Pinned
            </span>
          )}
          {post.tags?.map(t => (
            <span key={t} className="text-[0.62rem] font-[Montserrat] px-2 py-0.5 rounded bg-white/[.03] text-gray-500 border border-white/[.06]">
              {t}
            </span>
          ))}
        </div>

        {/* title */}
        <h1 className="font-[Montserrat] text-[1.25rem] font-black leading-snug mb-4">{post.title}</h1>

        {/* author */}
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/[.05]">
          <Avatar name={post.authorName} uid={post.authorId} size={9} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[0.82rem] font-semibold">{post.authorName}</span>
              <RoleBadge role={post.authorRole} />
            </div>
            <div className="text-[0.67rem] text-gray-500 mt-0.5">{timeAgo(post.createdAt)}</div>
          </div>
        </div>

        {/* body */}
        <div className="text-[0.85rem] text-gray-300 leading-relaxed whitespace-pre-wrap mb-5">
          {post.body}
        </div>

        {/* media */}
        {post.videoUrl && <div className="mb-4"><VideoEmbed url={post.videoUrl} /></div>}
        {post.fileUrl  && <div className="mb-4"><FileAttachment url={post.fileUrl} name={post.fileName} /></div>}

        {/* actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/[.05]">
          <button onClick={togglePostLike}
            className={`flex items-center gap-2 text-[0.75rem] font-[Montserrat] transition-colors ${postLiked ? 'text-[#FF4447]' : 'text-gray-500 hover:text-gray-300'}`}>
            <span>{postLiked ? '♥' : '♡'}</span>
            <span>{post.likes || 0} {post.likes === 1 ? 'like' : 'likes'}</span>
          </button>
          <span className="text-[0.75rem] text-gray-600 font-[Montserrat]">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
          <button
            onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied.') }}
            className="text-[0.72rem] text-gray-600 hover:text-gray-300 transition-colors font-[Montserrat]">
            Copy link
          </button>
          <div className="ml-auto flex items-center gap-3">
            {isAdmin && (
              <button onClick={togglePin}
                className="text-[0.72rem] text-gray-500 hover:text-amber-300 transition-colors font-[Montserrat]">
                {post.pinned ? 'Unpin' : 'Pin post'}
              </button>
            )}
            {canDelete && (
              <button onClick={deletePost}
                className="text-[0.72rem] text-gray-600 hover:text-red-400 transition-colors font-[Montserrat]">
                Delete post
              </button>
            )}
          </div>
        </div>
      </div>

      {/* replies section */}
      <div className="mb-4">
        <h2 className="font-[Montserrat] text-[0.72rem] font-bold tracking-[.1em] uppercase text-gray-500 mb-3">
          {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
        </h2>

        {replies.length === 0 ? (
          <div className="bg-[#111] border border-white/[.05] rounded-[12px] px-6 py-8 text-center text-[0.8rem] text-gray-600">
            No replies yet. Be the first to respond.
          </div>
        ) : (
          <div className="bg-[#111] border border-white/[.06] rounded-[12px] px-5">
            {replies.map(r => (
              <ReplyCard
                key={r.id}
                reply={r}
                postId={postId}
                isAdmin={isAdmin}
                currentUid={profile?.uid}
              />
            ))}
          </div>
        )}
        <div ref={repliesEndRef} />
      </div>

      {/* reply composer */}
      <ReplyComposer
        postId={postId}
        onPosted={() => repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />
    </div>
  )
}
