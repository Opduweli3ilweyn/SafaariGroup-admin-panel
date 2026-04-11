import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export default function AdminGuard({ children }) {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 uppercase tracking-widest font-black text-gray-300 animate-pulse">
        Xaqiijinta Maamulka...
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    // Redirect to login if not admin
    console.warn("Access denied: User is not an admin", user?.role);
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
