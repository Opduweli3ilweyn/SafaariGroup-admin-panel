import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AdminGuard({ children }) {
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !profile || profile.role !== 'admin') {
        console.warn("Access denied: User is not an admin", profile?.role);
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error("Admin check failed:", err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 uppercase tracking-widest font-black text-gray-300 animate-pulse">
        Xaqiijinta Maamulka...
      </div>
    );
  }

  if (!isAdmin) {
    // Redirect to login if not admin
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
