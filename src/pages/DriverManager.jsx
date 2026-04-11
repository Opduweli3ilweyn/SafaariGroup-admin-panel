import {
  Calendar,
  Download,
  Filter,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
  X,
  Car,
  Truck,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';

export default function DriverManager() {
  const { user: currentUser } = useUser();
  const [drivers, setDrivers] = useState([]);
  const [approvedDrivers, setApprovedDrivers] = useState([]); // Whitelist
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Driver Route Assignment State
  const [routes, setRoutes] = useState([]);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  // New Driver Modal State
  const [newDriverModalOpen, setNewDriverModalOpen] = useState(false);
  const [newDriverData, setNewDriverData] = useState({ full_name: '', phone: '', plate_number: '' });
  const [savingNewDriver, setSavingNewDriver] = useState(false);
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Active Trips State
  const [activeTrips, setActiveTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [arrivingTripId, setArrivingTripId] = useState(null);

  useEffect(() => {
    fetchDrivers();
    fetchRoutes();
    fetchActiveTrips();
  }, []);

  async function fetchRoutes() {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          origin:locations!origin_id(name),
          destination:locations!destination_id(name)
        `)
        .order('departure_time', { ascending: true });

      if (error) throw error;
      setRoutes(data || []);
    } catch (e) {
      console.error("Fetch routes error:", e);
    }
  }

  // ── Active Trips ─────────────────────────────────────────────────
  async function fetchActiveTrips() {
    setTripsLoading(true);
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let query = supabase
        .from('active_trips')
        .select(`
          *,
          origin:locations!origin_id(name),
          destination:locations!destination_id(name)
        `)
        .or(`status.eq.in_transit,and(status.eq.arrived,arrived_at.gte.${cutoff})`)
        .order('created_at', { ascending: false });

      // Branch admins only see trips heading TO their city
      if (currentUser?.branch_id) {
        query = query.eq('destination_id', currentUser.branch_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setActiveTrips(data || []);
    } catch (err) {
      console.error('Error fetching active trips:', err);
    } finally {
      setTripsLoading(false);
    }
  }

  const handleMarkArrived = async (trip) => {
    if (!window.confirm(`Ma hubtaa in gaadiidka ${trip.origin?.name} → ${trip.destination?.name} uu yimid?`)) return;
    setArrivingTripId(trip.id);
    try {
      // 1. Mark trip as arrived
      const { error: updateErr } = await supabase
        .from('active_trips')
        .update({ status: 'arrived', arrived_at: new Date().toISOString() })
        .eq('id', trip.id);
      if (updateErr) throw updateErr;

      // 2. Find all cargo receivers on this route for today
      const { data: cargos, error: cargoErr } = await supabase
        .from('cargo_shipments')
        .select('receiver_name, receiver_phone')
        .eq('origin_id', trip.origin_id)
        .eq('destination_id', trip.destination_id)
        .eq('status', 'confirmed');

      if (cargoErr) throw cargoErr;

      // 3. Send SMS to each unique receiver
      const originName = trip.origin?.name || '...';
      const destName = trip.destination?.name || '...';
      const uniquePhones = [...new Set((cargos || []).map(c => c.receiver_phone).filter(Boolean))];

      let smsCount = 0;
      for (const phone of uniquePhones) {
        const receiverNames = cargos.filter(c => c.receiver_phone === phone).map(c => c.receiver_name).join(', ');
        const message = `${receiverNames}, Xamuulkaagii ka yimid ${originName} wuu yimid ${destName}. Fadlan kaalay xafiiska si aad u qaadatid. Mahadsanid!`;
        try {
          await supabase.functions.invoke('send-sms', {
            body: { phone, message, event: 'cargo_arrival_notification' }
          });
          smsCount++;
        } catch (smsErr) {
          console.error('SMS error for', phone, smsErr);
        }
      }

      // 4. Delete all tickets on this route (trip arrived = passengers delivered)
      const { error: deleteErr } = await supabase
        .from('tickets')
        .delete()
        .eq('origin_id', trip.origin_id)
        .eq('destination_id', trip.destination_id)
        .in('status', ['confirmed', 'pending_verification']);

      if (deleteErr) console.error('Ticket cleanup error:', deleteErr);

      alert(`Gaadiidku wuu yimid! ${smsCount} SMS ayaa loo diray macaamiisha.`);
      fetchActiveTrips();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setArrivingTripId(null);
    }
  };

  const openDriverModal = (driver) => {
    setSelectedDriver(driver);
    setDriverModalOpen(true);
  };

  const assignRoute = async (routeId) => {
    if (!selectedDriver) return;
    setAssigningLoading(true);
    try {
      const { error } = await supabase
        .from('driver_routes')
        .insert({ driver_id: selectedDriver.id, route_id: routeId });

      if (error && error.code !== '23505') throw error; // Ignore duplicate

      alert('Marin si guul leh ayaa loogu qoondeeyey darawalka!');
      setDriverModalOpen(false);
      fetchDrivers(); 
    } catch (err) {
      alert('Error assigning route: ' + err.message);
    } finally {
      setAssigningLoading(false);
    }
  };

  async function fetchDrivers() {
    setLoading(true);
    try {
      // 1. Fetch Registered Drivers
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select(`
          *,
          driver_routes(
            route_id,
            route:routes(
              origin:locations!origin_id(name),
              destination:locations!destination_id(name)
            )
          )
        `)
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (profileErr) throw profileErr;

      // 2. Fetch Approved Drivers (Pending)
      const { data: approvedData, error: approvedErr } = await supabase
        .from('approved_drivers')
        .select('*');

      if (approvedErr) throw approvedErr;

      setApprovedDrivers(approvedData || []);

      // 3. Merge: Identify which approved drivers are not yet registered
      // We use Phone as the unique key
      const registeredPhones = profileData?.map(p => p.phone) || [];
      const pendingDrivers = (approvedData || [])
        .filter(ad => !registeredPhones.includes(ad.phone))
        .map(ad => ({
           id: `pending-${ad.phone}`,
           full_name: ad.full_name,
           phone: ad.phone,
           plate_number: ad.plate_number,
           status: 'pending',
           driver_routes: []
        }));

      const activeDrivers = (profileData || []).map(p => ({ ...p, status: 'active' }));
      
      setDrivers([...activeDrivers, ...pendingDrivers]);
    } catch (err) {
        console.error("Error fetching drivers:", err);
    } finally {
      setLoading(false);
    }
  }

  const removeRoute = async (userId, routeId) => {
    if (!window.confirm("Ma hubtaa inaad ka saarto marinkan darawalka?")) return;
    try {
      const { error } = await supabase
        .from('driver_routes')
        .delete()
        .eq('driver_id', userId)
        .eq('route_id', routeId);

      if (error) throw error;
      fetchDrivers();
    } catch (err) {
      alert('Error removing route: ' + err.message);
    }
  };

  const addNewApprovedDriver = async (e) => {
    e.preventDefault();
    setSavingNewDriver(true);
    try {
      const { error } = await supabase
        .from('approved_drivers')
        .insert([newDriverData]);

      if (error) throw error;

      alert('Driver-ka cusub si guul leh ayaa loogu daray liiska!');
      setNewDriverModalOpen(false);
      setNewDriverData({ full_name: '', phone: '', plate_number: '' });
      fetchDrivers();
    } catch (err) {
      alert('Error adding driver: ' + err.message);
    } finally {
      setSavingNewDriver(false);
    }
  };

  const filteredDrivers = drivers.filter(d =>
    d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.includes(searchTerm) ||
    d.plate_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count cargo/tickets per trip
  const getTripCounts = (trip) => {
    // We don't have live counts without a join, so we show route info only
    return null;
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* ── ACTIVE TRIPS PANEL ──────────────────────────────────────── */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Truck size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">SAFARADA MAANTA (TODAY'S TRIPS)</h2>
              <p className="text-xs text-gray-400 font-bold">Tikidh ama xamuul markii la diiwaangeliyo, safar cusub ayaa si toos ah loo abuurayaa.</p>
            </div>
          </div>
          <button onClick={fetchActiveTrips} className="text-xs font-bold text-gray-400 hover:text-gray-700 transition">
            Cusbooneysii
          </button>
        </div>

        <div className="p-6">
          {tripsLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-300">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : activeTrips.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-300 font-bold text-sm">Maanta safar lama diiwaangellin wali.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTrips.map((trip) => {
                const isArrived = trip.status === 'arrived';
                const isMyDestination = currentUser?.branch_id === trip.destination_id;
                const isArriving = arrivingTripId === trip.id;
                return (
                  <div
                    key={trip.id}
                    className={`relative rounded-2xl border-2 p-5 transition-all ${
                      isArrived
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    {/* Status dot */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isArrived ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isArrived ? 'text-green-700' : 'text-amber-700'}`}>
                          {isArrived ? 'WAA YIMID ✓' : 'JIDKA SAARAN'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">
                        {new Date(trip.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-black text-gray-900">{trip.origin?.name || '?'}</span>
                      <span className="text-gray-300">→</span>
                      <span className="text-sm font-black text-gray-900">{trip.destination?.name || '?'}</span>
                    </div>

                    {/* Arrived info or action button */}
                    {isArrived ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                        <CheckCircle2 size={14} />
                        Wuu yimid {trip.arrived_at ? new Date(trip.arrived_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    ) : isMyDestination || !currentUser?.branch_id ? (
                      <button
                        onClick={() => handleMarkArrived(trip)}
                        disabled={isArriving}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isArriving ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                        {isArriving ? 'SMS-ka waa la direyaa...' : 'WAA YIMID (ARRIVED)'}
                      </button>
                    ) : (
                      <div className="text-[10px] font-bold text-amber-500 text-center py-2">
                        Gaadiidku wali jidka ayuu saaran yahay...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── DRIVERS SECTION ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Darewalada (Drivers)</h1>
          <p className="text-gray-500 font-medium">Maamul macluumaadka darawalada iyo gawaarida ay wadaan.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setNewDriverModalOpen(true)}
                className="bg-blue-600 px-6 py-3 rounded-2xl text-white font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-all"
            >
                <UserCheck size={20} /> DARAWAL CUSUB
            </button>
            <div className="bg-white border border-gray-100 px-6 py-3 rounded-2xl text-gray-700 font-bold shadow-sm flex items-center gap-2">
                Total: {drivers.length}
            </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Ku raadi magaca, taleefanka, ama taargada..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Darawalka</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Xiriirka & Taargada</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Marinnada loo qoondeeyey</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Maamulka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          driver.status === 'pending' 
                          ? 'bg-amber-50 text-amber-500 border-2 border-dashed border-amber-200' 
                          : 'bg-gray-100 text-gray-400 group-hover:bg-blue-600 group-hover:text-white'
                      }`}>
                        <UserCheck size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="font-black text-gray-900">{driver.full_name}</p>
                           {driver.status === 'pending' && (
                             <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">Wali ma soo biirin</span>
                           )}
                        </div>
                        <p className="text-xs text-gray-400 font-bold uppercase">
                           {driver.status === 'active' ? `ID: ${driver.id.slice(0, 8)}` : 'Sugo inta uu soo galayo'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Phone size={14} className="text-blue-500" /> {driver.phone || 'Lama helin'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Car size={14} className="text-gray-400" />
                        <input 
                            type="text" 
                            defaultValue={driver.plate_number} 
                            placeholder="Taargo majirto"
                            onBlur={(e) => updatePlate(driver.id, e.target.value)}
                            className="bg-transparent border-b border-dashed border-gray-200 focus:border-blue-500 outline-none text-xs font-black text-gray-600 w-24"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1">
                      {driver.driver_routes?.map(dr => (
                        <div key={dr.route_id} className="flex items-center gap-1.5 bg-white border border-gray-100 px-2 py-1 rounded-lg group/route hover:border-red-200 transition-all shadow-sm">
                          <span className="text-[10px] font-bold text-gray-600">
                            {dr.route?.origin?.name} → {dr.route?.destination?.name}
                          </span>
                          <button
                            onClick={() => removeRoute(driver.id, dr.route_id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {(!driver.driver_routes || driver.driver_routes.length === 0) && (
                          <span className="text-[10px] font-bold text-gray-300 italic">Marin looma qoondeeyn</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {driver.status === 'active' ? (
                      <button
                          onClick={() => openDriverModal(driver)}
                          className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-100 transition-all border border-blue-100"
                      >
                          U QOONDEE MARIN
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                          PENDING...
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-20 text-center font-black text-gray-300 animate-pulse uppercase tracking-widest">Cusboonaysiinta xogta darewalada...</div>}
        </div>
      </div>

      {driverModalOpen && selectedDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setDriverModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-all"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-1">U qoondee Marin</h2>
            <p className="text-gray-500 font-medium mb-6">Dooro marin u qoondeynta <span className="text-gray-900 font-bold">{selectedDriver.full_name}</span></p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {routes.map(r => (
                <button
                  key={r.id}
                  onClick={() => assignRoute(r.id)}
                  className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-4 group"
                  disabled={assigningLoading}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{r.origin?.name || 'Lama yaqaan'} → {r.destination?.name || 'Lama yaqaan'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-blue-600 font-bold uppercase bg-blue-50 px-2 py-0.5 rounded-md">
                        {r.vehicle_type === 'Bus' ? 'Bas' : r.vehicle_type}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        {r.departure_time ? new Date(r.departure_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Wakhti majiro'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add New Approved Driver Modal */}
      {newDriverModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setNewDriverModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 transition-all"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">Darawal Cusub</h2>
            <p className="text-gray-500 font-medium mb-6">Ku dar darawal cusub liiska la oggol yahay si toos ah.</p>
            
            <form onSubmit={addNewApprovedDriver} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Magaca oo dhamaystiran</label>
                <input 
                  type="text" 
                  required
                  value={newDriverData.full_name}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-gray-700 transition-all"
                  placeholder="Gali magaca darawalka"
                  onChange={(e) => setNewDriverData({...newDriverData, full_name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Lambarka Taleefanka</label>
                <input 
                  type="text" 
                  required
                  value={newDriverData.phone}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-gray-700 transition-all"
                  placeholder="7XXXXXX"
                  onChange={(e) => setNewDriverData({...newDriverData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Lambarka Taargada</label>
                <input 
                  type="text" 
                  required
                  value={newDriverData.plate_number}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-gray-700 transition-all"
                  placeholder="TR-XXXX"
                  onChange={(e) => setNewDriverData({...newDriverData, plate_number: e.target.value})}
                />
              </div>
              <button 
                type="submit" 
                disabled={savingNewDriver}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all mt-4"
              >
                {savingNewDriver ? 'Galinaya...' : 'Kudar Liiska Oggol'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
