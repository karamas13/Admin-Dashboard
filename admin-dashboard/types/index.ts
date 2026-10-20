export type UrgencyLevel = 'normal' | 'high' | 'urgent' | 'emergency';

export type ClosureReason = 
  | 'closed' 
  | 'holiday' 
  | 'vacation' 
  | 'staff_absence' 
  | 'emergency' 
  | 'extra_hours' 
  | 'other';

export type AvailabilityEffect = 'closed' | 'open';

export type AppointmentStatus = 
  | 'pending'
  | 'booked'
  | 'cancelled'
  | 'rescheduled'
  | 'expired'
  | 'failed';

export type CallbackReasonCode = 
  | 'after_hours' 
  | 'clinic_closed' 
  | 'holiday' 
  | 'patient_requested_callback' 
  | 'water_leak' 
  | 'repair' 
  | 'customer_requested_callback'
  | string;

export interface AvailabilityCheckResponse {
  available: boolean;
  reason?: string;
  suggestions?: Array<{
    starts_at: string;
    ends_at: string;
  }>;
}

export interface AvailableSlot {
  starts_at: string;
  ends_at: string;
}

export interface AvailableSlotsResponse {
  slots_by_date: Record<string, AvailableSlot[]>;
}

export interface Clinic {
  clinic_id: string;
  name: string;
  timezone: string;
  working_hours_start: string;
  working_hours_end: string;
  appointment_interval: number;
  created_at?: string;
}

export interface Appointment {
  appointment_id: string;
  clinic_id: string;
  caller_name: string;
  phone: string;
  callback_phone?: string;
  appointment_type_code: string;
  urgency_code: UrgencyLevel;
  start_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes?: string;
  created_at?: string;
  google_sync_status?: 'healthy' | 'error' | 'pending';
}

export interface CallbackRequest {
  callback_id: string;
  clinic_id: string;
  caller_name: string;
  phone: string;
  callback_phone?: string;
  callback_reason_code: CallbackReasonCode;
  urgency_code: UrgencyLevel;
  status: 'created' | 'pending' | 'completed' | 'resolved';
  work_summary?: string;
  notes?: string;
  created_at: string;
  acknowledged_at?: string;
  notification_status?: string;
  is_urgent?: boolean;
}

export interface Closure {
  schedule_exception_id: string;
  clinic_id: string;
  starts_at: string;
  ends_at: string;
  availability_effect: AvailabilityEffect;
  reason_code: ClosureReason;
  active: boolean;
  note?: string;
  created_at?: string;
}

export interface NotificationPreferences {
  urgent_alerts: boolean;
  regular_callbacks: boolean;
  new_bookings: boolean;
}

export interface ClinicSettings {
  minimum_booking_notice_minutes?: number;
  google_calendar_sync_enabled?: boolean;
  google_calendar_id?: string | null;
  sms_sender_id?: string;
  appointment_confirmation_sms_enabled?: boolean;
  urgent_after_hours_escalation?: {
    enabled: boolean;
    live_transfer_enabled: boolean;
    transfer_destination: string | null;
    sms_destination: string | null;
    callback_guaranteed: boolean;
  };
  agent_profile_config_json?: Record<string, any>;
  working_hours_json?: Record<string, any>;
  appointment_preparation_json?: Record<string, string>;
}