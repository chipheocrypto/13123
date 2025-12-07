import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { Room, RoomStatus, Role } from '../types';
import { Mic2, Music, CheckCircle, AlertTriangle, XCircle, Clock, Move, Plus, Edit, Trash2, Image as ImageIcon, Upload, Banknote } from 'lucide-react';

interface DashboardProps {
  onSelectRoom: (roomId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectRoom }) => {
  const { rooms, updateRoomStatus, startSession, activeOrders, user, addRoom, updateRoomInfo, deleteRoom, forceEndSession, currentStore } = useApp();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomId: string } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<Room>>({
    name: '', type: 'NORMAL', hourlyRate: 150000, imageUrl: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000); 
    return () => clearInterval(timer);
  }, []);

  const isAdmin = user?.role === Role.ADMIN;

  const getStatusColor = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.AVAILABLE: return 'border-green-600 shadow-green-900/20';
      case RoomStatus.OCCUPIED: return 'border-red-600 shadow-red-900/20 animate-pulse-border';
      case RoomStatus.PAYMENT: return 'border-blue-500 shadow-blue-900/20'; 
      case RoomStatus.CLEANING: return 'border-yellow-500 shadow-yellow-900/20';
      case RoomStatus.ERROR: return 'border-gray-600 bg-gray-900';
      default: return 'border-gray-700';
    }
  };

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.AVAILABLE: return <span className="bg-green-600 px-2 py-1 rounded text-xs font-bold uppercase">Trống</span>;
      case RoomStatus.OCCUPIED: return <span className="bg-red-600 px-2 py-1 rounded text-xs font-bold uppercase animate-pulse">Đang hát</span>;
      case RoomStatus.PAYMENT: return <span className="bg-blue-600 px-2 py-1 rounded text-xs font-bold uppercase">Thanh toán</span>;
      case RoomStatus.CLEANING: return <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold uppercase">Chờ dọn (Đã TT)</span>;
      case RoomStatus.ERROR: return <span className="bg-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">Bảo trì</span>;
      default: return null;
    }
  };

  const handleRightClick = (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, roomId });
  };

  const handleStatusChange = (newStatus: RoomStatus) => {
    if (!contextMenu) return;
    const roomId = contextMenu.roomId;
    const room = rooms.find(r => r.id === roomId);

    if (room) {
      if ((room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.PAYMENT) && 
          newStatus !== RoomStatus.OCCUPIED && newStatus !== RoomStatus.PAYMENT) {
        
        const confirmChange = window.confirm(
          "CẢNH BÁO: Phòng này đang hoạt động hoặc đang thanh toán!\n\nHành động này sẽ HỦY phiên hát hiện tại và đặt lại trạng thái phòng.\nBạn có chắc chắn muốn tiếp tục?"
        );
        if (confirmChange) {
          forceEndSession(roomId, newStatus);
        }
      } else {
        updateRoomStatus(roomId, newStatus);
      }
    }
    setContextMenu(null);
  };

  const handleRoomClick = (roomId: string, status: RoomStatus) => {
    if (status === RoomStatus.AVAILABLE) {
      startSession(roomId);
      onSelectRoom(roomId);
    } else if (status === RoomStatus.OCCUPIED || status === RoomStatus.PAYMENT) {
      onSelectRoom(roomId);
    } else if (status === RoomStatus.CLEANING) {
       alert("Phòng đang dọn dẹp. Click chuột phải chọn 'Đã xong' sau khi dọn phòng xong.");
    }
  };

  const handleOpenAdd = () => {
    setEditingRoom({ name: '', type: 'NORMAL', hourlyRate: 150000, imageUrl: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!contextMenu) return;
    const room = rooms.find(r => r.id === contextMenu.roomId);
    if (room) {
      setEditingRoom(room);
      setIsModalOpen(true);
    }
    setContextMenu(null);
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    if (confirm("Bạn có chắc chắn muốn xóa phòng này?")) {
      deleteRoom(contextMenu.roomId);
    }
    setContextMenu(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingRoom(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom.name || !editingRoom.hourlyRate) return;
    if (!currentStore) return;

    if (editingRoom.id) {
      updateRoomInfo(editingRoom as Room);
    } else {
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        storeId: currentStore.id,
        name: editingRoom.name!,
        type: editingRoom.type as 'VIP' | 'NORMAL',
        hourlyRate: Number(editingRoom.hourlyRate),
        status: RoomStatus.AVAILABLE,
        imageUrl: editingRoom.imageUrl
      };
      addRoom(newRoom);
    }
    setIsModalOpen(false);
  };

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center">
          <Music className="mr-3 text-pink-500" /> Sơ đồ phòng
        </h2>
        {isAdmin && (
          <button 
            onClick={handleOpenAdd}
            className="flex items-center bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-transform hover:scale-105"
          >
            <Plus className="mr-2" size={20} /> Thêm Phòng
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {rooms.map(room => {
          const order = activeOrders[room.id];
          const duration = order ? Math.floor((Date.now() - order.startTime) / 60000) : 0;

          return (
            <div
              key={room.id}
              onClick={() => handleRoomClick(room.id, room.status)}
              onContextMenu={(e) => handleRightClick(e, room.id)}
              className={`
                relative h-56 rounded-2xl shadow-xl cursor-pointer transition-all transform hover:scale-[1.03]
                overflow-hidden border-2 flex flex-col justify-end group
                ${getStatusColor(room.status)}
              `}
            >
              {room.imageUrl ? (
                 <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${room.imageUrl})` }}
                 />
              ) : (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center opacity-50">
                   <Mic2 size={60} className="text-gray-600" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

              <div className="absolute top-3 right-3">
                 <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded border border-gray-600">
                  {room.type}
                 </span>
              </div>
              
              <div className="absolute top-3 left-3">
                 {getStatusBadge(room.status)}
              </div>

              <div className="relative z-10 p-4 w-full">
                <div className="flex justify-between items-end">
                   <div>
                     <h3 className="text-2xl font-bold text-white leading-none mb-1 shadow-black drop-shadow-md">{room.name}</h3>
                     <p className="text-gray-300 text-sm font-medium">{room.hourlyRate.toLocaleString()}đ/h</p>
                   </div>
                   {(room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.PAYMENT) && (
                      <div className="flex items-center text-yellow-400 font-mono font-bold bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                        <Clock size={14} className="mr-1" />
                        {duration}p
                      </div>
                   )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4 max-w-2xl">
        <div className="flex items-center text-sm text-gray-300">
          <div className="w-4 h-4 bg-green-600 rounded mr-2"></div> Trống
        </div>
        <div className="flex items-center text-sm text-gray-300">
          <div className="w-4 h-4 bg-red-600 rounded mr-2"></div> Đang hát
        </div>
        <div className="flex items-center text-sm text-gray-300">
          <div className="w-4 h-4 bg-blue-600 rounded mr-2"></div> Đang thanh toán
        </div>
        <div className="flex items-center text-sm text-gray-300">
          <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div> Chờ dọn
        </div>
        <div className="flex items-center text-sm text-gray-300">
          <div className="w-4 h-4 bg-gray-700 border border-gray-600 rounded mr-2"></div> Bảo trì
        </div>
      </div>

      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed bg-gray-800 border border-gray-700 shadow-2xl rounded-lg py-2 z-50 w-56"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wider">Đổi trạng thái</div>
          <button onClick={() => handleStatusChange(RoomStatus.AVAILABLE)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-green-400 flex items-center">
            <CheckCircle size={16} className="mr-2" /> Đã xong / Trống
          </button>
          <button onClick={() => handleStatusChange(RoomStatus.CLEANING)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-yellow-400 flex items-center">
            <Move size={16} className="mr-2" /> Cần dọn dẹp
          </button>
           <button onClick={() => handleStatusChange(RoomStatus.ERROR)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-500 flex items-center">
            <XCircle size={16} className="mr-2" /> Báo lỗi / Hỏng
          </button>

          {isAdmin && (
            <>
              <div className="border-t border-gray-700 my-1"></div>
              <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wider">Quản lý</div>
              <button onClick={handleOpenEdit} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-blue-400 flex items-center">
                <Edit size={16} className="mr-2" /> Sửa thông tin
              </button>
              <button onClick={handleDelete} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400 flex items-center">
                <Trash2 size={16} className="mr-2" /> Xóa phòng
              </button>
            </>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-white">
              {editingRoom.id ? 'Sửa thông tin phòng' : 'Thêm phòng mới'}
            </h3>
            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tên phòng</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-pink-500 outline-none" 
                  value={editingRoom.name} 
                  onChange={e => setEditingRoom({...editingRoom, name: e.target.value})} 
                  placeholder="Ví dụ: Phòng 10"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Loại phòng</label>
                  <select 
                    className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-pink-500 outline-none"
                    value={editingRoom.type} 
                    onChange={e => setEditingRoom({...editingRoom, type: e.target.value as any})}
                  >
                    <option value="NORMAL">Thường (Normal)</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Giá giờ (VND)</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-pink-500 outline-none" 
                    value={editingRoom.hourlyRate === 0 ? '' : editingRoom.hourlyRate} 
                    onChange={e => setEditingRoom({...editingRoom, hourlyRate: e.target.value === '' ? 0 : Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Hình ảnh phòng</label>
                <div 
                  className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-pink-500 hover:bg-gray-750 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {editingRoom.imageUrl ? (
                    <div className="relative">
                      <img src={editingRoom.imageUrl} alt="Preview" className="w-full h-40 object-cover rounded" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded">
                        <span className="text-white font-bold flex items-center">
                          <Upload size={20} className="mr-2" /> Đổi ảnh
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 text-gray-400">
                      <ImageIcon size={40} className="mb-2" />
                      <span>Nhấn để tải ảnh lên</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-700">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white font-bold shadow-lg"
                >
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};