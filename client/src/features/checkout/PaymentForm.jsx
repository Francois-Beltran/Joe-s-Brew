export default function PaymentForm({ formState, setFormState }) {
  return (
    <div className="space-y-4">
      {/* Reference Number Input */}
      <div>
        <label className="font-body text-sm text-brew-brown/70 mb-1 block">
          GCash Reference Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          maxLength={13}
          value={formState.refNumber || ''} 
          onChange={(e) => setFormState(prev => ({ ...prev, refNumber: e.target.value }))} 
          placeholder="e.g. 1023456789012"
          className="w-full p-3 rounded-xl border border-brew-brown/20 bg-white"
        />
      </div>

      {/* Screenshot File Input */}
      <div>
        <label className="font-body text-sm text-brew-brown/70 mb-1 block">
          Payment Screenshot <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFormState(prev => ({ ...prev, screenshot: e.target.files[0] }))}
          className="w-full text-sm text-brew-brown file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-brew-brown file:text-brew-beige cursor-pointer"
        />
        {formState.screenshot && (
          <p className="text-xs text-green-600 mt-1">✓ Attached: {formState.screenshot.name}</p>
        )}
      </div>
    </div>
  )
}