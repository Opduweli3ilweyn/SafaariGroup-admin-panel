import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Send, Trash2, Info, Loader2 } from 'lucide-react';

const NewsManager = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('Wararkii ugu dambeeyey');
  const [loading, setLoading] = useState(false);
  const [newsList, setNewsList] = useState([]);
  const [fetching, setFetching] = useState(true);

  const categoryStyles = {
    'Sicir-dhimis': { icon: 'pricetag-outline', color: '#ef4444', bgColor: '#fef2f2' },
    'Wararkii ugu dambeeyey': { icon: 'bus-outline', color: '#f59e0b', bgColor: '#fffbeb' },
    'Xamuulka': { icon: 'cube-outline', color: '#000066', bgColor: '#eef2ff' },
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNewsList(data || []);
    } catch (err) {
      console.error("Fetch Error:", err.message);
    } finally {
      setFetching(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title || !content) return alert("Fadlan buuxi meelaha banaan!");
    
    setLoading(true);
    const style = categoryStyles[type];

    try {
      const { error } = await supabase.from('news').insert([{
        title,
        content,
        type,
        icon: style.icon,
        color: style.color,
        bg_color: style.bgColor,
      }]);

      if (error) throw error;

      alert("Si guul leh ayaa loo daabacay!");
      setTitle('');
      setContent('');
      fetchNews();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteNews = async (id) => {
    if (window.confirm("Ma hubtaa inaad tirturto?")) {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (!error) fetchNews();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-2xl font-extrabold text-[#000066] flex items-center gap-2">
          <Bell /> Maamulka Ogeysiisyada
        </h1>
        <p className="text-gray-500">U dir ogeysiisyo cusub macaamiisha app-ka.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold mb-4">Daabac Cusub</h2>
          <form onSubmit={handlePublish} className="space-y-4">
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              className="w-full p-3 rounded-xl border bg-gray-50 border-gray-200 outline-none focus:border-blue-500"
            >
              <option value="Wararkii ugu dambeeyey">Wararka (General)</option>
              <option value="Sicir-dhimis">Sicir-dhimis (Discount)</option>
              <option value="Xamuulka">Xamuulka (Cargo)</option>
            </select>

            <input 
              type="text" 
              placeholder="Cinwaanka (Title)"
              className="w-full p-3 rounded-xl border border-gray-200"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea 
              placeholder="Warkaaga halkan ku qor..."
              className="w-full p-3 rounded-xl border border-gray-200 h-32"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#000066] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              Daabac Hadda
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-lg font-bold">Wararkii Hore</h2>
          {fetching ? (
            <p className="text-center py-10 text-gray-400">Loading news...</p>
          ) : newsList.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl text-center border border-dashed">
              <p className="text-gray-400">Wax warar ah ma jiraan.</p>
            </div>
          ) : (
            newsList.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 flex items-center justify-between" style={{ borderLeftColor: item.color }}>
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: item.bg_color }}>
                    <Info size={20} style={{ color: item.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.content}</p>
                  </div>
                </div>
                <button onClick={() => deleteNews(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-full transition">
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsManager;