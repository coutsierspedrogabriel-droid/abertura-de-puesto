import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function PostLoginPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Button
        onClick={() => navigate('/area')}
        className="w-full max-w-sm py-6 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-glow-primary"
      >
        Continuar
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}

