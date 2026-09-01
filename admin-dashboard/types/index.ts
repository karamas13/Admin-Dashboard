export type AppointmentStatus = 'booked' | 'pending' | 'cancelled' | 'completed' | 'available';
export type UrgencyLevel = 'normal' | 'high' | 'emergency';
export type ClosureReason = 'closed' | 'holiday' | 'vacation' | 'staff_absence' | 'emergency';

export interface Clinic {
  clinic_id: string; // Ευθυγράμμιση με το DB Schema (clinic_id αντί για id)
  name: string;
  timezone: string;
  working_hours_start: string; // Στη βάση αποθηκεύονται ως ξεχωριστά flat text πεδία
  working_hours_end: string;
  appointment_interval: number; // σε λεπτά
  created_at?: string;
}

export interface Appointment {
  appointment_id: string;
  clinic_id: string; // Απαραίτητο foreign key για τα Supabase φίλτρα (.eq('clinic_id', ...))
  caller_name: string;
  phone: string;
  appointment_type_code: string; // π.χ., "cleaning", "checkup"
  urgency_code: UrgencyLevel;
  start_at: string; // ISO String (TIMESTAMPTZ στη βάση)
  duration_minutes: number;
  status: AppointmentStatus;
  created_at?: string;
  // Αν το Google Sync δεν υπάρχει ακόμα στον πίνακα της βάσης, το κρατάμε ως προαιρετικό
  google_sync_status?: 'healthy' | 'error' | 'pending'; 
}

export interface CallbackRequest {
  callback_id: string;
  clinic_id: string; // Foreign key
  caller_name: string;
  phone: string;
  reason_code: string; // Το Postman Collection το ορίζει ως reason_code (π.χ. "pain", " reschedule")
  urgency_code: UrgencyLevel; // Αντιστοιχία με το urgency_code του Appointment
  status: 'pending' | 'completed';
  created_at: string;
}

export interface Closure {
  schedule_exception_id: string;
  clinic_id: string; // Foreign key
  starts_at: string; // TIMESTAMPTZ ISO String
  ends_at: string;   // TIMESTAMPTZ ISO String
  reason_code: ClosureReason;
  created_at?: string;
}

export interface ClinicSettings {
  clinic_id: string;
  clinic_name: string;
  timezone: string;
  working_hours_start: string;
  working_hours_end: string;
  appointment_interval: number;
  google_calendar_sync_enabled: boolean;
  google_calendar_id: string;
  call_transfer_enabled: boolean;
  call_transfer_target: string;
  faqs?: FAQEntry[]; // Προαιρετικό αναλόγως αν έρχεται από joint πίνακα
}

export interface FAQEntry {
  faq_id: string; // snake_case ID
  clinic_id: string;
  question: string;
  answer: string;
  created_at?: string;
}