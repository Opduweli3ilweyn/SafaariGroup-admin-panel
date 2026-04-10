import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, MapPin, Clock, DollarSign, X, Users, 
  User, Truck, Pencil, Trash2, Calendar, RefreshCcw, Car,
  Activity, CheckCircle, AlertCircle, Play
} from 'lucide-react';

export default function RoutesManager() {
  const [routes, setRoutes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [drivers, setDrivers] = useState([]); // New state for drivers

  const [formData, setFormData] = useState({
    origin_id: '',
    destination_id: '',
    departure_time: '',
    arrival_time: '',
    price_ticket: '',
    total_seats: 14,
    available_seats: 14,
    driver_name: '',
    vehicle_plate: '',
    vehicle_type: 'Bus',
    estimated_duration: '',
    is_recurring: false,
    status: 'scheduled',
    driver_id: '' // Added relational field
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: locData } = await supabase.from('locations').select('*');
    setLocations(locData || []);

    const { data: driverData } = await supabase.from('profiles').select('id, full_name').eq('role', 'driver');
    setDrivers(driverData || []);

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
      driver_name: route.driver_name || '',
      vehicle_plate: route.vehicle_plate || '',
      vehicle_type: route.vehicle_type || 'Bus',
      estimated_duration: route.estimated_duration || '',
      is_recurring: route.is_recurring || false,
      status: route.status || 'scheduled',
      driver_id: route.driver_id || ''
    });
    setShowModal(true);
  };

  const deleteRoute = async (id) => {
    if (window.confirm("Are you sure you want to delete this route?")) {
      const { error } = await supabase.from('routes').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchData();
    }
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
      origin_id: '', destination_id: '', departure_time: '', arrival_time: '',
      price_ticket: '', total_seats: 14, available_seats: 14,
      driver_name: '', vehicle_plate: '', vehicle_type: 'Bus', estimated_duration: '', is_recurring: false,
      status: 'scheduled',
      driver_id: ''
    });
    fetchData();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Dhammaaday</span>;
      case 'in_transit': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Activity size={10} /> Socda</span>;
      case 'cancelled': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> La Joojiyay</span>;
      default: return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> Qorsheysan</span>;
    }
  };

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

      {/* ROUTE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routes.map((route) => (
          <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group relative">
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(route)} className="p-2 bg-white/90 shadow-sm rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white"><Pencil size={14} /></button>
              <button onClick={() => deleteRoute(route.id)} className="p-2 bg-white/90 shadow-sm rounded-lg text-red-600 hover:bg-red-600 hover:text-white"><Trash2 size={14} /></button>
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
                <div className="text-[10px] font-bold uppercase transition-all">
                  {getStatusBadge(route.status)}
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
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 font-medium">
                <div className="flex items-center gap-2 truncate"><User size={16} className="text-gray-400" /> {route.driver_name}</div>
                <div className="flex items-center gap-2"><Truck size={16} className="text-gray-400" /> {route.vehicle_plate}</div>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${(route.available_seats / route.total_seats) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                <span>Kuraasta</span>
                <span>{route.available_seats} / {route.total_seats} Bannaan</span>
              </div>
            </div>
          </div>
        ))}
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
                {/* EVERYDAY TOGGLE */}
                <div 
                  onClick={() => setFormData({...formData, is_recurring: !formData.is_recurring})}
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

                {/* TRIP STATUS SELECTOR */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Xaaladda Safarka</label>
                  <select 
                    value={formData.status} 
                    className={`w-full p-3 border-2 rounded-2xl font-bold transition-all ${
                      formData.status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      formData.status === 'in_transit' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                      'border-gray-100 bg-gray-50 text-gray-600'
                    }`}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="scheduled">Qorsheysan</option>
                    <option value="in_transit">Socda</option>
                    <option value="completed">Dhammaaday (Tikidhadu waay dhacayaan)</option>
                    <option value="cancelled">La Joojiyay</option>
                  </select>
                </div>
              </div>

              {/* VEHICLE TYPE SELECTOR */}
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
                  <select required value={formData.origin_id} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, origin_id: e.target.value})}>
                    <option value="">Dooro halka laga bixiyo</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Halka loo socdo</label>
                  <select required value={formData.destination_id} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, destination_id: e.target.value})}>
                    <option value="">Dooro halka loo socdo</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Doorashada Darawalka</label>
                  <select 
                    required 
                    value={formData.driver_id} 
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold" 
                    onChange={(e) => {
                      const selected = drivers.find(d => d.id === e.target.value);
                      setFormData({...formData, driver_id: e.target.value, driver_name: selected?.full_name || ''});
                    }}
                  >
                    <option value="">Dooro Darawalka</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Lambarka Baabuurka</label>
                  <input type="text" value={formData.vehicle_plate} placeholder="Lambarka Taargada" className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Bixitaanka</label>
                  <input type="datetime-local" required value={formData.departure_time} className="w-full p-3 bg-gray-50 border rounded-xl text-sm" onChange={(e) => setFormData({...formData, departure_time: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Isqabashada</label>
                  <input type="datetime-local" required value={formData.arrival_time} className="w-full p-3 bg-gray-50 border rounded-xl text-sm" onChange={(e) => setFormData({...formData, arrival_time: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Qiimaha</label>
                  <input type="number" required value={formData.price_ticket} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, price_ticket: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Kuraasta</label>
                  <input type="number" value={formData.total_seats} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, total_seats: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Muddada</label>
                  <input type="text" value={formData.estimated_duration} placeholder="4h" className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, estimated_duration: e.target.value})} />
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