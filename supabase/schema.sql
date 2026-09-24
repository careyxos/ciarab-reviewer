-- ==============================================================================
-- CHOBEE AI STUDY PLATFORM - SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- ==============================================================================
-- Real-time multi-device cloud architecture for Chobee Smart AI Study Companion
-- Compatible with Supabase Auth, PostgreSQL, Realtime WebSocket Presence, and RLS

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. User Profiles Table (Linked to auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'free', 'premium', 'admin')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'unlimited')),
  daily_token_limit INTEGER DEFAULT 100,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_disabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen_at DESC);

-- ==============================================================================
-- 3. Multi-Device User Sessions & Real-Time Presence Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  device_type TEXT DEFAULT 'Desktop', -- 'Mobile', 'Desktop', 'Tablet'
  browser_info TEXT DEFAULT 'Chrome / Windows',
  is_active BOOLEAN DEFAULT TRUE,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_device_session UNIQUE (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active, last_heartbeat DESC);

-- ==============================================================================
-- 4. Daily AI Token Usage Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tokens_allocated INTEGER NOT NULL DEFAULT 100,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_remaining INTEGER NOT NULL DEFAULT 100,
  last_reset_time TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_daily_usage UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_usage(user_id, date);

-- ==============================================================================
-- 5. AI Activity Logs Table (Audit Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'flashcards', 'quiz', 'summary', 'studyGuide', 'chat', 'regenerate'
  tokens_used INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  user_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_timestamp ON public.ai_usage_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_timestamp ON public.ai_usage_logs(timestamp DESC);

-- ==============================================================================
-- 6. User Study Materials Table (Cloud-Saved Reviewers & Flashcard Sets)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.study_materials (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  data JSONB NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  share_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe migrations if columns were not previously present
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS share_code TEXT;

CREATE INDEX IF NOT EXISTS idx_study_materials_user ON public.study_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_updated ON public.study_materials(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_materials_public ON public.study_materials(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_study_materials_share ON public.study_materials(share_code) WHERE share_code IS NOT NULL;

-- ==============================================================================
-- 6B. Study Files Metadata Table (PDF, DOCX, PPTX, TXT, External URLs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.study_files (
  id TEXT PRIMARY KEY DEFAULT ('file_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  study_set_id TEXT REFERENCES public.study_materials(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'external_url', 'manual_notes')),
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_study_files_user ON public.study_files(user_id);
CREATE INDEX IF NOT EXISTS idx_study_files_set ON public.study_files(study_set_id);
CREATE INDEX IF NOT EXISTS idx_study_files_type ON public.study_files(source_type);
CREATE INDEX IF NOT EXISTS idx_study_files_created ON public.study_files(user_id, created_at DESC);

-- ==============================================================================
-- 6C. Study Notes Table (Manually Created Notes Content - Stored in Database)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.study_notes (
  id TEXT PRIMARY KEY DEFAULT ('note_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  study_set_id TEXT REFERENCES public.study_materials(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_study_notes_user ON public.study_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_set ON public.study_notes(study_set_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_created ON public.study_notes(user_id, created_at DESC);

-- ==============================================================================
-- 6D. Supabase Storage Bucket Initialization (Private study-files bucket)
-- ==============================================================================
-- Ensure the storage bucket exists, is strictly private, and has security limits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-files',
  'study-files',
  FALSE,
  52428800, -- 50 MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET 
  public = FALSE,
  file_size_limit = 52428800;

-- ==============================================================================
-- 7. Database Stored Procedures & Functions
-- ==============================================================================

-- A. Auto-create Profile and Daily Usage upon Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := 'user';
  v_plan TEXT := 'free';
  v_limit INTEGER := 100;
  v_ref_code TEXT;
  v_referred_by TEXT;
BEGIN
  -- Generate unique referral code
  v_ref_code := 'CHOBEE-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 6));
  
  -- Check admin whitelist
  IF LOWER(NEW.email) IN ('careysison21@gmail.com', 'ciarabernadette12@gmail.com', 'carey@chobee.app') THEN
    v_role := 'admin';
    v_plan := 'unlimited';
    v_limit := 999999;
  END IF;

  -- Extract referred_by metadata if provided during signup
  v_referred_by := (NEW.raw_user_meta_data->>'referred_by');

  -- Insert profile
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    role,
    plan,
    daily_token_limit,
    referral_code,
    referred_by,
    created_at,
    last_login_at,
    last_seen_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    v_role,
    v_plan,
    v_limit,
    v_ref_code,
    v_referred_by,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    last_login_at = NOW(),
    last_seen_at = NOW();

  -- Insert initial daily usage for today
  INSERT INTO public.daily_usage (
    user_id,
    date,
    tokens_allocated,
    tokens_used,
    tokens_remaining,
    last_reset_time
  ) VALUES (
    NEW.id,
    CURRENT_DATE,
    v_limit,
    0,
    v_limit,
    NOW()
  )
  ON CONFLICT (user_id, date) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Atomic Token Deduction with Row Locking
CREATE OR REPLACE FUNCTION public.deduct_daily_tokens(
  p_user_id UUID,
  p_cost INTEGER,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_usage RECORD;
  v_profile RECORD;
BEGIN
  -- Get user profile
  SELECT role, daily_token_limit, is_disabled INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  IF v_profile.is_disabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account is disabled');
  END IF;

  -- Admin accounts have unlimited tokens
  IF v_profile.role = 'admin' THEN
    RETURN jsonb_build_object(
      'success', true, 
      'remaining', 999999, 
      'allocated', 999999, 
      'used', 0,
      'is_admin', true
    );
  END IF;

  -- Lock daily usage row for update
  SELECT * INTO v_usage
  FROM public.daily_usage
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  -- Initialize if not exists
  IF NOT FOUND THEN
    INSERT INTO public.daily_usage (
      user_id,
      date,
      tokens_allocated,
      tokens_used,
      tokens_remaining,
      last_reset_time
    ) VALUES (
      p_user_id,
      p_date,
      v_profile.daily_token_limit,
      0,
      v_profile.daily_token_limit,
      NOW()
    )
    RETURNING * INTO v_usage;
  END IF;

  -- Check balance
  IF v_usage.tokens_remaining < p_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient daily tokens',
      'remaining', v_usage.tokens_remaining,
      'required', p_cost
    );
  END IF;

  -- Deduct tokens
  UPDATE public.daily_usage
  SET
    tokens_used = tokens_used + p_cost,
    tokens_remaining = tokens_remaining - p_cost
  WHERE id = v_usage.id
  RETURNING * INTO v_usage;

  RETURN jsonb_build_object(
    'success', true,
    'remaining', v_usage.tokens_remaining,
    'allocated', v_usage.tokens_allocated,
    'used', v_usage.tokens_used
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Token Refund on AI Failure
CREATE OR REPLACE FUNCTION public.refund_daily_tokens(
  p_user_id UUID,
  p_cost INTEGER,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.daily_usage
  SET
    tokens_used = GREATEST(0, tokens_used - p_cost),
    tokens_remaining = LEAST(tokens_allocated, tokens_remaining + p_cost)
  WHERE user_id = p_user_id AND date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Heartbeat Presence Update (Multi-Device)
CREATE OR REPLACE FUNCTION public.heartbeat_presence(
  p_user_id UUID,
  p_session_id TEXT,
  p_device_type TEXT,
  p_browser_info TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Upsert active session
  INSERT INTO public.user_sessions (
    user_id,
    session_id,
    device_type,
    browser_info,
    is_active,
    last_heartbeat
  ) VALUES (
    p_user_id,
    p_session_id,
    p_device_type,
    p_browser_info,
    TRUE,
    NOW()
  )
  ON CONFLICT (user_id, session_id) DO UPDATE SET
    device_type = EXCLUDED.device_type,
    browser_info = EXCLUDED.browser_info,
    is_active = TRUE,
    last_heartbeat = NOW();

  -- Update user last_seen_at
  UPDATE public.profiles
  SET last_seen_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- E. Inactive Session Cleanup (Mark offline if no heartbeat in 2 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_active = FALSE
  WHERE is_active = TRUE AND last_heartbeat < (NOW() - INTERVAL '2 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 8. Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own display profile" ON public.profiles;
CREATE POLICY "Users can update own display profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- USER SESSIONS POLICIES
DROP POLICY IF EXISTS "Users can manage own sessions or admins view all" ON public.user_sessions;
CREATE POLICY "Users can manage own sessions or admins view all"
  ON public.user_sessions FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- DAILY USAGE POLICIES
DROP POLICY IF EXISTS "Users can view own usage or admins view all" ON public.daily_usage;
CREATE POLICY "Users can view own usage or admins view all"
  ON public.daily_usage FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- AI USAGE LOGS POLICIES
DROP POLICY IF EXISTS "Users can view own logs or admins view all" ON public.ai_usage_logs;
CREATE POLICY "Users can view own logs or admins view all"
  ON public.ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- STUDY MATERIALS POLICIES (Secure Sharing + Strict Data Ownership)
DROP POLICY IF EXISTS "Users can manage own study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Users can view own or public study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Users can insert own study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Users can update own study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Users can delete own study materials" ON public.study_materials;

-- SELECT: Owner, Admin, or Public/Shared sets
CREATE POLICY "Users can view own or public study materials"
  ON public.study_materials FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE OR public.is_admin());

-- INSERT: Only owner or admin
CREATE POLICY "Users can insert own study materials"
  ON public.study_materials FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- UPDATE: Only owner or admin
CREATE POLICY "Users can update own study materials"
  ON public.study_materials FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- DELETE: Only owner or admin
CREATE POLICY "Users can delete own study materials"
  ON public.study_materials FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- STUDY FILES POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.study_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own or public study files" ON public.study_files;
DROP POLICY IF EXISTS "Users can insert own study files" ON public.study_files;
DROP POLICY IF EXISTS "Users can update own study files" ON public.study_files;
DROP POLICY IF EXISTS "Users can delete own study files" ON public.study_files;

-- SELECT: Owner, Admin, or files linked to a public study set
CREATE POLICY "Users can view own or public study files"
  ON public.study_files FOR SELECT
  USING (
    auth.uid() = user_id 
    OR public.is_admin()
    OR (
      study_set_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.study_materials 
        WHERE public.study_materials.id = public.study_files.study_set_id 
        AND public.study_materials.is_public = TRUE
      )
    )
  );

-- INSERT: Owner or admin
CREATE POLICY "Users can insert own study files"
  ON public.study_files FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- UPDATE: Owner or admin
CREATE POLICY "Users can update own study files"
  ON public.study_files FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- DELETE: Owner or admin
CREATE POLICY "Users can delete own study files"
  ON public.study_files FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- STUDY NOTES POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own or public study notes" ON public.study_notes;
DROP POLICY IF EXISTS "Users can insert own study notes" ON public.study_notes;
DROP POLICY IF EXISTS "Users can update own study notes" ON public.study_notes;
DROP POLICY IF EXISTS "Users can delete own study notes" ON public.study_notes;

CREATE POLICY "Users can view own or public study notes"
  ON public.study_notes FOR SELECT
  USING (
    auth.uid() = user_id 
    OR public.is_admin()
    OR (
      study_set_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.study_materials 
        WHERE public.study_materials.id = public.study_notes.study_set_id 
        AND public.study_materials.is_public = TRUE
      )
    )
  );

CREATE POLICY "Users can insert own study notes"
  ON public.study_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update own study notes"
  ON public.study_notes FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete own study notes"
  ON public.study_notes FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- STORAGE BUCKET POLICIES (study-files: Private, user-isolated folders)
-- ------------------------------------------------------------------------------
-- Pattern: study-files/{user_id}/{file_id}/{file_name}
DROP POLICY IF EXISTS "Users can upload own study files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own study files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own study files" ON storage.objects;

CREATE POLICY "Users can upload own study files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'study-files' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own study files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'study-files' 
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "Users can delete own study files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'study-files' 
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- ==============================================================================
-- 9. Enable Realtime Publications
-- ==============================================================================
-- Enable Realtime broadcast on tables for live presence and instant updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'daily_usage'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_usage;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'study_materials'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.study_materials;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'study_files'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.study_files;
  END IF;
END $$;
