import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, FileText } from 'lucide-react';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-lg px-4 py-16">
        <div className="flex flex-col items-center text-center animate-fade-in">
          <div className="h-24 w-24 rounded-full bg-status-ok/20 flex items-center justify-center mb-6 shadow-glow-ok">
            <CheckCircle2 className="h-14 w-14 text-status-ok" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Checklist Enviado!
          </h1>
          
          <p className="text-muted-foreground mb-8">
            Suas respostas foram registradas com sucesso no sistema.
            Os dados estão disponíveis para consulta.
          </p>

          <div className="w-full space-y-3">
            {sessionId && (
              <Button
                onClick={() => navigate(`/results/${sessionId}`)}
                variant="outline"
                className="w-full py-6 text-lg font-semibold gap-2"
              >
                <FileText className="h-5 w-5" />
                Ver Relatório e Exportar PDF
              </Button>
            )}
            <Button
              onClick={() => navigate('/shift')}
              className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-glow-primary"
            >
              Novo Checklist
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
