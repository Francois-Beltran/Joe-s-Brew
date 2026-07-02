import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './hooks/useCart'
import AdminGuard from './components/AdminGuard'
import Home from './pages/Home'
import Dashboard from './pages/admin/Dashboard'
import Success from './pages/Success'
import EmployeeGuard from './components/EmployeeGuard'
import EmployeeDashboard from './pages/employee/Dashboard'

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<Home />} />
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
      </BrowserRouter>
    </CartProvider>
  )
}