import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { API_URL } from '../../lib/api';

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const [shopOpen, setShopOpen] = useState(true);
  const [togglingShop, setTogglingShop] = useState(false);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          unit_price,
          menu_items (name)
        )
      `)
      .order('created_at', { ascending: false });
    setOrders(data ?? []);
    setLoading(false);

    const revenue = (data || []).reduce((sum, o) => {
      if (['paid', 'ready'].includes(o.status)) {
        return sum + Number(o.total_amount || 0);
      }
      return sum;
    }, 0);
    setTotalRevenue(revenue);
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const toggleShop = async () => {
    setTogglingShop(true);
    try {
      const res = await fetch(`${API_URL}/api/shop/toggle`, {
        method: 'POST',
        headers: { 'X-Session-Token': sessionStorage.getItem('joesbrew_admin_token') },
      });
      const data = await res.json();
      setShopOpen(data.isOpen);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingShop(false);
    }
  };

  const verifyOrder = async (orderId) => {
    try {
      await fetch(`${API_URL}/api/orders/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionStorage.getItem('joesbrew_admin_token'),
        },
        body: JSON.stringify({ orderId }),
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const rejectOrder = async (orderId) => {
    try {
      await fetch(`${API_URL}/api/orders/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionStorage.getItem('joesbrew_admin_token'),
        },
        body: JSON.stringify({ orderId, reason: 'Admin rejected' }),
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'paid') return order.status === 'paid';
    if (activeFilter === 'rejected') return order.status === 'rejected';
    if (activeFilter === 'unverified') return order.status === 'pending';
    return true;
  });

  return (
    <div className="min-h-screen bg-brew-beige p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-heading text-5xl text-brew-brown">ADMIN DASHBOARD</h1>
            <p className="font-body text-brew-brown/60 mt-1">Full Control • Joe's Brew</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-brew-brown/60">Total Revenue</p>
            <p className="font-heading text-4xl text-brew-brown">₱{totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Shop Toggle */}
        <div className={`mb-6 rounded-2xl p-4 flex items-center justify-between ${shopOpen ? 'bg-green-100' : 'bg-red-100'}`}>
          <div>
            <p className="font-heading text-lg text-brew-brown">Shop is currently {shopOpen ? 'OPEN' : 'CLOSED'}</p>
            <p className="font-body text-xs text-brew-brown/60">
              {shopOpen ? 'Customers can place orders normally.' : 'Checkout is disabled.'}
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

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'paid', 'rejected', 'unverified'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-5 py-2 rounded-full font-heading text-sm capitalize ${activeFilter === filter 
                ? 'bg-brew-brown text-brew-beige' 
                : 'bg-white border border-brew-brown/30 text-brew-brown hover:bg-brew-brown/5'}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Orders with full details */}
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl p-5 shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-heading text-lg text-brew-brown">
                    #{order.priority_number || order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="font-body text-sm text-brew-brown/60">{order.customer_name}</p>
                  <p className="font-body text-xs text-brew-brown/50">{order.customer_phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-xl">₱{Number(order.total_amount).toFixed(2)}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs mt-1 ${order.order_type === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {order.order_type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
                  </span>
                </div>
              </div>

              {order.delivery_address && (
                <p className="font-body text-xs text-brew-brown/70 bg-brew-beige/50 rounded-lg px-3 py-2 mb-3">
                  📍 {order.delivery_address}
                </p>
              )}

              {/* Full Order Items */}
              <ul className="mb-4 space-y-1 text-sm text-brew-brown/80">
                {order.order_items?.map((oi, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{oi.quantity}× {oi.menu_items?.name}</span>
                    <span>₱{(oi.unit_price * oi.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              {order.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => verifyOrder(order.id)}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-heading text-sm hover:bg-green-700"
                  >
                    VERIFY PAYMENT
                  </button>
                  <button
                    onClick={() => rejectOrder(order.id)}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-heading text-sm hover:bg-red-700"
                  >
                    REJECT
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}