import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPinned, 
  MapPin, 
  Package, 
  Users, 
  LogOut, 
  Ticket,
  Bell // 1. Added Bell Icon for News
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const menuItems = [
  { icon: LayoutDashboard, label: 'Shaashadda Guud', path: '/dashboard' },
  { icon: MapPinned, label: 'Marinnada Safarka', path: '/dashboard/routes' },
  { icon: MapPin, label: 'Magaalooyinka', path: '/dashboard/locations' },
  { icon: Ticket, label: 'Tikidhada Basaska', path: '/dashboard/tickets' },
  { icon: Package, label: 'Dabagalka Xamuulka', path: '/dashboard/cargo' },
  { icon: Users, label: 'Macaamiisha', path: '/dashboard/users' },
  { icon: Bell, label: 'Ogeysiisyada', path: '/dashboard/news' }, // 2. Renamed to Broadcast
];

export default function Sidebar() {
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
          // Changed to 'startsWith' to keep the parent link active when on sub-pages
          const isActive = location.pathname === item.path;
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
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}