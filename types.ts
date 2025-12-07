
export enum Role {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  MANAGER = 'MANAGER',
  SUPER_ADMIN = 'SUPER_ADMIN', // New Role for System Owner
}

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE', // Green
  OCCUPIED = 'OCCUPIED',   // Red
  PAYMENT = 'PAYMENT',     // Blue (New status)
  CLEANING = 'CLEANING',   // Yellow
  ERROR = 'ERROR',         // Black
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: 'ACTIVE' | 'LOCKED' | 'MAINTENANCE';
  expiryDate?: string; // Ngày hết hạn gói
  imageUrl?: string;
}

// NEW: Desktop App License Management
export interface DesktopLicense {
  id: string;
  storeId: string;
  licenseKey: string; // Mã kích hoạt (VD: POS-XXXX-YYYY)
  status: 'UNUSED' | 'ACTIVE';
  machineId?: string; // Mã phần cứng máy tính (HWID)
  deviceName?: string; // Tên máy tính (VD: MAY-THU-NGAN-01)
  activatedAt?: number;
  createdBy: string;
}

// NEW: Import Data Images
export interface ImportImage {
  id: string;
  storeId: string;
  url: string; // Base64 or URL
  description: string;
  uploaderName: string;
  timestamp: number;
}

export interface HRDetails {
  baseSalary: number;    // Lương cơ bản
  workDays: number;      // Ngày công thực tế
  totalWorkHours: number; // Tổng giờ làm
  leaveDays: number;     // Số ngày nghỉ
  bonus: number;         // Thưởng
  penalty: number;       // Phạt
  cashAdvance: number;   // Tạm ứng tiền (New)
  note?: string;         // Ghi chú
}

export interface User {
  id: string;
  storeId: string; // Primary Store Link (Origin)
  allowedStoreIds?: string[]; // NEW: List of stores this user can access (For Managers)
  name: string;
  username: string; // Used as Login ID
  email?: string;   // Contact email
  phoneNumber?: string; // NEW: Contact Phone
  password?: string; // Optional for update logic (not displayed)
  secondPassword?: string; // NEW: Mật khẩu cấp 2 (Security PIN)
  role: Role;
  permissions: string[];
  shift?: string; // Ca làm việc
  
  isSystemAccount?: boolean; // True: Hiện bên tab TK, False: Chỉ hiện bên bảng lương
  isOwner?: boolean; // NEW: True nếu là tài khoản đăng ký ban đầu (Không thể xóa/sửa quyền)
  
  maxAllowedStores?: number; // NEW: Số lượng quán tối đa được phép tạo (Quota)

  // HR & Payroll Info
  hr?: HRDetails;
}

export interface Product {
  id: string;
  storeId: string; // Linked to Store
  name: string;
  category: string;
  costPrice: number; // Vốn
  sellPrice: number; // Bán
  stock: number;
  unit: string;
  isTimeBased?: boolean; // If true, handled specially (hourly service like staff/musician)
  imageUrl?: string; // New field for product image
}

// Chi tiết từng dòng nhập (để tính lịch sử giá vốn)
export interface ImportRecord {
  id: string;
  storeId: string; // Linked to Store
  invoiceId: string; // Reference to PurchaseInvoice
  invoiceCode?: string; 
  supplier?: string;    
  productId: string;
  productName: string;
  quantity: number;
  importPrice: number; // Giá nhập tại thời điểm đó
  totalCost: number; // quantity * importPrice
  timestamp: number;
  // New fields for invoice detail view support
  newSellPrice?: number;
}

// Đối tượng Hóa đơn nhập hàng (Quản lý phiếu)
export interface PurchaseInvoice {
  id: string;
  storeId: string; // Linked to Store
  code: string;
  supplier: string;
  timestamp: number;
  totalAmount: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    newSellPrice?: number;
  }[];
  creatorName: string;
}

// Chi phí vặt hàng ngày (Mua đồ, thất lạc...)
export interface DailyExpense {
  id: string;
  storeId: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'PURCHASE' | 'LOSS' | 'OTHER'; // Mua sắm, Thất thoát, Khác
  timestamp: number;
}

// Nhật ký thao tác hệ thống
export interface ActionLog {
  id: string;
  storeId: string; // Linked to Store
  userId: string;
  userName: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'SYSTEM' | 'REQUEST' | 'PRINT';
  target: string; // Tên đối tượng bị tác động (VD: Hóa đơn #123, Sản phẩm Bia)
  description: string;
  timestamp: number;
}

