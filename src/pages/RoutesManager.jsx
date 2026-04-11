import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus, MapPin, Clock, DollarSign, X,
  Pencil, Trash2, Calendar, RefreshCcw, Car,
  Activity, CheckCircle, AlertCircle, Search
} from 'lucide-react';

export default function RoutesManager() {
  const [routes, setRoutes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    origin_id: '',
    destination_id: '',
    departure_time: '',
    price_ticket: '',
    total_seats: 14,
    available_seats: 14,
    vehicle_type: 'Bus',
    is_recurring: false,
    status: 'scheduled'
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: locData } = await supabase.from('locations').select('*');
    setLocations(locData || []);

    const { data: routeData, error } = await supabase
      .from('routes')
      .select(`
        *,
        origin:locations!origin_id(name),
        destination:locations!destination_id(name)
      `)
      .order('departure_time', { ascending: true });

    if (error) console.error(error);
    else setRoutes(routeData || []);
    setLoading(false);
  }

  const handleVehicleChange = (type) => {
    const seats = type === 'Bus' ? 14 : 12;
    setFormData({ ...formData, vehicle_type: type, total_seats: seats, available_seats: seats });
  };

  const handleEdit = (route) => {
    setEditingId(route.id);
    setFormData({
      origin_id: route.origin_id,
      destination_id: route.destination_id,
      departure_time: route.departure_time ? route.departure_time.slice(0, 16) : '',
      arrival_time: route.arrival_time ? route.arrival_time.slice(0, 16) : '',
      price_ticket: route.price_ticket,
      total_seats: route.total_seats,
      available_seats: route.available_seats,
      vehicle_type: route.vehicle_type || 'Bus',
      is_recurring: route.is_recurring || false,
      status: route.status || 'scheduled'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (editingId) {
      const { error } = await supabase.from('routes').update(formData).eq('id', editingId);
      if (error) alert(error.message);
    } else {
      const submissionData = { ...formData, available_seats: formData.total_seats };
      const { error } = await supabase.from('routes').insert([submissionData]);
      if (error) alert(error.message);
    }

    setShowModal(false);
    setEditingId(null);
    setFormData({
      origin_id: '', destination_id: '', departure_time: '',
      price_ticket: '', total_seats: 14, available_seats: 14,
      vehicle_type: 'Bus', is_recurring: false,
      status: 'scheduled'
    });
    fetchData();
  };

  const deleteRoute = async (id) => {
    if (!window.confirm("Ma tirtiraysaa marinkan? Dhammaan tikidhadii iyo xamuulkii la xiriiray waa la tirtiri doonaa.")) return;

    setLoading(true);
    try {
      // 1. Delete associated tickets first (manual cascade for safety)
      await supabase.from('tickets').delete().eq('route_id', id);
      // 2. Delete associated cargo
      await supabase.from('cargo_shipments').delete().eq('route_id', id);
      // 3. Delete the route itself
      const { error } = await supabase.from('routes').delete().eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      alert("Error deleting route: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Dhammaaday</span>;
      case 'in_transit': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Activity size={10} /> Socda</span>;
      case 'cancelled': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> La Joojiyay</span>;
      default: return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> Qorsheysan</span>;
    }
  };

  // Grouping and Filtering Logic
  const filteredRoutes = routes.filter(route =>
    route.origin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.destination?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.driver_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedRoutes = filteredRoutes.reduce((groups, route) => {
    const cityName = route.origin?.name || 'Aan La Aqoon';
    if (!groups[cityName]) groups[cityName] = [];
    groups[cityName].push(route);
    return groups;
  }, {});

  // Sort groups: Galkacyo first, then others alphabetically
  const sortedCities = Object.keys(groupedRoutes).sort((a, b) => {
    if (a.toLowerCase() === 'galkacyo') return -1;
    if (b.toLowerCase() === 'galkacyo') return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gaadiidka & Marinnada</h1>
          <p className="text-sm text-gray-500">Maamul bixitaannada maalinlaha ah iyo noocyada gawaarida.</p>
        </div>
        <button onClick={() => { setEditingId(null); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 shadow-lg">
          <Plus size={20} /> Kudar Bixitaan Cusub
        </button>
      </div>

      {/* SEARCH BAR & FILTERS */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Raadi marinka, magaalada ama darawalka..."
            className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-6 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-6 py-3.5 bg-gray-50 rounded-2xl border border-gray-100">
          <MapPin size={18} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{sortedCities.length} Magaalooyin</span>
        </div>
      </div>

      {/* GROUPED ROUTE SECTIONS */}
      <div className="space-y-12">
        {sortedCities.map(city => (
          <div key={city} className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Wadooyinka: {city}</h2>
              <div className="flex-1 h-[1px] bg-gray-100"></div>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{groupedRoutes[city].length} Marinnada</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedRoutes[city].map((route) => (
                <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group relative hover:shadow-xl transition-all">
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={() => handleEdit(route)} className="p-2 bg-white/90 shadow-sm rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-all"><Pencil size={14} /></button>
                  </div>

                  <div className="p-5 border-b border-gray-50 bg-gray-50/50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex gap-2">
                        {route.is_recurring && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase bg-green-50 px-2 py-0.5 rounded-full"><RefreshCcw size={10} /> Maalin kasta</span>
                        )}
                        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${route.vehicle_type === 'Land Cruiser' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          <Car size={10} /> {route.vehicle_type || 'Bus'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-bold uppercase transition-all">
                          {getStatusBadge(route.status)}
                        </div>
                        <button
                          onClick={() => deleteRoute(route.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-gray-800 font-bold text-xl">
                        <span>{route.origin?.name}</span> <span className="text-blue-400">→</span> <span>{route.destination?.name}</span>
                      </div>
                      <span className="text-lg font-bold text-gray-800">${route.price_ticket}</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: `${(route.available_seats / route.total_seats) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                      <span>Kuraasta Bannaan</span>
                      <span>{route.available_seats} / {route.total_seats}</span>
                    </div>
                    
                    <button 
                      onClick={() => deleteRoute(route.id)}
                      className="w-full mt-2 py-3 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-rose-100"
                    >
                      <Trash2 size={14} /> Tirtir Marinka
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {sortedCities.length === 0 && (
          <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Wax marin ah lama helin</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{editingId ? "Wax ka beddel Marinka" : "Abuur Marin Cusub"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setFormData({ ...formData, is_recurring: !formData.is_recurring })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${formData.is_recurring ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${formData.is_recurring ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}><RefreshCcw size={16} /></div>
                    <p className="font-bold text-gray-800 text-sm">Maalin kasta</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${formData.is_recurring ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 bg-white w-4 h-4 rounded-full transition-all ${formData.is_recurring ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Xaaladda Safarka</label>
                  <select
                    value={formData.status}
                    className={`w-full p-3 border-2 rounded-2xl font-bold transition-all ${formData.status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      formData.status === 'in_transit' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                        'border-gray-100 bg-gray-50 text-gray-600'
                      }`}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="scheduled">Qorsheysan</option>
                    <option value="in_transit">Socda</option>
                    <option value="completed">Dhammaaday</option>
                    <option value="cancelled">La Joojiyay</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Doorashada Gaariga</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Bus', 'Land Cruiser'].map((type) => (
                    <div
                      key={type}
                      onClick={() => handleVehicleChange(type)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${formData.vehicle_type === type ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                    >
                      <Car className={formData.vehicle_type === type ? 'text-blue-600' : 'text-gray-400'} size={24} />
                      <span className={`font-bold ${formData.vehicle_type === type ? 'text-blue-600' : 'text-gray-500'}`}>{type === 'Bus' ? 'Bas' : 'Land Cruiser'}</span>
                      <span className="text-[10px] text-gray-400">{type === 'Bus' ? '14 Kursi' : '12 Kursi'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Halka laga bixi</label>
                  <select required value={formData.origin_id} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({ ...formData, origin_id: e.target.value })}>
                    <option value="">Dooro halka laga bixiyo</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Halka loo socdo</label>
                  <select required value={formData.destination_id} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({ ...formData, destination_id: e.target.value })}>
                    <option value="">Dooro halka loo socdo</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4 bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Waqtiga Bixitaanka</label>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase italic">Maanta</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Subax', hour: '06:00' },
                      { label: 'Duhur', hour: '12:00' },
                      { label: 'Galab', hour: '15:00' },
                      { label: 'Habeen', hour: '20:00' }
                    ].map((slot) => (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setFormData({ ...formData, departure_time: `${today}T${slot.hour}` });
                        }}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border-2 ${formData.departure_time.includes(slot.hour)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'
                          }`}
                      >
                        {slot.label} ({slot.hour})
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <div className="bg-white p-3 rounded-2xl border-2 border-blue-100 text-blue-700 font-black text-center text-[11px] shadow-inner">
                      {formData.departure_time ? new Date(formData.departure_time).toLocaleString('so-SO', { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false }) : 'Xulo waqtiga bixitaanka'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Qiimaha Tikidka ($)</label>
                  <input type="number" required value={formData.price_ticket} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({ ...formData, price_ticket: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Isugeynta Kuraasta</label>
                  <input type="number" value={formData.total_seats} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({ ...formData, total_seats: e.target.value, available_seats: e.target.value })} />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg transition-all">
                {editingId ? "Cusboonaysii Jadwalka" : "Bilaw Jadwalka"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}