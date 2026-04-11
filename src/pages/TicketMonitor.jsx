import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import {
  User, Phone, CreditCard, Bus,
  Clock, CheckCircle2, XCircle,
  Loader2, Search, Trash2, Hash, MapPin,
  ArrowRightLeft, AlertCircle, Filter, CheckSquare, Square,
  Plus, X, ChevronRight, Armchair
} from 'lucide-react';

export default function TicketMonitor() {
  const { user: currentUser } = useUser();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [routeFilter, setRouteFilter] = useState('all');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [locations, setLocations] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    origin_id: '',
    destination_id: '',
    passenger_name: '',
    phone: '252',
    price_paid: '',
    status: 'confirmed'
  });

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
      fetchLocations();
    }
    const channel = supabase
      .channel('db-tickets')
      .on('postgres_changes', { event: '*', table: 'tickets' }, () => {
        if (currentUser) fetchTickets();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentUser]);

  async function fetchLocations() {
    const { data } = await supabase.from('locations').select('*').order('name');
    setLocations(data || []);
  }


  async function fetchTickets() {
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          route:routes(
            departure_time,
            origin:locations!origin_id(name),
            destination:locations!destination_id(name)
          ),
          origin:locations!origin_id(name),
          destination:locations!destination_id(name)
        `)
        .order('id', { ascending: false });

      if (currentUser?.branch_id) {
        // Strict Isolation: Only show what this branch booked (ORIGIN)
        query = query.eq('origin_id', currentUser.branch_id);
      }

      const { data, error } = await query;

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

  const deleteTicket = async (ticket) => {
    if (!window.confirm("Ma tirtiraysaa tikidkan?")) return;
    
    setLoading(true);
    try {
      // 1. Delete the ticket
      const { error } = await supabase.from('tickets').delete().eq('id', ticket.id);
      if (error) throw error;

      // 2. Restore seat count if it was a booking that occupied a seat
      if (['confirmed', 'pending_verification'].includes(ticket.status)) {
        const { data: route } = await supabase.from('routes').select('available_seats, total_seats').eq('id', ticket.route_id).single();
        if (route && route.available_seats < route.total_seats) {
          await supabase.from('routes').update({ available_seats: route.available_seats + 1 }).eq('id', ticket.route_id);
        }
      }

      setSelectedTickets(prev => prev.filter(tid => tid !== ticket.id));
      fetchTickets();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Ma tirtiraysaa ${selectedTickets.length} tikidhada aad dooratay?`)) return;
    setLoading(true);
    try {
      // Find the count to restore for each route affected
      const ticketsToDelete = tickets.filter(t => selectedTickets.includes(t.id));
      
      // Delete tickets
      await supabase.from('tickets').delete().in('id', selectedTickets);
      
      // Restore seats for confirmed/pending tickets
      for (const t of ticketsToDelete) {
        if (['confirmed', 'pending_verification'].includes(t.status)) {
          const { data: route } = await supabase.from('routes').select('available_seats, total_seats').eq('id', t.route_id).single();
          if (route && route.available_seats < route.total_seats) {
            await supabase.from('routes').update({ available_seats: route.available_seats + 1 }).eq('id', t.route_id);
          }
        }
      }

      setSelectedTickets([]);
      fetchTickets();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
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
    const currentRoute = `${t.origin?.name || 'Unknown'} → ${t.destination?.name || 'Unknown'}`;
    const matchesRoute = routeFilter === 'all' || currentRoute === routeFilter;
    const matchesSearch =
      t.passenger_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery);

    return matchesTab && matchesSearch && matchesRoute;
  });

  const handleAdminBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.origin_id || !bookingForm.destination_id || !bookingForm.passenger_name || !bookingForm.phone || !bookingForm.price_paid) {
      alert("Fadlan buuxi dhammaan meelaha loo baahan yahay.");
      return;
    }

    setLoading(true);
    try {
      const ticketCode = `TK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const payload = {
        ...bookingForm,
        ticket_code: ticketCode,
        branch_id: currentUser?.branch_id || bookingForm.origin_id
      };

      const { error } = await supabase.from('tickets').insert([payload]);

      if (error) throw error;

      // Auto-create active trip for tracking (no duplicates per day)
      if (bookingForm.origin_id && bookingForm.destination_id) {
        await supabase.from('active_trips').upsert({
          origin_id: bookingForm.origin_id,
          destination_id: bookingForm.destination_id,
          trip_date: new Date().toISOString().split('T')[0],
          status: 'in_transit'
        }, { onConflict: 'origin_id,destination_id,trip_date', ignoreDuplicates: true });
      }

      // Send SMS notification
      const originName = locations.find(l => l.id === bookingForm.origin_id)?.name || '...';
      const destName = locations.find(l => l.id === bookingForm.destination_id)?.name || '...';
      const smsMessage = `Macmiil Safarkaagii ${originName} Ilaa ${destName} waa la xaqiijiyey. Tikidh-koodkaagu waa : ${ticketCode}. Mahadsanid!`;

      try {
        const { data: smsData, error: smsErr } = await supabase.functions.invoke('send-sms', {
          body: {
            phone: bookingForm.phone,
            message: smsMessage,
            event: 'ticket_booking'
          }
        });
        if (smsErr) throw smsErr;
        if (smsData && smsData.success === false) throw new Error(smsData.error || smsData.gateway_response || 'Qalad aan la garanayn');
      } catch (smsErr) {
        alert("Fariinta SMS-ka lama dirin: " + (smsErr.message || JSON.stringify(smsErr)));
        console.error("SMS Error:", smsErr);
      }

      setShowBookingModal(false);
      setBookingForm({
        origin_id: '',
        destination_id: '',
        passenger_name: '',
        phone: '252',
        price_paid: '',
        status: 'confirmed'
      });
      fetchTickets();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedTickets = filteredTickets.reduce((groups, ticket) => {
    const routeName = `${ticket.origin?.name || 'Unknown'} → ${ticket.destination?.name || 'Unknown'}`;
    if (!groups[routeName]) groups[routeName] = [];
    groups[routeName].push(ticket);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-10 font-sans">
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase">Gooso Tikidh</h2>
              <button onClick={() => setShowBookingModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleAdminBooking} className="space-y-4">
              <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" onChange={(e) => setBookingForm({...bookingForm, origin_id: e.target.value})}>
                <option value="">Dooro Magaalada Bixitaanka</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" onChange={(e) => setBookingForm({...bookingForm, destination_id: e.target.value})}>
                <option value="">Dooro Magaalada Socodka</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <div className="space-y-4">
                <input type="text" placeholder="Magaca Rakaabka" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-gray-800" value={bookingForm.passenger_name} onChange={e => setBookingForm({ ...bookingForm, passenger_name: e.target.value })} required />
                
                <div className="relative">
                   <span className="absolute left-4 top-4 font-black text-gray-400">+</span>
                   <input type="tel" placeholder="Numbarka" className="w-full pl-8 p-4 bg-gray-50 rounded-2xl outline-none font-bold text-gray-800" value={bookingForm.phone} onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })} required />
                </div>

                <input type="number" placeholder="Qiimaha ($)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-gray-800" value={bookingForm.price_paid} onChange={e => setBookingForm({ ...bookingForm, price_paid: e.target.value })} required />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase disabled:opacity-50">
                {loading ? 'Fadlan sug...' : 'Dhammeystir'}
              </button>
            </form>
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
            {selectedTickets.length > 0 && (
              <button onClick={deleteSelected} className="flex items-center gap-2 bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-lg shadow-rose-200 animate-pulse">
                <Trash2 size={18} /> TIRTIR ({selectedTickets.length})
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-8 mt-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Raadi magaca ama taleefanka..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 font-bold"
          >
            <Plus size={20} /> Ballanso Tikidh Cusub
          </button>
        </div>

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
                      <MapPin size={14} className="text-blue-500" /> Marinka: <span className="text-blue-600">Direct Booking</span>
                    </div>

                    <div className="flex gap-2">
                      {activeTab === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(t.id, 'confirmed', t)} className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-bold text-[10px] hover:bg-blue-600 transition-colors uppercase">Hubi & Xaqiiji</button>
                          <button onClick={() => deleteTicket(t)} className="flex-1 border border-slate-200 text-rose-500 py-3 rounded-xl font-bold text-[10px] uppercase hover:bg-rose-50 transition-all">Diid (Tirtir)</button>
                        </>
                      )}
                      {(activeTab === 'confirmed' || activeTab === 'cancelled' || activeTab === 'expired') && (
                        <button onClick={() => deleteTicket(t)} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all">
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