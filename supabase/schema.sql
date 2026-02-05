-- ===========================================
-- AURA Coaching Platform - Database Schema
-- ===========================================
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- PROFILES TABLE
-- ===========================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow insert during registration
CREATE POLICY "Enable insert for registration"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ===========================================
-- STEPS TABLE (Program structure)
-- ===========================================
CREATE TABLE public.steps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL DEFAULT 2,
  objectives JSONB NOT NULL DEFAULT '[]',
  deliverables JSONB NOT NULL DEFAULT '[]',
  resources JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;

-- Everyone can read steps
CREATE POLICY "Steps are viewable by everyone"
  ON public.steps FOR SELECT
  USING (true);

-- Only admins can modify steps
CREATE POLICY "Admins can modify steps"
  ON public.steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===========================================
-- PROGRAMS TABLE (User enrollments)
-- ===========================================
CREATE TABLE public.programs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  current_step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Users can view their own program
CREATE POLICY "Users can view their own program"
  ON public.programs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own program
CREATE POLICY "Users can update their own program"
  ON public.programs FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow insert during registration
CREATE POLICY "Enable insert for programs"
  ON public.programs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all programs
CREATE POLICY "Admins can view all programs"
  ON public.programs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all programs
CREATE POLICY "Admins can update all programs"
  ON public.programs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===========================================
-- STEP_PROGRESS TABLE
-- ===========================================
CREATE TABLE public.step_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  step_id UUID REFERENCES public.steps(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'pending_validation', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, step_id)
);

-- Enable RLS
ALTER TABLE public.step_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view their own step progress"
  ON public.step_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE id = step_progress.program_id AND user_id = auth.uid()
    )
  );

-- Users can update their own progress
CREATE POLICY "Users can update their own step progress"
  ON public.step_progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE id = step_progress.program_id AND user_id = auth.uid()
    )
  );

-- Allow insert for step progress
CREATE POLICY "Enable insert for step progress"
  ON public.step_progress FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE id = step_progress.program_id AND user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins have full access to step progress"
  ON public.step_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===========================================
-- SUBMISSIONS TABLE
-- ===========================================
CREATE TABLE public.submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  step_progress_id UUID REFERENCES public.step_progress(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('link', 'file', 'text')),
  content TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view their own submissions"
  ON public.submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.step_progress sp
      JOIN public.programs p ON sp.program_id = p.id
      WHERE sp.id = submissions.step_progress_id AND p.user_id = auth.uid()
    )
  );

-- Users can insert their own submissions
CREATE POLICY "Users can create submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.step_progress sp
      JOIN public.programs p ON sp.program_id = p.id
      WHERE sp.id = submissions.step_progress_id AND p.user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to submissions"
  ON public.submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===========================================
