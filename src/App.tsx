import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ScrollProvider } from './contexts/ScrollContext'
import Layout from './components/Layout'
import SignIn from './pages/SignIn'
import Landing from './pages/Landing'
import Info from './pages/Info'
import Feed from './pages/Feed'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAllowed } = useAuth()
  if (loading) return <div className="app-loading">Loading…</div>
  if (!user || !isAllowed) return <Navigate to="/signin" replace />
  return <ScrollProvider>{children}</ScrollProvider>
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Landing />} />
        <Route path="info" element={<Info />} />
        <Route path="feed" element={<Feed />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
