import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, CreditCard, Bus, 
  Clock, CheckCircle2, XCircle, 
  Loader2, Search, Trash2, Hash,
  ArrowRightLeft, AlertCircle, Filter, CheckSquare, Square
} from 'lucide-react';

export default function TicketMonitor() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [routeFilter, setRouteFilter] = useState('all');

  useEffect(() => {
    fetchTickets();
    const channel = supabase
      .channel('db-tickets')
      .on('postgres_changes', { event: '*', table: 'tickets' }, () => fetchTickets())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

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

  const updateStatus = async (id, newStatus) => {
    setActionLoading(id);
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', id);
    if (error) alert(error.message);
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
  ))).filter(r => r !== "undefined → undefined");

  // 2. Filter logic
  const filteredTickets = tickets.filter(t => {
    const statusMap = { 'pending': 'awaiting_confirmation', 'confirmed': 'confirmed', 'cancelled': 'cancelled' };
    const matchesTab = t.status === statusMap[activeTab];
    const currentRoute = `${t.route?.origin?.name} → ${t.route?.destination?.name}`;
    const matchesRoute = routeFilter === 'all' || currentRoute === routeFilter;
    const matchesSearch = 
      t.passenger_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.phone.includes(searchQuery);
    return matchesTab && matchesSearch && matchesRoute;
  });

  // 3. Grouping logic
  const groupedTickets = filteredTickets.reduce((groups, ticket) => {
    const routeName = `${ticket.route?.origin?.name || 'Unknown'} → ${ticket.route?.destination?.name || 'Unknown'}`;
    if (!groups[routeName]) groups[routeName] = [];
    groups[routeName].push(ticket);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">System Monitor</h1>
            <p className="text-slate-500 font-medium">Verify payments and manage departures.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {selectedTickets.length > 0 && (
              <button 
                onClick={deleteSelected}
                className="flex items-center gap-2 bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-lg shadow-rose-200 animate-pulse"
              >
                <Trash2 size={18}/> DELETE SELECTED ({selectedTickets.length})
              </button>
            )}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search..." 
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
            className={`px-5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              routeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            ALL ROUTES
          </button>
          {uniqueRoutes.map(route => (
            <button
              key={route}
              onClick={() => setRouteFilter(route)}
              className={`px-5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                routeFilter === route ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {route}
            </button>
          ))}
        </div>

        {/* TAB NAVIGATION */}
        <div className="mt-6 flex p-1.5 bg-slate-200/50 backdrop-blur-md rounded-2xl w-fit border border-slate-200">
          {[
            { id: 'pending', label: 'Pending', icon: <AlertCircle size={16}/> },
            { id: 'confirmed', label: 'Confirmed', icon: <CheckCircle2 size={16}/> },
            { id: 'cancelled', label: 'Cancelled', icon: <XCircle size={16}/> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedTickets([]); }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'
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
                 <Bus size={16}/> {routeName} ({groupedTickets[routeName].length})
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
                    {selectedTickets.includes(t.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} className="text-slate-300"/>}
                  </button>

                  <div className={`p-6 md:w-56 flex flex-col justify-center items-center text-center rounded-[2rem] ${
                    activeTab === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 
                    activeTab === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    <CreditCard size={28} className="mb-3" />
                    <span className="text-[10px] font-black uppercase opacity-60">Payment Phone</span>
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
                      <Hash size={14} className="text-blue-500"/> Seat: <span className="text-blue-600">{t.seat_number}</span>
                    </div>

                    <div className="flex gap-2">
                      {activeTab === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(t.id, 'confirmed')} className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-bold text-[10px] hover:bg-blue-600 transition-colors">VERIFY</button>
                          <button onClick={() => updateStatus(t.id, 'cancelled')} className="flex-1 border border-slate-200 text-rose-500 py-3 rounded-xl font-bold text-[10px]">REJECT</button>
                        </>
                      )}
                      {(activeTab === 'confirmed' || activeTab === 'cancelled') && (
                        <button onClick={() => deleteTicket(t.id)} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all">
                          <Trash2 size={14}/> DELETE RECORD
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
          <p className="text-slate-400 font-bold">No tickets found for this filter.</p>
        </div>
      )}
    </div>
  );
}