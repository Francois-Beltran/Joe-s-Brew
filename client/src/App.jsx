import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './hooks/useCart'
import TermsGate from './components/common/TermsGate'
import BugReporter from './components/common/BugReporter'
import { useDynamicManifest } from './hooks/useDynamicManifest'

import Home from './pages/Home'
import Success from './pages/Success'

import AdminDashboard from './features/admin/Dashboard'
//import EmployeeDashboard from './pages/employee/Dashboard'   // ← This should work

import AdminGuard from './components/common/AdminGuard'
import EmployeeGuard from './components/common/EmployeeGuard'

function AppRoutes() {
  useDynamicManifest()

  const hostname = window.location.hostname

  if (hostname.includes('admin') && window.location.pathname === '/') {
    window.location.replace('/admin')
    return null
  }
  if (hostname.includes('employee') && window.location.pathname === '/') {
    window.location.replace('/employee')
    return null
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/success" element={<Success />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        }
      />
      {/*<Route
        path="/employee"
        element={
          <EmployeeGuard>
            <EmployeeDashboard />
          </EmployeeGuard>
        }
      />*/}
    </Routes>
  )
}

export default function App() {
  return (
    <TermsGate>
      <CartProvider>
        <BrowserRouter>
          <AppRoutes />
          <BugReporter />
        </BrowserRouter>
      </CartProvider>
    </TermsGate>
  )
}