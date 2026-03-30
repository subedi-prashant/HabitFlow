-- ============================================
-- HabitFlow: Initial Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. users_profile
-- ============================================
CREATE TABLE public.users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.users_profile FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users_profile FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users_profile FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON public.users_profile FOR DELETE
  USING (auth.uid() = id);

-- ============================================
-- 2. habits
-- ============================================
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '✅',
  color TEXT DEFAULT '#4F46E5',
  category TEXT DEFAULT 'Custom' CHECK (category IN ('Health', 'Fitness', 'Learning', 'Mindfulness', 'Custom')),
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),
  frequency_days INT[] DEFAULT '{}',
  target_value NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'times',
  reminder_time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. habit_logs
-- ============================================
CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  value NUMERIC DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(habit_id, logged_at)
);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habit logs"
  ON public.habit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit logs"
  ON public.habit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit logs"
  ON public.habit_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit logs"
  ON public.habit_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. routines
-- ============================================
CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'custom' CHECK (type IN ('morning', 'evening', 'fitness', 'custom')),
  habit_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routines"
  ON public.routines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routines"
  ON public.routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines"
  ON public.routines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines"
  ON public.routines FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. streaks
-- ============================================
CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_logged_date DATE,
  UNIQUE(habit_id, user_id)
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streaks"
  ON public.streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON public.streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON public.streaks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streaks"
  ON public.streaks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. Functions & Triggers
-- ============================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create streak record when a new habit is created
CREATE OR REPLACE FUNCTION public.handle_new_habit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.streaks (habit_id, user_id, current_streak, longest_streak)
  VALUES (NEW.id, NEW.user_id, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_habit_created
  AFTER INSERT ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_habit();

-- Update streak when a habit is logged
CREATE OR REPLACE FUNCTION public.update_streak_on_log()
RETURNS TRIGGER AS $$
DECLARE
  streak_record RECORD;
  habit_record RECORD;
  new_current_streak INT;
BEGIN
  -- Get the habit to check target_value
  SELECT * INTO habit_record FROM public.habits WHERE id = NEW.habit_id;

  -- Only count as completed if value >= target_value
  IF NEW.value < habit_record.target_value THEN
    RETURN NEW;
  END IF;

  -- Get existing streak
  SELECT * INTO streak_record FROM public.streaks
  WHERE habit_id = NEW.habit_id AND user_id = NEW.user_id;

  IF streak_record IS NULL THEN
    INSERT INTO public.streaks (habit_id, user_id, current_streak, longest_streak, last_logged_date)
    VALUES (NEW.habit_id, NEW.user_id, 1, 1, NEW.logged_at);
  ELSE
    IF streak_record.last_logged_date = NEW.logged_at THEN
      -- Already logged today, no streak change
      RETURN NEW;
    ELSIF streak_record.last_logged_date = NEW.logged_at - INTERVAL '1 day' THEN
      -- Consecutive day
      new_current_streak := streak_record.current_streak + 1;
    ELSE
      -- Streak broken, start fresh
      new_current_streak := 1;
    END IF;

    UPDATE public.streaks
    SET
      current_streak = new_current_streak,
      longest_streak = GREATEST(streak_record.longest_streak, new_current_streak),
      last_logged_date = NEW.logged_at
    WHERE habit_id = NEW.habit_id AND user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_habit_logged
  AFTER INSERT OR UPDATE ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_streak_on_log();

-- ============================================
-- 7. Indexes for performance
-- ============================================
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habit_logs_user_id ON public.habit_logs(user_id);
CREATE INDEX idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX idx_habit_logs_logged_at ON public.habit_logs(logged_at);
CREATE INDEX idx_streaks_user_id ON public.streaks(user_id);
CREATE INDEX idx_routines_user_id ON public.routines(user_id);