// NEW: Request to edit bill
export interface BillEditRequest {
  id: string;
  storeId: string;
  orderId: string;
  requestByUserId: string;
  requestByName: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'; // COMPLETED = Edits made
  timestamp: number;
  resolvedBy?: string;
  resolvedAt?: number;
}

export interface OrderItem {
  id?: string; // Unique ID for table row (needed for individual time tracking)
  productId: string;
  name: string;
  quantity: number;
  sellPrice: number;
  costPrice: number;
  isTimeBased?: boolean;
  
  // For Time Based Items
  startTime?: number;
  endTime?: number;
}

export interface Room {
  id: string;
  storeId: string; // Linked to Store
  name: string;
  status: RoomStatus;
  type: 'VIP' | 'NORMAL';
  hourlyRate: number;
  currentOrderId?: string;
  checkInTime?: number; // Timestamp
  imageUrl?: string; // New field for room image
}

export interface Order {
  id: string;
  storeId: string; // Linked to Store
  roomId: string;
  items: OrderItem[];
  startTime: number;
  endTime?: number;
  status: 'OPEN' | 'PAID' | 'CANCELLED';
  subTotal: number;
  vatRate: number;
  discount: number;
  totalAmount: number;
  totalProfit: number; // Calculated at checkout
  printCount?: number; // Số lần in bill
  editCount?: number; // NEW: Số lần sửa bill
}

export interface Shareholder {
  id: string;
  name: string;
  percentage: number; // Tỷ lệ góp vốn (%)
}

// Chi tiết chi phí vận hành (Thuê nhà, Mạng, v.v.)
export interface OperatingCost {
  id: string;
  name: string;
  amount: number;
  months: number; // Số tháng thanh toán (Ví dụ: 6 tháng)
}

export interface FinancialConfig {
  constructionCost: number; // Chi phí xây dựng quán
  otherCost: number; // Chi phí khác (setup ban đầu)
  monthlyFixedCost: number; // DEPRECATED: Replaced by operatingCosts list, but kept for backward compat sum
  operatingCosts: OperatingCost[]; // NEW: Danh sách chi phí vận hành chi tiết
  shareholdersList: Shareholder[]; // Danh sách cổ đông
}

export interface Settings {
  storeId?: string; // Linked to Store (Optional for default)

  timeRoundingMinutes: number; // e.g., 5 minutes for Room
  staffServiceMinutes: number; // e.g., 10 minutes addition
  serviceBlockMinutes: number; // NEW: Block rounding for Services (e.g., 10 mins)
  vatRate: number;
  lowStockThreshold: number;
  
  // Bill Editing Rules
  staffEditWindowMinutes: number; // Thời gian nhân viên được phép yêu cầu sửa (VD: 5 phút)
  adminAutoApproveMinutes: number; // Thời gian hệ thống tự duyệt (nếu có)
  hardBillLockMinutes: number; // NEW: Thời gian khóa sổ vĩnh viễn (VD: 24h), không ai được sửa
  
  // Data Management
  autoDeleteImagesDays: number; // NEW: Số ngày tự động xóa ảnh import

  // Unit Management
  availableUnits: string[]; // List of available units (e.g. Lon, Thùng, Đĩa...)
  
  // Category Management (New)
  productCategories: string[]; // List of categories (Bia, Rượu, Mồi...)

  // Invoice Design - Business Info
  storeName: string;      // Tên doanh nghiệp
  storeAddress: string;   // Địa chỉ
  storeTaxCode: string;   // Mã số thuế
  
  // Invoice Design - Header/Footer
  invoiceTitle: string; 
  invoiceFooter: string;
  
  // Invoice Design - Legal/Symbol
  invoiceSerial: string; // Ký hiệu (1C25M...)
  invoiceFormNo: string; // Mẫu số (1/001...)
  invoiceDigitalSignature: boolean; // Hiển thị chữ ký số

  // Visibility Toggles
  invoiceShowCashier: boolean;
  invoiceShowTime: boolean;
  invoiceShowStartTime: boolean;
  invoiceShowEndTime: boolean;
  invoiceShowDuration: boolean;

  // Financials
  financials: FinancialConfig;
}