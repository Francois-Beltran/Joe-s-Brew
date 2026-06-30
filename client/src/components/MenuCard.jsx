import { useCart } from '../hooks/useCart'

/**
 * Star rating display component
 * Renders visual star rating with half-star support
 * 
 * @param {Object} props - Component props
 * @param {number} props.rating - Rating value (0-5)
 * @returns {JSX.Element} Star rating UI
 */
function StarRating({ rating }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <div className="flex items-center gap-1">
      {[...Array(full)].map((_, i) => <span key={`f${i}`} className="text-amber-400 text-sm">★</span>)}
      {half && <span className="text-amber-400 text-sm">½</span>}
      {[...Array(empty)].map((_, i) => <span key={`e${i}`} className="text-brew-brown/20 text-sm">★</span>)}
      <span className="font-body text-xs text-brew-brown/50 ml-1">{Number(rating).toFixed(1)}</span>
    </div>
  )
}

/**
 * Menu item card component
 * Displays menu item with image, price, rating, and add to cart button
 * 
 * @param {Object} props - Component props
 * @param {Object} props.item - Menu item data
 * @param {string} props.item.id - Item ID
 * @param {string} props.item.name - Item name
 * @param {number} props.item.price - Item price
 * @param {string} props.item.description - Item description
 * @param {string} props.item.image_url - Item image URL
 * @param {number} props.item.rating - Item rating (0-5)
 * @param {boolean} props.item.best_seller - Whether item is a best seller
 * @returns {JSX.Element} Menu card UI
 */
export default function MenuCard({ item }) {
  const { addItem, cart } = useCart()
  const inCart = cart.find(i => i.menuItemId === item.id)

  /**
   * Handles adding item to cart
   */
  const handleAdd = () => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      displayPrice: item.price,
    })
  }

  return (
    <div className="bg-brew-light rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative">

      {/* Best Seller badge */}
      {item.best_seller && (
        <div className="absolute top-3 left-3 z-10 bg-amber-400 text-amber-900 font-heading text-xs tracking-wider px-3 py-1 rounded-full shadow">
          ⭐ BEST SELLER
        </div>
      )}

      {/* Image */}
      {item.image_url ? (
        <div className="relative overflow-hidden h-52">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="w-full h-52 bg-brew-brown/20 flex items-center justify-center">
          <span className="text-5xl">☕</span>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-heading text-xl text-brew-brown leading-tight">{item.name}</h3>
          <span className="font-heading text-lg text-brew-brown shrink-0">
            ₱{Number(item.price).toFixed(2)}
          </span>
        </div>

        {/* Rating */}
        {item.rating > 0 && (
          <div className="mb-2">
            <StarRating rating={item.rating} />
          </div>
        )}

        {item.description && (
          <p className="font-body text-sm text-brew-brown/70 mb-4 flex-1 leading-relaxed">
            {item.description}
          </p>
        )}

        <button
          onClick={handleAdd}
          className="mt-auto w-full bg-brew-brown text-brew-beige font-heading tracking-wider py-2 rounded-xl hover:bg-brew-dark transition-colors"
        >
          {inCart ? `ADD AGAIN (${inCart.quantity} in cart)` : 'ADD TO CART'}
        </button>
      </div>
    </div>
  )
}