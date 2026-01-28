export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          company_name: string | null
          phone: string | null
          role: 'client' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          company_name?: string | null
          phone?: string | null
          role?: 'client' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          company_name?: string | null
          phone?: string | null
          role?: 'client' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string | null
          status: 'active' | 'completed' | 'paused'
          current_step: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_date?: string
          end_date?: string | null
          status?: 'active' | 'completed' | 'paused'
          current_step?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_date?: string
          end_date?: string | null
          status?: 'active' | 'completed' | 'paused'
          current_step?: number
          created_at?: string
          updated_at?: string
        }
      }
      steps: {
        Row: {
          id: string
          number: number
          title: string
          subtitle: string
          description: string
          duration_weeks: number
          objectives: Json
          deliverables: Json
          resources: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          number: number
          title: string
          subtitle: string
          description: string
          duration_weeks?: number
          objectives?: Json
          deliverables?: Json
          resources?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          number?: number
          title?: string
          subtitle?: string
          description?: string
          duration_weeks?: number
          objectives?: Json
          deliverables?: Json
          resources?: Json
          created_at?: string
          updated_at?: string
        }
      }
      step_progress: {
        Row: {
          id: string
          program_id: string
          step_id: string
          status: 'locked' | 'in_progress' | 'pending_validation' | 'completed'
          started_at: string | null
          completed_at: string | null
          validated_at: string | null
          validated_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          program_id: string
          step_id: string
          status?: 'locked' | 'in_progress' | 'pending_validation' | 'completed'
          started_at?: string | null
          completed_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          step_id?: string
          status?: 'locked' | 'in_progress' | 'pending_validation' | 'completed'
          started_at?: string | null
          completed_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          step_progress_id: string
          type: 'link' | 'file' | 'text'
          content: string
          file_url: string | null
          file_name: string | null
          status: 'pending' | 'approved' | 'rejected'
          feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          step_progress_id: string
          type: 'link' | 'file' | 'text'
          content: string
          file_url?: string | null
          file_name?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          step_progress_id?: string
          type?: 'link' | 'file' | 'text'
          content?: string
          file_url?: string | null
          file_name?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'submission_received' | 'submission_approved' | 'submission_rejected' | 'step_unlocked' | 'message'
          title: string
          message: string
          read: boolean
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'submission_received' | 'submission_approved' | 'submission_rejected' | 'step_unlocked' | 'message'
          title: string
          message: string
          read?: boolean
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'submission_received' | 'submission_approved' | 'submission_rejected' | 'step_unlocked' | 'message'
          title?: string
          message?: string
          read?: boolean
          data?: Json | null
          created_at?: string
        }
      }
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Program = Database['public']['Tables']['programs']['Row']
export type Step = Database['public']['Tables']['steps']['Row']
export type StepProgress = Database['public']['Tables']['step_progress']['Row']
export type Submission = Database['public']['Tables']['submissions']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Extended types with relations
export interface StepWithProgress extends Step {
  progress?: StepProgress
  submissions?: Submission[]
}

export interface ProgramWithDetails extends Program {
  profile?: Profile
  step_progress?: (StepProgress & { 
    step?: Step
    submissions?: Submission[]
  })[]
}
