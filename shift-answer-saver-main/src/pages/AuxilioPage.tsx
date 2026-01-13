import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, ExternalLink, FileUp, Loader2 } from 'lucide-react';

type AreaType = 'estamparia' | 'solda';

interface LocationState {
  area: AreaType;
  productionLineId: string;
  operationId: string;
}

type DocScope = 'area' | 'line' | 'operation';

interface HelpDocumentRow {
  id: string;
  created_at: string;
  uploaded_by: string;
  area: AreaType;
  production_line_id: string | null;
  operation_id: string | null;
  title: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '');
}

export default function AuxilioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const locationState = location.state as LocationState | null;

  const [docs, setDocs] = useState<HelpDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [scope, setScope] = useState<DocScope>('line');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!locationState?.area || !locationState?.productionLineId || !locationState?.operationId) {
      navigate('/area');
      return;
    }
    void fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationState?.area, locationState?.productionLineId, locationState?.operationId]);

  const filteredDocs = useMemo(() => {
    if (!locationState) return [];
    return docs.filter((d) => {
      const lineOk = d.production_line_id === null || d.production_line_id === locationState.productionLineId;
      const opOk = d.operation_id === null || d.operation_id === locationState.operationId;
      return d.area === locationState.area && lineOk && opOk;
    });
  }, [docs, locationState]);

  const areaDocs = filteredDocs.filter((d) => d.production_line_id === null && d.operation_id === null);
  const lineDocs = filteredDocs.filter((d) => d.production_line_id !== null && d.operation_id === null);
  const operationDocs = filteredDocs.filter((d) => d.operation_id !== null);

  const fetchDocs = async () => {
    if (!locationState) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('help_documents')
        .select('*')
        .eq('area', locationState.area)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocs((data as HelpDocumentRow[]) || []);
    } catch (error) {
      console.error('Error fetching help documents:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os documentos de auxílio.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openDoc = async (doc: HelpDocumentRow) => {
    try {
      const { data, error } = await supabase.storage
        .from('help-documents')
        .createSignedUrl(doc.file_path, 60 * 10); // 10 min

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening help document:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir o documento.',
        variant: 'destructive',
      });
    }
  };

  const handleUpload = async () => {
    if (!user || !locationState) return;
    if (!file) {
      toast({
        title: 'Selecione um arquivo',
        description: 'Escolha um PDF ou documento para enviar.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const safeName = sanitizeFileName(file.name) || `documento-${Date.now()}`;
      const filePath = [
        `area=${locationState.area}`,
        `line=${scope === 'area' ? 'all' : locationState.productionLineId}`,
        `operation=${scope !== 'operation' ? 'all' : locationState.operationId}`,
        `${Date.now()}-${safeName}`,
      ].join('/');

      const uploadRes = await supabase.storage
        .from('help-documents')
        .upload(filePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadRes.error) throw uploadRes.error;

      const insertPayload = {
        uploaded_by: user.id,
        area: locationState.area,
        production_line_id: scope === 'area' ? null : locationState.productionLineId,
        operation_id: scope === 'operation' ? locationState.operationId : null,
        title: title.trim() ? title.trim() : null,
        file_name: file.name,
        file_path: filePath,
        mime_type: file.type || 'application/octet-stream',
      };

      const { error: insertError } = await supabase.from('help_documents').insert(insertPayload);
      if (insertError) throw insertError;

      toast({
        title: 'Documento enviado!',
        description: 'O documento de auxílio foi cadastrado com sucesso.',
      });

      setTitle('');
      setFile(null);
      const input = document.getElementById('help-doc-file') as HTMLInputElement | null;
      if (input) input.value = '';

      await fetchDocs();
    } catch (error) {
      console.error('Error uploading help document:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar/cadastrar o documento.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (!locationState) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-3xl px-4 py-8">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-2">Auxílio</h1>
          <p className="text-muted-foreground">
            Cadastre e consulte documentos (PDFs) para apoiar o preenchimento do checklist.
          </p>
        </div>

        <Card className="p-4 bg-card/50 border-border mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Resumo da Seleção</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <p className="text-foreground">
              <span className="text-muted-foreground">Área:</span> {locationState.area}
            </p>
            <p className="text-foreground">
              <span className="text-muted-foreground">Linha:</span> {locationState.productionLineId}
            </p>
            <p className="text-foreground">
              <span className="text-muted-foreground">Operação:</span> {locationState.operationId}
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 border-border mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Adicionar documento de auxílio</h2>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Tipo de vínculo</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as DocScope)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">Área (vale para todas as linhas/operações)</SelectItem>
                  <SelectItem value="line">Linha (vale para todas as operações da linha)</SelectItem>
                  <SelectItem value="operation">Operação (específico da operação)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="help-doc-title">Título (opcional)</Label>
              <Input
                id="help-doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Instrução de setup / padrão de inspeção"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="help-doc-file">Arquivo</Label>
              <Input
                id="help-doc-file"
                type="file"
                accept=".pdf,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: PDF. Você pode enviar DOC/DOCX também.
              </p>
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-glow-primary disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-5 w-5" />
                  Enviar documento
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 border-border mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Documentos disponíveis para esta seleção</h2>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Área</p>
                {areaDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum documento cadastrado para a área.</p>
                ) : (
                  <div className="space-y-2">
                    {areaDocs.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{d.title || d.file_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.file_name}</p>
                        </div>
                        <Button variant="outline" className="gap-2" onClick={() => openDoc(d)}>
                          <ExternalLink className="h-4 w-4" />
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Linha</p>
                {lineDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum documento cadastrado para a linha.</p>
                ) : (
                  <div className="space-y-2">
                    {lineDocs.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{d.title || d.file_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.file_name}</p>
                        </div>
                        <Button variant="outline" className="gap-2" onClick={() => openDoc(d)}>
                          <ExternalLink className="h-4 w-4" />
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Operação</p>
                {operationDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum documento cadastrado para a operação.</p>
                ) : (
                  <div className="space-y-2">
                    {operationDocs.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{d.title || d.file_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.file_name}</p>
                        </div>
                        <Button variant="outline" className="gap-2" onClick={() => openDoc(d)}>
                          <ExternalLink className="h-4 w-4" />
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/area')}
            className="flex-1 py-6 text-lg"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Voltar
          </Button>
          <Button
            onClick={() =>
              navigate('/shift', {
                state: locationState,
              })
            }
            className="flex-1 py-6 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-glow-primary"
          >
            Continuar para turno
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </main>
    </div>
  );
}

