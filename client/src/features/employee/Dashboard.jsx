import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { API_URL } from '../../lib/api';

export default function EmployeeDashboard() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fulfilling, setFulfilling] = useState(null);
  const [actionError, setActionError] = useState('');

  const [shopOpen, setShopOpen] = useState(true);
  const [togglingShop, setTogglingShop] = useState(false);

  // Fetch orders (only paid and ready)
  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(quantity, unit_price, menu_items(name))')
      .in('status', ['paid', 'ready'])
      .order('created_at', { ascending: true });
    setOrders(data ?? []);
    setLoading(false);
  };

  // Fetch menu items
  const fetchMenu = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('id, name, price, price_grande, price_king, is_available, category, best_seller')
      .order('category');
    setMenuItems(data ?? []);
  };

  useEffect(() => {
    fetchOrders();
    fetchMenu();

    const channel = supabase
      .channel('employee-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Shop status
  useEffect(() => {
    fetch(`${API_URL}/api/shop/status`)
      .then(r => r.json())
      .then(d => setShopOpen(d.isOpen))
      .catch(() => setShopOpen(true));
  }, []);

  const toggleShop = async () => {
    setTogglingShop(true);
    try {
      const res = await fetch(`${API_URL}/api/shop/toggle`, {
        method: 'POST',
        headers: { 'X-Session-Token': sessionStorage.getItem('joesbrew_employee_token') },
      });
      const data = await res.json();
      setShopOpen(data.isOpen);
    } catch {
      setActionError('Failed to toggle shop status');
    } finally {
      setTogglingShop(false);
    }
  };

  const markReady = async (order) => {
    setFulfilling(order.id);
    setActionError('');
    try {
      const res = await fetch(`${API_URL}/api/orders/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionStorage.getItem('joesbrew_employee_token'),
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || 'Failed to mark order ready');
        return;
      }

      fetchOrders();
    } catch (error) {
      setActionError('Network error: ' + error.message);
    } finally {
      setFulfilling(null);
    }
  };

  const toggleAvailability = async (item) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);

    if (error) {
      setActionError('Failed to update availability: ' + error.message);
      return;
    }

    setMenuItems(prev => prev.map(m => 
      m.id === item.id ? { ...m, is_available: !m.is_available } : m
    ));
  };

  // Group menu items by category
  const grouped = menuItems.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const sortedCats = Object.keys(grouped).sort((a, b) => {
    const order = ['Hot Brew', 'Cold Brew', 'Barista Signature', 'Frappe', 'Milk Tea', 'Fruity Seltzer', 'Tea Infused Fruit Blend', 'Aqua Infused Fruit Blend'];
    return (order.indexOf(a) - order.indexOf(b)) || a.localeCompare(b);
  });

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'pending') return o.status === 'paid';
    if (activeTab === 'completed') return o.status === 'ready';
    return true;
  });

  return (
    <div className="min-h-screen bg-brew-beige p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="font-heading text-5xl text-brew-brown">ORDER DASHBOARD</h1>
          <p className="font-body text-brew-brown/60 mt-1">Joe's Brew · Employee Fulfillment</p>
        </div>

        {/* Shop Status Toggle */}
        <div className={`mb-6 rounded-2xl p-4 flex items-center justify-between ${shopOpen ? 'bg-green-100' : 'bg-red-100'}`}>
          <div>
            <p className="font-heading text-lg text-brew-brown">
              Shop is currently {shopOpen ? 'OPEN' : 'CLOSED'}
            </p>
            <p className="font-body text-xs text-brew-brown/60">
              {shopOpen ? 'Customers can place orders.' : 'Checkout is disabled.'}
            </p>
          </div>
          <button
            onClick={toggleShop}
            disabled={togglingShop}
            className={`font-heading text-sm px-5 py-2 rounded-full transition-colors ${shopOpen ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            {togglingShop ? '...' : shopOpen ? 'CLOSE SHOP' : 'OPEN SHOP'}
          </button>
        </div>

        {actionError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex justify-between">
            <p className="font-body text-sm text-red-700">{actionError}</p>
            <button onClick={() => setActionError('')} className="text-red-400 text-sm">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Orders Section */}
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h2 className="font-heading text-2xl text-brew-brown">ORDERS</h2>
              {['pending', 'completed', 'all'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`font-heading text-xs tracking-wider px-4 py-1 rounded-full border transition-colors ${activeTab === tab
                    ? 'bg-brew-brown text-brew-beige border-brew-brown'
                    : 'text-brew-brown border-brew-brown/30 hover:border-brew-brown'
                  }`}
                >
                  {tab.toUpperCase()}
                  {tab === 'pending' && <span className="ml-1">({orders.filter(o => o.status === 'paid').length})</span>}
                </button>
              ))}
            </div>

            {loading ? (
              <p>Loading orders...</p>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-brew-light rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">☕</p>
                <p className="font-body text-brew-brown/50">No orders in this view.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl p-5 shadow-md">
                    <div className="flex justify-between mb-2">
                      <div>
                        <p className="font-heading text-lg text-brew-brown">
                          #{order.priority_number} <span className="text-xs text-brew-brown/40">({order.id.slice(0, 8).toUpperCase()})</span>
                        </p>
                        <p className="font-body text-xs text-brew-brown/50">{order.customer_name}</p>
                      </div>
                      <span className={`font-body text-xs px-3 py-1 rounded-full ${order.order_type === 'delivery' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {order.order_type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
                      </span>
                    </div>

                    {order.order_type === 'delivery' && order.delivery_address && (
                      <p className="font-body text-xs text-brew-brown/70 bg-brew-beige/50 rounded-lg px-3 py-2 mb-2">
                        📍 {order.delivery_address}
                      </p>
                    )}

                    <ul className="mb-3 space-y-1">
                      {order.order_items?.map((oi, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span>{oi.quantity}× {oi.menu_items?.name}</span>
                          <span>₱{(oi.unit_price * oi.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>

                    {order.status === 'paid' ? (
                      <button
                        onClick={() => markReady(order)}
                        disabled={fulfilling === order.id}
                        className="w-full bg-brew-brown text-brew-beige font-heading text-xs tracking-wider py-3 rounded-xl hover:bg-brew-dark disabled:opacity-50"
                      >
                        {fulfilling === order.id ? 'NOTIFYING...' : '☕ MARK AS READY & NOTIFY'}
                      </button>
                    ) : (
                      <p className="text-center font-body text-xs text-purple-700 py-2">✓ Completed</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory Section */}
          <div>
            <h2 className="font-heading text-2xl text-brew-brown mb-4">INVENTORY</h2>
            {sortedCats.map(cat => (
              <div key={cat} className="mb-4">
                <div className="bg-brew-brown/10 px-4 py-2 rounded-t-xl">
                  <p className="font-heading text-sm text-brew-brown tracking-widest">{cat.toUpperCase()}</p>
                </div>
                <div className="bg-white rounded-b-xl shadow-sm overflow-hidden">
                  {grouped[cat].map((item, idx) => (
                    <div key={item.id} className={`flex items-center justify-between px-4 py-3 gap-3 ${idx !== grouped[cat].length - 1 ? 'border-b' : ''}`}>
                      <div className="flex-1">
                        <p className="font-body text-sm text-brew-brown">{item.name}</p>
                      </div>
                      <button
                        onClick={() => toggleAvailability(item)}
                        className={`shrink-0 px-4 py-1.5 rounded-full font-heading text-xs transition-colors ${item.is_available ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800' : 'bg-red-100 text-red-800 hover:bg-green-100 hover:text-green-800'}`}
                      >
                        {item.is_available ? 'AVAILABLE' : 'UNAVAILABLE'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}