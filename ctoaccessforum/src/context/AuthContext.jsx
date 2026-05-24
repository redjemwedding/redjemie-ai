import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signInWithPopup,
  signOut as fbSignOut, sendEmailVerification,
  sendPasswordResetEmail, updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import toast from 'react-hot-toast'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fu => {
      if (fu) {
        setUser(fu)
        const p = await fetchOrCreate(fu)
        setProfile(p)
      } else {
        setUser(null); setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function fetchOrCreate(fu) {
    const ref  = doc(db, 'users', fu.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) return { id: fu.uid, ...snap.data() }
    const isAdmin = fu.email === ADMIN_EMAIL
    const data = {
      uid: fu.uid, email: fu.email,
      displayName: fu.displayName || fu.email.split('@')[0],
      photoURL: fu.photoURL || null,
      role:   isAdmin ? 'admin'    : 'member_free',
      plan:   'free',
      status: isAdmin ? 'approved' : 'pending_approval',
      xp: 0, streak: 0, posts: 0,
      joinedAt: serverTimestamp(),
      bio: '', title: '', location: '',
    }
    await setDoc(ref, data)
    return { id: fu.uid, ...data }
  }

  // ── Validate invite code client-side (Spark plan — no Functions) ──
  async function validateCode(code) {
    const ref  = doc(db, 'inviteCodes', code.toUpperCase().trim())
    const snap = await getDoc(ref)
    if (!snap.exists())    throw new Error('Invalid invite code.')
    if (snap.data().used)  throw new Error('This invite code has already been used.')
    return snap.data()
  }

  async function consumeCode(code) {
    const ref = doc(db, 'inviteCodes', code.toUpperCase().trim())
    await updateDoc(ref, { used: true, usedAt: serverTimestamp() })
  }

  // ── Email sign-up ─────────────────────────────────────────────
  async function signUp(name, email, password, inviteCode) {
    const codeData = await validateCode(inviteCode)
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    await sendEmailVerification(cred.user)
    const isAdmin = email === ADMIN_EMAIL
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid, email, displayName: name, photoURL: null,
      role:   isAdmin ? 'admin' : 'member_free',
      plan:   codeData.plan || 'free',
      status: isAdmin ? 'approved' : 'pending_approval',
      inviteCode: inviteCode.toUpperCase().trim(),
      xp: 0, streak: 0, posts: 0,
      joinedAt: serverTimestamp(), bio: '', title: '', location: '',
    })
    if (!isAdmin) {
      await setDoc(doc(db, 'approvalQueue', cred.user.uid), {
        uid: cred.user.uid, name, email,
        inviteCode: inviteCode.toUpperCase().trim(),
        plan: codeData.plan || 'free',
        submittedAt: serverTimestamp(), status: 'pending',
      })
    }
    await consumeCode(inviteCode)
    return cred
  }

  async function signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function signInWithGoogle(inviteCode) {
    const cred = await signInWithPopup(auth, googleProvider)
    const snap = await getDoc(doc(db, 'users', cred.user.uid))
    if (!snap.exists()) {
      if (!inviteCode) throw new Error('NEEDS_INVITE_CODE')
      const codeData = await validateCode(inviteCode)
      const isAdmin  = cred.user.email === ADMIN_EMAIL
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid, email: cred.user.email,
        displayName: cred.user.displayName,
        photoURL: cred.user.photoURL || null,
        role: isAdmin ? 'admin' : 'member_free',
        plan: codeData.plan || 'free',
        status: isAdmin ? 'approved' : 'pending_approval',
        inviteCode: inviteCode.toUpperCase().trim(),
        xp: 0, streak: 0, posts: 0,
        joinedAt: serverTimestamp(), bio: '', title: '', location: '',
      })
      if (!isAdmin) {
        await setDoc(doc(db, 'approvalQueue', cred.user.uid), {
          uid: cred.user.uid, name: cred.user.displayName,
          email: cred.user.email,
          inviteCode: inviteCode.toUpperCase().trim(),
          submittedAt: serverTimestamp(), status: 'pending',
        })
      }
      await consumeCode(inviteCode)
    }
    return cred
  }

  async function signOut()           { await fbSignOut(auth); toast.success('Signed out') }
  async function resetPassword(email){ await sendPasswordResetEmail(auth, email) }
  async function refreshProfile() {
    if (!user) return
    const snap = await getDoc(doc(db, 'users', user.uid))
    if (snap.exists()) setProfile({ id: user.uid, ...snap.data() })
  }

  // ── Admin: approve user ───────────────────────────────────────
  async function approveUser(uid, approved) {
    const batch = [
      updateDoc(doc(db,'users',uid), {
        status: approved ? 'approved' : 'rejected',
        reviewedAt: serverTimestamp()
      }),
      updateDoc(doc(db,'approvalQueue',uid), {
        status: approved ? 'approved' : 'rejected',
        reviewedAt: serverTimestamp()
      })
    ]
    await Promise.all(batch)
  }

  const isAdmin      = profile?.role === 'admin'
  const isInstructor = ['admin','instructor'].includes(profile?.role)
  const isPro        = ['pro','team'].includes(profile?.plan) || isInstructor
  const isApproved   = profile?.status === 'approved' || isAdmin
  const isVerified   = user?.emailVerified || user?.providerData?.[0]?.providerId === 'google.com'

  return (
    <AuthCtx.Provider value={{
      user, profile, loading,
      isAdmin, isInstructor, isPro, isApproved, isVerified,
      signIn, signUp, signInWithGoogle, signOut, resetPassword,
      refreshProfile, approveUser,
    }}>
      {children}
    </AuthCtx.Provider>
  )
}
