import {
  ArrowRight,
  CheckCircle, Clock,
  DollarSign,
  Hash,
  Package,
  Pencil,
  Plus,
  Scale,
  Search,
  Settings,
  Tag,
  Trash2,
  Truck,
  User,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';

export default function CargoManager() {
  const { user: currentUser } = useUser();
  const [searchParams] = useSearchParams();
  const [cargo, setCargo] = useState([]);
  const [locations, setLocations] = useState([]);
  const [routes, setRoutes] = useState([]); // State for routes
  const [categories, setCategories] = useState([]); // State for categories
  const [showModal, setShowModal] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false); // Toggle for Category UI
  const [expandedCatId, setExpandedCatId] = useState(null); // Which category is showing route rates
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, paid, pending

  const initialFormState = {
    tracking_number: '',
    origin_id: '',
    destination_id: '',
    sender_name: '',
    sender_phone: '252',
    sender_address: '',
    receiver_name: '',
    receiver_phone: '252',
    receiver_address: '',
    cargo_type: '',
    category_id: '', // Linked to category table
    weight_kg: 0,
    quantity: 1,
    price_total: 0,
    status: 'pending_verification',
    route_id: '', // Linked to routes table
    payment_type: 'pay_at_origin',
    payment_status: 'paid'
  };

  const [formData, setFormData] = useState(initialFormState);

  // New state for adding a category
  const [newCat, setNewCat] = useState({ name: '', unit_type: 'kg', price_per_unit: 0 });
  const [editingCatId, setEditingCatId] = useState(null); // State for editing category

  // New state for rates
  const [rates, setRates] = useState([]);
  const [newRate, setNewRate] = useState({ category_id: '', origin_id: '', destination_id: '', price_per_unit: 0 });
  const [editingRateId, setEditingRateId] = useState(null);

  useEffect(() => { 
    if (currentUser !== undefined) {
      fetchData(); 
    }
  }, [currentUser]);

  // AUTO-CALCULATION LOGIC based on Category and Route

  async function fetchData() {
    setLoading(true);
    try {
      const { data: locData } = await supabase.from('locations').select('*').order('name');
      setLocations(locData || []);

      const { data: catData } = await supabase.from('cargo_categories').select('*').order('name');
      setCategories(catData || []);

      let query = supabase
        .from('cargo_shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentUser?.branch_id) {
        // Strict Isolation: Only show what this branch booked (ORIGIN)
        query = query.eq('origin_id', currentUser.branch_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCargo(data || []);
    } catch (err) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- CATEGORY ACTIONS ---
  const handleAddCategory = async () => {
    if (!newCat.name) return;
    const { error } = editingCatId
      ? await supabase.from('cargo_categories').update(newCat).eq('id', editingCatId)
      : await supabase.from('cargo_categories').insert([newCat]);

    if (error) alert(error.message);
    else {
      setNewCat({ name: '', unit_type: 'kg', price_per_unit: 0 });
      setEditingCatId(null);
      fetchData();
    }
  };

  const handleEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setNewCat({ name: cat.name, unit_type: cat.unit_type, price_per_unit: cat.price_per_unit });
  };

  const handleDeleteCategory = async (id) => {
    if (confirm("Delete this category?")) {
      await supabase.from('cargo_categories').delete().eq('id', id);
      fetchData();
    }
  };

  // --- RATE ACTIONS ---
  const handleAddRate = async () => {
    if (!newRate.category_id || !newRate.origin_id || !newRate.destination_id) return;
    const { error } = editingRateId
      ? await supabase.from('cargo_rates').update(newRate).eq('id', editingRateId)
      : await supabase.from('cargo_rates').insert([newRate]);

    if (error) alert(error.message);
    else {
      setNewRate({ category_id: '', origin_id: '', destination_id: '', price_per_unit: 0 });
      setEditingRateId(null);
      fetchData();
    }
  };

  const handleEditRate = (rate) => {
    setEditingRateId(rate.id);
    setNewRate({ 
      category_id: rate.category_id, 
      origin_id: rate.origin_id, 
      destination_id: rate.destination_id, 
      price_per_unit: rate.price_per_unit 
    });
  };

  const handleDeleteRate = async (id) => {
    if (confirm("Delete this rate?")) {
      await supabase.from('cargo_rates').delete().eq('id', id);
      fetchData();
    }
  };

  // --- SHIPMENT ACTIONS ---
  const handleApprove = async (item) => {
    const code = 'TRK-' + Math.random().toString(36).toUpperCase().substring(2, 10);
    const { error } = await supabase.from('cargo_shipments').update({ status: 'confirmed', tracking_number: code }).eq('id', item.id);

    if (error) {
      alert(error.message);
    } else {
      // Send confirmation SMS to sender
      const senderMsg = `SAFAARI-CARGO: Xamuulkaagii waa la xaqiijiyey. Koodka raad-raaca: ${code}. Mahadsanid!`;
      const receiverMsg = `SAFAARI-CARGO: Xamuul ayaa kuu soo socda. Koodka: ${code}. Telka soo diraha: ${item.sender_phone}.`;

      try {
        // Notify Sender
        await supabase.functions.invoke('send-sms', {
          body: { phone: item.sender_phone, message: senderMsg, event: 'cargo_confirmation' }
        });
        // Notify Receiver
        if (item.receiver_phone) {
          await supabase.functions.invoke('send-sms', {
            body: { phone: item.receiver_phone, message: receiverMsg, event: 'cargo_confirmation' }
          });
        }
      } catch (err) {
        console.error('Failed to send cargo confirmation SMS:', err);
      }
      fetchData();
    }
  };

  const handleAddNew = () => {
    const code = 'TRK-' + Math.random().toString(36).toUpperCase().substring(2, 10);
    setEditingId(null);
    setFormData({ ...initialFormState, tracking_number: code });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ ...item, route_id: item.route_id || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete shipment?")) {
      const { error } = await supabase.from('cargo_shipments').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalData = { ...formData };
      let trackingCode = formData.tracking_number;

      // Clean empty UUID fields to null
      Object.keys(finalData).forEach(key => {
        if (finalData[key] === '') finalData[key] = null;
      });

      if (!editingId && !trackingCode) {
        trackingCode = 'TRK-' + Math.random().toString(36).toUpperCase().substring(2, 10);
        finalData.tracking_number = trackingCode;
        finalData.status = 'confirmed'; // Default to confirmed for admin direct booking
        finalData.branch_id = currentUser?.branch_id || finalData.origin_id; // Tag with branch
      }

      // ALWAYS calculate payment status from payment type during submission
      if (finalData.payment_type === 'pay_at_destination') {
        finalData.payment_status = 'pending';
      } else {
        finalData.payment_status = 'paid';
      }

      const { error } = editingId
        ? await supabase.from('cargo_shipments').update(finalData).eq('id', editingId)
        : await supabase.from('cargo_shipments').insert([finalData]);

      if (error) throw error;

      // Auto-create active trip for tracking (no duplicates per day)
      if (!editingId && finalData.origin_id && finalData.destination_id) {
        await supabase.from('active_trips').upsert({
          origin_id: finalData.origin_id,
          destination_id: finalData.destination_id,
          trip_date: new Date().toISOString().split('T')[0],
          status: 'in_transit'
        }, { onConflict: 'origin_id,destination_id,trip_date', ignoreDuplicates: true });
      }

      // Send SMS Notifications for NEW shipments
      if (!editingId) {
        const originName = locations.find(l => l.id === finalData.origin_id)?.name || '...';
        
        // SMS 1: To Sender
        const senderMessage = `Macmiil Xamuulkaagii aad udirtay ${finalData.receiver_name} waa la xaqiijiyey. Koodka raad-raacu waa : ${trackingCode}. Mahadsanid!`;
        
        // SMS 2: To Receiver
        const receiverMessage = `${finalData.receiver_name} Xamuul ayuu ${finalData.sender_name} kaaga soodiray ${originName}, Lambarka soo diraha: ${finalData.sender_phone}, Koodka raad-raacu waa: ${trackingCode}..`;

        try {
          // Notify Sender
          const { data: d1, error: err1 } = await supabase.functions.invoke('send-sms', {
            body: { phone: finalData.sender_phone, message: senderMessage, event: 'cargo_sender_confirmation' }
          });
          if (err1) throw err1;
          if (d1 && d1.success === false) throw new Error(d1.error || d1.gateway_response || 'Qalad aan la garanayn');

          // Notify Receiver
          const { data: d2, error: err2 } = await supabase.functions.invoke('send-sms', {
            body: { phone: finalData.receiver_phone, message: receiverMessage, event: 'cargo_receiver_notification' }
          });
          if (err2) throw err2;
          if (d2 && d2.success === false) throw new Error(d2.error || d2.gateway_response || 'Qalad aan la garanayn');
          
        } catch (smsErr) {
          alert("Fariinta SMS-ka lama dirin: " + (smsErr.message || JSON.stringify(smsErr)));
          console.error("SMS notification error:", smsErr);
        }
      }

      setShowModal(false);
      setEditingId(null);
      setFormData(initialFormState);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCargo = (cargo || []).filter(item => {
    const matchesSearch = (item.tracking_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.receiver_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.route?.driver_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status Filter
    const matchesStatus = filter === 'all' ? true : item.status === 'pending_verification';

    // Payment Filter
    let matchesPayment = true;
    const itemStatus = item.payment_status || 'paid'; // Treat missing as 'paid'
    if (paymentFilter === 'paid') matchesPayment = itemStatus === 'paid';
    if (paymentFilter === 'pending') matchesPayment = itemStatus === 'pending';

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const selectedUnitType = categories.find(c => c.id === formData.category_id)?.unit_type || 'kg';

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Maamulka Xamuulka</h1>
          <p className="text-gray-500 font-medium">Maamul noocyada iyo rarista xafiisyada.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCatManager(!showCatManager)} className={`px-6 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all ${showCatManager ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Settings size={20} /> {showCatManager ? 'Xir Noocyada' : 'Noocyada Xamuulka'}
          </button>
          <button onClick={handleAddNew} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl transition-all flex items-center gap-2">
            <Plus size={24} /> Diiwaangeli Cusub
          </button>
        </div>
      </div>

      {/* CATEGORY LISTING / ADMIN PRICING SECTION (NEW) */}
      {showCatManager && (
        <div className="bg-white p-8 rounded-[32px] border-2 border-gray-900 shadow-xl animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black flex items-center gap-2"><Tag className="text-blue-600" /> Noocyada Xamuulka</h2>
            {editingCatId && <button onClick={() => { setEditingCatId(null); setNewCat({ name: '', unit_type: 'kg', price_per_unit: 0 }); }} className="text-sm font-bold text-red-500 hover:underline">Huji/Cancel</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-6 rounded-2xl">
            <input type="text" placeholder="Magaca Nooca" className="p-4 rounded-xl border-none shadow-sm font-bold" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} />
            <select className="p-4 rounded-xl border-none shadow-sm font-bold" value={newCat.unit_type} onChange={e => setNewCat({ ...newCat, unit_type: e.target.value })}>
              <option value="kg">Miisaanka (kg)</option>
              <option value="quantity">Tirada (xabbo)</option>
              <option value="box">Kartoon</option>
            </select>
            <input type="number" placeholder="Qiimaha Default" className="p-4 rounded-xl border-none shadow-sm font-bold" value={newCat.price_per_unit} onChange={e => setNewCat({ ...newCat, price_per_unit: e.target.value })} />
            <button onClick={handleAddCategory} className={`${editingCatId ? 'bg-blue-600' : 'bg-green-600'} text-white font-black rounded-xl hover:opacity-90 flex items-center justify-center gap-2`}>
              {editingCatId ? <Pencil size={18} /> : <Plus />} {editingCatId ? 'Cusboonaysii' : 'Kudar Nooc'}
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="border border-gray-100 rounded-[28px] bg-white shadow-sm overflow-hidden transition-all">
                <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Tag size={20} />
                    </div>
                    <div>
                      <p className="font-black text-xl text-gray-900">{cat.name}</p>
                      <p className="text-sm text-gray-400 font-bold uppercase">${cat.price_per_unit} halkii {cat.unit_type} (Default)</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setExpandedCatId(expandedCatId === cat.id ? null : cat.id)} 
                      className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${expandedCatId === cat.id ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                    >
                      <DollarSign size={18} /> {expandedCatId === cat.id ? 'Xir Qiimaha' : 'Qiimaha Marinka'}
                    </button>
                    <button onClick={() => handleEditCategory(cat)} className="p-2 text-blue-400 hover:text-blue-600"><Pencil size={20} /></button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={20} /></button>
                  </div>
                </div>

                {/* ROUTE SPECIFIC RATES FOR THIS CATEGORY */}
                {expandedCatId === cat.id && (
                  <div className="bg-gray-50 p-8 border-t border-gray-100 animate-in slide-in-from-top duration-300">
                    <h4 className="text-sm font-black text-gray-400 uppercase mb-4 flex items-center gap-2">
                      <Truck size={16} /> Qiimaha Marinnada Gaarka ah
                    </h4>
                    
                    {/* ADD NEW RATE FORM */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm">
                      <select 
                        className="p-3 rounded-xl border border-gray-100 font-bold" 
                        value={`${newRate.origin_id}-${newRate.destination_id}`} 
                        onChange={e => {
                          const [origin, dest] = e.target.value.split('-');
                          setNewRate({ ...newRate, origin_id: origin, destination_id: dest, category_id: cat.id });
                        }}
                      >
                        <option value="-">Dooro Marinka (Route)</option>
                        {Array.from(new Set(routes.map(r => `${r.origin_id}-${r.destination_id}`))).map(pair => {
                          const [oid, did] = pair.split('-');
                          const routeObj = routes.find(r => r.origin_id === oid && r.destination_id === did);
                          return (
                            <option key={pair} value={pair}>
                              {routeObj?.origin?.name} → {routeObj?.destination?.name}
                            </option>
                          );
                        })}
                      </select>
                      <input 
                        type="number" 
                        placeholder="Qiimaha ($)" 
                        className="p-3 rounded-xl border border-gray-100 font-bold" 
                        value={newRate.price_per_unit} 
                        onChange={e => setNewRate({ ...newRate, price_per_unit: e.target.value, category_id: cat.id })} 
                      />
                      <button 
                        onClick={handleAddRate} 
                        className="bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <Plus size={18} /> Kudar
                      </button>
                    </div>

                    {/* LIST OF RATES FOR THIS CAT */}
                    <div className="space-y-3">
                      {(rates || []).filter(r => r.category_id === cat.id).length === 0 && (
                        <p className="text-center py-4 text-gray-400 font-bold text-sm bg-white rounded-2xl">Ma jiraan qiimo marinnada u gaar ah. Waxaa la isticmaalayaa qiimaha default-ka.</p>
                      )}
                      {(rates || []).filter(r => r.category_id === cat.id).map(rate => {
                        const origin = (locations || []).find(l => l.id === rate.origin_id);
                        const dest = (locations || []).find(l => l.id === rate.destination_id);
                        return (
                          <div key={rate.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 font-black text-gray-700">
                                <span className="text-blue-600">{origin?.name || '...'}</span> 
                                <ArrowRight size={14} className="text-gray-300" /> 
                                <span className="text-blue-600">{dest?.name || '...'}</span>
                              </div>
                              <span className="text-sm font-black text-green-600 bg-green-50 px-3 py-1 rounded-lg">${rate.price_per_unit} / {cat.unit_type}</span>
                            </div>
                            <button 
                              onClick={() => handleDeleteRate(rate.id)} 
                              className="p-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input type="text" placeholder="Raadi ID-ga ama Magaca Heleha..." className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 shadow-sm font-bold" onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* PAYMENT TABS (GREEN/RED SEPARATION) */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button 
          onClick={() => setPaymentFilter('all')}
          className={`px-6 py-3 rounded-2xl font-black transition-all border-2 ${paymentFilter === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-transparent text-slate-400 hover:bg-slate-50'}`}
        >
          DHAMAAN (ALL)
        </button>
        <button 
          onClick={() => setPaymentFilter('paid')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all border-2 ${paymentFilter === 'paid' ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white border-transparent text-green-600/50 hover:bg-green-50'}`}
        >
          <div className={`w-2 h-2 rounded-full ${paymentFilter === 'paid' ? 'bg-white' : 'bg-green-500'}`} />
          LA BIXIYEY (PAID)
        </button>
        <button 
          onClick={() => setPaymentFilter('pending')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all border-2 ${paymentFilter === 'pending' ? 'bg-red-600 border-red-600 text-white shadow-red-200 shadow-xl' : 'bg-white border-transparent text-red-600/50 hover:bg-red-50'}`}
        >
          <div className={`w-2 h-2 rounded-full ${paymentFilter === 'pending' ? 'bg-white animate-pulse' : 'bg-red-500'}`} />
          LAMA BIXIN (UNPAID)
        </button>
      </div>

      {/* CARGO LIST */}
      <div className="grid grid-cols-1 gap-4">
        {loading && <div className="p-12 text-center bg-white rounded-[32px] border border-gray-100 font-bold text-gray-500 animate-pulse">Wuxuu soo rarayaa Liiska...</div>}
        {!loading && filteredCargo.length === 0 && (
          <div className="p-12 text-center bg-white rounded-[32px] border border-gray-100 font-black text-gray-400">
            Lama helin wax Xamuul ah oo halkan ka baxa.
          </div>
        )}
        {filteredCargo.map((item) => {
          const originName = locations.find(l => l.id === item.origin_id)?.name || '...';
          const destName = locations.find(l => l.id === item.destination_id)?.name || '...';
          const isPaid = (item.payment_status || 'paid') === 'paid';

          return (
          <div key={item.id} className={`group bg-white p-6 rounded-[32px] border-2 flex items-center justify-between relative hover:shadow-xl transition-all ${item.status === 'pending_verification' ? 'border-orange-200 bg-orange-50/30' : isPaid ? 'border-green-100 hover:border-green-300' : 'border-red-100 hover:border-red-300 shadow-sm shadow-red-50'}`}>
            <div className="flex items-center gap-6">
              <div className={`p-5 rounded-[24px] ${item.status === 'pending_verification' ? 'bg-orange-100 text-orange-600' : isPaid ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                <Package size={32} />
              </div>
              <div>
                <h3 className="font-black text-xl text-gray-900 tracking-tight">{item.status === 'pending_verification' ? 'CODSIGA SUGAYA' : item.tracking_number}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400 font-bold uppercase mt-1">
                  <span className="text-blue-500">{item.sender_name}</span>
                  <ArrowRight size={14} className="text-gray-300" />
                  <span className="text-blue-500">{item.receiver_name}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-md font-black uppercase">
                    {originName} → {destName}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-12 items-center mr-16">
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase">Rarka</p>
                <p className="text-lg font-black text-gray-700">{item.weight_kg > 0 ? `${item.weight_kg} kg` : `${item.quantity} qty`}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase italic">Lacagta</p>
                <p className={`text-lg font-black ${isPaid ? 'text-green-600' : 'text-red-600'}`}>${item.price_total}</p>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase ${isPaid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600 animate-pulse'}`}>
                   {isPaid ? 'La Bixiyey' : 'Ma Bixin'}
                </span>
              </div>
              <div className="text-center min-w-[100px]">
                <p className="text-[10px] font-black text-gray-300 uppercase">Xaaladda</p>
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 'pending_verification' ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{item.status === 'pending_verification' ? 'Sugaya' : 'La xaqiijiyay'}</span>
              </div>
            </div>

            <div className="absolute right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              {item.status === 'pending_verification' && <button onClick={() => handleApprove(item)} className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"><CheckCircle size={20} /></button>}
              <button onClick={() => handleEdit(item)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Pencil size={20} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={20} /></button>
            </div>
          </div>
          );
        })}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl overflow-y-auto max-h-[95vh]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-gray-900">{editingId ? 'Wax ka beddel Xamuul' : 'Diiwaangeli Xamuul'}</h2>
              <button onClick={() => setShowModal(false)} className="p-3 bg-gray-50 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={28} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Origin / Destination - Compact Row */}
              <div className="grid grid-cols-2 gap-3">
                <select required className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" value={formData.origin_id} onChange={(e) => setFormData({ ...formData, origin_id: e.target.value })}>
                  <option value="">Laga: Magaalada</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select required className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" value={formData.destination_id} onChange={(e) => setFormData({ ...formData, destination_id: e.target.value })}>
                  <option value="">Taga: Magaalada</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {/* Sender / Receiver - Minimal */}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Soo Diraha" value={formData.sender_name} className="w-full p-3 bg-gray-50 border-gray-100 rounded-xl font-bold text-xs" onChange={e => setFormData({ ...formData, sender_name: e.target.value })} required />
                <input type="text" placeholder="Heleha" value={formData.receiver_name} className="w-full p-3 bg-gray-50 border-gray-100 rounded-xl font-bold text-xs" onChange={e => setFormData({ ...formData, receiver_name: e.target.value })} required />
              </div>

              {/* Phone Numbers Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                   <span className="absolute left-3 top-3 font-black text-gray-400 text-xs">+</span>
                   <input type="tel" placeholder="Telfoonka So Diraha" value={formData.sender_phone} className="w-full pl-6 p-3 bg-gray-50 border-gray-100 rounded-xl font-bold text-xs" onChange={e => setFormData({ ...formData, sender_phone: e.target.value })} required />
                </div>
                <div className="relative">
                   <span className="absolute left-3 top-3 font-black text-gray-400 text-xs">+</span>
                   <input type="tel" placeholder="Telfoonka Heleha" value={formData.receiver_phone} className="w-full pl-6 p-3 bg-gray-50 border-gray-100 rounded-xl font-bold text-xs" onChange={e => setFormData({ ...formData, receiver_phone: e.target.value })} required />
                </div>
              </div>

              {/* THE CORE 3 INPUTS: Category, KG, Price */}
              <div className="bg-gray-900 p-6 rounded-[32px] space-y-4 shadow-xl">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Nooca Xamuulka (Category)</label>
                  <select 
                    value={formData.category_id} 
                    className="w-full p-4 bg-gray-800 text-white rounded-2xl outline-none font-bold border-none" 
                    onChange={e => setFormData({ ...formData, category_id: e.target.value, cargo_type: categories.find(c => c.id === e.target.value)?.name || '' })} 
                    required
                  >
                    <option value="">Dooro Nooca</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Miisaanka (KG)</label>
                    <div className="relative">
                      <Scale className="absolute left-4 top-3.5 text-blue-500" size={18} />
                      <input 
                        type="number" 
                        value={formData.weight_kg} 
                        className="w-full p-4 pl-12 bg-gray-800 text-white rounded-2xl outline-none font-black text-xl border-none" 
                        onChange={e => setFormData({ ...formData, weight_kg: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-500 uppercase ml-1">Qiimaha Guud ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-3.5 text-emerald-500" size={18} />
                      <input 
                        type="number" 
                        value={formData.price_total} 
                        className="w-full p-4 pl-12 bg-gray-800 text-white rounded-2xl outline-none font-black text-xl border-emerald-500/30 border" 
                        onChange={e => setFormData({ ...formData, price_total: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Lacag Bixinta (Payment)</label>
                  <select 
                    className="w-full p-4 bg-gray-800 text-white rounded-2xl outline-none font-bold border-none"
                    value={formData.payment_type}
                    onChange={e => setFormData({ ...formData, payment_type: e.target.value })}
                  >
                    <option value="pay_at_origin">Hadda (Pay At Origin)</option>
                    <option value="pay_at_destination">Heleha (Pay At Destination)</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
                {loading ? 'Fadlan sug...' : editingId ? 'Cusboonaysii' : 'Diiwaangeli Rarka'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}