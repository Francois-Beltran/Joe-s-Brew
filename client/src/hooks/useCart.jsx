import { createContext, useContext, useReducer, useEffect } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'joesbrew_cart'

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      // Match by both menuItemId AND size so Medio and Grande are separate cart entries
      const existing = state.find(i =>
        i.menuItemId === action.item.menuItemId && i.size === action.item.size
      )
      if (existing) {
        return state.map(i =>
          i.menuItemId === action.item.menuItemId && i.size === action.item.size
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...state, { ...action.item, quantity: 1 }]
    }
    case 'REMOVE_ITEM':
      return state.filter(i =>
        !(i.menuItemId === action.menuItemId && i.size === action.size)
      )
    case 'UPDATE_QTY':
      return state.map(i =>
        i.menuItemId === action.menuItemId && i.size === action.size
          ? { ...i, quantity: action.quantity }
          : i
      ).filter(i => i.quantity > 0)
    case 'CLEAR':
      return []
    case 'HYDRATE':
      return action.cart
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, [], loadCartFromStorage)

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    } catch {
      // localStorage might be full or disabled — fail silently
    }
  }, [cart])

  const addItem = (item) => dispatch({ type: 'ADD_ITEM', item })
  const removeItem = (menuItemId, size) => dispatch({ type: 'REMOVE_ITEM', menuItemId, size })
const updateQty = (menuItemId, quantity, size) => dispatch({ type: 'UPDATE_QTY', menuItemId, quantity, size })
  const clearCart = () => dispatch({ type: 'CLEAR' })

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQty, clearCart, totalItems }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}