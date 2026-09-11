CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  performed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INT CHECK (duration_minutes BETWEEN 1 AND 1440),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workout_sessions_id_user_id_key UNIQUE (id, user_id)
);

CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  muscle_group TEXT NOT NULL DEFAULT 'Other' CHECK (muscle_group IN ('Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full Body', 'Other')),
  position INT NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workout_exercises_session_user_fkey
    FOREIGN KEY (session_id, user_id)
    REFERENCES public.workout_sessions(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT workout_exercises_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT workout_exercises_session_position_key UNIQUE (session_id, position)
);

CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_number INT NOT NULL CHECK (set_number > 0),
  reps INT NOT NULL CHECK (reps BETWEEN 1 AND 1000),
  weight_kg NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
  rpe NUMERIC(3,1) CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  is_warmup BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workout_sets_exercise_user_fkey
    FOREIGN KEY (exercise_id, user_id)
    REFERENCES public.workout_exercises(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT workout_sets_exercise_number_key UNIQUE (exercise_id, set_number)
);

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('Walking', 'Running', 'Cycling', 'Swimming', 'Hiking', 'Sport', 'Yoga', 'Mobility', 'Other')),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  performed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INT NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
  distance_km NUMERIC(8,2) CHECK (distance_km IS NULL OR distance_km >= 0),
  calories INT CHECK (calories IS NULL OR calories >= 0),
  intensity TEXT NOT NULL DEFAULT 'Moderate' CHECK (intensity IN ('Low', 'Moderate', 'High')),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workout sessions"
  ON public.workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout sessions"
  ON public.workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout sessions"
  ON public.workout_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout sessions"
  ON public.workout_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own workout exercises"
  ON public.workout_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout exercises"
  ON public.workout_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout exercises"
  ON public.workout_exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout exercises"
  ON public.workout_exercises FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own workout sets"
  ON public.workout_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout sets"
  ON public.workout_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout sets"
  ON public.workout_sets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout sets"
  ON public.workout_sets FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity logs"
  ON public.activity_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity logs"
  ON public.activity_logs FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX workout_sessions_user_date_idx ON public.workout_sessions (user_id, performed_on DESC);
CREATE INDEX workout_exercises_session_idx ON public.workout_exercises (session_id, position);
CREATE INDEX workout_sets_exercise_idx ON public.workout_sets (exercise_id, set_number);
CREATE INDEX activity_logs_user_date_idx ON public.activity_logs (user_id, performed_on DESC);
CREATE INDEX activity_logs_user_type_idx ON public.activity_logs (user_id, activity_type);

CREATE OR REPLACE FUNCTION public.set_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_training_updated_at();

CREATE TRIGGER set_activity_logs_updated_at
  BEFORE UPDATE ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_training_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
