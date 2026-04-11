import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function SmsMonitor() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sms_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setLogs(data);
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Taariikhda SMS</h1>
          <p className="text-slate-500 mt-1">La soco fariimaha loo diray macaamiisha (SafaariGroup & Golis Gateway)</p>
        </div>
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition disabled:opacity-50"
        >
          {loading ? 'Fadlan sug...' : 'Cusbooneysii (Refresh)'}
        </button>
      </div>

      <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-900 border-b-2 border-slate-900">
                <th className="p-4 font-black">Taariikh (Date)</th>
                <th className="p-4 font-black">Numbarka (Phone)</th>
                <th className="p-4 font-black">Dhambaalka (Message)</th>
                <th className="p-4 font-black">Ujeedada (Event)</th>
                <th className="p-4 font-black text-center">Xaaladda (Status)</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 font-bold">Xogta waa la soo rarayaa...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 font-bold">Lama helin wax SMS ah.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b-2 border-slate-100 hover:bg-slate-50 transition">
                    <td className="p-4 font-medium text-slate-700 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('so-SO', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                      +{log.recipient_phone}
                    </td>
                    <td className="p-4 text-slate-700 text-sm max-w-xs truncate" title={log.message_text}>
                      {log.message_text}
                    </td>
                    <td className="p-4 text-slate-500 font-medium whitespace-nowrap text-xs uppercase tracking-wider">
                      {log.trigger_event || 'N/A'}
                    </td>
                    <td className="p-4 text-center">
                      {log.status === 'sent' ? (
                        <span className="inline-block bg-teal-100 text-teal-800 text-xs font-black px-3 py-1 rounded-full border-2 border-teal-800">
                          WAA LA DIRAY
                        </span>
                      ) : (
                        <span className="inline-block bg-rose-100 text-rose-800 text-xs font-black px-3 py-1 rounded-full border-2 border-rose-800">
                          WUU FASHILMAY
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
