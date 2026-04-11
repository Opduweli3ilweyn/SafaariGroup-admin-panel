import {
  BarChart3, Box,
  CheckCircle2,
  DollarSign,
  Download,
  FileDown, Layers,
  MapPin,
  Package,
  Search,
  Ticket,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { exportData, generateUnifiedMasterReport } from '../lib/exportUtils';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';

export default function DashboardHome() {
  const { user: currentUser } = useUser();
  const [activeTable, setActiveTable] = useState('profiles');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [stats, setStats] = useState({
    totalRev: 0, 
    dailyRev: 0, 
    weeklyRev: 0, 
    monthlyRev: 0,
    ticketSales: 0, 
    cargoSales: 0,
    userCount: 0, 
    cargoCount: 0, 
    ticketCount: 0,
    branchCount: 0, 
    activeRoutes: 0
  });

  const [rawTickets, setRawTickets] = useState([]);
  const [rawCargo, setRawCargo] = useState([]);

  const coreTables = ['profiles', 'cargo_shipments', 'tickets', 'locations', 'routes'];

  useEffect(() => { 
    fetchGlobalInsights(); 
    
    // Real-time stats subscription
    const channel = supabase
      .channel('dashboard-stats-real-time')
      .on('postgres_changes', { event: '*', table: 'tickets' }, () => fetchGlobalInsights())
      .on('postgres_changes', { event: '*', table: 'cargo_shipments' }, () => fetchGlobalInsights())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);
  useEffect(() => { fetchTableData(); }, [activeTable]);

  async function fetchGlobalInsights() {
    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      
      const startOfMonth = new Date(now);
      startOfMonth.setDate(now.getDate() - 30);

      // 1. Fetch relevant tickets and cargo with origin/destination names for the master report
      let ticketQuery = supabase.from('tickets').select('*, origin:locations!origin_id(name), destination:locations!destination_id(name)').in('status', ['confirmed', 'pending_verification']);
      let cargoQuery = supabase.from('cargo_shipments').select('*, origin:locations!origin_id(name), destination:locations!destination_id(name)').in('status', ['confirmed', 'pending_verification']);

      // 1b. Apply Branch Isolation if not a Global Manager
      if (currentUser?.branch_id) {
        ticketQuery = ticketQuery.or(`origin_id.eq.${currentUser.branch_id},destination_id.eq.${currentUser.branch_id}`);
        cargoQuery = cargoQuery.or(`origin_id.eq.${currentUser.branch_id},destination_id.eq.${currentUser.branch_id}`);
      }

      const [
        { data: tickets },
        { data: cargo },
        { count: userCount },
        { count: branchCount },
        { count: routeCount }
      ] = await Promise.all([
        ticketQuery,
        cargoQuery,
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('locations').select('*', { count: 'exact', head: true }),
        supabase.from('routes').select('*', { count: 'exact', head: true })
      ]);

      setRawTickets(tickets || []);
      setRawCargo(cargo || []);

      // 2. Sum revenue logic
      const calculateRev = (list, dateFilter = null) => {
        let filtered = list?.filter(item => item.status === 'confirmed') || [];
        if (dateFilter) {
          filtered = filtered.filter(item => new Date(item.created_at) >= dateFilter);
        }
        return filtered.reduce((a, b) => a + Number(b.price_paid || b.price_total || 0), 0);
      };

      const tRevTotal = calculateRev(tickets);
      const cRevTotal = calculateRev(cargo);
      
      const dailyRev = calculateRev(tickets, startOfToday) + calculateRev(cargo, startOfToday);
      const weeklyRev = calculateRev(tickets, startOfWeek) + calculateRev(cargo, startOfWeek);
      const monthlyRev = calculateRev(tickets, startOfMonth) + calculateRev(cargo, startOfMonth);

      setStats({
        totalRev: tRevTotal + cRevTotal,
        dailyRev,
        weeklyRev,
        monthlyRev,
        ticketSales: tRevTotal,
        cargoSales: cRevTotal,
        userCount: userCount || 0,
        cargoCount: cargo?.length || 0,
        ticketCount: tickets?.length || 0,
        branchCount: branchCount || 0,
        activeRoutes: routeCount || 0
      });
    } catch (error) {
      console.error("Sync error:", error);
    }
  }

  async function fetchTableData() {
    setLoading(true);
    try {
      const { data: tableData, error } = await supabase
        .from(activeTable)
        .select('*')
        .limit(100); // Standard safety limit for preview

      if (!error) setData(tableData || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  const handleDownloadAll = async () => {
    for (const table of coreTables) {
      const { data } = await supabase.from(table).select('*');
      if (data) exportData(data, `SafaariGroup_${table}_Full`, exportFormat);
    }
    setIsExportModalOpen(false);
  };

  const filteredData = data.filter(item =>
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-10 space-y-12 bg-gray-50 min-h-screen">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Safaari Admin</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">
            {currentUser?.branch ? `${currentUser.branch.name} Office / Xarunta ${currentUser.branch.name}` : 'Global Overview / Maamulka Guud'}
          </p>
        </div>
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-gray-200"
        >
          <Layers size={18} /> La Degida Xogta (Export)
        </button>
      </div>

      {/* FINANCIAL INSIGHTS SECTION */}
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Warbixinta Maaliyadda</h2>
          <button 
            onClick={() => generateUnifiedMasterReport(rawTickets, rawCargo)}
            className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
          >
            <Download size={14} /> Soo Deji Doc Master (Maanta)
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <IncomeCard
            label="Dakhliga Guud ee Shirkada"
            value={`$${stats.totalRev.toLocaleString()}`}
            type="GLOBAL"
            detail={`${stats.ticketCount + stats.cargoCount} Isugeynta Dhaqdhaqaaqa`}
          />
          <IncomeCard
            label="Dakhliga Iibka Tikidhada"
            value={`$${stats.ticketSales.toLocaleString()}`}
            type="TICKETS"
            detail={`${stats.ticketCount} Kuraas La Iibiyay`}
          />
          <IncomeCard
            label="Dakhliga Xamuulka"
            value={`$${stats.cargoSales.toLocaleString()}`}
            type="CARGO"
            detail={`${stats.cargoCount} Xamuul La Diray`}
          />
        </div>
      </div>

      {/* TIME-BASED STATS SECTION */}
      <div className="bg-gray-900 p-10 rounded-[48px] shadow-2xl space-y-8 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-blue-400 font-black uppercase text-[10px] tracking-widest mb-6">Madaxtooyada Maaliyadda (Performance)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <p className="text-gray-500 font-black uppercase text-[10px] mb-2 tracking-widest">Maanta (Daily - from Midnight)</p>
              <h4 className="text-5xl font-black text-white tracking-tighter">${stats.dailyRev.toLocaleString()}</h4>
              <p className="text-emerald-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Wadarta dakhliga Maanta</p>
            </div>
            <div className="border-l border-gray-800 pl-12">
              <p className="text-gray-500 font-black uppercase text-[10px] mb-2 tracking-widest">Toddobaadkan (Weekly)</p>
              <h4 className="text-5xl font-black text-white tracking-tighter">${stats.weeklyRev.toLocaleString()}</h4>
              <p className="text-blue-400 text-[10px] font-bold mt-2 uppercase tracking-widest">7-bari ee u dambaysay</p>
            </div>
            <div className="border-l border-gray-800 pl-12">
              <p className="text-gray-500 font-black uppercase text-[10px] mb-2 tracking-widest">Bishan (Monthly)</p>
              <h4 className="text-5xl font-black text-white tracking-tighter">${stats.monthlyRev.toLocaleString()}</h4>
              <p className="text-indigo-400 text-[10px] font-bold mt-2 uppercase tracking-widest">30-bari ee u dambaysay</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-5">
           <BarChart3 size={300} className="text-white" />
        </div>
      </div>

      {/* MINI STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <MiniStat label="Rakaabka Safarka ah" value={stats.userCount} icon={<Users />} />
        <MiniStat label="Xarumaha & Xafiisyada" value={stats.branchCount} icon={<MapPin />} />
        <MiniStat label="Marinnada Isku-xirka" value={stats.activeRoutes} icon={<BarChart3 />} />
        <MiniStat label="Tikidhada Goosman" value={stats.ticketCount} icon={<Ticket />} />
      </div>

      {/* DATABASE EXPLORER */}
      <div className="bg-white rounded-[48px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="p-10 bg-gray-900 text-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Box className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Xog-baaraha Nidaamka</h2>
              <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mt-1">Geliitaanka Tooska ah ee Shaxda: {activeTable}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Raadi xogta shaxda..."
                className="bg-gray-800 text-white pl-12 pr-6 py-4 rounded-2xl border-none w-full focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => exportData(data, activeTable, 'csv')}
              className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-black/20 shrink-0"
            >
              <FileDown size={18} /> Soo Deji CSV
            </button>
          </div>
        </div>

        <div className="flex gap-3 p-6 bg-gray-50 border-b border-gray-100 overflow-x-auto no-scrollbar">
          {coreTables.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTable(tab); setSearchTerm(''); }}
              className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap min-w-[140px] ${activeTable === tab ? 'bg-white shadow-xl shadow-blue-500/10 text-blue-600 border border-blue-50' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-10 py-6">Xogta Aqoonsiga Gaarka Ah</th>
                <th className="px-10 py-6">Isku-xiraha Dhaqdhaqaaqa</th>
                <th className="px-10 py-6 text-right">La Deg Deg Deg Ah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((item, idx) => (
                <tr key={idx} className="hover:bg-blue-50/20 transition-all border-l-4 border-l-transparent hover:border-l-blue-600">
                  <td className="px-10 py-6">
                    <span className="font-mono text-gray-400 text-[10px] bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">{item.id}</span>
                  </td>
                  <td className="px-10 py-6">
                    <p className="font-bold text-gray-800 text-lg uppercase tracking-tight">{item.full_name || item.sender_name || item.passenger_name || item.name || 'Soo-geliye Aan La Aqoon'}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1 opacity-70">
                      {item.email || item.phone || item.tracking_number || item.ticket_code || 'Ma Jiro Xiriir Koowaad'}
                    </p>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button
                      onClick={() => exportData([item], `Row_${activeTable}_${idx}`, 'json')}
                      className="p-3 text-blue-600 hover:bg-white hover:shadow-lg rounded-2xl transition-all border border-transparent hover:border-blue-50"
                    >
                      <Download size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-32 text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-gray-400 uppercase text-[10px] tracking-widest animate-pulse">La Xiriiraya Xogta Guud...</p>
          </div>}
          {!loading && filteredData.length === 0 && (
            <div className="p-32 text-center">
              <p className="font-black text-gray-300 uppercase text-xs tracking-widest">Wax xog ah lagama helin shaxdan {activeTable}</p>
            </div>
          )}
        </div>
      </div>

      {/* EXPORT MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl scale-in">
            <div className="p-10 bg-gray-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Global Export</h2>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Export Multi-table Package</p>
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Format</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all ${exportFormat === 'csv' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-gray-100 text-gray-400'}`}
                  >
                    <CheckCircle2 size={18} className={exportFormat === 'csv' ? 'opacity-100' : 'opacity-0'} /> CSV (Excel)
                  </button>
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all ${exportFormat === 'json' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-gray-100 text-gray-400'}`}
                  >
                    <CheckCircle2 size={18} className={exportFormat === 'json' ? 'opacity-100' : 'opacity-0'} /> JSON
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Tables</p>
                <div className="grid grid-cols-2 gap-3">
                  {coreTables.map(t => (
                    <div key={t} className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{t.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDownloadAll}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/20 transition-all flex items-center justify-center gap-4"
              >
                <Download size={24} /> Download Whole Data Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IncomeCard({ label, value, type, detail }) {
  const getSubColor = () => {
    if (type === 'GLOBAL') return 'bg-blue-700';
    if (type === 'TICKETS') return 'bg-indigo-700';
    return 'bg-orange-700';
  };

  const getMainColor = () => {
    if (type === 'GLOBAL') return 'bg-blue-600 shadow-blue-500/20';
    if (type === 'TICKETS') return 'bg-indigo-600 shadow-indigo-500/20';
    return 'bg-orange-600 shadow-orange-500/20';
  };

  return (
    <div className={`${getMainColor()} p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group`}>
      <div className="relative z-10">
        <div className={`w-14 h-14 ${getSubColor()} rounded-3xl flex items-center justify-center mb-8 border border-white/10`}>
          <DollarSign size={28} />
        </div>
        <p className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em]">{label}</p>
        <h3 className="text-5xl font-black tracking-tighter mt-2">{value}</h3>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-6 opacity-60 flex items-center gap-2">
          <CheckCircle2 size={12} /> {detail}
        </p>
      </div>
      <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
        {type === 'TICKETS' ? <Ticket size={200} /> : type === 'CARGO' ? <Package size={200} /> : <TrendingUp size={200} />}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-gray-100 flex items-center gap-6 shadow-xl shadow-gray-100/50 hover:shadow-2xl transition-all">
      <div className="bg-gray-50 w-16 h-16 rounded-3xl flex items-center justify-center text-gray-400 border border-gray-100">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-black text-gray-900 tracking-tighter">{value}</p>
      </div>
    </div>
  );
}
