export default function OrderTypeSelector({ formState, setFormState }) {
  // Extract orderType safely
  const { orderType } = formState || {};

  return (
    <div>
      <label className="font-body text-sm text-brew-brown/70 mb-2 block">
        Order Type <span className="text-red-500">*</span>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFormState(prev => ({ ...prev, orderType: 'pickup' }))}
          className={`flex-1 py-2 rounded-xl font-heading text-sm border-2 transition-colors ${
            orderType === 'pickup'
              ? 'bg-brew-brown text-brew-beige border-brew-brown'
              : 'text-brew-brown border-brew-brown/30'
          }`}
        >
          🏪 Pickup
        </button>
        <button
          type="button"
          onClick={() => setFormState(prev => ({ ...prev, orderType: 'delivery' }))}
          className={`flex-1 py-2 rounded-xl font-heading text-sm border-2 transition-colors ${
            orderType === 'delivery'
              ? 'bg-brew-brown text-brew-beige border-brew-brown'
              : 'text-brew-brown border-brew-brown/30'
          }`}
        >
          🛵 Delivery
        </button>
      </div>
    </div>
  )
}