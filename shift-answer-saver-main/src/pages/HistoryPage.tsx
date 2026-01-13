import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Loader2,
  ArrowLeft,
  FileText,
  Filter,
  Calendar,
  Sun,
  Sunset,
  Moon,
  Factory,
  Zap,
} from 'lucide-react';

type ShiftType = 'morning' | 'afternoon' | 'night';
type AreaType = 'estamparia' | 'solda';

interface FormSession {
  id: string;
  shift: ShiftType;
  area: AreaType;
  started_at: string;
  completed_at: string | null;
  is_complete: boolean;
  production_line_id: string | null;
  operation_id: string | null;
}

interface ProductionLine {
  id: string;
  line_name: string;
}

interface Operation {
  id: string;
  operation_name: string;
}

const shiftLabels: Record<ShiftType, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
};

const areaLabels: Record<AreaType, string> = {
  estamparia: 'Estamparia',
  solda: 'Solda',
};

const shiftIcons: Record<ShiftType, React.ReactNode> = {
  morning: <Sun className="h-4 w-4 text-amber-400" />,
  afternoon: <Sunset className="h-4 w-4 text-orange-400" />,
  night: <Moon className="h-4 w-4 text-blue-400" />,
};

const areaIcons: Record<AreaType, React.ReactNode> = {
  estamparia: <Factory className="h-4 w-4 text-blue-400" />,
  solda: <Zap className="h-4 w-4 text-orange-400" />,
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<FormSession[]>([]);
  const [productionLines, setProductionLines] = useState<Record<string, ProductionLine>>({});
  const [operations, setOperations] = useState<Record<string, Operation>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');

  useEffect(() => {
    fetchProductionLinesAndOperations();
  }, []);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, dateFrom, dateTo, filterShift, filterArea]);

  const fetchProductionLinesAndOperations = async () => {
    try {
      const [linesRes, opsRes] = await Promise.all([
        supabase.from('production_lines').select('id, line_name'),
        supabase.from('operations').select('id, operation_name'),
      ]);

      if (linesRes.data) {
        const linesMap: Record<string, ProductionLine> = {};
        linesRes.data.forEach(line => {
          linesMap[line.id] = line;
        });
        setProductionLines(linesMap);
      }

      if (opsRes.data) {
        const opsMap: Record<string, Operation> = {};
        opsRes.data.forEach(op => {
          opsMap[op.id] = op;
        });
        setOperations(opsMap);
      }
    } catch (error) {
      console.error('Error fetching production lines and operations:', error);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('form_sessions')
        .select('id, shift, area, started_at, completed_at, is_complete, production_line_id, operation_id')
        .eq('user_id', user!.id)
        .eq('is_complete', true)
        .order('completed_at', { ascending: false });

      // Apply date filters
      if (dateFrom) {
        query = query.gte('completed_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('completed_at', `${dateTo}T23:59:59`);
      }

      // Apply shift filter
      if (filterShift !== 'all') {
        query = query.eq('shift', filterShift as ShiftType);
      }

      // Apply area filter
      if (filterArea !== 'all') {
        query = query.eq('area', filterArea as AreaType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setFilterShift('all');
    setFilterArea('all');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasActiveFilters = dateFrom || dateTo || filterShift !== 'all' || filterArea !== 'all';

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header />

      <main className="container max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/area')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-xl font-bold text-foreground">Histórico de Checklists</h1>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6 bg-card/50 border-border">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Filtros</h2>
            {hasActiveFilters && (
              <Button variant="link" size="sm" onClick={clearFilters} className="ml-auto text-primary">
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div className="space-y-2">
              <Label htmlFor="dateFrom" className="text-sm text-muted-foreground">
                Data inicial
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label htmlFor="dateTo" className="text-sm text-muted-foreground">
                Data final
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
            </div>

            {/* Shift Filter */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Turno</Label>
              <Select value={filterShift} onValueChange={setFilterShift}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos os turnos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os turnos</SelectItem>
                  <SelectItem value="morning">Manhã</SelectItem>
                  <SelectItem value="afternoon">Tarde</SelectItem>
                  <SelectItem value="night">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Area Filter */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Área</Label>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todas as áreas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  <SelectItem value="estamparia">Estamparia</SelectItem>
                  <SelectItem value="solda">Solda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? 'Nenhum checklist encontrado com os filtros selecionados.'
                : 'Você ainda não possui checklists concluídos.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {sessions.length} checklist{sessions.length !== 1 ? 's' : ''} encontrado{sessions.length !== 1 ? 's' : ''}
            </p>

            {sessions.map((session) => (
              <Card
                key={session.id}
                className="p-4 bg-card/50 border-border hover:bg-card/80 transition-colors cursor-pointer"
                onClick={() => navigate(`/results/${session.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          {formatDate(session.completed_at || session.started_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          {shiftIcons[session.shift]}
                          {shiftLabels[session.shift]}
                        </span>
                        <span className="flex items-center gap-1">
                          {areaIcons[session.area]}
                          {areaLabels[session.area]}
                        </span>
                        {session.production_line_id && productionLines[session.production_line_id] && (
                          <span className="text-xs">
                            {productionLines[session.production_line_id].line_name}
                          </span>
                        )}
                        {session.operation_id && operations[session.operation_id] && (
                          <span className="text-xs">
                            {operations[session.operation_id].operation_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-status-ok border-status-ok/50">
                    Concluído
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
