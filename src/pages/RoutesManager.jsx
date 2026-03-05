import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, MapPin, Clock, DollarSign, X, Users, 
  User, Truck, Pencil, Trash2, Calendar, RefreshCcw, Car 
} from 'lucide-react';

export default function RoutesManager() {
  const [routes, setRoutes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

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
    is_recurring: false // RESTORED
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
      driver_name: route.driver_name || '',
      vehicle_plate: route.vehicle_plate || '',
      vehicle_type: route.vehicle_type || 'Bus',
      estimated_duration: route.estimated_duration || '',
      is_recurring: route.is_recurring || false
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
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
      driver_name: '', vehicle_plate: '', vehicle_type: 'Bus', estimated_duration: '', is_recurring: false
    });
    fetchData();
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fleet & Routes</h1>
          <p className="text-sm text-gray-500">Manage daily departures and assign vehicle types.</p>
        </div>
        <button onClick={() => { setEditingId(null); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 shadow-lg">
          <Plus size={20} /> Add New Departure
        </button>
      </div>

      {/* ROUTE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routes.map((route) => (
          <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group relative">
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(route)} className="p-2 bg-white/90 shadow-sm rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(route.id)} className="p-2 bg-white/90 shadow-sm rounded-lg text-red-600 hover:bg-red-600 hover:text-white"><Trash2 size={14} /></button>
            </div>

            <div className="p-5 border-b border-gray-50 bg-gray-50/50">
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-2">
                  {route.is_recurring && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase bg-green-50 px-2 py-0.5 rounded-full"><RefreshCcw size={10} /> Everyday</span>
                  )}
                  <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${route.vehicle_type === 'Land Cruiser' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    <Car size={10} /> {route.vehicle_type || 'Bus'}
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-800">${route.price_ticket}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-800 font-bold text-xl">
                <span>{route.origin?.name}</span> <span className="text-blue-400">→</span> <span>{route.destination?.name}</span>
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
                <span>Seats</span>
                <span>{route.available_seats} / {route.total_seats} Available</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{editingId ? "Edit Route" : "Create New Route"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* EVERYDAY TOGGLE - RESTORED */}
              <div 
                onClick={() => setFormData({...formData, is_recurring: !formData.is_recurring})}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${formData.is_recurring ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formData.is_recurring ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}><RefreshCcw size={20} /></div>
                  <div>
                    <p className="font-bold text-gray-800">Everyday Route</p>
                    <p className="text-xs text-gray-500">Repeats daily at the set time.</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-all ${formData.is_recurring ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${formData.is_recurring ? 'right-1' : 'left-1'}`} />
                </div>
              </div>

              {/* VEHICLE TYPE SELECTOR */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Vehicle Selection</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Bus', 'Land Cruiser'].map((type) => (
                    <div 
                      key={type}
                      onClick={() => handleVehicleChange(type)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${formData.vehicle_type === type ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                    >
                      <Car className={formData.vehicle_type === type ? 'text-blue-600' : 'text-gray-400'} size={24} />
                      <span className={`font-bold ${formData.vehicle_type === type ? 'text-blue-600' : 'text-gray-500'}`}>{type}</span>
                      <span className="text-[10px] text-gray-400">{type === 'Bus' ? '14 Seats' : '12 Seats'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ... REST OF THE FORM ... */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Origin</label>
                  <select required value={formData.origin_id} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, origin_id: e.target.value})}>
                    <option value="">Select Origin</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Destination</label>
                  <select required value={formData.destination_id} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, destination_id: e.target.value})}>
                    <option value="">Select Destination</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Driver</label>
                  <input type="text" value={formData.driver_name} placeholder="Driver Name" className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, driver_name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Plate</label>
                  <input type="text" value={formData.vehicle_plate} placeholder="Plate Number" className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Departure</label>
                  <input type="datetime-local" required value={formData.departure_time} className="w-full p-3 bg-gray-50 border rounded-xl text-sm" onChange={(e) => setFormData({...formData, departure_time: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Arrival</label>
                  <input type="datetime-local" required value={formData.arrival_time} className="w-full p-3 bg-gray-50 border rounded-xl text-sm" onChange={(e) => setFormData({...formData, arrival_time: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Price</label>
                  <input type="number" required value={formData.price_ticket} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, price_ticket: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Seats</label>
                  <input type="number" value={formData.total_seats} className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, total_seats: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Duration</label>
                  <input type="text" value={formData.estimated_duration} placeholder="4h" className="w-full p-3 bg-gray-50 border rounded-xl" onChange={(e) => setFormData({...formData, estimated_duration: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg transition-all">
                {editingId ? "Update Schedule" : "Launch Schedule"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}