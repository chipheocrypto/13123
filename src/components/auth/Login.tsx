
import React, { useState, useEffect } from 'react';
import { useApp } from '../../store';
import { Mic2, Lock, User, Eye, EyeOff, Globe } from 'lucide-react';
import { Role } from '../../types';

interface LoginProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
  const { login, loginError } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Detect Subdomain
  const [currentDomainType, setCurrentDomainType] = useState<'ADMIN' | 'STAFF' | 'PUBLIC'>('PUBLIC');

  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname.startsWith('admin.')) {
        setCurrentDomainType('ADMIN');
    } else if (hostname.startsWith('staff.')) {
        setCurrentDomainType('STAFF');
    } else {
        setCurrentDomainType('PUBLIC');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Pass validation check function to login
    const validationSuccess = login(username, password, remember);
    
    if (validationSuccess) {
       // Logic redirect will be handled by App.tsx based on role
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-900/30 text-pink-500 mb-4">
              <Mic2 size={32} />
            </div>
            <h2 className="text-3xl font-bold text-white">Đăng Nhập</h2>
            
            {/* Domain Indicator */}
            {currentDomainType !== 'PUBLIC' && (
                <div className={`inline-flex items-center mt-2 px-3 py-1 rounded-full text-xs font-bold border ${
                    currentDomainType === 'ADMIN' 
                    ? 'bg-purple-900/50 text-purple-400 border-purple-500' 
                    : 'bg-blue-900/50 text-blue-400 border-blue-500'
                }`}>
                    <Globe size={12} className="mr-1" />
                    {currentDomainType === 'ADMIN' ? 'Cổng Quản Trị Viên' : 'Cổng Nhân Viên'}
                </div>
            )}
            
            <p className="text-gray-400 mt-2 text-sm">Hệ thống quản lý Karaoke Pro</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {loginError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 text-sm p-3 rounded text-center">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Tên đăng nhập</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 bg-gray-900 border border-gray-600 rounded-lg py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  placeholder="Nhập tên đăng nhập"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 bg-gray-900 border border-gray-600 rounded-lg py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-600 rounded bg-gray-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Nhớ đăng nhập
                </label>
              </div>
              <div className="text-sm">
                <button type="button" onClick={onSwitchToForgotPassword} className="font-medium text-pink-500 hover:text-pink-400">
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all transform hover:scale-[1.02]"
            >
              ĐĂNG NHẬP
            </button>
          </form>

          <div className="mt-6 text-center">
             <p className="text-gray-400 text-sm">
               Chưa có tài khoản quản lý?{' '}
               {/* Only allow Register on Admin Domain or Public Domain */}
               {currentDomainType !== 'STAFF' ? (
                   <button onClick={onSwitchToRegister} className="text-pink-400 hover:text-pink-300 font-bold">
                     Đăng ký ngay
                   </button>
               ) : (
                   <span className="text-gray-500 block mt-1 text-xs">Vui lòng truy cập trang Admin để đăng ký.</span>
               )}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
