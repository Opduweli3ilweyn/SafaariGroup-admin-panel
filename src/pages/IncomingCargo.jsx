import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { 
  Package, MapPin, User, Phone, 
  ArrowRight, Info, Search, 
  Map as MapIcon, Calendar, Hash,
  Truck, CheckCircle, Clock, X,
  ArrowDownCircle, MapPinned
} from 'lucide-react';

export default function IncomingCargo() {
  const { user: currentUser } = useUser();
  const [cargo, setCargo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, paid, pending

  useEffect(() => {
    if (currentUser) {
      fetchIncomingCargo();
    }
  }, [currentUser]);

  async function fetchIncomingCargo() {
    setLoading(true);
    try {
      let query = supabase
        .from('cargo_shipments')
        .select(`
          *,
          origin:locations!origin_id(name),
          destination:locations!destination_id(name),
          category:cargo_categories(name, unit_type)
        `)
        .order('created_at', { ascending: false });

      if (currentUser?.branch_id) {
        // Only show items destined FOR this branch
        query = query.eq('destination_id', currentUser.branch_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCargo(data || []);
    } catch (err) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredCargo = cargo.filter(item => {
    const matchesSearch = item.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.receiver_name?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesPayment = true;
    const itemStatus = item.payment_status || 'paid'; // Treat old as 'paid'
    if (paymentFilter === 'paid') matchesPayment = itemStatus === 'paid';
    if (paymentFilter === 'pending') matchesPayment = itemStatus === 'pending';

    return matchesSearch && matchesPayment;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-10 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <ArrowDownCircle className="text-blue-600" size={40} />
            Soo Socda <span className="text-blue-600">/ Incoming</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-2 px-1">
            Manifest-ka Xamuulka kuso socda xafiiskaaga
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Raadi Koodka ama Magaca..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[2rem] outline-none shadow-sm focus:ring-4 focus:ring-blue-100 transition-all font-bold"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* PAYMENT TABS (GREEN/RED SEPARATION) */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button 
          onClick={() => setPaymentFilter('all')}
          className={`px-6 py-3 rounded-2xl font-black transition-all border-2 ${paymentFilter === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-transparent text-slate-400 hover:bg-slate-50'}`}
        >
          DHAMAAN (ALL)
        </button>
        <button 
          onClick={() => setPaymentFilter('paid')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all border-2 ${paymentFilter === 'paid' ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white border-transparent text-green-600/50 hover:bg-green-50'}`}
        >
          <div className={`w-2 h-2 rounded-full ${paymentFilter === 'paid' ? 'bg-white' : 'bg-green-500'}`} />
          HADDA LA BIXIYEY (PRE-PAID)
        </button>
        <button 
          onClick={() => setPaymentFilter('pending')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all border-2 ${paymentFilter === 'pending' ? 'bg-red-600 border-red-600 text-white shadow-red-200 shadow-xl' : 'bg-white border-transparent text-red-600/50 hover:bg-red-50'}`}
        >
          <div className={`w-2 h-2 rounded-full ${paymentFilter === 'pending' ? 'bg-white animate-pulse' : 'bg-red-500'}`} />
          LACAGTA LA QABANAYO (COLLECT)
        </button>
      </div>

      {/* MANIFEST LIST */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-20 text-center animate-pulse">
            <Package size={48} className="mx-auto text-slate-200 mb-4 animate-bounce" />
            <p className="text-slate-300 font-black uppercase tracking-widest">Soo xaraynta Manifest-ka...</p>
          </div>
        ) : filteredCargo.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-100">
            <MapPinned size={64} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-black text-slate-400 uppercase">Ma jiraan xamuul kugu soo socda</h3>
            <p className="text-slate-300 font-bold mt-2">Marka xafiisyada kale xamuul kuu soo diraan, halkan ayey kasoo muuqanayaan.</p>
          </div>
        ) : (
          filteredCargo.map((item) => {
            const isPaid = (item.payment_status || 'paid') === 'paid';
            return (
            <button 
              key={item.id} 
              onClick={() => setSelectedItem(item)}
              className={`group bg-white p-6 rounded-[2.5rem] border-2 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all text-left ${isPaid ? 'border-green-100 hover:border-green-300' : 'border-red-100 hover:border-red-300 shadow-sm shadow-red-50/50'}`}
            >
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className={`p-5 rounded-[24px] transition-all ${isPaid ? 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white' : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'}`}>
                  <Package size={32} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">Manifest ID</p>
                  <h3 className="font-black text-xl text-slate-900 tracking-tight">{item.tracking_number}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${isPaid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600 animate-pulse'}`}>
                      Ka yimid: {item.origin?.name}
                    </span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className="text-sm font-bold text-slate-500">{item.sender_name}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Heleha Macmiilka</p>
                  <p className="font-black text-slate-800">{item.receiver_name}</p>
                  <p className="text-xs font-bold text-slate-400">{item.receiver_phone}</p>
                </div>
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>

      {/* MANIFEST DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all z-10"
            >
              <X size={24} />
            </button>

            <div className="p-10">
              {/* MODAL HEADER */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-600 rounded-[20px] flex items-center justify-center text-white">
                  <Hash size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedItem.tracking_number}</h2>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Detailed Shipment Manifest</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* LEFT COLUMN: VISUAL ROUTE & STATUS */}
                <div className="space-y-8">
                  {/* VISUAL ROUTE MAP (SVG/CSS) */}
                  <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-[60px] rounded-full" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-10">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-3">
                            <MapPin size={24} className="text-blue-400" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Origin</p>
                          <p className="font-black text-lg">{selectedItem.origin?.name}</p>
                        </div>

                        <div className="flex-1 px-4 relative">
                          <div className="h-[2px] w-full bg-slate-800 relative">
                             <div className="absolute top-[-10px] left-0 animate-infinite-slide">
                                <Truck size={20} className="text-blue-500" />
                             </div>
                             <div className="absolute inset-0 bg-blue-500/30 blur-sm" />
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-3">
                            <ArrowDownCircle size={24} className="text-white" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Destination</p>
                          <p className="font-black text-lg">{selectedItem.destination?.name}</p>
                        </div>
                      </div>

                      <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <Clock size={16} className="text-slate-400" />
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Travel Time</p>
                         </div>
                         <p className="text-xs font-black text-blue-400">IN TRANSIT</p>
                      </div>
                    </div>
                  </div>

                  {/* STATUS TIMELINE */}
                  <div className="bg-slate-50 rounded-[2.5rem] p-8">
                    <h4 className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-6">Shipment Timeline</h4>
                    <div className="space-y-8">
                      <TimelineItem icon={CheckCircle} color="text-green-500" title="Registered" date={new Date(selectedItem.created_at).toLocaleString()} active />
                      <TimelineItem icon={Truck} color="text-blue-500" title="Sent from Origin" date="Package processed at hub" active />
                      <TimelineItem icon={Clock} color="text-slate-300" title="Arriving" date="Pending arrival at your branch" />
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: CONTACTS & SPECS */}
                <div className="space-y-6">
                  {/* SENDER BOX */}
                  <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={16} /></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Soo Dire (Sender)</p>
                    </div>
                    <p className="font-black text-xl text-slate-900">{selectedItem.sender_name}</p>
                    <div className="flex items-center gap-2 mt-2 text-slate-500 font-bold">
                       <Phone size={14} /> {selectedItem.sender_phone}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 italic">{selectedItem.sender_address || 'Ciwaanka lama dhex dhigin'}</p>
                  </div>

                  {/* RECEIVER BOX */}
                  <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-slate-900 text-white rounded-lg"><User size={16} /></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hele (Receiver)</p>
                    </div>
                    <p className="font-black text-xl text-slate-900">{selectedItem.receiver_name}</p>
                    <div className="flex items-center gap-2 mt-2 text-slate-500 font-bold">
                       <Phone size={14} /> {selectedItem.receiver_phone}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 italic">{selectedItem.receiver_address || 'Ciwaanka lama dhex dhigin'}</p>
                  </div>

                  {/* CARGO SPECS */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-6 rounded-[2rem]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</p>
                      <p className="font-black text-lg text-slate-800">{selectedItem.category?.name || 'General'}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-[2rem]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weight</p>
                      <p className="font-black text-lg text-slate-800">{selectedItem.weight_kg} {selectedItem.category?.unit_type || 'Kg'}</p>
                    </div>
                  </div>

                  <div className="bg-blue-600 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-xl shadow-blue-500/20 px-8">
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Price Total / Lacagta</p>
                       <p className="text-2xl font-black">${selectedItem.price_total || 0}</p>
                       <div className="flex items-center gap-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${selectedItem.payment_status === 'paid' ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            {selectedItem.payment_status === 'paid' ? 'GUDOONSADAY' : 'LAMA BIXIN BIL-LACAG'}
                          </p>
                       </div>
                     </div>
                     <div className="flex flex-col items-end gap-2">
                        {selectedItem.payment_type === 'pay_at_destination' && selectedItem.payment_status === 'pending' && (
                           <button 
                             onClick={async () => {
                               if (window.confirm("Ma xaqiijinaysaa in lacagta la bixiyey?")) {
                                 const { error } = await supabase.from('cargo_shipments').update({ payment_status: 'paid' }).eq('id', selectedItem.id);
                                 if (!error) {
                                   setSelectedItem({ ...selectedItem, payment_status: 'paid' });
                                   fetchIncomingCargo();
                                 }
                               }
                             }}
                             className="bg-white text-blue-600 px-4 py-2 rounded-xl font-black text-xs hover:bg-blue-50 transition-all shadow-md"
                           >
                             CALAAMADEE 'LA BIXIYEY'
                           </button>
                        )}
                        <CheckCircle size={32} className={selectedItem.payment_status === 'paid' ? 'opacity-100' : 'opacity-20'} />
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes infinite-slide {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        .animate-infinite-slide {
          animation: infinite-slide 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

function TimelineItem({ icon: Icon, color, title, date, active = false }) {
  return (
    <div className="flex gap-4 relative">
      <div className={`p-3 rounded-xl bg-white shadow-sm z-10 ${active ? color : 'text-slate-200'}`}>
        <Icon size={18} />
      </div>
      <div>
        <h5 className={`text-sm font-black ${active ? 'text-slate-900' : 'text-slate-300'}`}>{title}</h5>
        <p className="text-xs font-bold text-slate-400">{date}</p>
      </div>
    </div>
  );
}

function ChevronRight({ size }) {
  return <ArrowRight size={size} />;
}
