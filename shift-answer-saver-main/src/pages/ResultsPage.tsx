import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Download, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  MinusCircle,
  FileText
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Answer {
  id: string;
  status: 'ok' | 'nok' | 'na';
  justification: string | null;
  answered_at: string;
  question: {
    id: string;
    question_number: number;
    question_text: string;
  };
}

interface FormSession {
  id: string;
  shift: 'morning' | 'afternoon' | 'night';
  started_at: string;
  completed_at: string | null;
  user_id: string;
}

interface Stats {
  ok: number;
  nok: number;
  na: number;
  total: number;
  okPercent: number;
  nokPercent: number;
  naPercent: number;
}

const shiftLabels: Record<string, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
};

const statusIcons = {
  ok: <CheckCircle2 className="h-5 w-5 text-status-ok" />,
  nok: <XCircle className="h-5 w-5 text-status-nok" />,
  na: <MinusCircle className="h-5 w-5 text-status-na" />,
};

const statusLabels = {
  ok: 'OK',
  nok: 'NOK',
  na: 'N/A',
};

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [session, setSession] = useState<FormSession | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('form_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!sessionData) {
        toast({
          title: 'Sessão não encontrada',
          description: 'O checklist solicitado não existe.',
          variant: 'destructive',
        });
        navigate('/shift');
        return;
      }

      setSession(sessionData);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', sessionData.user_id)
        .maybeSingle();

      if (profileData) {
        setUserName(profileData.full_name);
      }

      // Fetch answers with questions
      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select(`
          id,
          status,
          justification,
          answered_at,
          question:questions(id, question_number, question_text)
        `)
        .eq('form_session_id', sessionId)
        .order('answered_at');

      if (answersError) throw answersError;

      // Transform the data to flatten the question
      const transformedAnswers = (answersData || []).map((a: any) => ({
        ...a,
        question: a.question,
      }));

      // Sort by question number
      transformedAnswers.sort((a: Answer, b: Answer) => 
        a.question.question_number - b.question.question_number
      );

      setAnswers(transformedAnswers);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const stats: Stats = {
    ok: answers.filter((a) => a.status === 'ok').length,
    nok: answers.filter((a) => a.status === 'nok').length,
    na: answers.filter((a) => a.status === 'na').length,
    total: answers.length,
    get okPercent() {
      return this.total > 0 ? Math.round((this.ok / this.total) * 100) : 0;
    },
    get nokPercent() {
      return this.total > 0 ? Math.round((this.nok / this.total) * 100) : 0;
    },
    get naPercent() {
      return this.total > 0 ? Math.round((this.na / this.total) * 100) : 0;
    },
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0a0a0a',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;

      // Calculate how many pages we need
      const scaledHeight = imgHeight * ratio;
      const pageHeight = pdfHeight - 20; // Leave some margin
      let heightLeft = scaledHeight;
      let position = 10;
      let page = 1;

      // First page
      pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, scaledHeight);
      heightLeft -= pageHeight;

      // Add more pages if needed
      while (heightLeft > 0) {
        position = heightLeft - scaledHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, scaledHeight);
        heightLeft -= pageHeight;
        page++;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`checklist-${shiftLabels[session?.shift || 'morning']}-${dateStr}.pdf`);

      toast({
        title: 'PDF Exportado!',
        description: 'O relatório foi baixado com sucesso.',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o PDF.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header />

      {/* Action Buttons */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border py-4">
        <div className="container max-w-4xl px-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/shift')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button
            onClick={exportToPDF}
            disabled={exporting}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exportar PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <main className="container max-w-4xl px-4 py-6">
        <div ref={reportRef} className="space-y-6 p-6 bg-background">
          {/* Header */}
          <div className="text-center border-b border-border pb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                Relatório do Checklist
              </h1>
            </div>
            <p className="text-muted-foreground">
              Turno: <span className="font-semibold text-foreground">{shiftLabels[session?.shift || 'morning']}</span>
            </p>
          </div>

          {/* Session Info */}
          <Card className="p-4 bg-card/50 border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Responsável:</span>
                <p className="font-medium text-foreground">{userName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Turno:</span>
                <p className="font-medium text-foreground">{shiftLabels[session?.shift || 'morning']}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Início:</span>
                <p className="font-medium text-foreground">{session ? formatDate(session.started_at) : 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Conclusão:</span>
                <p className="font-medium text-foreground">
                  {session?.completed_at ? formatDate(session.completed_at) : 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          {/* Statistics */}
          <Card className="p-6 bg-card/50 border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Estatísticas</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-status-ok/10 border border-status-ok/30">
                <CheckCircle2 className="h-8 w-8 text-status-ok mx-auto mb-2" />
                <p className="text-3xl font-bold text-status-ok">{stats.okPercent}%</p>
                <p className="text-sm text-muted-foreground">OK ({stats.ok})</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-status-nok/10 border border-status-nok/30">
                <XCircle className="h-8 w-8 text-status-nok mx-auto mb-2" />
                <p className="text-3xl font-bold text-status-nok">{stats.nokPercent}%</p>
                <p className="text-sm text-muted-foreground">NOK ({stats.nok})</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-status-na/10 border border-status-na/30">
                <MinusCircle className="h-8 w-8 text-status-na mx-auto mb-2" />
                <p className="text-3xl font-bold text-status-na">{stats.naPercent}%</p>
                <p className="text-sm text-muted-foreground">N/A ({stats.na})</p>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Total de perguntas: {stats.total}
            </div>
          </Card>

          {/* Answers List */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground mb-4">Respostas Detalhadas</h2>
            
            {answers.map((answer) => (
              <Card
                key={answer.id}
                className={`p-4 bg-card/50 border-l-4 ${
                  answer.status === 'ok'
                    ? 'border-l-status-ok'
                    : answer.status === 'nok'
                    ? 'border-l-status-nok'
                    : 'border-l-status-na'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        #{answer.question.question_number}
                      </Badge>
                      <span className="text-sm text-foreground">
                        {answer.question.question_text}
                      </span>
                    </div>
                    {answer.status === 'nok' && answer.justification && (
                      <div className="mt-2 pl-4 border-l-2 border-status-nok/50">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-status-nok">Justificativa:</span>{' '}
                          {answer.justification}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcons[answer.status]}
                    <span
                      className={`text-sm font-medium ${
                        answer.status === 'ok'
                          ? 'text-status-ok'
                          : answer.status === 'nok'
                          ? 'text-status-nok'
                          : 'text-status-na'
                      }`}
                    >
                      {statusLabels[answer.status]}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center pt-6 border-t border-border text-sm text-muted-foreground">
            <p>Relatório gerado em {formatDate(new Date().toISOString())}</p>
            <p className="mt-1">Sistema de Checklist Industrial</p>
          </div>
        </div>
      </main>
    </div>
  );
}
