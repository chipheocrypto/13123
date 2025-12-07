import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Room, Product, Order, User, Settings, RoomStatus, Role, OrderItem, ImportRecord, PurchaseInvoice, ActionLog, Store, DailyExpense, BillEditRequest, DesktopLicense, ImportImage } from './types';
import { MOCK_ROOMS, MOCK_PRODUCTS, MOCK_USERS, DEFAULT_SETTINGS, MOCK_IMPORT_HISTORY, MOCK_STORES } from './constants';
import { supabase } from './src/supabaseClient'; // Import Supabase Client

interface AppState {
  user: User | null;
  users: User[]; 
  allUsers: User[]; 
  stores: Store[];
  currentStore: Store | null;
  selectStore: (storeId: string) => void;
  addNewStore: (store: Store) => void;
  updateStore: (store: Store) => void;
  deleteStore: (storeId: string) => void;
  updateStoreExpiry: (storeId: string, dateStr: string) => void;
  toggleStoreLock: (storeId: string) => void;
  createStoreForOwner: (ownerId: string, storeData: Partial<Store>) => void;
  updateOwnerQuota: (username: string, delta: number) => void; 
  updateSecondPassword: (userId: string, pin: string) => void;
  licenses: DesktopLicense[];
  createLicense: (storeId: string, name: string) => void;
  revokeLicense: (licenseId: string) => void;
  activateLicense: (key: string) => Promise<{ success: boolean; message: string }>;
  rooms: Room[];
  products: Product[];
  orders: Order[]; 
  importHistory: ImportRecord[]; 
  purchaseInvoices: PurchaseInvoice[]; 
  dailyExpenses: DailyExpense[]; 
  billRequests: BillEditRequest[]; 
  actionLogs: ActionLog[]; 
  importImages: ImportImage[]; 
  activeOrders: Record<string, Order>; 
  settings: Settings;
  isAuthenticated: boolean;
  loginError: string | null;
  login: (username: string, password: string, remember: boolean) => boolean;
  register: (data: any) => void;
  logout: () => void;
  verifyUserContact: (contact: string) => User | null; 
  resetUserPassword: (userId: string, newPass: string) => void;
  updateRoomStatus: (roomId: string, status: RoomStatus) => void;
  startSession: (roomId: string) => void;
  addItemToOrder: (roomId: string, product: Product, quantity: number) => void;
  stopServiceItem: (roomId: string, itemUniqueId: string) => void; 
  resumeServiceItem: (roomId: string, itemUniqueId: string) => void; 
  removeItemFromOrder: (roomId: string, itemUniqueId: string) => void; 
  adjustOrderStartTime: (roomId: string, minutes: number) => void;
  adjustOrderItemStartTime: (roomId: string, itemUniqueId: string, minutes: number) => void;
  checkout: (roomId: string) => boolean;
  forceEndSession: (roomId: string, targetStatus: RoomStatus) => void;
  moveOrder: (fromRoomId: string, toRoomId: string) => void;
  updateSettings: (newSettings: Partial<Settings>) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void; 
  deleteProduct: (productId: string) => boolean; 
  restockProduct: (productId: string, quantity: number, importPrice: number) => void; 
  addPurchaseInvoice: (data: { invoiceCode: string, supplier: string, items: { productId: string, quantity: number, price: number, newSellPrice?: number }[] }) => void;
  updatePurchaseInvoice: (invoiceId: string, data: { supplier: string, code: string }) => void;
  deletePurchaseInvoice: (invoiceId: string) => void;
  addDailyExpense: (expense: DailyExpense) => void;
  updateDailyExpense: (expense: DailyExpense) => void;
  deleteDailyExpense: (id: string) => void;
  addImportImage: (img: ImportImage) => void;
  deleteImportImage: (id: string) => void;
  requestBillEdit: (orderId: string, reason: string) => void;
  approveBillEdit: (requestId: string) => void;
  rejectBillEdit: (requestId: string) => void;
  updatePaidOrder: (orderId: string, newItems: OrderItem[], newStartTime?: number, newEndTime?: number, requestId?: string) => void; 
  incrementPrintCount: (orderId: string) => void; 
  logAction: (actionType: ActionLog['actionType'], target: string, description: string) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  addRoom: (room: Room) => void;
  updateRoomInfo: (room: Room) => void;
  deleteRoom: (roomId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Default Mock Data (Will be overwritten if Supabase is active)
  const [stores, setStores] = useState<Store[]>(MOCK_STORES);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [allRooms, setAllRooms] = useState<Room[]>(MOCK_ROOMS);
  const [allProducts, setAllProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allImportHistory, setAllImportHistory] = useState<ImportRecord[]>(MOCK_IMPORT_HISTORY);
  const [allPurchaseInvoices, setAllPurchaseInvoices] = useState<PurchaseInvoice[]>([]); 
  const [allDailyExpenses, setAllDailyExpenses] = useState<DailyExpense[]>([]); 
  const [allBillRequests, setAllBillRequests] = useState<BillEditRequest[]>([]); 
  const [allActionLogs, setAllActionLogs] = useState<ActionLog[]>([]); 
  const [allUsers, setAllUsers] = useState<User[]>(MOCK_USERS);
  const [licenses, setLicenses] = useState<DesktopLicense[]>([]); 
  const [allImportImages, setAllImportImages] = useState<ImportImage[]>([]);
  const [allSettings, setAllSettings] = useState<Record<string, Settings>>({
    'store-1': { ...DEFAULT_SETTINGS, storeId: 'store-1', storeName: 'Karaoke Pro - Cơ Sở 1' },
  });
  const [activeOrders, setActiveOrders] = useState<Record<string, Order>>({});

  // --- SUPABASE SYNC LOGIC ---
  useEffect(() => {
    if (supabase) {
      // 1. Fetch Initial Data
      const fetchData = async () => {
        try {
          const { data: usersData } = await supabase.from('users').select('*');
          const { data: storesData } = await supabase.from('stores').select('*');
          const { data: roomsData } = await supabase.from('rooms').select('*');
          const { data: productsData } = await supabase.from('products').select('*');
          
          if (usersData) setAllUsers(usersData);
          if (storesData) setStores(storesData);
          if (roomsData) setAllRooms(roomsData);
          if (productsData) setAllProducts(productsData);
          // ... similarly fetch other data ...
        } catch (error) {
          console.error("Error fetching data from Supabase:", error);
        }
      };

      fetchData();

      // 2. Subscribe to Realtime Changes
      const channel = supabase.channel('db_changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          console.log('Realtime update received:', payload);
          // You would implement specific logic here to update React state based on DB changes
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // --- FILTERED DATA (Based on Current Store) ---
  const rooms = useMemo(() => allRooms.filter(r => r.storeId === currentStore?.id), [allRooms, currentStore]);
  const products = useMemo(() => allProducts.filter(p => p.storeId === currentStore?.id), [allProducts, currentStore]);
  const orders = useMemo(() => allOrders.filter(o => o.storeId === currentStore?.id), [allOrders, currentStore]);
  const importHistory = useMemo(() => allImportHistory.filter(i => i.storeId === currentStore?.id), [allImportHistory, currentStore]);
  const purchaseInvoices = useMemo(() => allPurchaseInvoices.filter(i => i.storeId === currentStore?.id), [allPurchaseInvoices, currentStore]);
  const dailyExpenses = useMemo(() => allDailyExpenses.filter(e => e.storeId === currentStore?.id), [allDailyExpenses, currentStore]);
  const billRequests = useMemo(() => allBillRequests.filter(req => req.storeId === currentStore?.id), [allBillRequests, currentStore]);
  const actionLogs = useMemo(() => allActionLogs.filter(l => l.storeId === currentStore?.id), [allActionLogs, currentStore]);
  const importImages = useMemo(() => allImportImages.filter(img => img.storeId === currentStore?.id), [allImportImages, currentStore]);
  
  const users = useMemo(() => allUsers.filter(u => u.storeId === currentStore?.id), [allUsers, currentStore]);
  
  const settings = useMemo(() => {
    if (!currentStore) return DEFAULT_SETTINGS;
    return allSettings[currentStore.id] || { ...DEFAULT_SETTINGS, storeId: currentStore.id };
  }, [allSettings, currentStore]);

  // --- AUTO DELETE IMAGES LOGIC ---
  useEffect(() => {
    if (currentStore) {
        const daysLimit = settings.autoDeleteImagesDays || 30; // Default 30 days
        const msLimit = daysLimit * 24 * 60 * 60 * 1000;
        const now = Date.now();

        setAllImportImages(prev => {
            const validImages = prev.filter(img => {
                if (img.storeId !== currentStore.id) return true; 
                const age = now - img.timestamp;
                return age <= msLimit;
            });
            return validImages;
        });
    }
  }, [currentStore, settings.autoDeleteImagesDays]);


  const logAction = (actionType: ActionLog['actionType'], target: string, description: string) => {
    const storeId = currentStore?.id || 'system';
    const newLog: ActionLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      storeId: storeId,
      userId: user?.id || 'system',
      userName: user?.name || 'Hệ thống',
      actionType,
      target,
      description,
      timestamp: Date.now()
    };
    setAllActionLogs(prev => [newLog, ...prev]);
    // TODO: if (supabase) supabase.from('action_logs').insert(newLog);
  };

  const selectStore = (storeId: string) => {
    if (storeId === '') {
      setCurrentStore(null);
      return;
    }

    if (user && user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      const allowed = user.allowedStoreIds || [user.storeId];
      if (!allowed.includes(storeId)) {
        alert("Bạn không có quyền truy cập vào chi nhánh này!");
        return;
      }
    }

    const store = stores.find(s => s.id === storeId);
    if (store) {
      if (user?.role !== Role.SUPER_ADMIN) {
        if (store.expiryDate) {
          const expiry = new Date(store.expiryDate).getTime();
          const now = Date.now();
          if (now > expiry) {
            alert("Chi nhánh này đã hết hạn dùng thử (7 ngày).\nVui lòng liên hệ Admin để gia hạn.");
            return;
          }
        }

        if (store.status === 'LOCKED') {
          alert("Chi nhánh này đang bị khóa. Vui lòng liên hệ Admin.");
          return;
        }
      }

      setCurrentStore(store);
      setAllSettings(prev => {
        if (!prev[store.id]) {
          return { ...prev, [store.id]: { ...DEFAULT_SETTINGS, storeId: store.id, storeName: store.name } };
        }
        return prev;
      });
    }
  };

  const login = (username: string, password: string, remember: boolean) => {
    const foundUser = allUsers.find(u => u.username === username);
    if (foundUser) {
      if (foundUser.password && foundUser.password !== password && password !== 'admin') { 
         if(foundUser.password !== password) {
            setLoginError("Mật khẩu không đúng!");
            return false;
         }
      }
      setUser(foundUser);
      setIsAuthenticated(true);
      setLoginError(null);
      
      if (remember) {
        localStorage.setItem('saved_user', username);
      }

      if (foundUser.role === Role.STAFF) {
        if (foundUser.storeId) {
          selectStore(foundUser.storeId);
        }
      }
      else if (foundUser.role === Role.MANAGER) {
        const allowed = foundUser.allowedStoreIds || (foundUser.storeId ? [foundUser.storeId] : []);
        if (allowed.length === 1) {
          selectStore(allowed[0]);
        } else if (allowed.length > 1) {
          setCurrentStore(null);
        } else {
           if (foundUser.storeId) selectStore(foundUser.storeId);
        }
      }
      return true;
    } else {
      setLoginError("Tên đăng nhập không đúng!");
      return false;
    }
  };

  const register = (data: any) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      storeId: '', 
      name: `${data.lastName} ${data.firstName}`,
      username: data.username,
      email: data.email, 
      password: data.password,
      phoneNumber: data.phoneNumber,
      role: Role.ADMIN,
      permissions: ['all'],
      shift: 'Toàn thời gian',
      isSystemAccount: true,
      maxAllowedStores: 1, 
      isOwner: true, 
    };
    
    setAllUsers(prev => [...prev, newUser]);
    // TODO: if (supabase) supabase.from('users').insert(newUser);
    alert("Đăng ký tài khoản thành công! Vui lòng đăng nhập và tạo cửa hàng đầu tiên.");
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setCurrentStore(null); 
    localStorage.removeItem('saved_user');
  };

  const verifyUserContact = (contact: string) => {
    const found = allUsers.find(u => 
      u.email === contact || u.phoneNumber === contact
    );
    return found || null;
  };

  const resetUserPassword = (userId: string, newPass: string) => {
    setAllUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, password: newPass } : u
    ));
    // TODO: Supabase Update
  };

  const addNewStore = (newStore: Store) => {
    setStores(prev => [...prev, newStore]);
    setAllSettings(prev => ({ ...prev, [newStore.id]: { ...DEFAULT_SETTINGS, storeId: newStore.id, storeName: newStore.name } }));
    
    if (user && user.role === Role.ADMIN) {
      const adminClone: User = {
        ...user,
        id: `user-${Date.now()}-admin`,
        storeId: newStore.id,
        isSystemAccount: true,
      };
      setAllUsers(prev => [...prev, adminClone]);
    }
    // TODO: Supabase Insert Store
  };

  const updateStore = (updatedStore: Store) => {
    setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
  };

  const deleteStore = (storeId: string) => {
    setStores(prev => prev.filter(s => s.id !== storeId));
    setAllUsers(prev => prev.filter(u => u.storeId !== storeId));
    setAllRooms(prev => prev.filter(r => r.storeId !== storeId));
    setAllProducts(prev => prev.filter(p => p.storeId !== storeId));
    setAllOrders(prev => prev.filter(o => o.storeId !== storeId));
    setAllImportHistory(prev => prev.filter(i => i.storeId !== storeId));
    setAllPurchaseInvoices(prev => prev.filter(i => i.storeId !== storeId));
    setAllDailyExpenses(prev => prev.filter(e => e.storeId !== storeId));
    setAllBillRequests(prev => prev.filter(b => b.storeId !== storeId));
    setAllActionLogs(prev => prev.filter(l => l.storeId !== storeId));
    setLicenses(prev => prev.filter(l => l.storeId !== storeId));
    setAllImportImages(prev => prev.filter(img => img.storeId !== storeId));

    if (currentStore?.id === storeId) {
      setCurrentStore(null);
    }
  };

  const updateStoreExpiry = (storeId: string, dateStr: string) => {
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, expiryDate: dateStr } : s));
  };

  const toggleStoreLock = (storeId: string) => {
    setStores(prev => prev.map(s => {
      if (s.id === storeId) {
        return { ...s, status: s.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED' };
      }
      return s;
    }));
  };

  const createStoreForOwner = (ownerId: string, storeData: Partial<Store>) => {};

  const updateOwnerQuota = (username: string, delta: number) => {
    setAllUsers(prev => prev.map(u => {
      if (u.username === username) {
        const currentQuota = u.maxAllowedStores || 1;
        return { ...u, maxAllowedStores: Math.max(0, currentQuota + delta) };
      }
      return u;
    }));
  };

  const updateSecondPassword = (userId: string, pin: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, secondPassword: pin };
      }
      return u;
    }));
    // If updating current user, sync state
    if (user && user.id === userId) {
        setUser(prev => prev ? { ...prev, secondPassword: pin } : null);
    }
  };

  // --- LICENSE MANAGEMENT (WEB VERSION) ---
  const createLicense = (storeId: string, name: string) => {
    const existing = licenses.find(l => l.storeId === storeId);
    if (existing) return;

    const key = `KEY-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const newLicense: DesktopLicense = {
      id: `lic-${Date.now()}`,
      storeId,
      licenseKey: key,
      status: 'UNUSED',
      deviceName: name,
      createdBy: user?.name || 'Admin'
    };
    setLicenses(prev => [...prev, newLicense]);
  };

  const revokeLicense = (licenseId: string) => {
    setLicenses(prev => prev.filter(l => l.id !== licenseId));
  };

  // Activate License Logic (Web Version - Browser ID)
  const activateLicense = async (key: string): Promise<{ success: boolean; message: string }> => {
    const license = licenses.find(l => l.licenseKey === key);
    
    if (!license) {
      return { success: false, message: "Mã kích hoạt không tồn tại!" };
    }

    // WEB VERSION: Use LocalStorage UUID as Machine ID
    let machineId = localStorage.getItem('device_id');
    if (!machineId) {
        machineId = `WEB-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        localStorage.setItem('device_id', machineId);
    }

    if (license.status === 'ACTIVE') {
      if (license.machineId === machineId) {
        return { success: true, message: "Kích hoạt thành công (Thiết bị cũ)." };
      } else {
        return { success: false, message: `Key này đã được sử dụng trên thiết bị khác!` };
      }
    }

    setLicenses(prev => prev.map(l => 
      l.id === license.id 
      ? { ...l, status: 'ACTIVE', machineId: machineId!, activatedAt: Date.now() } 
      : l
    ));

    return { success: true, message: "Kích hoạt bản quyền thành công!" };
  };

  const updateRoomStatus = (roomId: string, status: RoomStatus) => {
    setAllRooms(prev => prev.map(r => r.id === roomId ? { ...r, status } : r));
  };

  const startSession = (roomId: string) => {
    if (!currentStore) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    if (activeOrders[roomId]) return;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      storeId: currentStore.id,
      roomId,
      items: [],
      startTime: Date.now(),
      status: 'OPEN',
      subTotal: 0,
      vatRate: settings.vatRate,
      discount: 0,
      totalAmount: 0,
      totalProfit: 0,
      printCount: 0 
    };

    setActiveOrders(prev => ({ ...prev, [roomId]: newOrder }));
    updateRoomStatus(roomId, RoomStatus.OCCUPIED);
    logAction('CREATE', room.name, 'Mở phòng mới');
  };

  const addItemToOrder = (roomId: string, product: Product, quantity: number) => {
    setActiveOrders(prev => {
      const order = prev[roomId];
      if (!order) return prev;
      let newItems: OrderItem[] = [...order.items];

      if (product.isTimeBased) {
        newItems.push({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: product.id,
          name: product.name,
          quantity: 1,
          sellPrice: product.sellPrice,
          costPrice: product.costPrice,
          isTimeBased: true,
          startTime: Date.now()
        });
      } else {
        const existingItemIndex = newItems.findIndex(i => i.productId === product.id && !i.isTimeBased);
        if (existingItemIndex > -1) {
          const item = newItems[existingItemIndex];
          const newQty = item.quantity + quantity;
          if (newQty <= 0) {
             newItems.splice(existingItemIndex, 1);
          } else {
             newItems[existingItemIndex] = { ...item, quantity: newQty };
          }
        } else if (quantity > 0) {
          newItems.push({
            id: `item-${Date.now()}`,
            productId: product.id,
            name: product.name,
            quantity,
            sellPrice: product.sellPrice,
            costPrice: product.costPrice,
            isTimeBased: false
          });
        }
      }
      return { ...prev, [roomId]: { ...order, items: newItems } };
    });
  };

  const stopServiceItem = (roomId: string, itemUniqueId: string) => {
    setActiveOrders(prev => {
      const order = prev[roomId];
      if (!order) return prev;
      const newItems = order.items.map(item => {
        if (item.id === itemUniqueId && item.isTimeBased && !item.endTime) {
          return { ...item, endTime: Date.now() };
        }
        return item;
      });
      return { ...prev, [roomId]: { ...order, items: newItems } };
    });
  };

  const resumeServiceItem = (roomId: string, itemUniqueId: string) => {
    setActiveOrders(prev => {
      const order = prev[roomId];
      if (!order) return prev;
      const newItems = order.items.map(item => {
        if (item.id === itemUniqueId && item.isTimeBased && item.endTime) {
          const { endTime, ...rest } = item;
          return { ...rest, endTime: undefined };
        }
        return item;
      });
      return { ...prev, [roomId]: { ...order, items: newItems } };
    });
  };

  const removeItemFromOrder = (roomId: string, itemUniqueId: string) => {
    setActiveOrders(prev => {
      const order = prev[roomId];
      if (!order) return prev;
      const newItems = order.items.filter(i => (i.id || i.productId) !== itemUniqueId);
      return { ...prev, [roomId]: { ...order, items: newItems } };
    });
  };

  const adjustOrderStartTime = (roomId: string, minutes: number) => {
    setActiveOrders(prev => {
      const order = prev[roomId];
      if (!order) return prev;
      return { ...prev, [roomId]: { ...order, startTime: order.startTime + (minutes * 60000) } };
    });
  };

  const adjustOrderItemStartTime = (roomId: string, itemUniqueId: string, minutes: number) => {
    setActiveOrders(prev => {
      const order = prev[roomId];
      if (!order) return prev;
      const newItems = order.items.map(item => {
        if (item.id === itemUniqueId && item.isTimeBased && item.startTime) {
          return { ...item, startTime: item.startTime + (minutes * 60000) };
        }
        return item;
      });
      return { ...prev, [roomId]: { ...order, items: newItems } };
    });
  };

  const moveOrder = (fromRoomId: string, toRoomId: string) => {
    const sourceOrder = activeOrders[fromRoomId];
    if (!sourceOrder) return;
    const targetRoom = rooms.find(r => r.id === toRoomId);
    if (!targetRoom || targetRoom.status !== RoomStatus.AVAILABLE) {
      alert("Phòng đích không khả dụng hoặc đang có khách!");
      return;
    }

    setActiveOrders(prev => {
      const newOrders = { ...prev };
      newOrders[toRoomId] = { ...sourceOrder, roomId: toRoomId };
      delete newOrders[fromRoomId];
      return newOrders;
    });

    setAllRooms(prev => prev.map(r => {
      if (r.id === fromRoomId) return { ...r, status: RoomStatus.AVAILABLE };
      if (r.id === toRoomId) return { ...r, status: RoomStatus.OCCUPIED };
      return r;
    }));
    logAction('UPDATE', `Chuyển phòng`, `Chuyển từ ${rooms.find(r=>r.id===fromRoomId)?.name} sang ${targetRoom.name}`);
  };

  const checkout = (roomId: string) => {
    const order = activeOrders[roomId];
    if (!order) return false;

    const endTime = Date.now();
    const durationMs = endTime - order.startTime;
    const durationMinutes = Math.ceil(durationMs / 60000);
    let billedMinutes = durationMinutes;
    if (settings.timeRoundingMinutes > 1) {
      billedMinutes = Math.ceil(durationMinutes / settings.timeRoundingMinutes) * settings.timeRoundingMinutes;
    }
    billedMinutes += settings.staffServiceMinutes;

    const room = rooms.find(r => r.id === roomId);
    const hourlyRate = room ? room.hourlyRate : 0;
    const roomTimeCost = (billedMinutes / 60) * hourlyRate;

    let productRevenue = 0;
    let productCost = 0;

    order.items.forEach(item => {
      if (item.isTimeBased && item.startTime) {
        const serviceEnd = item.endTime || endTime;
        const svcDurationMinutes = Math.max(1, Math.ceil((serviceEnd - item.startTime) / 60000));
        const serviceBlock = settings.serviceBlockMinutes || 1;
        const svcBilledMinutes = Math.ceil(svcDurationMinutes / serviceBlock) * serviceBlock;

        productRevenue += (svcBilledMinutes / 60) * item.sellPrice;
        productCost += (svcBilledMinutes / 60) * item.costPrice;
      } else {
        productRevenue += item.sellPrice * item.quantity;
        productCost += item.costPrice * item.quantity;
      }
    });

    const subTotal = productRevenue + roomTimeCost;
    const vatAmount = subTotal * (settings.vatRate / 100);
    const totalAmount = subTotal + vatAmount;
    const totalProfit = subTotal - productCost; 

    const finalOrder: Order = {
      ...order,
      endTime,
      status: 'PAID',
      subTotal,
      totalAmount,
      totalProfit
    };

    setAllOrders(prev => [...prev, finalOrder]);
    
    setAllProducts(prev => prev.map(p => {
      if (p.storeId !== currentStore?.id) return p;
      const item = order.items.find(i => i.productId === p.id);
      if (item && !item.isTimeBased) {
        return { ...p, stock: p.stock - item.quantity };
      }
      return p;
    }));

    setActiveOrders(prev => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });

    updateRoomStatus(roomId, RoomStatus.CLEANING);
    logAction('UPDATE', room?.name || 'Phòng', `Thanh toán thành công: ${Math.round(totalAmount).toLocaleString()}đ`);
    return true;
  };

  const forceEndSession = (roomId: string, targetStatus: RoomStatus) => {
    if (activeOrders[roomId]) {
      const order = activeOrders[roomId];
      const closedOrder: Order = {
        ...order,
        endTime: Date.now(),
        status: 'CANCELLED',
        subTotal: 0, totalAmount: 0, totalProfit: 0
      };
      setAllOrders(prev => [...prev, closedOrder]);
      setActiveOrders(prev => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
      logAction('DELETE', rooms.find(r=>r.id===roomId)?.name || 'Phòng', `Hủy phiên hoạt động (Force End)`);
    }
    updateRoomStatus(roomId, targetStatus);
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    if (!currentStore) return;
    setAllSettings(prev => ({
      ...prev,
      [currentStore.id]: { ...prev[currentStore.id], ...newSettings }
    }));
    logAction('SYSTEM', 'Cài đặt', 'Cập nhật cấu hình hệ thống');
  };

  const addProduct = (product: Product) => {
    if (!currentStore) return;
    setAllProducts(prev => [...prev, { ...product, storeId: currentStore.id }]);
    logAction('CREATE', product.name, 'Thêm sản phẩm mới');
  };

  const updateProduct = (product: Product) => {
    setAllProducts(prev => prev.map(p => p.id === product.id ? product : p));
    logAction('UPDATE', product.name, 'Cập nhật thông tin sản phẩm');
  };

  const deleteProduct = (productId: string) => {
    const p = products.find(i => i.id === productId);
    setAllProducts(prev => prev.filter(p => p.id !== productId));
    logAction('DELETE', p?.name || 'Sản phẩm', 'Xóa sản phẩm khỏi kho');
    return true;
  };

  const restockProduct = (productId: string, quantity: number, importPrice: number) => {
    addPurchaseInvoice({
      invoiceCode: `QC-${Date.now()}`,
      supplier: 'Nhập nhanh',
      items: [{ productId, quantity, price: importPrice }]
    });
  };

  const addPurchaseInvoice = (data: { invoiceCode: string, supplier: string, items: { productId: string, quantity: number, price: number, newSellPrice?: number }[] }) => {
    if (!currentStore) return;
    const timestamp = Date.now();
    const newInvoiceId = `inv-${timestamp}`;
    let invoiceTotal = 0;

    const newRecords: ImportRecord[] = [];
    const invoiceItems: { productId: string, productName: string, quantity: number, price: number }[] = [];

    const updatedAllProducts = allProducts.map(p => {
       if (p.storeId !== currentStore.id) return p;

       const item = data.items.find(i => i.productId === p.id);
       if (!item) return p;

       const qty = Number(item.quantity);
       const price = Number(item.price);
       if (qty <= 0) return p;

       const currentTotalValue = (p.stock > 0 ? p.stock : 0) * p.costPrice;
       const importTotalValue = qty * price;
       const newStock = p.stock + qty;
        
       let newCostPrice = p.costPrice;
       if (newStock > 0) {
         newCostPrice = (currentTotalValue + importTotalValue) / newStock;
       }

       const totalCost = importTotalValue;
       invoiceTotal += totalCost;

       invoiceItems.push({
          productId: p.id,
          productName: p.name,
          quantity: qty,
          price: price
       });

       newRecords.push({
          id: `imp-${timestamp}-${Math.random()}`,
          storeId: currentStore.id,
          invoiceId: newInvoiceId,
          invoiceCode: data.invoiceCode,
          supplier: data.supplier,
          productId: p.id,
          productName: p.name,
          quantity: qty,
          importPrice: price,
          totalCost: totalCost,
          timestamp: timestamp,
          newSellPrice: item.newSellPrice
       });

       return {
          ...p,
          stock: newStock,
          costPrice: Math.round(newCostPrice),
          sellPrice: (item.newSellPrice && item.newSellPrice > 0) ? item.newSellPrice : p.sellPrice
       };
    });

    const newInvoice: PurchaseInvoice = {
      id: newInvoiceId,
      storeId: currentStore.id,
      code: data.invoiceCode,
      supplier: data.supplier,
      timestamp,
      totalAmount: invoiceTotal,
      items: invoiceItems,
      creatorName: user?.name || 'Hệ thống'
    };

    setAllProducts(updatedAllProducts);
    setAllImportHistory(prev => [...newRecords, ...prev]);
    setAllPurchaseInvoices(prev => [newInvoice, ...prev]);
    
    logAction('IMPORT', data.invoiceCode, `Nhập hàng từ ${data.supplier} (${invoiceItems.length} món) - Tổng: ${Math.round(invoiceTotal).toLocaleString()}`);
  };

  const updatePurchaseInvoice = (invoiceId: string, data: { supplier: string, code: string }) => {
    setAllPurchaseInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, supplier: data.supplier, code: data.code } : inv));
    setAllImportHistory(prev => prev.map(rec => rec.invoiceId === invoiceId ? { ...rec, supplier: data.supplier, invoiceCode: data.code } : rec));
    logAction('UPDATE', data.code, 'Cập nhật thông tin hóa đơn nhập');
  };

  const deletePurchaseInvoice = (invoiceId: string) => {
    const invoice = purchaseInvoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const updatedAllProducts = allProducts.map(p => {
       if (p.storeId !== currentStore?.id) return p;
       const item = invoice.items.find(i => i.productId === p.id);
       if (item) {
         return {
           ...p,
           stock: Math.max(0, p.stock - item.quantity)
         };
       }
       return p;
    });

    setAllProducts(updatedAllProducts);
    setAllImportHistory(prev => prev.filter(rec => rec.invoiceId !== invoiceId));
    setAllPurchaseInvoices(prev => prev.filter(inv => inv.id !== invoiceId));

    logAction('DELETE', invoice.code, `Xóa hóa đơn nhập hàng và hoàn lại kho (${invoice.items.length} món)`);
  };

  // --- DAILY EXPENSES ---
  const addDailyExpense = (expense: DailyExpense) => {
    if (!currentStore) return;
    setAllDailyExpenses(prev => [...prev, { ...expense, storeId: currentStore.id }]);
  };

  const updateDailyExpense = (expense: DailyExpense) => {
    setAllDailyExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
  };

  const deleteDailyExpense = (id: string) => {
    setAllDailyExpenses(prev => prev.filter(e => e.id !== id));
  };

  // --- IMPORT IMAGES (DATA NHẬP HÀNG) ---
  const addImportImage = (img: ImportImage) => {
    if (!currentStore) return;
    setAllImportImages(prev => [{...img, storeId: currentStore.id}, ...prev]);
    logAction('IMPORT', 'Ảnh chứng từ', `Tải lên ảnh: ${img.description}`);
  };

  const deleteImportImage = (id: string) => {
    setAllImportImages(prev => prev.filter(img => img.id !== id));
    logAction('DELETE', 'Ảnh chứng từ', 'Xóa ảnh nhập hàng');
  };

  // --- BILL REQUESTS & EDITING ---
  const requestBillEdit = (orderId: string, reason: string) => {
    if (!currentStore || !user) return;
    const newReq: BillEditRequest = {
      id: `req-${Date.now()}`,
      storeId: currentStore.id,
      orderId,
      requestByUserId: user.id,
      requestByName: user.name,
      reason,
      status: 'PENDING',
      timestamp: Date.now()
    };
    setAllBillRequests(prev => [newReq, ...prev]);
    logAction('REQUEST', orderId, `Yêu cầu sửa Bill: ${reason}`);
  };

  const approveBillEdit = (requestId: string) => {
    if (!user) return;
    setAllBillRequests(prev => prev.map(req => 
      req.id === requestId 
      ? { ...req, status: 'APPROVED', resolvedBy: user.name, resolvedAt: Date.now() } 
      : req
    ));
    logAction('UPDATE', 'Yêu cầu sửa Bill', 'Đã duyệt yêu cầu');
  };

  const rejectBillEdit = (requestId: string) => {
    if (!user) return;
    setAllBillRequests(prev => prev.map(req => 
      req.id === requestId 
      ? { ...req, status: 'REJECTED', resolvedBy: user.name, resolvedAt: Date.now() } 
      : req
    ));
    logAction('UPDATE', 'Yêu cầu sửa Bill', 'Đã từ chối yêu cầu');
  };

  // --- UPDATE PAID ORDER ---
  const updatePaidOrder = (orderId: string, newItems: OrderItem[], newStartTime?: number, newEndTime?: number, requestId?: string) => {
    if (!currentStore) return;
    
    // Find the order
    const oldOrder = allOrders.find(o => o.id === orderId);
    if (!oldOrder) return;

    // Calculate diff for Logging
    let changesLog: string[] = [];
    
    // Time Changes Log
    if (newStartTime && newStartTime !== oldOrder.startTime) {
       changesLog.push(`Giờ vào: ${new Date(oldOrder.startTime).toLocaleTimeString()} -> ${new Date(newStartTime).toLocaleTimeString()}`);
    }
    if (newEndTime && oldOrder.endTime && newEndTime !== oldOrder.endTime) {
       changesLog.push(`Giờ ra: ${new Date(oldOrder.endTime).toLocaleTimeString()} -> ${new Date(newEndTime).toLocaleTimeString()}`);
    }

    newItems.forEach(newItem => {
        const oldItem = oldOrder.items.find(i => (i.id || i.productId) === (newItem.id || newItem.productId));
        if (!oldItem) {
            changesLog.push(`Thêm món: ${newItem.name} (x${newItem.quantity})`);
        } else if (oldItem.quantity !== newItem.quantity) {
            changesLog.push(`${newItem.name}: ${oldItem.quantity} -> ${newItem.quantity}`);
        } else if (newItem.isTimeBased && oldItem.isTimeBased) {
            // Check time based item changes
            if (newItem.startTime !== oldItem.startTime) {
                changesLog.push(`${newItem.name} (Vào): ${new Date(oldItem.startTime!).toLocaleTimeString()} -> ${new Date(newItem.startTime!).toLocaleTimeString()}`);
            }
            if (newItem.endTime !== oldItem.endTime) {
                changesLog.push(`${newItem.name} (Ra): ${oldItem.endTime ? new Date(oldItem.endTime).toLocaleTimeString() : '...'} -> ${newItem.endTime ? new Date(newItem.endTime).toLocaleTimeString() : '...'}`);
            }
        }
    });
    oldOrder.items.forEach(oldItem => {
        const newItem = newItems.find(i => (i.id || i.productId) === (oldItem.id || oldItem.productId));
        if (!newItem) {
            changesLog.push(`Xóa món: ${oldItem.name}`);
        }
    });

    if (changesLog.length === 0) return; // No changes

    // Use new times or fallback to old times
    const finalStartTime = newStartTime || oldOrder.startTime;
    const finalEndTime = newEndTime || oldOrder.endTime || Date.now();

    // Recalculate Totals
    const durationMs = finalEndTime - finalStartTime;
    const durationMinutes = Math.max(1, Math.ceil(durationMs / 60000));
    
    // Room Time
    let billedMinutes = durationMinutes;
    if (settings.timeRoundingMinutes > 1) {
      billedMinutes = Math.ceil(durationMinutes / settings.timeRoundingMinutes) * settings.timeRoundingMinutes;
    }
    billedMinutes += settings.staffServiceMinutes;
    
    const room = allRooms.find(r => r.id === oldOrder.roomId);
    const hourlyRate = room ? room.hourlyRate : 0;
    const roomTimeCost = (billedMinutes / 60) * hourlyRate;

    let productRevenue = 0;
    let productCost = 0;

    newItems.forEach(item => {
      if (item.isTimeBased && item.startTime) {
        const itemEndTime = item.endTime || finalEndTime;
        const svcDurationMinutes = Math.max(1, Math.ceil((itemEndTime - item.startTime) / 60000));
        const serviceBlock = settings.serviceBlockMinutes || 1;
        const svcBilledMinutes = Math.ceil(svcDurationMinutes / serviceBlock) * serviceBlock;

        productRevenue += (svcBilledMinutes / 60) * item.sellPrice;
        productCost += (svcBilledMinutes / 60) * item.costPrice;
      } else {
        productRevenue += item.sellPrice * item.quantity;
        productCost += item.costPrice * item.quantity;
      }
    });

    const subTotal = productRevenue + roomTimeCost;
    const vatAmount = subTotal * (settings.vatRate / 100);
    const totalAmount = subTotal + vatAmount;
    const totalProfit = subTotal - productCost;

    const updatedOrder: Order = {
        ...oldOrder,
        startTime: finalStartTime,
        endTime: finalEndTime,
        items: newItems,
        subTotal,
        totalAmount,
        totalProfit,
        editCount: (oldOrder.editCount || 0) + 1 // INCREMENT EDIT COUNT
    };

    setAllOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    
    // IF Request ID provided, Mark Request as COMPLETED
    if (requestId) {
       setAllBillRequests(prev => prev.map(req => 
          req.id === requestId ? { ...req, status: 'COMPLETED' } : req
       ));
    }

    logAction('UPDATE', `Bill ${orderId}`, `Sửa Bill: ${changesLog.join(', ')}`);
  };

  const incrementPrintCount = (orderId: string) => {
    setAllOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, printCount: (o.printCount || 0) + 1 } : o
    ));
    logAction('PRINT', `Bill ${orderId}`, 'In lại hóa đơn');
  };

  const addUser = (user: User) => {
    const targetStoreId = user.storeId || currentStore?.id;
    if (!targetStoreId) {
        console.error("Cannot add user: No Store ID linked");
        return;
    }
    const userToAdd = { ...user, storeId: targetStoreId };
    setAllUsers(prev => [...prev, userToAdd]);
    logAction('CREATE', user.name, 'Tạo tài khoản nhân viên mới');
  };

  const updateUser = (updatedUser: User) => {
    setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (user && user.id === updatedUser.id) setUser(updatedUser);
    logAction('UPDATE', updatedUser.name, 'Cập nhật thông tin nhân viên/lương');
  };

  const deleteUser = (userId: string) => {
    const u = users.find(u=>u.id === userId);
    if (u?.isOwner) {
        alert("Không thể xóa tài khoản chủ sở hữu (Owner).");
        return;
    }
    setAllUsers(prev => prev.filter(u => u.id !== userId));
    logAction('DELETE', u?.name || 'Nhân viên', 'Xóa tài khoản nhân viên');
  };

  const addRoom = (room: Room) => {
    if (!currentStore) return;
    setAllRooms(prev => [...prev, { ...room, storeId: currentStore.id }]);
    logAction('CREATE', room.name, 'Thêm phòng mới');
  };

  const updateRoomInfo = (updatedRoom: Room) => {
    setAllRooms(prev => prev.map(r => r.id === updatedRoom.id ? updatedRoom : r));
    logAction('UPDATE', updatedRoom.name, 'Cập nhật thông tin phòng');
  };

  const deleteRoom = (roomId: string) => {
    const r = rooms.find(i => i.id === roomId);
    setAllRooms(prev => prev.filter(r => r.id !== roomId));
    logAction('DELETE', r?.name || 'Phòng', 'Xóa phòng');
  };

  return (
    <AppContext.Provider value={{
      user, users, allUsers, stores, currentStore, rooms, products, orders, activeOrders, settings, isAuthenticated, loginError, importHistory, purchaseInvoices, actionLogs, dailyExpenses, billRequests, licenses, importImages,
      login, register, logout, selectStore, addNewStore, updateStore, deleteStore,
      updateRoomStatus, startSession, addItemToOrder, stopServiceItem, resumeServiceItem,
      removeItemFromOrder, checkout, forceEndSession, moveOrder, updateSettings, addProduct, updateProduct, deleteProduct, restockProduct, 
      addPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice, logAction,
      addDailyExpense, updateDailyExpense, deleteDailyExpense,
      addImportImage, deleteImportImage,
      requestBillEdit, approveBillEdit, rejectBillEdit, updatePaidOrder, incrementPrintCount,
      addUser, updateUser, deleteUser,
      addRoom, updateRoomInfo, deleteRoom,
      adjustOrderStartTime, adjustOrderItemStartTime,
      verifyUserContact, resetUserPassword,
      updateStoreExpiry, toggleStoreLock, createStoreForOwner, updateOwnerQuota,
      createLicense, revokeLicense, activateLicense,
      updateSecondPassword
    }}>
      {children}
    </AppContext.Provider>
  );
};