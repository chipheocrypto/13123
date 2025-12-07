
import React, { useState } from 'react';
import { AppProvider, useApp } from './store';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Overview } from './pages/Overview';
import { RoomPos } from './pages/RoomPos';
import { Inventory } from './pages/admin/Inventory';
import { Reports } from './pages/admin/Reports';
import { SettingsPage } from './pages/admin/Settings';
import { Staff } from './pages/admin/Staff';
import { DailyExpenses } from './pages/admin/DailyExpenses';
import { ImportData } from './pages/ImportData';
import { Bills } from './pages/Bills';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { ForgotPassword } from './components/auth/ForgotPassword'; 
import { StoreSelection } from './pages/StoreSelection';
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { Role } from './types';
import { Menu } from 'lucide-react';

const MainContent = () => {
  const { user, isAuthenticated, currentStore } = useApp();
  
  const initialPage = user?.role === Role.ADMIN ? 'overview' : 'rooms';
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isAuthenticated || !user) {
    if (authMode === 'REGISTER') {
      return <Register onSwitchToLogin={() => setAuthMode('LOGIN')} />;
    }
    if (authMode === 'FORGOT_PASSWORD') {
      return <ForgotPassword onSwitchToLogin={() => setAuthMode('LOGIN')} />;
    }
    return <Login 
      onSwitchToRegister={() => setAuthMode('REGISTER')} 
      onSwitchToForgotPassword={() => setAuthMode('FORGOT_PASSWORD')}
    />;
  }

  if (user.role === Role.SUPER_ADMIN) {
    return <SuperAdminDashboard />;
  }

  if (!currentStore) {
    return <StoreSelection />;
  }

  if (activeRoomId) {
    return (
      <RoomPos 
        roomId={activeRoomId} 
        onBack={() => setActiveRoomId(null)} 
        onChangeRoom={(id) => setActiveRoomId(id)}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'overview': return user.role === Role.ADMIN ? <Overview /> : <Dashboard onSelectRoom={setActiveRoomId} />;
      case 'rooms': return <Dashboard onSelectRoom={setActiveRoomId} />;
      case 'bills': return <Bills />;
      case 'inventory': return <Inventory />;
      case 'import-data': return <ImportData />;
      case 'daily-expenses': return <DailyExpenses />;
      case 'reports': return <Reports />;
      case 'settings': return <SettingsPage />;
      case 'staff': return <Staff />;
      default: return <Dashboard onSelectRoom={setActiveRoomId} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar 
        currentPage={currentPage} 
        setPage={setCurrentPage} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="md:hidden bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700 shrink-0">
           <div className="flex items-center">
             <button onClick={() => setIsSidebarOpen(true)} className="mr-3 text-white">
               <Menu size={28} />
             </button>
             <span className="font-bold text-lg text-white">{currentStore.name}</span>
           </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-900">
          {renderPage()}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
};

export default App;
