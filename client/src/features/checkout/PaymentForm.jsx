export default function PaymentForm({ formState, setFormState }) {
  return (
    <>
      <div>
        <label className="font-body text-sm text-brew-brown/70 mb-1 block">
          GCash reference number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="1234567890123"
          maxLength={13}
          value={formState.refNumber}
          onChange={e => setFormState(prev => ({ ...prev, refNumber: e.target.value.replace(/\D/g, '') }))}
          className="w-full border-2 border-brew-brown/30 rounded-xl px-4 py-3 font-body text-brew-brown bg-transparent placeholder:text-brew-brown/30 focus:outline-none focus:border-brew-brown tracking-widest font-heading text-lg"
        />
        <p className="font-body text-xs text-brew-brown/40 mt-1">
          {formState.refNumber.length}/13 digits
          {formState.refNumber.length === 13 && <span className="text-green-600 ml-2">✓</span>}
        </p>
      </div>

      {/* Screenshot Upload - you can expand this if needed */}
      <div>
        <label className="font-body text-sm text-brew-brown/70 mb-1 block">
          Payment screenshot <span className="text-red-500">*</span>
        </label>
        {/* Add your screenshot upload UI here */}
      </div>
    </>
  )
}