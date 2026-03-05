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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Driver Route Assignment State
  const [routes, setRoutes] = useState([]);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [assigningLoading, setAssigningLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoutes();
  }, []);

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

  async function fetchUsers() {
    setLoading(true);
    try {
      // Fetch profiles with their assigned routes
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
      // Optional: alert('Role successfully updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to update role: ' + err.message);
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
    a.download = 'Customer_List.csv';
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
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Customer Base</h1>
          <p className="text-gray-500 font-medium">Manage and verify all registered travelers.</p>
        </div>
        <button
          onClick={exportUsers}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
        >
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-lg">
          <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Total Members</p>
          <h2 className="text-4xl font-black mt-1">{users.length}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/20 p-2 rounded-xl w-fit">
            <UserCheck size={14} /> Active Database
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
            placeholder="Search by name, phone, or email..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all">
          <Filter size={18} /> Filters
        </button>
      </div>

      {/* USER TABLE */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Role Management</th>
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
                        <Phone size={14} className="text-blue-500" /> {user.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        <Mail size={14} /> {user.email}
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
                      <select
                        value={user.role || 'user'}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-2xl text-xs font-black uppercase outline-none border cursor-pointer transition-all shadow-sm
                          ${user.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200 hover:border-red-300'
                            : user.role === 'driver' ? 'bg-green-50 text-green-700 border-green-200 hover:border-green-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300'}`}
                      >
                        <option value="user">User</option>
                        <option value="driver">Driver</option>
                        <option value="admin">Admin</option>
                      </select>

                      {user.role === 'driver' && (
                        <div className="mt-3 flex flex-col items-end gap-2">
                          <button
                            onClick={() => openDriverModal(user)}
                            className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-all border border-blue-200"
                          >
                            <MapPin size={12} /> Assign Route
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
          {loading && <div className="p-20 text-center font-black text-gray-300 animate-pulse uppercase tracking-widest">Syncing Customer Profiles...</div>}
          {!loading && filteredUsers.length === 0 && (
            <div className="p-20 text-center">
              <ShieldAlert size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold">No customers found matching your search.</p>
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
            <h2 className="text-2xl font-black text-gray-900 mb-1">Assign Route</h2>
            <p className="text-gray-500 font-medium mb-6">Select a route for <span className="text-gray-900 font-bold">{selectedDriver.full_name}</span></p>

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
                    <p className="font-bold text-gray-900 text-sm">{r.origin?.name || 'Unknown'} → {r.destination?.name || 'Unknown'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-blue-600 font-bold uppercase bg-blue-50 px-2 py-0.5 rounded-md">
                        {r.vehicle_type || 'Bus'}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        {r.departure_time ? new Date(r.departure_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'No Time'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {routes.length === 0 && <p className="text-gray-400 font-bold text-center py-4">No routes available yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}