import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  User, Phone, CreditCard, Bus,
  Clock, CheckCircle2, XCircle,
  Loader2, Search, Trash2, Hash,
  ArrowRightLeft, AlertCircle, Filter, CheckSquare, Square,
  Plus, X, ChevronRight, Armchair
} from 'lucide-react';

export default function TicketMonitor() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [routeFilter, setRouteFilter] = useState('all');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [occupiedSeatsForRoute, setOccupiedSeatsForRoute] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    route_id: '',
    passenger_name: '',
    phone: '',
    seat_number: '',
    price_paid: 0,
    vehicle_type: 'Bus'
  });

  useEffect(() => {
    fetchTickets();
    fetchRoutes();
    const channel = supabase
      .channel('db-tickets')
      .on('postgres_changes', { event: '*', table: 'tickets' }, () => {
        fetchTickets();
        if (bookingForm.route_id) fetchOccupiedSeats(bookingForm.route_id);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [bookingForm.route_id]);

  async function fetchRoutes() {
    const { data } = await supabase
      .from('routes')
      .select('*, origin:locations!origin_id(name), destination:locations!destination_id(name)')
      .in('status', ['active', 'scheduled'])
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true });
    setAvailableRoutes(data || []);
  }

  async function fetchOccupiedSeats(routeId) {
    const { data } = await supabase
      .from('tickets')
      .select('seat_number')
      .eq('route_id', routeId)
      .in('status', ['confirmed', 'pending_verification']);
    setOccupiedSeatsForRoute(data?.map(t => t.seat_number) || []);
  }

  async function fetchTickets() {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          route:routes(
            departure_time,
            origin:locations!origin_id(name),
            destination:locations!destination_id(name)
          )
        `)
        .order('id', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (id, newStatus, ticketData = null) => {
    setActionLoading(id);
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert(error.message);
    } else if (newStatus === 'confirmed' && ticketData) {
      // Send confirmation SMS to user
      const message = `SAFAARI: Boos-qabsigaaga waa la xaqiijiyey. Tikidh-kood: ${ticketData.ticket_code}. Kursi: ${ticketData.seat_number}. Mahadsanid!`;

      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            phone: ticketData.phone,
            message: message,
            event: 'ticket_confirmation'
          }
        });
      } catch (err) {
        console.error('Failed to send confirmation SMS:', err);
      }
    }
    setActionLoading(null);
  };

  const deleteTicket = async (id) => {
    if (!window.confirm("Ma tirtiraysaa tikidkan?")) return;
    await supabase.from('tickets').delete().eq('id', id);
    setSelectedTickets(prev => prev.filter(tid => tid !== id));
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Ma tirtiraysaa ${selectedTickets.length} tikidhada aad dooratay?`)) return;
    setLoading(true);
    await supabase.from('tickets').delete().in('id', selectedTickets);
    setSelectedTickets([]);
    fetchTickets();
  };

  const toggleSelect = (id) => {
    setSelectedTickets(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  // 1. Get unique routes for the filter bar
  const uniqueRoutes = Array.from(new Set(tickets.map(t =>
    `${t.route?.origin?.name} → ${t.route?.destination?.name}`
  ))).filter(r => r !== "undefined → undefined");  // 2. Filter logic
  const filteredTickets = tickets.filter(t => {
    const statusMap = {
      'pending': 'pending_verification',
      'confirmed': 'confirmed',
      'cancelled': 'cancelled',
      'expired': 'expired'
    };
    const matchesTab = t.status === statusMap[activeTab];
    const currentRoute = `${t.route?.origin?.name} → ${t.route?.destination?.name}`;
    const matchesRoute = routeFilter === 'all' || currentRoute === routeFilter;
    const matchesSearch =
      t.passenger_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery);
    return matchesTab && matchesSearch && matchesRoute;
  });

  const handleAdminBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.route_id || !bookingForm.passenger_name || !bookingForm.phone || !bookingForm.seat_number) {
      alert("Fadlan buuxi dhammaan meelaha loo baahan yahay.");
      return;
    }

    if (occupiedSeatsForRoute.includes(bookingForm.seat_number)) {
      alert("Kursigan waa la qabsaday. Fadlan dooro kursi kale.");
      return;
    }

    setLoading(true);
    try {
      // 1. Generate Unique Ticket Code
      const ticketCode = `TKT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;

      // 2. Insert Ticket
      const { data: ticket, error: ticketErr } = await supabase
        .from('tickets')
        .insert([{
          route_id: bookingForm.route_id,
          passenger_name: bookingForm.passenger_name,
          phone: bookingForm.phone,
          seat_number: bookingForm.seat_number,
          price_paid: bookingForm.price_paid,
          status: 'confirmed',
          ticket_code: ticketCode,
          verification_method: 'admin_manual'
        }])
        .select()
        .single();

      if (ticketErr) throw ticketErr;

      // 3. Update Available Seats
      const selectedRoute = availableRoutes.find(r => r.id === bookingForm.route_id);
      if (selectedRoute) {
        await supabase
          .from('routes')
          .update({ available_seats: selectedRoute.available_seats - 1 })
          .eq('id', bookingForm.route_id);
      }

      // 4. Send SMS (fire-and-forget)
      const message = `SAFAARI: Boos-qabsigaaga waa la xaqiijiyey (Admin). Tikidh-kood: ${ticketCode}. Kursi: ${bookingForm.seat_number}. Mahadsanid!`;
      supabase.functions.invoke('send-sms', {
        body: { phone: bookingForm.phone, message, event: 'admin_booking' }
      }).catch(e => console.error('SMS Error:', e));

      setShowBookingModal(false);
      setBookingForm({ route_id: '', passenger_name: '', phone: '', seat_number: '', price_paid: 0, vehicle_type: 'Bus' });
      fetchTickets();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const SeatGrid = ({ routeId, vehicleType, selectedSeat, onSelect }) => {
    const isLandCruiser = vehicleType?.toLowerCase().includes('land') || vehicleType?.toLowerCase().includes('cruiser');
    
    // Front Row
    const frontSeats = isLandCruiser ? ['F1'] : ['F1', 'F2'];
    
    // Rows
    const rowCounts = isLandCruiser ? 3 : 3;
    const cols = ['A', 'B', 'C', 'D']; // D is missing on last row LC
    
    const renderSeat = (id) => {
      const isOccupied = occupiedSeatsForRoute.includes(id);
      const isSelected = selectedSeat === id;
      
      return (
        <button
          key={id}
          type="button"
          disabled={isOccupied}
          onClick={() => onSelect(id)}
          className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all ${
            isOccupied ? 'bg-slate-100 text-slate-300 cursor-not-allowed' :
            isSelected ? 'bg-blue-600 text-white shadow-lg scale-105' :
            'bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-400'
          }`}
        >
          <Armchair size={16} />
          <span className="text-[8px] font-bold">{id}</span>
        </button>
      );
    };

    return (
      <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-200 space-y-4">
        <div className="flex justify-between items-center mb-2 px-2">
            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center"><Bus size={18} className="text-slate-400" /></div>
            <div className="flex gap-2">
                {frontSeats.map(renderSeat)}
            </div>
        </div>
        <div className="h-0.5 bg-slate-200 w-full rounded-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(rowNum => (
             <div key={rowNum} className="flex justify-between">
                {cols.map(col => {
                    const id = `${rowNum}${col}`;
                    if (isLandCruiser && rowNum === 3 && col === 'D') return <div key={id} className="w-10 h-10" />;
                    return renderSeat(id);
                })}
             </div>
          ))}
        </div>
      </div>
    );
  };

  // 3. Grouping logic
  const groupedTickets = filteredTickets.reduce((groups, ticket) => {
    const routeName = `${ticket.route?.origin?.name || 'Unknown'} → ${ticket.route?.destination?.name || 'Unknown'}`;
    if (!groups[routeName]) groups[routeName] = [];
    groups[routeName].push(ticket);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-10 font-sans">
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row">
            {/* Left side: Form */}
            <div className="flex-1 p-8 lg:p-12 overflow-y-auto border-r border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase">Gooso Tikidh</h2>
                  <p className="text-slate-500 text-sm font-bold">Goosashada Tikidhada (Admin)</p>
                </div>
                <button onClick={() => setShowBookingModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAdminBooking} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Dooro Marinka</label>
                  <select
                    required
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                    value={bookingForm.route_id}
                    onChange={(e) => {
                      const route = availableRoutes.find(r => r.id === e.target.value);
                      setBookingForm({ 
                        ...bookingForm, 
                        route_id: e.target.value, 
                        price_paid: route?.price_ticket || 0,
                        vehicle_type: route?.vehicle_type || 'Bus'
                      });
                      fetchOccupiedSeats(e.target.value);
                    }}
                  >
                    <option value="">-- Dooro Bixitaanka --</option>
                    {availableRoutes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.origin?.name} → {r.destination?.name} ({new Date(r.departure_time).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Magaca Rakaabka</label>
                    <input
                      required
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"
                      placeholder="Magaca oo Buuxa"
                      value={bookingForm.passenger_name}
                      onChange={(e) => setBookingForm({ ...bookingForm, passenger_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Lambarka Taleefanka</label>
                    <input
                      required
                      type="tel"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"
                      placeholder="252..."
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Lambarka Kursiga</label>
                    <input
                      required
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"
                      placeholder="e.g. 1A"
                      value={bookingForm.seat_number}
                      onChange={(e) => setBookingForm({ ...bookingForm, seat_number: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Price Override ($)</label>
                    <input
                      required
                      type="number"
                      className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 outline-none focus:border-emerald-500 transition-all"
                      value={bookingForm.price_paid}
                      onChange={(e) => setBookingForm({ ...bookingForm, price_paid: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-blue-100"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />} 
                  Dhammeystir Goosashada (Admin)
                </button>
              </form>
            </div>

            {/* Right side: Visual Grid */}
            <div className="hidden md:flex flex-[0.7] bg-slate-50 p-8 flex-col items-center justify-center">
                <div className="mb-6 text-center">
                    <h3 className="font-black text-slate-900 uppercase">Dooro Kursi</h3>
                    <p className="text-[10px] font-bold text-slate-400">Naqshadda kursiga ee gaariga</p>
                </div>
                
                {bookingForm.route_id ? (
                    <SeatGrid 
                        routeId={bookingForm.route_id} 
                        vehicleType={bookingForm.vehicle_type}
                        selectedSeat={bookingForm.seat_number}
                        onSelect={(id) => setBookingForm({ ...bookingForm, seat_number: id })}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                        <Bus size={64} opacity={0.2} />
                        <p className="font-bold text-xs uppercase tracking-widest">Marka hore dooro marinka</p>
                    </div>
                )}

                <div className="mt-8 flex gap-4 text-[10px] font-bold uppercase">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-slate-200 rounded" /> Bannaan</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-200 rounded" /> Laga Buuxo</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded" /> La Doortay</div>
                </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Ilaaalinta Nidaamka</h1>
            <p className="text-slate-500 font-medium">Hubi lacagaha iyo maamulka bixitaanka.</p>
          </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowBookingModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                <Plus size={18} /> GOOSO TIKIDH CUSUB
              </button>
              {selectedTickets.length > 0 && (
                <button
                  onClick={deleteSelected}
                  className="flex items-center gap-2 bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-lg shadow-rose-200 animate-pulse"
                >
                  <Trash2 size={18} /> TIRTIR KUWA LA DOORTAY ({selectedTickets.length})
                </button>
              )}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Raadi..."
                className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl w-full md:w-64 shadow-sm outline-none font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ROUTE FILTER SCROLL */}
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setRouteFilter('all')}
            className={`px-5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${routeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'
              }`}
          >
            DHAMAAN MARINNADA
          </button>
          {uniqueRoutes.map(route => (
            <button
              key={route}
              onClick={() => setRouteFilter(route)}
              className={`px-5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${routeFilter === route ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                }`}
            >
              {route}
            </button>
          ))}
        </div>

        {/* TAB NAVIGATION */}
        <div className="mt-6 flex p-1.5 bg-slate-200/50 backdrop-blur-md rounded-2xl w-fit border border-slate-200 overflow-x-auto scollbar-hide max-w-full">
          {[
            { id: 'pending', label: 'Sugaya', icon: <AlertCircle size={16} /> },
            { id: 'confirmed', label: 'La Xaqiijiyay', icon: <CheckCircle2 size={16} /> },
            { id: 'expired', label: 'Dhacay', icon: <Clock size={16} /> },
            { id: 'cancelled', label: 'La Joojiyay', icon: <XCircle size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedTickets([]); }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* GROUPED LIST */}
      <div className="max-w-7xl mx-auto space-y-12">
        {Object.keys(groupedTickets).map((routeName) => (
          <div key={routeName} className="space-y-4">
            <div className="flex items-center gap-4 px-4">
              <div className="h-px flex-1 bg-slate-200"></div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Bus size={16} /> {routeName} ({groupedTickets[routeName].length})
              </h2>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {groupedTickets[routeName].map((t) => (
                <div key={t.id} className={`relative bg-white rounded-[2.5rem] p-2 shadow-sm border transition-all duration-300 flex flex-col md:flex-row overflow-hidden ${selectedTickets.includes(t.id) ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'}`}>

                  {/* SELECT CHECKBOX */}
                  <button
                    onClick={() => toggleSelect(t.id)}
                    className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm hover:text-blue-600"
                  >
                    {selectedTickets.includes(t.id) ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} className="text-slate-300" />}
                  </button>

                  <div className={`p-6 md:w-56 flex flex-col justify-center items-center text-center rounded-[2rem] ${activeTab === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                      activeTab === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                        activeTab === 'expired' ? 'bg-slate-100 text-slate-700' :
                          'bg-blue-50 text-blue-700'
                    }`}>
                    <CreditCard size={28} className="mb-3" />
                    <span className="text-[10px] font-black uppercase opacity-60">Taleefanka Lacag-bixinta</span>
                    <p className="text-lg font-black">{t.payment_phone || 'N/A'}</p>
                  </div>

                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-black text-slate-900">{t.passenger_name}</h3>
                        <p className="text-sm font-bold text-slate-500">{t.phone}</p>
                      </div>
                      <p className="text-2xl font-black text-slate-900">${t.price_paid}</p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl mb-4 text-xs font-bold text-slate-600">
                      <Hash size={14} className="text-blue-500" /> Kursiga: <span className="text-blue-600">{t.seat_number}</span>
                    </div>

                    <div className="flex gap-2">
                      {activeTab === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(t.id, 'confirmed', t)} className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-bold text-[10px] hover:bg-blue-600 transition-colors uppercase">Hubi & Xaqiiji</button>
                          <button onClick={() => updateStatus(t.id, 'cancelled')} className="flex-1 border border-slate-200 text-rose-500 py-3 rounded-xl font-bold text-[10px] uppercase">Diid</button>
                        </>
                      )}
                      {(activeTab === 'confirmed' || activeTab === 'cancelled' || activeTab === 'expired') && (
                        <button onClick={() => deleteTicket(t.id)} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all">
                          <Trash2 size={14} /> TIRTIR XOGTA
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groupedTickets).length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-slate-400 font-bold">Wax tikidh ah looma helin doorashadan.</p>
        </div>
      )}
    </div>
  );
}