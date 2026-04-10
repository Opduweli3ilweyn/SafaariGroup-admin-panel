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
import { supabase } from '../lib/supabase';

export default function CargoManager() {
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

  const initialFormState = {
    tracking_number: '',
    origin_id: '',
    destination_id: '',
    sender_name: '',
    sender_phone: '',
    sender_address: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_address: '',
    cargo_type: '',
    category_id: '', // Linked to category table
    weight_kg: 0,
    quantity: 1,
    price_total: 0,
    status: 'pending_verification',
    route_id: '' // Linked to routes table
  };

  const [formData, setFormData] = useState(initialFormState);

  // New state for adding a category
  const [newCat, setNewCat] = useState({ name: '', unit_type: 'kg', price_per_unit: 0 });
  const [editingCatId, setEditingCatId] = useState(null); // State for editing category

  // New state for rates
  const [rates, setRates] = useState([]);
  const [newRate, setNewRate] = useState({ category_id: '', origin_id: '', destination_id: '', price_per_unit: 0 });
  const [editingRateId, setEditingRateId] = useState(null);

  useEffect(() => { fetchData(); }, []);

  // AUTO-CALCULATION LOGIC based on Category and Route
  useEffect(() => {
    if (!formData.category_id || !formData.origin_id || !formData.destination_id) return;

    const selectedRate = (rates || []).find(r => 
      r.category_id === formData.category_id && 
      r.origin_id === formData.origin_id && 
      r.destination_id === formData.destination_id
    );

    if (selectedRate) {
      const rate = parseFloat(selectedRate.price_per_unit) || 0;
      const amount = (categories || []).find(c => c.id === formData.category_id)?.unit_type === 'kg' 
        ? (formData.weight_kg || 0) 
        : (formData.quantity || 1);
      
      setFormData(prev => ({ ...prev, price_total: (amount * rate).toFixed(2) }));
    } else {
      // Fallback to category default if no route-specific rate exists
      const selectedCat = (categories || []).find(c => c.id === formData.category_id);
      if (selectedCat) {
        const rate = parseFloat(selectedCat.price_per_unit) || 0;
        const amount = selectedCat.unit_type === 'kg' ? (formData.weight_kg || 0) : (formData.quantity || 1);
        setFormData(prev => ({ ...prev, price_total: (amount * rate).toFixed(2) }));
      }
    }
  }, [formData.category_id, formData.origin_id, formData.destination_id, formData.weight_kg, formData.quantity, rates, categories]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: locData } = await supabase.from('locations').select('*').order('name');
      setLocations(locData || []);

      const { data: catData } = await supabase.from('cargo_categories').select('*').order('name');
      setCategories(catData || []);

      const { data: routeData } = await supabase.from('routes').select(`*, origin:locations!origin_id(name), destination:locations!destination_id(name)`).order('departure_time', { ascending: true });
      setRoutes(routeData || []);

      const { data: rateData } = await supabase.from('cargo_rates').select('*');
      setRates(rateData || []);

      const { data, error } = await supabase
        .from('cargo_shipments')
        .select(`
          *,
          origin:locations!origin_id(name),
          destination:locations!destination_id(name),
          route:routes(driver_name, vehicle_plate)
        `)
        .order('created_at', { ascending: false });

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
    const { origin, destination, ...dataToSave } = formData; // Clean up joins before saving
    try {
      const { error } = editingId
        ? await supabase.from('cargo_shipments').update(dataToSave).eq('id', editingId)
        : await supabase.from('cargo_shipments').insert([dataToSave]);
      if (error) throw error;
      setShowModal(false);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const filteredCargo = (cargo || []).filter(item => {
    const matchesSearch = (item.tracking_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.receiver_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.route?.driver_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' ? true : item.status === 'pending_verification';
    return matchesSearch && matchesFilter;
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
          <button onClick={() => setFilter(filter === 'all' ? 'pending' : 'all')} className={`px-6 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 ${filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Clock size={20} /> {filter === 'pending' ? 'Kuwa Sugaya' : 'Arag kuwa Sugaya'}
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

      {/* CARGO LIST */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCargo.map((item) => (
          <div key={item.id} className={`group bg-white p-6 rounded-[32px] border flex items-center justify-between relative hover:border-blue-300 transition-all ${item.status === 'pending_verification' ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'}`}>
            <div className="flex items-center gap-6">
              <div className={`p-5 rounded-[24px] ${item.status === 'pending_verification' ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                <Package size={32} />
              </div>
              <div>
                <h3 className="font-black text-xl text-gray-900 tracking-tight">{item.status === 'pending_verification' ? 'CODSIGA SUGAYA' : item.tracking_number}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400 font-bold uppercase mt-1">
                  <span className="text-blue-500">{item.sender_name}</span>
                  <ArrowRight size={14} className="text-gray-300" />
                  <span className="text-blue-500">{item.receiver_name}</span>
                </div>
                {item.route && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1">
                      <User size={10} /> {item.route.driver_name}
                    </span>
                    <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1">
                      <Truck size={10} /> {item.route.vehicle_plate}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-12 items-center mr-16">
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase">Rarka</p>
                <p className="text-lg font-black text-gray-700">{item.weight_kg > 0 ? `${item.weight_kg} kg` : `${item.quantity} qty`}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase">Warta</p>
                <p className="text-lg font-black text-blue-600">${item.price_total}</p>
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
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[40px] w-full max-w-4xl p-10 shadow-2xl overflow-y-auto max-h-[95vh]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-gray-900">{editingId ? 'Wax ka beddel Xamuul' : 'Diiwaangeli Xamuul'}</h2>
              <button onClick={() => setShowModal(false)} className="p-3 bg-gray-50 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={28} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 bg-gray-50 p-6 rounded-[32px]">
                  <h4 className="text-sm font-black text-blue-600 uppercase flex items-center gap-2"><User size={18} /> Soo Diraha</h4>
                  <input type="text" placeholder="Magaca Soo Diraha" value={formData.sender_name} className="w-full p-4 bg-white rounded-2xl border-none outline-none shadow-sm font-bold" onChange={e => setFormData({ ...formData, sender_name: e.target.value })} required />
                  <input type="text" placeholder="Taleefanka" value={formData.sender_phone} className="w-full p-4 bg-white rounded-2xl border-none outline-none shadow-sm font-bold" onChange={e => setFormData({ ...formData, sender_phone: e.target.value })} required />
                </div>
                <div className="space-y-4 bg-blue-50/30 p-6 rounded-[32px]">
                  <h4 className="text-sm font-black text-blue-600 uppercase flex items-center gap-2"><User size={18} /> Heleha</h4>
                  <input type="text" placeholder="Magaca Heleha" value={formData.receiver_name} className="w-full p-4 bg-white rounded-2xl border-none outline-none shadow-sm font-bold" onChange={e => setFormData({ ...formData, receiver_name: e.target.value })} required />
                  <input type="text" placeholder="Taleefanka" value={formData.receiver_phone} className="w-full p-4 bg-white rounded-2xl border-none outline-none shadow-sm font-bold" onChange={e => setFormData({ ...formData, receiver_phone: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1">
                  <label className="text-xs font-black text-gray-400 uppercase ml-2">Nooca & Qiimaha</label>
                  <select value={formData.category_id} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" onChange={e => setFormData({ ...formData, category_id: e.target.value, cargo_type: categories.find(c => c.id === e.target.value)?.name || '' })} required>
                    <option value="">Dooro Qiimaha</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} (${c.price_per_unit}/{c.unit_type})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase ml-2">Halka laga diray</label>
                  <select value={formData.origin_id} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" onChange={e => setFormData({ ...formData, origin_id: e.target.value })} required>
                    <option value="">Dooromagaalada</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase ml-2">Halka loo diray</label>
                  <select value={formData.destination_id} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" onChange={e => setFormData({ ...formData, destination_id: e.target.value })} required>
                    <option value="">Dooro magaalada</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100">
                <label className="text-xs font-black text-blue-600 uppercase ml-2 flex items-center gap-2">
                  <Truck size={18} /> U qoondeynta Marinka (Darawalka)
                </label>
                <select
                  value={formData.route_id}
                  className="w-full mt-2 p-4 bg-white rounded-2xl outline-none font-bold shadow-sm"
                  onChange={e => setFormData({ ...formData, route_id: e.target.value })}
                >
                  <option value="">Dooro Marinka / Darawalka</option>
                  {routes
                    .filter(r => r.origin_id === formData.origin_id && r.destination_id === formData.destination_id)
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {new Date(r.departure_time).toLocaleDateString()} - {r.driver_name} ({r.vehicle_plate})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-blue-400 font-bold mt-2 ml-2">
                  Tuseysa marinnada ka baxa {locations.find(l => l.id === formData.origin_id)?.name || '...'} ee taga {locations.find(l => l.id === formData.destination_id)?.name || '...'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-900 p-10 rounded-[40px] shadow-2xl">
                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{selectedUnitType === 'kg' ? 'Miisaanka (KG)' : 'Tirada'}</label>
                  <div className="flex items-center gap-4 text-white">
                    {selectedUnitType === 'kg' ? <Scale size={48} className="text-blue-500" /> : <Hash size={48} className="text-blue-500" />}
                    <input type="number" value={selectedUnitType === 'kg' ? formData.weight_kg : formData.quantity} className="bg-transparent border-none text-6xl font-black outline-none w-full" onChange={e => setFormData({ ...formData, [selectedUnitType === 'kg' ? 'weight_kg' : 'quantity']: e.target.value })} />
                  </div>
                </div>
                <div className="md:border-l border-gray-800 md:pl-10 text-right space-y-2">
                  <label className="text-xs font-black text-blue-500 uppercase tracking-widest">Warta Guud ($)</label>
                  <div className="flex items-center justify-end gap-2 text-white">
                    <span className="text-4xl font-black opacity-50">$</span>
                    <input 
                      type="number" 
                      value={formData.price_total} 
                      className="bg-transparent border-none text-6xl font-black outline-none w-48 text-right" 
                      onChange={e => setFormData({ ...formData, price_total: e.target.value })} 
                    />
                  </div>
                  <p className="text-gray-500 font-bold text-xs">Waad bedeli kartaa haddii loo baahdo</p>
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-2xl hover:bg-blue-700 transition-all shadow-2xl">Keydi Xamuulka</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}