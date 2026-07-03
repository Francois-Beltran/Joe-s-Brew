export default function Receipt({ result, onSuccess, downloadReceipt, customerPhone }) {
  return (
    <div className="py-8 flex flex-col items-center gap-4 text-center">
      <div className="text-6xl">✅</div>
      <h3 className="font-heading text-2xl text-brew-brown">ORDER RECEIVED!</h3>

      <div className="bg-white rounded-2xl p-5 w-full border border-brew-brown/20 space-y-3">
        <div>
          <p className="font-body text-xs text-brew-brown/50 mb-1">Order ID</p>
          <p className="font-heading text-lg text-brew-brown tracking-widest">
            #{result.orderId?.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <hr className="border-brew-brown/10" />
        <div>
          <p className="font-body text-xs text-brew-brown/50 mb-1">GCash Reference Number</p>
          <p className="font-heading text-2xl text-brew-brown tracking-widest">
            {result.gcashRef}
          </p>
        </div>
        <hr className="border-brew-brown/10" />
        <div>
          <p className="font-body text-xs text-brew-brown/50 mb-1">Amount</p>
          <p className="font-heading text-xl text-brew-brown">
            ₱{Number(result.totalAmount).toFixed(2)}
          </p>
        </div>
      </div>

      <p className="font-body text-brew-brown/60 text-sm">
        Our staff will verify your payment shortly. You'll receive an SMS on <strong>{customerPhone}</strong> when your order is ready.
      </p>

      <button
        onClick={downloadReceipt}
        className="w-full bg-white border-2 border-brew-brown text-brew-brown font-heading tracking-wider py-3 rounded-xl hover:bg-brew-brown hover:text-brew-beige transition-colors mb-2"
      >
        📄 DOWNLOAD RECEIPT
      </button>

      <button
        onClick={onSuccess}
        className="w-full bg-brew-brown text-brew-beige font-heading tracking-wider py-3 rounded-xl hover:bg-brew-dark transition-colors"
      >
        DONE
      </button>
    </div>
  )
}