export default function CustomerForm({ formState, setFormState }) {
  return (
    <>
      <div>
        <label className="font-body text-sm text-brew-brown/70 mb-1 block">
          Your name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Juan Dela Cruz"
          value={formState.customerName}
          onChange={e => setFormState(prev => ({ ...prev, customerName: e.target.value }))}
          className="w-full border-2 border-brew-brown/30 rounded-xl px-4 py-3 font-body text-brew-brown bg-transparent placeholder:text-brew-brown/30 focus:outline-none focus:border-brew-brown"
        />
      </div>

      <div>
        <label className="font-body text-sm text-brew-brown/70 mb-1 block">
          Your phone number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          inputMode="numeric"
          placeholder="09XXXXXXXXX"
          maxLength={11}
          value={formState.customerPhone}
          onChange={e => setFormState(prev => ({ ...prev, customerPhone: e.target.value.replace(/\D/g, '') }))}
          className="w-full border-2 border-brew-brown/30 rounded-xl px-4 py-3 font-body text-brew-brown bg-transparent placeholder:text-brew-brown/30 focus:outline-none focus:border-brew-brown tracking-widest"
        />
        <p className="font-body text-xs text-brew-brown/40 mt-1">
          {formState.customerPhone.length}/11 digits
          {formState.customerPhone.length === 11 && <span className="text-green-600 ml-2">✓</span>}
        </p>
      </div>
    </>
  )
}