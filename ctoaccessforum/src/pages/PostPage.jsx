import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, collection, query, orderBy,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  serverTimestamp, increment, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { uploadFile } from '@/lib/cloudinary'
import { timeAgo, strToColor, initials, CHANNELS, ROLE_META, parseVideoUrl, bytesToSize } from '@/lib/utils'
import { notify } from '@/lib/notifications'
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
  const parsed = parseVideoUrl(url)
  if (!parsed) return null
  return (
    <div className="video-wrap rounded-[10px] overflow-hidden">
      <iframe src={parsed.src} allowFullScreen className="absolute inset-0 w-full h-full border-0" />
    </div>
  )
}

// ── send notifications to unique recipients only ───────────────────
async function sendReplyNotifications({ currentUid, currentName, post, postId, parentReply }) {
  const recipients = new Set()

  // always notify post author (if not the replier)
  if (post?.authorId && post.authorId !== currentUid) {
    recipients.add(post.authorId)
  }

  // also notify the parent reply author if replying to a reply
  if (parentReply?.authorId && parentReply.authorId !== currentUid) {
    recipients.add(parentReply.authorId)
  }

  // send to all unique recipients
  await Promise.all([...recipients].map(uid =>
    notify(uid, {
      type:    'reply',
      message: uid === post?.authorId
        ? `${currentName} replied to your post`
        : `${currentName} also replied to a thread you're in`,
      preview: post?.title,
      link:    `/forum/post/${postId}`,
    })
  ))
}

function ReplyComposer({ postId, post, replies, replyTo, setReplyTo, onPosted }) {
  const { profile } = useAuth()
  const [body,      setBody]      = useState('')
  const [videoUrl,  setVideoUrl]  = useState('')
  const [file,      setFile]      = useState(null)
 // reply to a specific reply
  const [posting,   setPosting]   = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [showExtra, setShowExtra] = useState(false)




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
        body:          body.trim(),
        videoUrl:      videoUrl || null,
        fileUrl,
        fileName,
        fileSize,
        authorId:      profile.uid,
        authorName:    profile.displayName,
        authorRole:    profile.role,
        replyToId:     replyTo?.id    || null,
        replyToName:   replyTo?.authorName || null,
        replyToBody:   replyTo?.body?.slice(0, 100) || null,
        likes:         0,
        likedBy:       [],
        createdAt:     serverTimestamp(),
      })

      await updateDoc(doc(db, 'posts', postId), { replies: increment(1) })

      // send notifications
      await sendReplyNotifications({
        currentUid:  profile.uid,
        currentName: profile.displayName,
        post,
        postId,
        parentReply: replyTo,
      })

      setBody(''); setVideoUrl(''); setFile(null)
      setProgress(0); setShowExtra(false); setReplyTo(null)
      toast.success('Reply posted.')
      onPosted?.()
    } catch (err) { toast.error(err.message) }
    finally { setPosting(false) }
  }

  return (
    <div className="bg-[#111] border border-white/[.06] rounded-[12px] p-4">
      {/* replying to indicator */}
      {replyTo && (
        <div className="flex items-center justify-between mb-3 px-3 py-2 bg-[#1a1a1a] border border-white/[.06] rounded-[8px]">
          <div className="flex-1 min-w-0">
            <span className="text-[0.67rem] text-gray-500">Replying to </span>
            <span className="text-[0.67rem] font-bold text-[#FF4447]">{replyTo.authorName}</span>
            <span className="text-[0.67rem] text-gray-600"> — </span>
            <span className="text-[0.67rem] text-gray-500 italic line-clamp-1">{replyTo.body?.slice(0, 80)}</span>
          </div>
          <button onClick={() => setReplyTo(null)}
            className="text-gray-600 hover:text-red-400 text-xs ml-2 flex-shrink-0">✕</button>
        </div>
      )}

      <div className="flex gap-3">
        <Avatar name={profile?.displayName} uid={profile?.uid} size={8} />
        <div className="flex-1 min-w-0">
          <textarea
            value={body}
            onChange={ev => setBody(ev.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.authorName}…` : 'Write a reply…'}
            rows={3}
            maxLength={5000}
            className="w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2.5 text-white text-[0.8rem] outline-none font-[Poppins] placeholder-gray-600 resize-none focus:border-[rgba(229,24,27,.3)] transition-colors"
          />

          {showExtra && (
            <div className="flex flex-col gap-2.5 mt-2.5">
              <input
                value={videoUrl}
                onChange={ev => setVideoUrl(ev.target.value)}
                placeholder="Video link — YouTube, Vimeo, Google Drive"
                type="url"
                className="w-full bg-[#1a1a1a] border border-white/[.06] rounded-[8px] px-3.5 py-2 text-white text-[0.78rem] outline-none font-[Poppins] placeholder-gray-600"
              />
              <div onClick={() => document.getElementById('reply-file').click()}
                className="border border-dashed border-white/[.08] rounded-[8px] px-4 py-3 cursor-pointer hover:border-red-500/25 transition-colors text-center">
                {file ? (
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-[0.7rem] font-medium text-white">{file.name}</span>
                    <span className="text-[0.65rem] text-gray-500">({bytesToSize(file.size)})</span>
                    <button onClick={ev => { ev.stopPropagation(); setFile(null) }}
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
                onChange={ev => setFile(ev.target.files[0] || null)} />
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <button onClick={() => setShowExtra(s => !s)}
              className="text-[0.7rem] text-gray-500 hover:text-gray-300 font-[Montserrat] transition-colors">
              {showExtra ? 'Hide attachments' : '+ Add video / file'}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] text-gray-700">{body.length}/5000</span>
              <button onClick={submit} disabled={posting || !body.trim()}
                className="px-4 py-1.5 bg-[#E5181B] hover:bg-[#C01215] text-white text-[0.76rem] font-bold font-[Montserrat] rounded-[7px] disabled:opacity-40 transition-colors flex items-center gap-2">
                {posting
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Posting…</span></>
                  : 'Post Reply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReplyCard({ reply, postId, isAdmin, currentUid, onReplyTo }) {
  const canDelete = isAdmin || reply.authorId === currentUid
  const liked     = reply.likedBy?.includes(currentUid)

  async function toggleLike() {
    if (!currentUid) return
    const ref     = doc(db, 'posts', postId, 'replies', reply.id)
    const wasLiked = liked
    await updateDoc(ref, {
      likes:   increment(wasLiked ? -1 : 1),
      likedBy: wasLiked ? arrayRemove(currentUid) : arrayUnion(currentUid),
    })
    // notify reply author on new like (not on unlike, not self-like)
    if (!wasLiked && reply.authorId && reply.authorId !== currentUid) {
      await notify(reply.authorId, {
        type:    'like',
        message: `Someone liked your reply`,
        preview: reply.body?.slice(0, 80),
        link:    `/forum/post/${postId}`,
      })
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this reply?')) return
    try {
      await deleteDoc(doc(db, 'posts', postId, 'replies', reply.id))
      await updateDoc(doc(db, 'posts', postId), { replies: increment(-1) })
      toast.success('Reply deleted.')
    } catch (err) { toast.error(err.message) }
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

        {/* replying to quote */}
        {reply.replyToName && (
          <div className="mb-2 pl-3 border-l-2 border-white/[.1]">
            <span className="text-[0.67rem] text-gray-500">
              Replying to <span className="text-gray-400 font-medium">{reply.replyToName}</span>
            </span>
            {reply.replyToBody && (
              <p className="text-[0.68rem] text-gray-600 italic line-clamp-1 mt-0.5">{reply.replyToBody}</p>
            )}
          </div>
        )}

        {/* body */}
        <p className="text-[0.8rem] text-gray-300 leading-relaxed whitespace-pre-wrap mb-3">{reply.body}</p>

        {/* attachments */}
        {reply.videoUrl && <div className="mb-3"><VideoEmbed url={reply.videoUrl} /></div>}
        {reply.fileUrl  && <div className="mb-3"><FileAttachment url={reply.fileUrl} name={reply.fileName} /></div>}

        {/* actions */}
        <div className="flex items-center gap-4 text-[0.7rem] text-gray-600">
          <button onClick={toggleLike}
            className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-[#FF4447]' : 'hover:text-gray-300'}`}>
            {liked ? '♥' : '♡'} {reply.likes || 0}
          </button>
          <button onClick={() => onReplyTo(reply)}
            className="hover:text-gray-300 transition-colors">
            Reply
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
  const { postId }           = useParams()
  const nav                  = useNavigate()
  const { profile, isAdmin } = useAuth()
  const [post,    setPost]   = useState(null)
  const [replies, setReplies]= useState([])
  const [loading, setLoading]= useState(true)
  const [replyTo, setReplyTo]= useState(null)
  const composerRef          = useRef(null)
  const repliesEndRef        = useRef(null)

  useEffect(() => {
    if (!postId) return
    getDoc(doc(db, 'posts', postId)).then(snap => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() })
      else { toast.error('Post not found'); nav(-1) }
      setLoading(false)
    })
  }, [postId])

  useEffect(() => {
    if (!postId) return
    const q = query(
      collection(db, 'posts', postId, 'replies'),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, s => setReplies(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {})
  }, [postId])

  function handleReplyTo(reply) {
    setReplyTo(reply)
    composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function togglePostLike() {
    if (!profile?.uid || !post) return
    const liked = post.likedBy?.includes(profile.uid)
    await updateDoc(doc(db, 'posts', postId), {
      likes:   increment(liked ? -1 : 1),
      likedBy: liked ? arrayRemove(profile.uid) : arrayUnion(profile.uid),
    })
    // notify post author on new like
    if (!liked && post.authorId && post.authorId !== profile.uid) {
      await notify(post.authorId, {
        type:    'like',
        message: `${profile.displayName} liked your post`,
        preview: post.title,
        link:    `/forum/post/${postId}`,
      })
    }
    setPost(p => ({
      ...p,
      likes:   (p.likes || 0) + (liked ? -1 : 1),
      likedBy: liked
        ? (p.likedBy || []).filter(id => id !== profile.uid)
        : [...(p.likedBy || []), profile.uid],
    }))
  }

  async function togglePin() {
    if (!isAdmin || !post) return
    await updateDoc(doc(db, 'posts', postId), { pinned: !post.pinned })
    setPost(p => ({ ...p, pinned: !p.pinned }))
    toast.success(post.pinned ? 'Post unpinned.' : 'Post pinned.')
  }

  async function deletePost() {
    if (!confirm('Delete this post and all replies?')) return
    try { await deleteDoc(doc(db, 'posts', postId)); toast.success('Post deleted.'); nav('/forum') }
    catch (err) { toast.error(err.message) }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )
  if (!post) return null

  const channel   = CHANNELS.find(c => c.id === post.channel)
  const postLiked = post.likedBy?.includes(profile?.uid)
  const canDelete = isAdmin || post.authorId === profile?.uid

  return (
    <div className="max-w-screen-md mx-auto">
      <button onClick={() => nav(-1)}
        className="text-[0.75rem] text-gray-500 hover:text-white mb-5 transition-colors font-[Montserrat]">
        ← Back to Forum
      </button>

      {/* post */}
      <div className="bg-[#111] border border-white/[.06] rounded-[14px] p-6 mb-4">
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
            <span key={t} className="text-[0.62rem] font-[Montserrat] px-2 py-0.5 rounded bg-white/[.03] text-gray-500 border border-white/[.06]">{t}</span>
          ))}
        </div>

        <h1 className="font-[Montserrat] text-[1.25rem] font-black leading-snug mb-4">{post.title}</h1>

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

        <div className="text-[0.85rem] text-gray-300 leading-relaxed whitespace-pre-wrap mb-5">{post.body}</div>

        {post.videoUrl && <div className="mb-4"><VideoEmbed url={post.videoUrl} /></div>}
        {post.fileUrl  && <div className="mb-4"><FileAttachment url={post.fileUrl} name={post.fileName} /></div>}

        <div className="flex items-center gap-4 pt-4 border-t border-white/[.05]">
          <button onClick={togglePostLike}
            className={`flex items-center gap-2 text-[0.75rem] font-[Montserrat] transition-colors ${postLiked ? 'text-[#FF4447]' : 'text-gray-500 hover:text-gray-300'}`}>
            {postLiked ? '♥' : '♡'} {post.likes || 0} {post.likes === 1 ? 'like' : 'likes'}
          </button>
          <span className="text-[0.75rem] text-gray-600 font-[Montserrat]">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
          <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied.') }}
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

      {/* replies */}
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
                onReplyTo={handleReplyTo}
              />
            ))}
          </div>
        )}
        <div ref={repliesEndRef} />
      </div>

      {/* composer */}
      <div ref={composerRef}>
        <ReplyComposer
          postId={postId}
          post={post}
          replies={replies}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          onPosted={() => repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />
      </div>
    </div>
  )
}
