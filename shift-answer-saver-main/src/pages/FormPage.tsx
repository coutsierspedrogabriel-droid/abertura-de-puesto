import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { QuestionCard } from '@/components/QuestionCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

type Status = 'ok' | 'nok' | 'na' | null;

interface Question {
  id: string;
  question_number: number;
  question_text: string;
}

interface Answer {
  questionId: string;
  status: Status;
  justification: string;
}

export default function FormPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('question_number');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as perguntas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, status: Status, justification: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      newAnswers.set(questionId, { questionId, status, justification });
      return newAnswers;
    });
    // Clear error when answered
    if (errors.has(questionId)) {
      setErrors((prev) => {
        const newErrors = new Set(prev);
        newErrors.delete(questionId);
        return newErrors;
      });
    }
  };

  const progress = useMemo(() => {
    const answered = Array.from(answers.values()).filter((a) => a.status !== null).length;
    return questions.length > 0 ? (answered / questions.length) * 100 : 0;
  }, [answers, questions]);

  const validateForm = (): boolean => {
    const newErrors = new Set<string>();

    questions.forEach((q) => {
      const answer = answers.get(q.id);
      if (!answer || answer.status === null) {
        newErrors.add(q.id);
      } else if (answer.status === 'nok' && !answer.justification.trim()) {
        newErrors.add(q.id);
      }
    });

    setErrors(newErrors);
    return newErrors.size === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Formulário incompleto',
        description: 'Por favor, responda todas as perguntas e adicione justificativas para NOK.',
        variant: 'destructive',
      });
      // Scroll to first error
      const firstError = Array.from(errors)[0];
      document.getElementById(`question-${firstError}`)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    try {
      const answersToInsert = Array.from(answers.values()).map((a) => ({
        form_session_id: sessionId,
        question_id: a.questionId,
        status: a.status as 'ok' | 'nok' | 'na',
        justification: a.justification || null,
      }));

      const { error: answersError } = await supabase
        .from('answers')
        .insert(answersToInsert);

      if (answersError) throw answersError;

      // Mark session as complete
      const { error: sessionError } = await supabase
        .from('form_sessions')
        .update({
          is_complete: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      toast({
        title: 'Checklist enviado!',
        description: 'Suas respostas foram salvas com sucesso.',
      });

      navigate(`/results/${sessionId}`);
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível salvar as respostas. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
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

  const answeredCount = Array.from(answers.values()).filter((a) => a.status !== null).length;
  const nokCount = Array.from(answers.values()).filter((a) => a.status === 'nok').length;

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />

      {/* Progress Bar */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border py-4">
        <div className="container max-w-3xl px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Progresso: {answeredCount}/{questions.length}
            </span>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-status-ok">
                <CheckCircle2 className="h-4 w-4" />
                {Array.from(answers.values()).filter((a) => a.status === 'ok').length}
              </span>
              <span className="flex items-center gap-1 text-status-nok">
                <AlertCircle className="h-4 w-4" />
                {nokCount}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Questions */}
      <main className="container max-w-3xl px-4 py-6">
        <div className="space-y-4">
          {questions.map((question) => (
            <div key={question.id} id={`question-${question.id}`}>
              <QuestionCard
                questionNumber={question.question_number}
                questionText={question.question_text}
                onAnswer={(status, justification) =>
                  handleAnswer(question.id, status, justification)
                }
                hasError={errors.has(question.id)}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Submit Button - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
        <div className="container max-w-3xl">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-glow-primary"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Enviar Checklist
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