-- NOTIFICATIONS TABLE
-- ===========================================
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('submission_received', 'submission_approved', 'submission_rejected', 'step_unlocked', 'message')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow insert for notifications (system and admins)
CREATE POLICY "Enable insert for notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ===========================================
-- STORAGE BUCKET
-- ===========================================
-- Create a bucket for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('files', 'files', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');

-- Allow public read access to files
CREATE POLICY "Public read access to files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'files');

-- ===========================================
-- SEED DATA: Insert default steps
-- ===========================================
INSERT INTO public.steps (number, title, subtitle, description, duration_weeks, objectives, deliverables, resources) VALUES
(1, 'Diagnostic Opérationnel', 'Module Fondamental', 'Analyser précisément votre allocation de temps et identifier les leviers d''optimisation stratégique.', 2,
  '[{"icon": "FileText", "text": "Installer Google Sheets et créer une fiche simple de suivi de votre semaine sur 5 jours"}, {"icon": "Calendar", "text": "Tracker 7 jours complets par tranche de temps de 1h"}, {"icon": "Target", "text": "Envoyer le fichier complété pour validation et analyse"}]',
  '[{"title": "Tracker temps complété", "description": "Lien vers votre Google Sheet avec 7 jours de tracking", "type": "link", "required": true}]',
  '[{"title": "Template Tracker Temps", "url": "https://docs.google.com/spreadsheets/d/TEMPLATE", "type": "template"}, {"title": "Guide de remplissage", "url": "/guides/tracker-guide.pdf", "type": "guide"}]'
),
(2, 'Planification Stratégique', 'Organisation & Priorités', 'Définir vos priorités business et créer un système de planification efficace aligné avec vos objectifs.', 2,
  '[{"icon": "Target", "text": "Identifier vos 3 priorités business pour le trimestre"}, {"icon": "Calendar", "text": "Mettre en place votre système de planification hebdomadaire"}, {"icon": "CheckCircle", "text": "Créer votre matrice de priorisation des tâches"}]',
  '[{"title": "Plan stratégique trimestriel", "description": "Document avec vos 3 priorités et leur déclinaison en actions", "type": "file", "required": true}, {"title": "Planning hebdomadaire type", "description": "Votre semaine type optimisée", "type": "link", "required": true}]',
  '[{"title": "Template Plan Stratégique", "url": "/templates/plan-strategique.docx", "type": "template"}]'
),
(3, 'Délégation Efficace', 'Libérer votre temps', 'Identifier les tâches à déléguer et mettre en place des process de délégation efficaces.', 3,
  '[{"icon": "Users", "text": "Cartographier toutes vos tâches récurrentes"}, {"icon": "Settings", "text": "Créer des procédures de délégation documentées"}, {"icon": "CheckCircle", "text": "Former et accompagner sur les premières délégations"}]',
  '[{"title": "Matrice de délégation", "description": "Liste des tâches avec responsables assignés", "type": "file", "required": true}, {"title": "Procédures documentées", "description": "Au moins 3 procédures de tâches déléguées", "type": "file", "required": true}]',
  '[{"title": "Template Matrice Délégation", "url": "/templates/matrice-delegation.xlsx", "type": "template"}]'
),
(4, 'Optimisation des Process', 'Systématisation', 'Automatiser et optimiser vos processus clés pour gagner en efficacité.', 3,
  '[{"icon": "Settings", "text": "Identifier vos 5 processus les plus chronophages"}, {"icon": "Lightbulb", "text": "Proposer des optimisations et automatisations"}, {"icon": "Rocket", "text": "Implémenter au moins 2 automatisations"}]',
  '[{"title": "Audit des processus", "description": "Analyse des 5 processus avec temps et points de friction", "type": "file", "required": true}, {"title": "Plan d''automatisation", "description": "Solutions identifiées et planning de mise en œuvre", "type": "file", "required": true}]',
  '[{"title": "Template Audit Process", "url": "/templates/audit-process.xlsx", "type": "template"}]'
),
(5, 'Autonomie Opérationnelle', 'Pérennisation', 'Consolider vos acquis et mettre en place les rituels qui garantissent votre autonomie durable.', 2,
  '[{"icon": "BarChart3", "text": "Mesurer les gains de temps réalisés depuis le début"}, {"icon": "Calendar", "text": "Installer vos rituels de management hebdomadaires"}, {"icon": "CheckCircle", "text": "Finaliser votre système d''amélioration continue"}]',
  '[{"title": "Bilan des gains", "description": "Comparaison avant/après avec métriques", "type": "file", "required": true}, {"title": "Charte des rituels", "description": "Document récapitulatif de tous vos rituels", "type": "file", "required": true}, {"title": "Plan d''amélioration continue", "description": "Votre feuille de route pour les 6 prochains mois", "type": "file", "required": true}]',
  '[{"title": "Template Bilan", "url": "/templates/bilan-accompagnement.docx", "type": "template"}]'
);

-- ===========================================
-- FUNCTION: Initialize step progress for new program
-- ===========================================
CREATE OR REPLACE FUNCTION public.initialize_step_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert step_progress for each step
  INSERT INTO public.step_progress (program_id, step_id, status, started_at)
  SELECT 
    NEW.id,
    s.id,
    CASE WHEN s.number = 1 THEN 'in_progress' ELSE 'locked' END,
    CASE WHEN s.number = 1 THEN NOW() ELSE NULL END
  FROM public.steps s
  ORDER BY s.number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize step progress when a program is created
CREATE TRIGGER on_program_created
  AFTER INSERT ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.initialize_step_progress();

-- ===========================================
-- FUNCTION: Auto-update updated_at timestamp
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.steps FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.step_progress FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===========================================
-- CREATE YOUR ADMIN USER
-- ===========================================
-- After creating your account via the app, run this query to make yourself admin:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
