import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, MapPin, Trash2 } from 'lucide-react'; // Simplified imports

export default function LocationsManager() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLocation, setNewLocation] = useState({ name: '', city_code: '' });

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAddLocation = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('locations').insert([newLocation]);
    
    if (error) {
      alert(error.message);
    } else {
      setNewLocation({ name: '', city_code: '' });
      fetchLocations();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this city? This might affect routes using this location.")) {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) alert("Cannot delete: This city is likely being used in an active route.");
      else fetchLocations();
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Manage Cities</h1>
        <p className="text-sm text-gray-500">Add destinations for your travel and cargo routes.</p>
        
        <form onSubmit={handleAddLocation} className="mt-6 flex flex-wrap gap-4">
          <input 
            type="text" 
            placeholder="City Name"
            className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={newLocation.name}
            onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
            required
          />
          <input 
            type="text" 
            placeholder="Code"
            className="w-32 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={newLocation.city_code}
            onChange={(e) => setNewLocation({...newLocation, city_code: e.target.value})}
            required
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2">
            <Plus size={20} /> Add City
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase">City Name</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase">Code</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {locations.map((loc) => (
              <tr key={loc.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4 font-medium text-gray-700 flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500" /> {loc.name}
                </td>
                <td className="p-4 text-gray-500 font-mono text-sm">{loc.city_code}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(loc.id)} className="text-red-400 hover:text-red-600 p-2">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-10 text-center text-gray-400">Loading cities...</div>}
      </div>
    </div>
  );
}