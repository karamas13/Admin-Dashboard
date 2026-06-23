export type AppointmentStatus = 'booked' | 'pending' | 'cancelled' | 'completed' | 'available';
export type UrgencyLevel = 'normal' | 'high' | 'emergency';
export type ClosureReason = 'closed' | 'holiday' | 'vacation' | 'staff_absence' | 'emergency';

export interface Clinic {
  id: string;
  name: string;
  timezone: string;
  working_hours: {
    start: string; // "09:00"
    end: string;   // "18:00"
  };
  appointment_interval: number; // in minutes
}

export interface Appointment {
  appointment_id: string;
  caller_name: string;
  phone: string;
  callback_phone?: string;
  appointment_type_code: string; // e.g., "cleaning", "checkup"
  urgency_code: UrgencyLevel;
  start_at: string; // ISO String
  duration_minutes: number;
  status: AppointmentStatus;
  google_sync_status: 'healthy' | 'error' | 'pending';
}

export interface CallbackRequest {
  callback_id: string;
  caller_name: string;
  phone: string;
  reason: string;
  urgency: UrgencyLevel;
  created_at: string;
  status: 'pending' | 'completed';
}

export interface Closure {
  closure_id: string;
  starts_at: string;
  ends_at: string;
  reason_code: ClosureReason;
}

export interface ClinicSettings {
  clinic_name: string;
  timezone: string;
  working_hours_start: string;
  working_hours_end: string;
  appointment_interval: number;
  google_calendar_sync_enabled: boolean;
  google_calendar_id: string;
  call_transfer_enabled: boolean;
  call_transfer_target: string;
  faqs: FAQEntry[];
}

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
}