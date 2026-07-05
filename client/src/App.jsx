import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './hooks/useCart'
import { BranchProvider } from './context/BranchContext'
import AdminGuard from './components/AdminGuard'
import Home from './pages/Home'
import Dashboard from './pages/admin/Dashboard'
import Success from './pages/Success'
import EmployeeGuard from './components/EmployeeGuard'
import EmployeeDashboard from './pages/employee/Dashboard'
import TermsGate from './components/TermsGate'
import { useDynamicManifest } from './hooks/useDynamicManifest'

// AppRoutes exists as its own component so useDynamicManifest (which needs
// useLocation) runs INSIDE the BrowserRouter — hooks that read the URL
// only work for components rendered inside <BrowserRouter>.
function AppRoutes() {
  useDynamicManifest() // swaps manifest.json based on current route (customer/admin/employee)

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
            <Dashboard />
          </AdminGuard>
        }
      />
      <Route
        path="/employee"
        element={
          <EmployeeGuard>
            <EmployeeDashboard />
          </EmployeeGuard>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <TermsGate>
      <BranchProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </BranchProvider>
    </TermsGate>
  )

}