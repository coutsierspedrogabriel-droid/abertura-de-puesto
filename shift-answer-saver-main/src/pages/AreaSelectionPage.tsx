import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Loader2, History, Factory, Zap, Layers, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type AreaType = 'estamparia' | 'solda';

interface ProductionLine {
  id: string;
  area: AreaType;
  line_number: number;
  line_name: string;
}

interface Operation {
  id: string;
  production_line_id: string;
  operation_number: number;
  operation_name: string;
}

const areas = [
  {
    id: 'estamparia' as AreaType,
    label: 'Estamparia',
    icon: Factory,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/50',
    iconColor: 'text-blue-400',
    description: 'Área de estampagem de peças',
  },
  {
    id: 'solda' as AreaType,
    label: 'Solda',
    icon: Zap,
    gradient: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/50',
    iconColor: 'text-orange-400',
    description: 'Área de soldagem',
  },
];

export default function AreaSelectionPage() {
  const [selectedArea, setSelectedArea] = useState<AreaType | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch production lines when area is selected
  useEffect(() => {
    if (selectedArea) {
      fetchProductionLines(selectedArea);
      setSelectedLine(null);
      setSelectedOperation(null);
      setOperations([]);
    }
  }, [selectedArea]);

  // Fetch operations when line is selected
  useEffect(() => {
    if (selectedLine) {
      fetchOperations(selectedLine);
      setSelectedOperation(null);
    }
  }, [selectedLine]);

  const fetchProductionLines = async (area: AreaType) => {
    setLoadingLines(true);
    try {
      const { data, error } = await supabase
        .from('production_lines')
        .select('*')
        .eq('area', area)
        .order('line_number');

      if (error) throw error;
      setProductionLines(data || []);
    } catch (error) {
      console.error('Error fetching production lines:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as linhas de produção.',
        variant: 'destructive',
      });
    } finally {
      setLoadingLines(false);
    }
  };

  const fetchOperations = async (lineId: string) => {
    setLoadingOperations(true);
    try {
      const { data, error } = await supabase
        .from('operations')
        .select('*')
        .eq('production_line_id', lineId)
        .order('operation_number');

      if (error) throw error;
      setOperations(data || []);
    } catch (error) {
      console.error('Error fetching operations:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as operações.',
        variant: 'destructive',
      });
    } finally {
      setLoadingOperations(false);
    }
  };

  const handleContinue = () => {
    if (!selectedArea || !selectedLine || !selectedOperation) return;
    
    navigate('/shift', {
      state: {
        area: selectedArea,
        productionLineId: selectedLine,
        operationId: selectedOperation,
      },
    });
  };

  const selectedLineData = productionLines.find(l => l.id === selectedLine);
  const selectedOperationData = operations.find(o => o.id === selectedOperation);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl px-4 py-8">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-2">Selecionar Área</h1>
          <p className="text-muted-foreground">
            Escolha a área, linha de produção e operação
          </p>
        </div>

        {/* Area Selection */}
        <div className="space-y-4 mb-8">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Factory className="h-4 w-4 text-muted-foreground" />
            Área de Trabalho
          </Label>
          {areas.map((area, index) => {
            const Icon = area.icon;
            const isSelected = selectedArea === area.id;

            return (
              <button
                key={area.id}
                onClick={() => setSelectedArea(area.id)}
                className={cn(
                  'w-full p-6 rounded-xl border-2 transition-all duration-300 animate-slide-in',
                  'flex items-center gap-4 text-left',
                  isSelected
                    ? `bg-gradient-to-r ${area.gradient} ${area.borderColor}`
                    : 'bg-card border-border hover:border-muted-foreground/50'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={cn(
                    'flex items-center justify-center h-14 w-14 rounded-xl',
                    isSelected ? `bg-gradient-to-r ${area.gradient}` : 'bg-muted'
                  )}
                >
                  <Icon
                    className={cn('h-7 w-7', isSelected ? area.iconColor : 'text-muted-foreground')}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{area.label}</h3>
                  <p className="text-sm text-muted-foreground">{area.description}</p>
                </div>
                {isSelected && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <svg
                      className="h-4 w-4 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Production Line Selection */}
        {selectedArea && (
          <div className="mb-6 animate-slide-in">
            <Label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Linha de Produção
            </Label>
            <Select
              value={selectedLine || ''}
              onValueChange={(value) => setSelectedLine(value)}
              disabled={loadingLines}
            >
              <SelectTrigger className="w-full py-6 text-base bg-card border-border">
                {loadingLines ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <SelectValue placeholder="Selecione a linha" />
                )}
              </SelectTrigger>
              <SelectContent>
                {productionLines.map((line) => (
                  <SelectItem key={line.id} value={line.id}>
                    {line.line_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Operation Selection */}
        {selectedLine && (
          <div className="mb-8 animate-slide-in">
            <Label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Operação
            </Label>
            <Select
              value={selectedOperation || ''}
              onValueChange={(value) => setSelectedOperation(value)}
              disabled={loadingOperations}
            >
              <SelectTrigger className="w-full py-6 text-base bg-card border-border">
                {loadingOperations ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <SelectValue placeholder="Selecione a operação" />
                )}
              </SelectTrigger>
              <SelectContent>
                {operations.map((operation) => (
                  <SelectItem key={operation.id} value={operation.id}>
                    {operation.operation_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Summary Card */}
        {selectedArea && selectedLine && selectedOperation && (
          <div className="mb-6 p-4 rounded-xl bg-card/50 border border-border animate-fade-in">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Resumo da Seleção</h4>
            <div className="space-y-1 text-sm">
              <p className="text-foreground">
                <span className="text-muted-foreground">Área:</span>{' '}
                {areas.find(a => a.id === selectedArea)?.label}
              </p>
              <p className="text-foreground">
                <span className="text-muted-foreground">Linha:</span>{' '}
                {selectedLineData?.line_name}
              </p>
              <p className="text-foreground">
                <span className="text-muted-foreground">Operação:</span>{' '}
                {selectedOperationData?.operation_name}
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={handleContinue}
          disabled={!selectedArea || !selectedLine || !selectedOperation}
          className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-glow-primary disabled:opacity-50"
        >
          Continuar
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {/* History Link */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/history')}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            Ver Histórico Completo
          </Button>
        </div>
      </main>
    </div>
  );
}
