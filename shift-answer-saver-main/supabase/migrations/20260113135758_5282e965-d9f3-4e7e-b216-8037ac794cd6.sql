-- Drop the old area_type enum and create a new one
ALTER TABLE public.form_sessions DROP COLUMN area;
DROP TYPE IF EXISTS public.area_type;

-- Create new area_type enum with only two values
CREATE TYPE public.area_type AS ENUM ('estamparia', 'solda');

-- Create production_lines table
CREATE TABLE public.production_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area public.area_type NOT NULL,
  line_number INTEGER NOT NULL,
  line_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(area, line_number)
);

-- Create operations table
CREATE TABLE public.operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_line_id UUID NOT NULL REFERENCES public.production_lines(id),
  operation_number INTEGER NOT NULL,
  operation_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(production_line_id, operation_number)
);

-- Add new columns to form_sessions
ALTER TABLE public.form_sessions 
  ADD COLUMN area public.area_type NOT NULL DEFAULT 'estamparia',
  ADD COLUMN production_line_id UUID REFERENCES public.production_lines(id),
  ADD COLUMN operation_id UUID REFERENCES public.operations(id);

-- Enable RLS on new tables
ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

-- RLS policies for production_lines (read-only for all authenticated users)
CREATE POLICY "Anyone can view production lines" 
ON public.production_lines 
FOR SELECT 
USING (true);

-- RLS policies for operations (read-only for all authenticated users)
CREATE POLICY "Anyone can view operations" 
ON public.operations 
FOR SELECT 
USING (true);

-- Insert production lines for Estamparia
INSERT INTO public.production_lines (area, line_number, line_name) VALUES
  ('estamparia', 1, 'Linha 1'),
  ('estamparia', 2, 'Linha 2'),
  ('estamparia', 3, 'Linha 3'),
  ('estamparia', 4, 'Linha 4'),
  ('estamparia', 5, 'Linha 5');

-- Insert production lines for Solda
INSERT INTO public.production_lines (area, line_number, line_name) VALUES
  ('solda', 1, 'Linha 1'),
  ('solda', 2, 'Linha 2'),
  ('solda', 3, 'Linha 3'),
  ('solda', 4, 'Linha 4'),
  ('solda', 5, 'Linha 5');

-- Insert operations for each production line (5 operations per line)
INSERT INTO public.operations (production_line_id, operation_number, operation_name)
SELECT pl.id, op.n, 'Operação ' || op.n
FROM public.production_lines pl
CROSS JOIN (SELECT generate_series(1, 5) AS n) op;