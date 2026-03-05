import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import RoutesManager from './pages/RoutesManager';
import LocationsManager from './pages/LocationsManager';
import CargoManager from './pages/CargoManager';
import UserManager from './pages/UserManager';
import DashboardHome from './pages/DashboardHome';
import TicketMonitor from './pages/TicketMonitor.jsx';
import NewsManager from './pages/NewsManager'; // 1. Add this import

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />
        
        {/* Protected Admin Routes */}
        <Route path="/dashboard" element={<AdminLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="routes" element={<RoutesManager />} />
          <Route path="locations" element={<LocationsManager />} />
          <Route path="tickets" element={<TicketMonitor />} />
          <Route path="cargo" element={<CargoManager />} />
          <Route path="users" element={<UserManager />} />
          {/* 2. Add the News route here */}
          <Route path="news" element={<NewsManager />} /> 
        </Route>
      </Routes>
    </BrowserRouter>
  );
}