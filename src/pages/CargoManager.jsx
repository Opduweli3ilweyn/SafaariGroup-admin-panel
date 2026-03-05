import {
  ArrowRight,
  CheckCircle, Clock,
  Hash,
  Package,
  Pencil,
  Plus,
  Scale,
  Search,
  Settings,
  Tag,
  Trash2,
  User,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function CargoManager() {
  const [cargo, setCargo] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]); // State for categories
  const [showModal, setShowModal] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false); // Toggle for Category UI
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
    status: 'registered'
  };

  const [formData, setFormData] = useState(initialFormState);

  // New state for adding a category
  const [newCat, setNewCat] = useState({ name: '', unit_type: 'kg', price_per_unit: 0 });

  useEffect(() => { fetchData(); }, []);

  // AUTO-CALCULATION LOGIC based on Category
  useEffect(() => {
    const selectedCat = categories.find(c => c.id === formData.category_id);
    if (selectedCat) {
      const rate = parseFloat(selectedCat.price_per_unit) || 0;
      const amount = selectedCat.unit_type === 'kg' ? (formData.weight_kg || 0) : (formData.quantity || 0);
      setFormData(prev => ({ ...prev, price_total: (amount * rate).toFixed(2) }));
    }
  }, [formData.category_id, formData.weight_kg, formData.quantity, categories]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: locData } = await supabase.from('locations').select('*').order('name');
      setLocations(locData || []);

      const { data: catData } = await supabase.from('cargo_categories').select('*').order('name');
      setCategories(catData || []);

      const { data, error } = await supabase
        .from('cargo_shipments')
        .select(`*, origin:locations!origin_id(name), destination:locations!destination_id(name)`)
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
    const { error } = await supabase.from('cargo_categories').insert([newCat]);
    if (error) alert(error.message);
    else {
      setNewCat({ name: '', unit_type: 'kg', price_per_unit: 0 });
      fetchData();
    }
  };

  const handleDeleteCategory = async (id) => {
    if (confirm("Delete this category?")) {
      await supabase.from('cargo_categories').delete().eq('id', id);
      fetchData();
    }
  };

  // --- SHIPMENT ACTIONS ---
  const handleApprove = async (item) => {
    const code = 'TRK-' + Math.random().toString(36).toUpperCase().substring(2, 10);
    const { error } = await supabase.from('cargo_shipments').update({ status: 'registered', tracking_number: code }).eq('id', item.id);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleAddNew = () => {
    const code = 'TRK-' + Math.random().toString(36).toUpperCase().substring(2, 10);
    setEditingId(null);
    setFormData({ ...initialFormState, tracking_number: code });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ ...item });
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

  const filteredCargo = cargo.filter(item => {
    const matchesSearch = item.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.receiver_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' ? true : item.status === 'pending';
    return matchesSearch && matchesFilter;
  });

  const selectedUnitType = categories.find(c => c.id === formData.category_id)?.unit_type || 'kg';

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Cargo Logistics</h1>
          <p className="text-gray-500 font-medium">Manage categories and branch shipments.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCatManager(!showCatManager)} className="px-6 py-4 rounded-2xl font-bold bg-gray-900 text-white flex items-center gap-2 hover:bg-black transition-all">
            <Settings size={20} /> {showCatManager ? 'Close Pricing' : 'Manage Pricing'}
          </button>
          <button onClick={() => setFilter(filter === 'all' ? 'pending' : 'all')} className={`px-6 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 ${filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Clock size={20} /> {filter === 'pending' ? 'Showing Pending' : 'View Pending'}
          </button>
          <button onClick={handleAddNew} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl transition-all flex items-center gap-2">
            <Plus size={24} /> Register New
          </button>
        </div>
      </div>

      {/* CATEGORY LISTING / ADMIN PRICING SECTION (NEW) */}
      {showCatManager && (
        <div className="bg-white p-8 rounded-[32px] border-2 border-gray-900 shadow-xl animate-in fade-in zoom-in duration-200">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Tag className="text-blue-600" /> Cargo Categories & Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-6 rounded-2xl">
            <input type="text" placeholder="Category Name (e.g. Electronics)" className="p-4 rounded-xl border-none shadow-sm font-bold" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} />
            <select className="p-4 rounded-xl border-none shadow-sm font-bold" value={newCat.unit_type} onChange={e => setNewCat({ ...newCat, unit_type: e.target.value })}>
              <option value="kg">Weight (kg)</option>
              <option value="quantity">Quantity (pcs)</option>
              <option value="box">Box</option>
            </select>
            <input type="number" placeholder="Price per Unit" className="p-4 rounded-xl border-none shadow-sm font-bold" value={newCat.price_per_unit} onChange={e => setNewCat({ ...newCat, price_per_unit: e.target.value })} />
            <button onClick={handleAddCategory} className="bg-green-600 text-white font-black rounded-xl hover:bg-green-700 flex items-center justify-center gap-2"><Plus /> Add Category</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-blue-200">
                <div>
                  <p className="font-black text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-500 font-bold uppercase">${cat.price_per_unit} per {cat.unit_type}</p>
                </div>
                <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input type="text" placeholder="Search Tracking ID or Receiver Name..." className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 shadow-sm font-bold" onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* CARGO LIST */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCargo.map((item) => (
          <div key={item.id} className={`group bg-white p-6 rounded-[32px] border flex items-center justify-between relative hover:border-blue-300 transition-all ${item.status === 'pending' ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'}`}>
            <div className="flex items-center gap-6">
              <div className={`p-5 rounded-[24px] ${item.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                <Package size={32} />
              </div>
              <div>
                <h3 className="font-black text-xl text-gray-900 tracking-tight">{item.status === 'pending' ? 'PENDING REQUEST' : item.tracking_number}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400 font-bold uppercase mt-1">
                  <span className="text-blue-500">{item.sender_name}</span>
                  <ArrowRight size={14} className="text-gray-300" />
                  <span className="text-blue-500">{item.receiver_name}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-12 items-center mr-16">
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase">Load</p>
                <p className="text-lg font-black text-gray-700">{item.weight_kg > 0 ? `${item.weight_kg} kg` : `${item.quantity} qty`}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase">Total</p>
                <p className="text-lg font-black text-blue-600">${item.price_total}</p>
              </div>
              <div className="text-center min-w-[100px]">
                <p className="text-[10px] font-black text-gray-300 uppercase">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{item.status}</span>
              </div>
            </div>

            <div className="absolute right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              {item.status === 'pending' && <button onClick={() => handleApprove(item)} className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"><CheckCircle size={20} /></button>}
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
              <h2 className="text-3xl font-black text-gray-900">{editingId ? 'Edit Shipment' : 'Register Shipment'}</h2>
              <button onClick={() => setShowModal(false)} className="p-3 bg-gray-50 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={28} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 bg-gray-50 p-6 rounded-[32px]">
                  <h4 className="text-sm font-black text-blue-600 uppercase flex items-center gap-2"><User size={18} /> Sender</h4>
                  <input type="text" placeholder="Sender Name" value={formData.sender_name} className="w-full p-4 bg-white rounded-2xl border-none outline-none shadow-sm font-bold" onChange={e => setFormData({ ...formData, sender_name: e.target.value })} required />
                  <input type="text" placeholder="Phone" value={formData.sender_phone} className="w-full p-4 bg-white rounded-2xl border-none outline-none shadow-sm font-bold" onChange={e => setFormData({ ...formData, sender_phone: e.target.value })} required />
                </div>
                <div className="space-y-4 bg-blue-50/30 p-6 rounded-[32px]">
                  <h4 className="text-sm font-black text-blue-600 uppercase flex items-center gap-2"><User size={18} /> Receiver</h4>
                  <input type="text" placeholder="Receiver Name" value={formData.receiver_name} className="w-full p-4 bg-white rounded-2xl border-none outline-none shadow-sm font-bold" onChange={e => setFormData({ ...formData, receiver_name: e.target.value })} required />
                  <input type="text" placeholder="Phone" value={formData.receiver_phone} className="w-full p-4 bg-white rounded-2xl border-none outline-none shadow-sm font-bold" onChange={e => setFormData({ ...formData, receiver_phone: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1">
                  <label className="text-xs font-black text-gray-400 uppercase ml-2">Category & Price</label>
                  <select value={formData.category_id} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" onChange={e => setFormData({ ...formData, category_id: e.target.value, cargo_type: categories.find(c => c.id === e.target.value)?.name || '' })} required>
                    <option value="">Choose Pricing</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} (${c.price_per_unit}/{c.unit_type})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase ml-2">Origin</label>
                  <select value={formData.origin_id} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" onChange={e => setFormData({ ...formData, origin_id: e.target.value })} required>
                    <option value="">Select City</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase ml-2">Destination</label>
                  <select value={formData.destination_id} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" onChange={e => setFormData({ ...formData, destination_id: e.target.value })} required>
                    <option value="">Select City</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-900 p-10 rounded-[40px] shadow-2xl">
                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{selectedUnitType === 'kg' ? 'Weight (KG)' : 'Quantity'}</label>
                  <div className="flex items-center gap-4 text-white">
                    {selectedUnitType === 'kg' ? <Scale size={48} className="text-blue-500" /> : <Hash size={48} className="text-blue-500" />}
                    <input type="number" value={selectedUnitType === 'kg' ? formData.weight_kg : formData.quantity} className="bg-transparent border-none text-6xl font-black outline-none w-full" onChange={e => setFormData({ ...formData, [selectedUnitType === 'kg' ? 'weight_kg' : 'quantity']: e.target.value })} />
                  </div>
                </div>
                <div className="md:border-l border-gray-800 md:pl-10 text-right space-y-2">
                  <label className="text-xs font-black text-blue-500 uppercase tracking-widest">Total Cost</label>
                  <p className="text-white text-6xl font-black">${formData.price_total}</p>
                  <p className="text-gray-500 font-bold text-xs">Based on Category Pricing</p>
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-2xl hover:bg-blue-700 transition-all shadow-2xl">Save Shipment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}