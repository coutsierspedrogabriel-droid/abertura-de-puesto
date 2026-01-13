-- Create area enum
CREATE TYPE public.area_type AS ENUM ('production', 'warehouse', 'maintenance', 'quality', 'logistics', 'administrative');

-- Add area column to form_sessions
ALTER TABLE public.form_sessions ADD COLUMN area public.area_type NOT NULL DEFAULT 'production';