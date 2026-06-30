import { createContext, useContext, useReducer } from 'react'

const CartContext = createContext(null)

/**
 * Cart state reducer
 * Handles cart actions: add item, remove item, update quantity, clear cart
 * 
 * @param {Array<Object>} state - Current cart state
 * @param {Object} action - Action object with type and payload
 * @returns {Array<Object>} New cart state
 */
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.find(i => i.menuItemId === action.item.menuItemId)
      if (existing) {
        return state.map(i =>
          i.menuItemId === action.item.menuItemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...state, { ...action.item, quantity: 1 }]
    }
    case 'REMOVE_ITEM':
      return state.filter(i => i.menuItemId !== action.menuItemId)
    case 'UPDATE_QTY':
      return state.map(i =>
        i.menuItemId === action.menuItemId
          ? { ...i, quantity: action.quantity }
          : i
      ).filter(i => i.quantity > 0)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

/**
 * Cart context provider component
 * Manages shopping cart state and provides cart operations to children
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Cart context provider
 */
export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, [])

  const addItem = (item) => dispatch({ type: 'ADD_ITEM', item })
  const removeItem = (menuItemId) => dispatch({ type: 'REMOVE_ITEM', menuItemId })
  const updateQty = (menuItemId, quantity) => dispatch({ type: 'UPDATE_QTY', menuItemId, quantity })
  const clearCart = () => dispatch({ type: 'CLEAR' })

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQty, clearCart, totalItems }}>
      {children}
    </CartContext.Provider>
  )
}

/**
 * Custom hook to access cart context
 * Provides cart state and operations to components
 * 
 * @returns {Object} Cart context value with cart state and operations
 * @throws {Error} If used outside CartProvider
 */
export function useCart() {
  return useContext(CartContext)
}