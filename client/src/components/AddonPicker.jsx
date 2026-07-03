import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useCart } from '../hooks/useCart'

/**
 * AddonPicker — shows relevant add-ons for a given product category.
 * addonFor must match the menu_items.addon_for column: 'Milk Tea', 'Frappe', or 'Fruit Blend'
 */
export default function AddonPicker({ addonFor }) {
  const [addons, setAddons] = useState([])
  const { addItem, cart } = useCart()

  useEffect(() => {
    async function fetchAddons() {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('category', 'Add-ons')
        .eq('addon_for', addonFor)
        .eq('is_available', true)
      setAddons(data ?? [])
    }
    if (addonFor) fetchAddons()
  }, [addonFor])

  if (addons.length === 0) return null

  return (
    <div className="mb-10">
      <h3 className="font-heading text-xl text-brew-brown mb-2 px-4 md:px-0">
        {addonFor.toUpperCase()} ADD-ONS
      </h3>
      <p className="font-body text-xs text-brew-brown/50 mb-3 px-4 md:px-0">
        Tap to add to your order
      </p>
      <div className="flex gap-3 overflow-x-auto pb-3 px-4 md:px-0 snap-x snap-mandatory scrollbar-hide">
        {addons.map(item => {
          const inCart = cart.find(i => i.menuItemId === item.id && i.size === 'base')
          const qty = inCart?.quantity ?? 0
          return (
            <button
              key={item.id}
              onClick={() => addItem({
                menuItemId: item.id,
                name: item.name,
                size: 'base',
                sizeLabel: 'Add-on',
                displayPrice: item.price,
              })}
              className={`relative flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-2xl border-2 shrink-0 min-w-[110px] snap-start transition-all ${
                qty > 0
                  ? 'bg-brew-brown text-brew-beige border-brew-brown'
                  : 'bg-brew-light text-brew-brown border-brew-brown/30 hover:border-brew-brown'
              }`}
            >
              {qty > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-xs font-heading w-5 h-5 rounded-full flex items-center justify-center">
                  {qty}
                </span>
              )}
              <span className="font-heading text-sm text-center leading-tight">{item.name}</span>
              <span className="font-body text-xs opacity-70">+₱{Number(item.price).toFixed(0)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}