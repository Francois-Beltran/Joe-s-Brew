import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useCart } from '../hooks/useCart'
import MagneticButton from './MagneticButton'

export default function FruitBlendCard({ item }) {
  const { addItem, cart } = useCart()
  const [variants, setVariants] = useState([])
  const [selectedBase, setSelectedBase] = useState('')
  const [selectedSize, setSelectedSize] = useState('base')
  const [addons, setAddons] = useState([])
  const [selectedAddon, setSelectedAddon] = useState(null)

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

  useEffect(() => {
    async function fetchAddons() {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('category', 'Add-ons')
        .eq('addon_for', 'Fruit Blend')
        .eq('is_available', true)
      setAddons(data ?? [])
    }
    fetchAddons()
  }, [])

  const currentVariant = variants.find(v => v.base_type === selectedBase)
  const displayPrice = currentVariant
    ? (selectedSize === 'grande' ? currentVariant.price_grande : currentVariant.price)
    : 0

  const cartKey = `${item.id}_${selectedBase}`
  const inCart = cart.find(i => i.menuItemId === cartKey && i.size === selectedSize)

  // Item is unavailable if menu_items.is_available is false OR no variants are available
  const isUnavailable = !item.is_available || variants.length === 0

  const handleAdd = () => {
    if (!currentVariant || isUnavailable) return

    addItem({
      menuItemId: cartKey,
      actualMenuItemId: item.id,
      baseType: selectedBase,
      name: `${selectedBase} ${item.name}`,
      size: selectedSize,
      sizeLabel: selectedSize === 'grande' ? 'Grande' : 'Medio',
      displayPrice,
    })

    if (selectedAddon) {
      addItem({
        menuItemId: selectedAddon.id,
        name: `${selectedAddon.name} (for ${item.name})`,
        size: 'base',
        sizeLabel: 'Add-on',
        displayPrice: selectedAddon.price,
      })
      setSelectedAddon(null)
    }
  }

  return (
    <div className={`bg-brew-light rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative h-full ${isUnavailable ? 'grayscale' : ''}`}>

      {/* Badges */}
      {item.best_seller && !isUnavailable && (
        <div className="absolute top-3 left-3 z-10 bg-amber-400 text-amber-900 font-heading text-xs tracking-wider px-3 py-1 rounded-full shadow">
          ⭐ BEST SELLER
        </div>
      )}
      {isUnavailable && (
        <div className="absolute top-3 left-3 z-10 bg-gray-500 text-white font-heading text-xs tracking-wider px-3 py-1 rounded-full shadow">
          UNAVAILABLE
        </div>
      )}

      {/* Image */}
      {item.image_url ? (
        <div className="relative overflow-hidden h-44 shrink-0">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
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
        {!isUnavailable && variants.length > 0 && (
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
        )}

        {/* Size selector — Medio / Grande */}
        {!isUnavailable && currentVariant?.price_grande && (
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

        {/* Inline add-on picker — mirrors MenuCard structure */}
        {!isUnavailable && addons.length > 0 && (
          <div className="mb-3">
            <p className="font-heading text-[10px] text-brew-brown/60 mb-1 tracking-widest">ADD-ONS</p>
            <div className="flex gap-2 flex-wrap">
              {addons.map(addon => (
                <button
                  key={addon.id}
                  onClick={() => setSelectedAddon(selectedAddon?.id === addon.id ? null : addon)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-heading border transition-colors ${
                    selectedAddon?.id === addon.id
                      ? 'bg-brew-brown text-brew-beige border-brew-brown'
                      : 'bg-brew-beige/50 text-brew-brown border-brew-brown/20 hover:border-brew-brown'
                  }`}
                >
                  {addon.name} (+₱{Number(addon.price).toFixed(0)})
                </button>
              ))}
            </div>
          </div>
        )}

        <MagneticButton
          onClick={handleAdd}
          disabled={isUnavailable}
          className="mt-auto w-full bg-brew-brown text-brew-beige font-heading tracking-wider py-2 rounded-xl hover:bg-brew-dark hover:shadow-lg active:scale-95 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
          strength={isUnavailable ? 0 : 0.3}
        >
          {isUnavailable
            ? 'CURRENTLY UNAVAILABLE'
            : inCart
              ? `ADD AGAIN (${inCart.quantity} in cart)`
              : 'ADD TO CART'}
        </MagneticButton>
      </div>
    </div>
  )
}
