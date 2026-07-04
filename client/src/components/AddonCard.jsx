import { useCart } from '../hooks/useCart'

export default function AddonCard({ item }) {
  const { addItem, cart } = useCart()

  const inCart = cart.find(i => i.menuItemId === item.id && i.size === 'base')
  const qty = inCart?.quantity ?? 0

  const handleAdd = () => {
    addItem({
      menuItemId:   item.id,
      name:         item.name,
      size:         'base',
      sizeLabel:    'Add-on',
      displayPrice: item.price,
    })
  }

  return (
    <button
      onClick={handleAdd}
      className={`relative flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-2xl border-2 transition-all duration-200 shrink-0 min-w-[110px] ${
        qty > 0
          ? 'bg-brew-brown text-brew-beige border-brew-brown'
          : 'bg-brew-light text-brew-brown border-brew-brown/30 hover:border-brew-brown hover:bg-brew-brown/10'
      }`}
    >
      {qty > 0 && (
        <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-xs font-heading w-5 h-5 rounded-full flex items-center justify-center">
          {qty}
        </span>
      )}
      <span className="font-heading text-sm tracking-wide text-center leading-tight">{item.name}</span>
      <span className="font-body text-xs opacity-70">+₱{Number(item.price).toFixed(0)}</span>
    </button>
  )
}