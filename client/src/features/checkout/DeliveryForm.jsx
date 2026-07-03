export default function DeliveryForm({ formState, setFormState, deliveryZones, selectedFee }) {
  return (
    <>
      <div>
        <label className="font-body text-sm text-brew-brown/70 mb-1 block">
          Sitio <span className="text-red-500">*</span>
        </label>
        <select
          value={formState.sitio}
          onChange={e => setFormState(prev => ({ ...prev, sitio: e.target.value }))}
          className="w-full border-2 border-brew-brown/30 rounded-xl px-4 py-3 font-body text-brew-brown bg-transparent focus:outline-none focus:border-brew-brown"
        >
          <option value="">Select your Sitio</option>
          {deliveryZones.map(zone => (
            <option key={zone.sitio_name} value={zone.sitio_name}>
              {zone.sitio_name} {zone.fee > 0 ? `(+₱${Number(zone.fee)})` : '(Free)'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-body text-sm text-brew-brown/70 mb-1 block">
          Landmark <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formState.landmark}
          onChange={e => setFormState(prev => ({ ...prev, landmark: e.target.value }))}
          placeholder="e.g. Near the chapel..."
          className="w-full border-2 border-brew-brown/30 rounded-xl px-4 py-3 font-body text-brew-brown bg-transparent placeholder:text-brew-brown/30 focus:outline-none focus:border-brew-brown"
        />
      </div>
    </>
  )
}