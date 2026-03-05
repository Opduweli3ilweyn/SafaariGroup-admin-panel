// src/pages/Login.jsx (Simplified logic)
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
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
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-4">
          <h1 className="text-3xl font-bold">Admin Portal</h1>
          <input type="email" placeholder="Email" className="w-full p-3 border rounded" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full p-3 border rounded" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700">
            Sign In
          </button>
        </form>
      </div>
      {/* Right Side: Visual */}
      <div className="hidden lg:block lg:w-1/2 bg-blue-600">
         <img src="https://images.unsplash.com/photo-1464146072230-91cabc968266?auto=format&fit=crop&q=80" className="object-cover h-full opacity-50" />
      </div>
    </div>
  );
}