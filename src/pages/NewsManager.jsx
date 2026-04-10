import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Send, Trash2, Info, Loader2, Smartphone, User, Users } from 'lucide-react';

const NewsManager = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('Wararkii ugu dambeeyey');
  const [loading, setLoading] = useState(false);
  const [newsList, setNewsList] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [users, setUsers] = useState([]);
  const [targetUserId, setTargetUserId] = useState('all'); // 'all' or specific user ID
  const [sendSMS, setSendSMS] = useState(false);

  const categoryStyles = {
    'Sicir-dhimis': { icon: 'pricetag-outline', color: '#ef4444', bgColor: '#fef2f2' },
    'Wararkii ugu dambeeyey': { icon: 'bus-outline', color: '#f59e0b', bgColor: '#fffbeb' },
    'Xamuulka': { icon: 'cube-outline', color: '#000066', bgColor: '#eef2ff' },
  };

  useEffect(() => {
    fetchNews();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, phone').order('full_name');
    setUsers(data || []);
  };

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
      // 1. Create the App Notification record
      const { error } = await supabase.from('news').insert([{
        title,
        content,
        type,
        icon: style.icon,
        color: style.color,
        bg_color: style.bgColor,
        user_id: targetUserId === 'all' ? null : targetUserId
      }]);

      if (error) throw error;

      // 2. Handle SMS if enabled
      if (sendSMS) {
        let targets = [];
        if (targetUserId === 'all') {
          targets = users.filter(u => u.phone);
        } else {
          const single = users.find(u => u.id === targetUserId);
          if (single?.phone) targets = [single];
        }

        if (targets.length > 0) {
          // In a real production app with thousands of users, 
          // you would use a batching service or an Edge Function that handles the loop.
          // For now, we'll suggest a bulk send or loop through them.
          console.log(`Sending SMS to ${targets.length} users...`);
          
          for (const target of targets) {
            await supabase.functions.invoke('send-sms', {
              body: { 
                phone: target.phone, 
                message: `${title}: ${content}`,
                event: 'broadcast_news' 
              },
            });
          }
        }
      }

      alert("Si guul leh ayaa loo daabacay!");
      setTitle('');
      setContent('');
      setSendSMS(false);
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
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
              <p className="text-blue-800 text-sm font-medium flex items-center gap-2">
                <Info size={16} /> 
                Farriintaadu waxay u dhici doontaa sidii ogeysiis barnaamijka dhexdiisa ah (App Notification).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Cida loo dirayo (Target)</label>
              <div className="relative">
                <Users className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <select 
                  value={targetUserId} 
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full pl-10 p-3 rounded-xl border bg-gray-50 border-gray-200 outline-none focus:border-blue-500 appearance-none"
                >
                  <option value="all">Dhammaan Macaamiisha</option>
                  <optgroup label="Macaamiisha">
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.phone}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <input 
              type="text" 
              placeholder="Cinwaanka Farriinta"
              className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea 
              placeholder="Farriintaada halkan ku qor..."
              className="w-full p-3 rounded-xl border border-gray-200 h-32 outline-none focus:border-blue-500"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div 
              onClick={() => setSendSMS(!sendSMS)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${sendSMS ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <Smartphone className={sendSMS ? 'text-blue-600' : 'text-gray-400'} />
                <div>
                  <p className={`font-bold text-sm ${sendSMS ? 'text-blue-900' : 'text-gray-500'}`}>U dir SMS ahaan (Taleefanka)</p>
                  <p className="text-[10px] text-gray-400">Farriinta waxay u dhacaysaa sidii fariin taleefan oo caadi ah.</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${sendSMS ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                {sendSMS && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
              {loading ? 'Diraya...' : 'Dir Farriinta'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-lg font-bold">Wararkii Hore</h2>
          {fetching ? (
            <p className="text-center py-10 text-gray-400">Wararka ayaa soo kacaya...</p>
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