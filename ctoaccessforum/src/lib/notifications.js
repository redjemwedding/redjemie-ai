import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Create a notification for a user
 * @param {string} uid       - target user's uid
 * @param {object} payload   - { type, message, preview?, link? }
 *
 * Types: 'reply' | 'like' | 'approved' | 'mention' | 'event' | 'system'
 */
export async function notify(uid, { type, message, preview = null, link = null }) {
  if (!uid) return
  try {
    await addDoc(collection(db, 'users', uid, 'notifications'), {
      type,
      message,
      preview,
      link,
      read:      false,
      createdAt: serverTimestamp(),
    })
  } catch (e) {
    console.warn('notify error:', e.message)
  }
}

// ── Convenience helpers ────────────────────────────────────────────

export function notifyReply({ postAuthorUid, replierName, postTitle, postId }) {
  return notify(postAuthorUid, {
    type:    'reply',
    message: `${replierName} replied to your post`,
    preview: postTitle,
    link:    `/forum/post/${postId}`,
  })
}

export function notifyLike({ postAuthorUid, likerName, postTitle, postId }) {
  return notify(postAuthorUid, {
    type:    'like',
    message: `${likerName} liked your post`,
    preview: postTitle,
    link:    `/forum/post/${postId}`,
  })
}

export function notifyApproved({ uid, displayName }) {
  return notify(uid, {
    type:    'approved',
    message: `Welcome ${displayName}! Your account has been approved.`,
    link:    '/dashboard',
  })
}

export function notifyEvent({ uid, eventTitle, eventId }) {
  return notify(uid, {
    type:    'event',
    message: `New event: ${eventTitle}`,
    link:    '/events',
  })
}
