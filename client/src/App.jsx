import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './hooks/useCart'
import Home from './pages/Home'
import Dashboard from './pages/admin/Dashboard'
import Success from './pages/Success'

/**
 * Main application component
 * Sets up routing and provides cart context to the entire application
 * 
 * @returns {JSX.Element} Application with routing and context providers
 */
export default function App() {
  return (
    <CartProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/"        element={<Home />} />
          <Route path="/success" element={<Success />} />
          <Route path="/admin"   element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}