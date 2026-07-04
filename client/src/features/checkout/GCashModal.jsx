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

  // Destructure the hook result
  const {
    formState,
    setFormState, // Ensure your hook provides this!
    grandTotal = 0, // Provide default value for safety
    error,
    loading,
    handleSubmit,
    downloadReceipt,
  } = useGCashModal({ onSuccess, setStage })

  // Front-end Form Validation Logic (All fields strictly required)
  const isFormValid = () => {
    const hasAgreed = !!formState?.agreedToTerms;
    const hasName = !!formState?.customerName?.trim();
    
    // Validate Phone Number (Must clean to exactly 11 digits)
    const cleanPhone = String(formState?.customerPhone || '').replace(/\D/g, '');
    const isPhoneValid = cleanPhone.length === 11;

    // FIX: Changed referenceNumber to refNumber to match your hook state!
    const cleanRef = String(formState?.refNumber || '').replace(/\D/g, '');
    const isRefValid = cleanRef.length === 13;

    // Strict Screenshot Check (File object, URL string, or truthy value)
    const hasScreenshot = !!formState?.screenshot;

    // Conditional validation if "delivery" mode is active
    if (formState?.orderType === 'delivery') {
      const hasSitio = !!formState?.sitio;
      const hasLandmark = !!formState?.landmark?.trim();
      return hasAgreed && hasName && isPhoneValid && isRefValid && hasScreenshot && hasSitio && hasLandmark;
    }

    // Default verification for pickup orders
    return hasAgreed && hasName && isPhoneValid && isRefValid && hasScreenshot;
  }

  // Guard: If formState is not initialized, return null
  if (!formState) return null;

  if (stage === 'done') {
    return (
      <Receipt 
        result={formState.result} 
        onSuccess={onSuccess} 
        downloadReceipt={downloadReceipt} 
        customerPhone={formState.customerPhone} 
      />
    )
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
          <p className="font-heading text-3xl">₱{Number(grandTotal).toFixed(2)}</p>
        </div>

        <div className="p-6 space-y-5">
          <GCashQR grandTotal={grandTotal} />

          {/* Pass state and setter explicitly */}
          <OrderTypeSelector formState={formState} setFormState={setFormState} />

          {formState.orderType === 'delivery' && (
            <DeliveryForm 
              formState={formState} 
              setFormState={setFormState} 
              deliveryZones={formState.deliveryZones || []} 
            />
          )}

          <CustomerForm formState={formState} setFormState={setFormState} />

          <PaymentForm formState={formState} setFormState={setFormState} />

          {/* Terms & Agreement Checkbox */}
          <div className="flex items-start gap-2.5 pt-1">
            <input 
              type="checkbox" 
              id="terms"
              checked={formState.agreedToTerms || false}
              onChange={(e) => setFormState(prev => ({ ...prev, agreedToTerms: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-2 border-brew-brown/30 accent-brew-brown focus:ring-0 cursor-pointer"
            />
            <label htmlFor="terms" className="font-body text-xs text-brew-brown/70 leading-tight cursor-pointer select-none">
              I agree to the <span className="underline font-semibold text-brew-brown hover:text-brew-dark">Terms and Conditions</span> and confirm my checkout details are accurate before making a payment.
            </label>
          </div>

          {error && (
            <p className="font-body text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !isFormValid()}
            className="w-full bg-brew-brown text-brew-beige font-heading tracking-widest text-lg py-4 rounded-xl hover:bg-brew-dark transition-colors disabled:opacity-40 disabled:hover:bg-brew-brown"
          >
            {loading ? 'SUBMITTING...' : 'CONFIRM ORDER'}
          </button>
        </div>
      </div>
    </div>
  )
}