// src/pages/Login.jsx (Simplified logic)
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import logo from '../assets/images/logo.png';
import minibusBg from '../assets/images/minibus-bg.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    // Invisible unique Username handling constraint!
    const formattedEmail = email.includes('@') 
      ? email.trim() 
      : `${email.toLowerCase().trim()}@safaarigroup.local`;

    const { data, error } = await supabase.auth.signInWithPassword({ email: formattedEmail, password });

    if (error) alert(error.message);
    else {
      // Check if user is Admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'admin') {
        window.location.href = '/dashboard';
      } else {
        await supabase.auth.signOut();
        alert("Access Denied: You are not an admin.");
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-12">
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="SafaariGroup Logo" className="w-32 h-32 object-contain mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Portal-ka Maamulka</h1>
            <p className="text-gray-500 mt-2">Gudaha gal si aad u maamusho nidaamka Shirkada</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username ama Iimayl"
              className="w-full p-4 border border-gray-200 rounded-2xl bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Erayga Sirta"
              className="w-full p-4 border border-gray-200 rounded-2xl bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold text-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.98]">
            Gudaha Gal
          </button>
        </form>
      </div>

      {/* Right Side: Visual */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${minibusBg})` }}
      >
        {/* Dark Blue Overlay */}
        <div className="absolute inset-0 bg-blue-900/80 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-transparent"></div>

        {/* Highlighted Content */}
        <div className="relative z-10 text-center p-12 text-white flex flex-col items-center justify-center">
          <div className="bg-white/10 p-8 rounded-full backdrop-blur-md border border-white/20 shadow-2xl mb-8 transform hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            <img
              src={logo}
              alt="SafaariGroup Logo"
              className="w-48 h-48 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
            />
          </div>
          <h2 className="text-5xl font-extrabold mb-4 tracking-tight drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            SafaariGroup
          </h2>
          <p className="text-blue-100 text-xl font-medium tracking-wide drop-shadow-md max-w-md mx-auto">
            Simplifying African Logistics & Travel for a Global Future
          </p>
        </div>
      </div>
    </div>
  );
}