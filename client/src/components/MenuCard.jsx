import { useState, useEffect } from 'react'
import { useCart } from '../hooks/useCart'
import { supabase } from '../lib/supabaseClient'
import MagneticButton from './MagneticButton'

function StarRating({ rating }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(full)].map((_, i) => <span key={`f${i}`} className="text-amber-400 text-xs">★</span>)}
      {half && <span className="text-amber-400 text-xs">½</span>}
      {[...Array(empty)].map((_, i) => <span key={`e${i}`} className="text-brew-brown/20 text-xs">★</span>)}
      <span className="font-body text-xs text-brew-brown/50 ml-1">{Number(rating).toFixed(1)}</span>
    </div>
  )
}

// Per-image display overrides. Key = exact image filename.
// position: CSS object-position (default "center center")
// fit: CSS object-fit (default "cover") — use "contain" for portrait drink shots
const IMAGE_STYLE = {
  // Hot Brew
  'joes_dark_chocolate.png':         { position: 'center 30%' },
  'joes_white_coffee.png':           { position: 'center 40%' },
  'joes_cappucino.png':              { position: 'center 30%' },
  'joes_vanilla.png':                { position: 'center 30%' },
  // Cold Brew
  'iced_cappucino.jpg':              { position: 'center 40%' },
  'joes_iced_mocha.png':             { position: 'center 30%' },
  'caramel_macchiato.jpg':           { position: 'center 40%' },
  'joes_iced_spanish_latte.jpg':     { position: 'center 40%' },
  'joe_s_iced_americano.jpg':        { position: 'center 40%' },
  'joes_salted_caramel.jpg':         { position: 'center 40%' },
  
  // Frappe
  'matcha_cream.jpg':                { position: 'center 30%' },
  'matcha_frappe.jpg':               { fit: 'contain', position: 'center center' },
  'taro_frappe.jpg':                 { position: 'center 30%' },
  'joes_mango_frappe.jpg':           { position: 'center 30%' },
  'cookies_and_cream_frappe.jpg':    { position: 'center 40%' },
  'dark_chocolate_frappe.jpg':       { fit: 'contain', position: 'center center' },
  'double_dutch_frappe.jpg':         { fit: 'contain', position: 'center center' },
  'mocha_frappe.jpg':                { fit: 'contain', position: 'center center' },
  // Milk Tea — portrait shots use contain so the full glass shows
  'dark_choco_milktea.jpg':          { fit: 'contain', position: 'center center' },
  'okinawa_milktea.jpg':             { fit: 'contain', position: 'center center' },
  'hokkaido_milktea.jpg':            { fit: 'contain', position: 'center center' },
  'white_bunny_milktea.jpg':         { fit: 'contain', position: 'center center' },
  'cookies_and_cream_milktea.jpg':   { position: 'center 40%' },
  'matcha_milktea.jpg':              { position: 'center 40%' },
  'joes_wintermelon_milktea.png':    { position: 'center 30%' },
  // old milk tea filenames (still in DB for some rows)
  'joes_okinawa_mikltea.png':        { fit: 'contain', position: 'center center' },
  'joes_dark_chocolate_milktea.png': { fit: 'contain', position: 'center center' },
  // Takoyaki / Waffles
  'classic_takoyaki.jpg':            { position: 'center 50%' },
  'vegetarian_takoyaki.jpg':         { position: 'center 50%' },
  'creamy_cheese_waffle.jpg':        { position: 'center 40%' },
  'berry_whip_waffle.jpg':           { position: 'center 40%' },
  'nutella_waffle.jpg':              { position: 'center 40%' },
}

function getImageStyle(imageUrl) {
  if (!imageUrl) return {}
  const filename = imageUrl.split('/').pop()
  const override = IMAGE_STYLE[filename]
  return {
    objectPosition: override?.position ?? 'center center',
    objectFit: override?.fit ?? 'cover',
  }
}

