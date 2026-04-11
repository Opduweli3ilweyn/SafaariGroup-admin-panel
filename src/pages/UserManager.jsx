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
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Driver Route Assignment State
  const [routes, setRoutes] = useState([]);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Custom Admin Creation State
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminCreating, setAdminCreating] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', full_name: '', branch_id: 'global' });

  useEffect(() => {
    fetchUsers();
    fetchRoutes();
    fetchLocations();
  }, []);

  async function fetchLocations() {
    const { data } = await supabase.from('locations').select('*').order('name');
    setLocations(data || []);
  }

  async function fetchRoutes() {
    try {
      console.log("Fetching routes for assignment...");
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          origin:locations!origin_id(name),
          destination:locations!destination_id(name)
        `)
        .order('departure_time', { ascending: true });

      if (error) throw error;
      console.log("Routes found:", data?.length);
      setRoutes(data || []);
    } catch (e) {
      console.error("Fetch routes error:", e);
      alert("Xogta jidadka lama helin: " + e.message);
    }
  }

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

      alert('Route successfully assigned to driver!');
      setDriverModalOpen(false);
      fetchUsers(); // Refresh to show the newly assigned route
    } catch (err) {
      alert('Error assigning route: ' + err.message);
    } finally {
      setAssigningLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newAdmin.username || !newAdmin.password || !newAdmin.full_name) {
      alert("Fadlan buuxi dhammaan xogta (Username, Password, Name).");
      return;
    }
    setAdminCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: newAdmin
      });

      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error);

      alert("Maamule cusub ayaa la diiwaangeliyey si guul ah!");
      setAdminModalOpen(false);
      setNewAdmin({ username: '', password: '', full_name: '', branch_id: 'global' });
      fetchUsers(); // Refresh table
    } catch (err) {
      alert("Qalad ayaa dhacay: " + err.message);
    } finally {
      setAdminCreating(false);
    }
  };

  async function fetchUsers() {
    setLoading(true);
    try {
      // Fetch only profiles with 'user' or other non-driver roles
      const { data, error } = await supabase
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
        .neq('role', 'driver')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const removeRoute = async (userId, routeId) => {
    if (!window.confirm("Are you sure you want to remove this route from the driver?")) return;
    try {
      const { error } = await supabase
        .from('driver_routes')
        .delete()
        .eq('driver_id', userId)
        .eq('route_id', routeId);

      if (error) throw error;
      fetchUsers(); // Refresh to show changes
    } catch (err) {
      alert('Error removing route: ' + err.message);
    }
  };

  const updateRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error(err);
      alert('Failed to update role: ' + err.message);
    }
  };

  const updateBranch = async (userId, branchId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ branch_id: branchId === 'global' ? null : branchId })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, branch_id: branchId === 'global' ? null : branchId } : u));
    } catch (err) {
      console.error(err);
      alert('Failed to update branch: ' + err.message);
    }
  };

  const exportUsers = () => {
    const headers = ['Name,Email,Phone,Joined Date\n'];
    const rows = users.map(u =>
      `${u.full_name},${u.email},${u.phone},${new Date(u.created_at).toLocaleDateString()}`
    );
    const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Macaamiisha.csv';
    a.click();
  };

  const rolePriority = {
    'driver': 1,
    'admin': 2,
    'user': 3
  };

  const filteredUsers = users
    .filter(u =>
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const priorityA = rolePriority[a.role] || 4;
      const priorityB = rolePriority[b.role] || 4;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // If same role, sort by most recently joined
      return new Date(b.created_at) - new Date(a.created_at);
    });

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Macaamiisha (Users)</h1>
          <p className="text-gray-500 font-medium">Maamul iyo xaqiiji dhammaan dadka isdiiwaangeliyey.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setAdminModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 border border-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md"
          >
            <UserCheck size={18} /> Diiwaangeli Maamule Cusub
          </button>
          <button
            onClick={exportUsers}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download size={18} /> Soo saar CSV
          </button>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-lg">
          <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Warta Xubnaha</p>
          <h2 className="text-4xl font-black mt-1">{users.length}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/20 p-2 rounded-xl w-fit">
            <UserCheck size={14} /> Xogta Isticmaalka
          </div>
        </div>
        {/* Placeholder for other metrics like 'New this Month' */}
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Ku raadi magaca, taleefanka, ama iimaylka..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all">
          <Filter size={18} /> Shaandheyn
        </button>
      </div>

      {/* USER TABLE */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Xogta Macmiilka</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Xogta Xiriirka</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Taariikhda Biirista</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Maamulka Kaalinta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">ID: {user.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Phone size={14} className="text-blue-500" /> {user.phone || 'Lama helin'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        <Mail size={14} /> {user.email || 'Iimayl majiro'}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                      <Calendar size={14} /> {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <select
                          value={user.role || 'user'}
                          onChange={(e) => updateRole(user.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase outline-none border cursor-pointer transition-all shadow-sm
                            ${user.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200 hover:border-red-300'
                              : user.role === 'driver' ? 'bg-green-50 text-green-700 border-green-200 hover:border-green-300'
                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300'}`}
                        >
                          <option value="user">Isticmaale</option>
                          <option value="driver">Darawal</option>
                          <option value="admin">Maamule</option>
                        </select>

                        {user.role === 'admin' && (
                          <select
                            value={user.branch_id || 'global'}
                            onChange={(e) => updateBranch(user.id, e.target.value)}
                            className="px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase outline-none border border-gray-200 bg-white text-gray-700 cursor-pointer hover:border-blue-500 transition-all shadow-sm"
                          >
                            <option value="global">Global Manager / Maamulka Guud</option>
                            {locations.map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.name} Office</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {user.role === 'driver' && (
                        <div className="mt-3 flex flex-col items-end gap-2">
                          <button
                            onClick={() => openDriverModal(user)}
                            className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-all border border-blue-200"
                          >
                            <MapPin size={12} /> U qoondee Marin
                          </button>

                          {/* Assigned Routes List */}
                          <div className="flex flex-wrap justify-end gap-1 mt-1">
                            {user.driver_routes?.map(dr => (
                              <div key={dr.route_id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg group/route hover:border-red-200 transition-all">
                                <span className="text-[10px] font-bold text-gray-500">
                                  {dr.route?.origin?.name} → {dr.route?.destination?.name}
                                </span>
                                <button
                                  onClick={() => removeRoute(user.id, dr.route_id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-20 text-center font-black text-gray-300 animate-pulse uppercase tracking-widest">Cusboonaysiinta xogta macaamiisha...</div>}
          {!loading && filteredUsers.length === 0 && (
            <div className="p-20 text-center">
              <ShieldAlert size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold">Wax macmiil ah uma helin raadintaada.</p>
            </div>
          )}
        </div>
      </div>

      {/* DRIVER ROUTE MODAL */}
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
              {routes.length === 0 && <p className="text-gray-400 font-bold text-center py-4">Maya marid hadda diyaar ah.</p>}
            </div>
          </div>
        </div>
      )}

      {/* CREATE ADMIN MODAL */}
      {adminModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setAdminModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Maamule Cusub</h2>
            <p className="text-gray-500 font-medium mb-8">U samee magac sir ah iyo xafiis.</p>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Username (Ka fogow meelaha banaan)</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border border-transparent focus:border-blue-500 focus:bg-white" 
                  placeholder="garowe_boss1"
                  value={newAdmin.username}
                  onChange={e => setNewAdmin({...newAdmin, username: e.target.value.replace(/\s+/g, '')})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Erayga Sirta (Password)</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border border-transparent focus:border-blue-500 focus:bg-white" 
                  placeholder="Sir culus (Ugu yaraan 6 xaraf)"
                  value={newAdmin.password}
                  onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Magaca Buuxa</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border border-transparent focus:border-blue-500 focus:bg-white" 
                  placeholder="Ahmed Ali"
                  value={newAdmin.full_name}
                  onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Xafiiska (Branch)</label>
                <select 
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border border-transparent focus:border-blue-500 focus:bg-white cursor-pointer"
                  value={newAdmin.branch_id}
                  onChange={e => setNewAdmin({...newAdmin, branch_id: e.target.value})}
                >
                  <option value="global">Global Boss / Taliyaha Guud (Dhamaan arkaa)</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} Office</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                disabled={adminCreating}
                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl mt-4 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {adminCreating ? 'Wuu Diiwaangalinayaa...' : 'Abuur Maamulaha'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}