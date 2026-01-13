-- Tabela de documentos de auxílio (PDFs/arquivos) por área/linha/operação
CREATE TABLE IF NOT EXISTS public.help_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area public.area_type NOT NULL,
  production_line_id UUID REFERENCES public.production_lines(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES public.operations(id) ON DELETE CASCADE,
  title TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS help_documents_lookup_idx
ON public.help_documents (area, production_line_id, operation_id);

-- RLS
ALTER TABLE public.help_documents ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar documentos de auxílio
CREATE POLICY "Anyone can view help documents"
ON public.help_documents
FOR SELECT
TO authenticated
USING (true);

-- Somente o uploader pode inserir/alterar/remover seus próprios registros
CREATE POLICY "Users can insert their own help documents"
ON public.help_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own help documents"
ON public.help_documents
FOR UPDATE
TO authenticated
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own help documents"
ON public.help_documents
FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by);

-- Storage bucket (privado) para os arquivos
INSERT INTO storage.buckets (id, name, public)
VALUES ('help-documents', 'help-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policies em storage.objects para permitir upload/leitura por usuários autenticados
CREATE POLICY "Authenticated can read help documents objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'help-documents');

CREATE POLICY "Users can upload their own help documents objects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'help-documents' AND auth.uid() = owner);

CREATE POLICY "Users can update their own help documents objects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'help-documents' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own help documents objects"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'help-documents' AND auth.uid() = owner);

