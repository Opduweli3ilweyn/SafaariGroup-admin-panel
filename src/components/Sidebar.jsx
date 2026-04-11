import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPinned, 
  MapPin, 
  Package, 
  Users, 
  UserCheck,
  LogOut, 
  Ticket,
  Bell, // 1. Added Bell Icon for News
  MessageSquare // For SMS logs
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard / Booska', path: '/dashboard' },
  { icon: Users, label: 'Users / Macaamiisha', path: '/dashboard/users', globalOnly: true },
  { icon: MapPinned, label: 'Routes / Jidadka', path: '/dashboard/routes', globalOnly: true },
  { icon: MapPin, label: 'City / Magaalo', path: '/dashboard/locations', globalOnly: true },
  { icon: Ticket, label: 'Tickets / Tikidhada', path: '/dashboard/tickets' },
  { icon: Package, label: 'Cargo / Xamuulka', path: '/dashboard/cargo' },
  { icon: Package, label: 'Incoming Cargo / Soo Socda', path: '/dashboard/incoming' },
  { icon: UserCheck, label: 'Drivers / Darawalada', path: '/dashboard/drivers' },
  { icon: MessageSquare, label: 'SMS Log / Fariimaha', path: '/dashboard/sms' },
  { icon: Bell, label: 'News / Wararka', path: '/dashboard/news' },
];

export default function Sidebar() {
  const { user: currentUser } = useUser();
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = '/';
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-20">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-blue-600 tracking-tight">LogisticsPro</h2>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          // Hide global-only items if user is a Branch Admin (they have a branch_id)
          if (item.globalOnly && currentUser?.branch_id) return null;
          
          const isActive = location.pathname + location.search === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 w-full rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout / Ka Bax</span>
        </button>
      </div>
    </aside>
  );
}