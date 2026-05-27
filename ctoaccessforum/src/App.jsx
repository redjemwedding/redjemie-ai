import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import AuthPage from '@/pages/AuthPage'
import PendingPage from '@/pages/PendingPage'
import VerifyPage from '@/pages/VerifyPage'
import DashboardPage from '@/pages/DashboardPage'
import ForumPage from '@/pages/ForumPage'
import PostPage from '@/pages/PostPage'
import CoursesPage from '@/pages/CoursesPage'
import ResourcesPage from '@/pages/ResourcesPage'
import EventsPage from '@/pages/EventsPage'
import ProfilePage from '@/pages/ProfilePage'
import AdminPage from '@/pages/AdminPage'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808]">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#E5181B] animate-spin" />
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}

function AppRoutes() {
  const { user, profile, loading, isAdmin, isApproved, isVerified } = useAuth()
  if (loading)                        return <Spinner />
  if (!user)                          return <AuthPage />
  if (!isVerified)                    return <VerifyPage />
  if (!isApproved && !isAdmin)        return <PendingPage />

  return (
    <AppLayout>
      <Routes>
        <Route index                   element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"        element={<DashboardPage />} />
        <Route path="forum"            element={<ForumPage />} />
        <Route path="forum/:ch"        element={<ForumPage />} />
        <Route path="forum/post/:postId" element={<PostPage />} />
        <Route path="courses"          element={<CoursesPage />} />
        <Route path="resources"        element={<ResourcesPage />} />
        <Route path="events"           element={<EventsPage />} />
        <Route path="profile"          element={<ProfilePage />} />
        {isAdmin && <Route path="admin" element={<AdminPage />} />}
        <Route path="*"                element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}
