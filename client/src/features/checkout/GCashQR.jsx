export default function GCashQR({ grandTotal }) {
  const GCASH_NUMBER = import.meta.env.VITE_GCASH_NUMBER || '09173011678'
  const GCASH_NAME = import.meta.env.VITE_GCASH_NAME || 'RO***A O.'

  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col items-center border-2 border-dashed border-brew-brown/30">
      <img
        src="/images/gcash-qr.jpg"
        alt="GCash QR Code"
        className="w-48 h-48 rounded-xl object-contain mb-3"
      />
      <p className="font-heading text-brew-brown text-lg tracking-wide">{GCASH_NUMBER}</p>
      <p className="font-body text-brew-brown/60 text-sm">{GCASH_NAME}</p>
    </div>
  )
}