export default function MenuCard({ item, branchAvail = {} }) {

  const { addItem, cart } = useCart()
  const [allAddons, setAllAddons] = useState([])
  const [selectedAddon, setSelectedAddon] = useState(null)
  
  const hasGrande = item.price_grande != null
  const hasKing = item.price_king != null
  const [selectedSize, setSelectedSize] = useState('base')

  const displayPrice =
    selectedSize === 'king' && hasKing ? item.price_king :
      selectedSize === 'grande' && hasGrande ? item.price_grande :
        item.price

  const sizeLabel =
    selectedSize === 'king' ? (item.size_label_king || 'King') :
      selectedSize === 'grande' ? (item.size_label_grande || 'Grande') :
        (item.size_label_base || 'Medio')

  const inCart = cart.find(i =>
    i.menuItemId === item.id && i.size === selectedSize
  )

  useEffect(() => {
    async function fetchAddons() {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('category', 'Add-ons')
        .ilike('addon_for', `%${item.category}%`)
        .eq('is_available', true)
      setAllAddons(data ?? [])
    }
    if (item.category) fetchAddons()
  }, [item.category])

  // Filter by branch availability at render time — avoids stale-closure race condition
  const addons = allAddons.filter(
    addon => addon.id in branchAvail ? branchAvail[addon.id] : true
  )

  const handleAdd = () => {
    // Add the main item
    addItem({
      menuItemId: item.id,
      name: item.name,
      size: selectedSize,
      sizeLabel: sizeLabel,
      displayPrice: displayPrice,
    })

    // Add the add-on if one is selected
    if (selectedAddon) {
      addItem({
        menuItemId: selectedAddon.id,
        name: `${selectedAddon.name} (for ${item.name})`,
        size: 'base',
        sizeLabel: 'Add-on',
        displayPrice: selectedAddon.price,
      })
      setSelectedAddon(null) // Reset selection after adding
    }
  }

  return (
    <div className={`bg-brew-light rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative h-full ${!item.is_available ? 'grayscale' : ''}`}>

      {/* Best Seller badge */}
      {item.best_seller && item.is_available && (
        <div className="absolute top-3 left-3 z-10 bg-amber-400 text-amber-900 font-heading text-xs tracking-wider px-3 py-1 rounded-full shadow">
          ⭐ BEST SELLER
        </div>
      )}
      {/* UNAVAILABLE badge */}
      {!item.is_available && (
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
            className="w-full h-full transition-transform duration-500 hover:scale-105"
            style={getImageStyle(item.image_url)}
          />
        </div>
      ) : (
        <div className="w-full h-44 bg-brew-brown/20 flex items-center justify-center shrink-0">
          <span className="text-4xl">☕</span>
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        {/* Name + Price */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-heading text-lg text-brew-brown leading-tight">{item.name}</h3>
          <span className="font-heading text-lg text-brew-brown shrink-0">
            ₱{Number(displayPrice).toFixed(2)}
          </span>
        </div>

        {/* Rating */}
        {item.rating > 0 && (
          <div className="mb-2">
            <StarRating rating={item.rating} />
          </div>
        )}

        {/* Description */}
        {item.description && (
          <p className="font-body text-xs text-brew-brown/70 mb-3 flex-1 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Size selector */}
        {(hasGrande || hasKing) && (
          <div className="flex gap-1.5 mb-3 flex-wrap">
            <button
              onClick={() => setSelectedSize('base')}
              className={`flex-1 py-1.5 rounded-xl font-heading text-xs tracking-wider border-2 transition-colors min-w-[60px] ${selectedSize === 'base'
                ? 'bg-brew-brown text-brew-beige border-brew-brown'
                : 'text-brew-brown border-brew-brown/30 hover:border-brew-brown'
                }`}
            >
              {item.size_label_base || 'Medio'}<br />
              <span className="text-[10px]">₱{Number(item.price).toFixed(0)}</span>
            </button>
            {hasGrande && (
              <button
                onClick={() => setSelectedSize('grande')}
                className={`flex-1 py-1.5 rounded-xl font-heading text-xs tracking-wider border-2 transition-colors min-w-[60px] ${selectedSize === 'grande'
                  ? 'bg-brew-brown text-brew-beige border-brew-brown'
                  : 'text-brew-brown border-brew-brown/30 hover:border-brew-brown'
                  }`}
              >
                {item.size_label_grande || 'Grande'}<br />
                <span className="text-[10px]">₱{Number(item.price_grande).toFixed(0)}</span>
              </button>
            )}
            {hasKing && (
              <button
                onClick={() => setSelectedSize('king')}
                className={`flex-1 py-1.5 rounded-xl font-heading text-xs tracking-wider border-2 transition-colors min-w-[60px] ${selectedSize === 'king'
                  ? 'bg-brew-brown text-brew-beige border-brew-brown'
                  : 'text-brew-brown border-brew-brown/30 hover:border-brew-brown'
                  }`}
              >
                {item.size_label_king || 'King'}<br />
                <span className="text-[10px]">₱{Number(item.price_king).toFixed(0)}</span>
              </button>
            )}
          </div>
        )}

        {/* Add-on Picker */}
        {addons.length > 0 && (
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

        {!hasGrande && (
          <p className="font-body text-xs text-brew-brown/50 mb-3">
            {item.size_label_base || 'One Size'}
          </p>
        )}

        <MagneticButton
          onClick={handleAdd}
          disabled={!item.is_available}
          className="mt-auto w-full bg-brew-brown text-brew-beige font-heading tracking-wider py-2 rounded-xl hover:bg-brew-dark hover:shadow-lg active:scale-95 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
          strength={item.is_available ? 0.3 : 0}
        >
          {!item.is_available ? 'CURRENTLY UNAVAILABLE' : inCart ? `ADD AGAIN (${inCart.quantity} in cart)` : 'ADD TO CART'}
        </MagneticButton>
      </div>
    </div>
  )
}