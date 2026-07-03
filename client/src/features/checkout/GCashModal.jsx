import { useState } from 'react'
import { useGCashModal } from './useGCashModal'
import GCashQR from './GCashQR'
import OrderTypeSelector from './OrderTypeSelector'
import DeliveryForm from './DeliveryForm'
import CustomerForm from './CustomerForm'
import PaymentForm from './PaymentForm'
import Receipt from './Receipt'

export default function GCashModal({ onClose, onSuccess }) {
  const [stage, setStage] = useState('instructions')

  const {
    formState,
    grandTotal,
    error,
    loading,
    handleSubmit,
    downloadReceipt,
  } = useGCashModal({ onSuccess, setStage })

  if (stage === 'done') {
    return <Receipt result={formState.result} onSuccess={onSuccess} downloadReceipt={downloadReceipt} customerPhone={formState.customerPhone} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-brew-dark/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-brew-light rounded-3xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">

        <div className="bg-brew-brown text-brew-beige p-6 rounded-t-3xl flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl tracking-wider">PAY WITH GCASH</h2>
            <p className="font-body text-brew-beige/60 text-sm">Joe's Brew · Order Total</p>
          </div>
          <p className="font-heading text-3xl">₱{grandTotal.toFixed(2)}</p>
        </div>

        <div className="p-6 space-y-5">
          <GCashQR grandTotal={grandTotal} />

          <OrderTypeSelector {...formState} />

          {formState.orderType === 'delivery' && <DeliveryForm {...formState} />}

          <CustomerForm {...formState} />

          <PaymentForm {...formState} />

          {error && <p className="font-body text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-brew-brown text-brew-beige font-heading tracking-widest text-lg py-4 rounded-xl hover:bg-brew-dark transition-colors disabled:opacity-40"
          >
            {loading ? 'SUBMITTING...' : 'CONFIRM ORDER'}
          </button>
        </div>
      </div>
    </div>
  )
}