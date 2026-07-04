import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useCart } from '../hooks/useCart'

/**
 * FruitBlendCard — special card for the unified Fruit Blend category.
 * Lets the customer choose: Aqua Infused, Tea Infused, or Fruity Seltzer
 * as the "base type" for a given flavor, each with its own price.
 */
export default function FruitBlendCard({ item }) {
  const { addItem, cart } = useCart()
  const [variants, setVariants] = useState([])
  const [selectedBase, setSelectedBase] = useState('')
  const [selectedSize, setSelectedSize] = useState('base') // 'base' = Medio, 'grande' = Grande

  useEffect(() => {
    async function fetchVariants() {
      const { data } = await supabase
        .from('fruit_blend_variants')
        .select('*')
        .eq('menu_item_id', item.id)
        .eq('is_available', true)
      setVariants(data ?? [])
      if (data && data.length > 0) setSelectedBase(data[0].base_type)
    }
    fetchVariants()
  }, [item.id])

  const currentVariant = variants.find(v => v.base_type === selectedBase)
  const displayPrice = currentVariant
    ? (selectedSize === 'grande' ? currentVariant.price_grande : currentVariant.price)
    : 0

  // Cart key needs to include base_type since the same flavor + different base = different product
  const cartKey = `${item.id}_${selectedBase}`
  const inCart = cart.find(i => i.menuItemId === cartKey && i.size === selectedSize)

  const handleAdd = () => {
    if (!currentVariant) return
    addItem({
      menuItemId: cartKey,          // unique per flavor+base combo
      actualMenuItemId: item.id,    // real DB id, needed at checkout for price lookup
      baseType: selectedBase,       // sent to backend so it can re-verify the correct variant price
      name: `${selectedBase} ${item.name}`,
      size: selectedSize,
      sizeLabel: selectedSize === 'grande' ? 'Grande' : 'Medio',
      displayPrice,
    })
  }

  return (
    <div className="bg-brew-light rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative h-full">

      {item.best_seller && (
        <div className="absolute top-3 left-3 z-10 bg-amber-400 text-amber-900 font-heading text-xs tracking-wider px-3 py-1 rounded-full shadow">
          ⭐ BEST SELLER
        </div>
      )}

      {item.image_url ? (
        <div className="relative overflow-hidden h-44 shrink-0">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <div className="w-full h-44 bg-brew-brown/20 flex items-center justify-center shrink-0">
          <span className="text-4xl">🧋</span>
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-heading text-lg text-brew-brown leading-tight">{item.name}</h3>
          <span className="font-heading text-lg text-brew-brown shrink-0">
            ₱{Number(displayPrice).toFixed(2)}
          </span>
        </div>

        {/* Base type selector — Aqua / Tea / Seltzer */}
        <div className="mb-3">
          <p className="font-body text-xs text-brew-brown/60 mb-1">Choose your base:</p>
          <div className="flex gap-1.5 flex-wrap">
            {variants.map(v => (
              <button
                key={v.base_type}
                onClick={() => setSelectedBase(v.base_type)}
                className={`px-2.5 py-1 rounded-lg font-heading text-xs border-2 transition-colors ${
                  selectedBase === v.base_type
                    ? 'bg-brew-brown text-brew-beige border-brew-brown'
                    : 'text-brew-brown border-brew-brown/30 hover:border-brew-brown'
                }`}
              >
                {v.base_type}
              </button>
            ))}
          </div>
        </div>

        {/* Size selector — Medio / Grande */}
        {currentVariant?.price_grande && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSelectedSize('base')}
              className={`flex-1 py-1.5 rounded-xl font-heading text-xs border-2 transition-colors ${
                selectedSize === 'base'
                  ? 'bg-brew-brown text-brew-beige border-brew-brown'
                  : 'text-brew-brown border-brew-brown/30'
              }`}
            >
              Medio ₱{Number(currentVariant.price).toFixed(0)}
            </button>
            <button
              onClick={() => setSelectedSize('grande')}
              className={`flex-1 py-1.5 rounded-xl font-heading text-xs border-2 transition-colors ${
                selectedSize === 'grande'
                  ? 'bg-brew-brown text-brew-beige border-brew-brown'
                  : 'text-brew-brown border-brew-brown/30'
              }`}
            >
              Grande ₱{Number(currentVariant.price_grande).toFixed(0)}
            </button>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={!currentVariant}
          className="mt-auto w-full bg-brew-brown text-brew-beige font-heading tracking-wider py-2 rounded-xl hover:bg-brew-dark active:scale-95 transition-all text-sm disabled:opacity-40"
        >
          {inCart ? `ADD AGAIN (${inCart.quantity} in cart)` : 'ADD TO CART'}
        </button>
      </div>
    </div>
  )
}