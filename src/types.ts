export interface UserProfile {
  id: string;
  username: string;
  password?: string;
  full_name: string;
  designation: string;
  id_card_no: string;
  sector: string;
  avatar_url?: string;
  role?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_approved?: boolean;
  created_at?: string;
}

export interface TransactionLog {
  id: string;
  type: 'RECEIVE' | 'ISSUE';
  date: string;
  challan: string;
  batch_no?: string;
  qty: number;
  remarks?: string;
  created_at?: string;
}

export interface TwillTapeItem {
  id: number;
  buyer_name: string;
  buyer?: string;
  date: string;
  booking_challan: string;
  style: string;
  order_no: string;
  store_ref: string;
  twill_ref?: string;
  s_tape_ref?: string;
  tape_ref?: string;
  job_no?: string;
  colour: string;
  color?: string;
  item_name: string;
  cm: string;
  size?: string;
  yds: string;
  booking_qty: number;
  booking_quantity?: number;
  receive_qty: number;
  rcvd_qty?: number;
  receive_date: string;
  rcvd_date?: string;
  receive_challan: string;
  rcvd_challan?: string;
  issue_qty: number;
  iss_qty?: number;
  issue_date: string;
  iss_date?: string;
  issue_challan: string;
  iss_challan?: string;
  balance_qty: number;
  batch_no?: string;
  remarks: string;
  receive_logs?: TransactionLog[];
  issue_logs?: TransactionLog[];
  created_at?: string;
}

export interface SewingThreadItem {
  id: number;
  buyer_name?: string;
  buyer?: string;
  date?: string;
  booking_challan?: string;
  style?: string;
  order_no?: string;
  store_ref?: string;
  s_thread_ref?: string;
  job_no?: string;
  colour?: string;
  color?: string;
  item_name?: string;
  thread_count?: string;
  count?: string;
  shade_no?: string;
  pantone?: string;
  sr_gt?: string;
  meter?: string;
  per_body_consm?: string;
  supplier?: string;
  qc_not_ok?: boolean | string;
  booking_qty: number;
  receive_qty: number;
  rcvd_date?: string;
  receive_date?: string;
  rcvd_challan?: string;
  receive_challan?: string;
  issue_qty: number;
  issue_date?: string;
  issue_challan?: string;
  balance_qty: number;
  remarks?: string;
  receive_logs?: TransactionLog[];
  issue_logs?: TransactionLog[];
  created_at?: string;
}

export interface DrawstringItem {
  id: number;
  sl_no?: number | string;
  buyer?: string;
  buyer_name: string;
  booking_date?: string;
  date: string;
  booking_challan?: string;
  ref_no_job_no?: string;
  style: string;
  sr_gt_no?: string;
  store_ref: string;
  po_no?: string;
  order_no: string;
  item_name?: string;
  drawstring_type: string;
  color?: string;
  colour: string;
  size?: string;
  size_mm?: string;
  unit?: 'YDS' | 'PCS' | 'MTRS' | string;
  booking_qty: number;
  rcv_qty?: number;
  receive_qty: number;
  due_qty?: number;
  balance_qty: number;
  last_rcvd_qty?: number;
  rcvd_date?: string;
  receive_date: string;
  receive_challan?: string;
  issue_qty?: number;
  issue_date?: string;
  issue_challan?: string;
  supplier?: string;
  qc_not_ok?: boolean | string;
  remarks: string;
  receive_logs?: TransactionLog[];
  issue_logs?: TransactionLog[];
  created_at?: string;
}

export interface PlanningItem {
  id: number;
  buyer_name: string;
  style: string;
  order_no: string;
  item_type: string;
  required_qty: number;
  unit: string;
  target_date: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PLANNED' | 'IN_BOOKING' | 'RECEIVED' | 'IN_PRODUCTION';
  mcd_ref?: string;
  planner_name?: string;
  remarks?: string;
  created_at?: string;
}

export type ActiveTab = 'dashboard' | 'twill_tape' | 'sewing_thread' | 'drawstring_received' | 'drawstring_report' | 'report' | 'planning' | 'admin' | 'profile';
export type StatusFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'FULFILLED';
export type AppTheme = 'light' | 'dark';

export interface QuickUpdatePayload {
  id: number;
  receive_qty: number;
  receive_date: string;
  receive_challan: string;
  issue_qty: number;
  issue_date: string;
  issue_challan: string;
  balance_qty: number;
  remarks?: string;
  new_receive_log?: TransactionLog;
  new_issue_log?: TransactionLog;
  new_receive_logs?: TransactionLog[];
  new_issue_logs?: TransactionLog[];
}

export interface InventoryStats {
  totalBookings: number;
  totalBookingQty: number;
  totalReceivedQty: number;
  totalIssuedQty: number;
  totalPendingCount: number; // Yellow items: booking_qty > 0 && receive_qty === 0
  totalPartialCount: number; // Blue items: receive_qty > 0 && receive_qty < booking_qty
  totalFulfilledCount: number; // White items: receive_qty >= booking_qty
  totalBalanceQty: number;
}

