-- Enum para status das respostas
CREATE TYPE public.answer_status AS ENUM ('ok', 'nok', 'na');

-- Enum para turnos
CREATE TYPE public.shift_type AS ENUM ('morning', 'afternoon', 'night');

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de perguntas
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number INTEGER NOT NULL UNIQUE,
  question_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de sessões de formulário (cada preenchimento)
CREATE TABLE public.form_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shift shift_type NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_complete BOOLEAN DEFAULT false NOT NULL
);

-- Tabela de respostas
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_session_id UUID REFERENCES public.form_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  status answer_status NOT NULL,
  justification TEXT,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(form_session_id, question_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Políticas para questions (todos podem ler)
CREATE POLICY "Anyone can view questions"
ON public.questions FOR SELECT
TO authenticated
USING (true);

-- Políticas para form_sessions
CREATE POLICY "Users can view their own sessions"
ON public.form_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
ON public.form_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.form_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Políticas para answers
CREATE POLICY "Users can view their own answers"
ON public.answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.form_sessions
    WHERE form_sessions.id = answers.form_session_id
    AND form_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own answers"
ON public.answers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.form_sessions
    WHERE form_sessions.id = answers.form_session_id
    AND form_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own answers"
ON public.answers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.form_sessions
    WHERE form_sessions.id = answers.form_session_id
    AND form_sessions.user_id = auth.uid()
  )
);

-- Inserir as 90 perguntas
INSERT INTO public.questions (question_number, question_text) VALUES
(1, 'Equipamento de proteção individual está em boas condições?'),
(2, 'Área de trabalho está limpa e organizada?'),
(3, 'Extintores de incêndio estão acessíveis e sinalizados?'),
(4, 'Iluminação do ambiente está adequada?'),
(5, 'Ventilação do local está funcionando corretamente?'),
(6, 'Sinalizações de segurança estão visíveis?'),
(7, 'Saídas de emergência estão desobstruídas?'),
(8, 'Máquinas possuem proteção adequada?'),
(9, 'Ferramentas estão em bom estado de conservação?'),
(10, 'Há disponibilidade de kit de primeiros socorros?'),
(11, 'Piso está em boas condições (sem buracos ou rachaduras)?'),
(12, 'Instalações elétricas estão em conformidade?'),
(13, 'Cabos e fios estão organizados e protegidos?'),
(14, 'Produtos químicos estão armazenados corretamente?'),
(15, 'FISPQs estão disponíveis e atualizadas?'),
(16, 'Colaboradores estão usando EPIs corretamente?'),
(17, 'Treinamentos de segurança estão em dia?'),
(18, 'Procedimentos operacionais estão documentados?'),
(19, 'Há registro de inspeções anteriores?'),
(20, 'Equipamentos de medição estão calibrados?'),
(21, 'Sistema de alarme está funcionando?'),
(22, 'Sprinklers estão desobstruídos?'),
(23, 'Hidrantes estão acessíveis?'),
(24, 'Mangueiras de incêndio estão em bom estado?'),
(25, 'Portas corta-fogo funcionam adequadamente?'),
(26, 'Escadas de emergência estão sinalizadas?'),
(27, 'Há iluminação de emergência?'),
(28, 'Rotas de fuga estão claramente marcadas?'),
(29, 'Ponto de encontro está definido e sinalizado?'),
(30, 'Brigada de incêndio está treinada?'),
(31, 'Empilhadeiras possuem checklist diário?'),
(32, 'Operadores de máquinas estão habilitados?'),
(33, 'Talhas e guindastes foram inspecionados?'),
(34, 'Correntes e cabos de aço estão em bom estado?'),
(35, 'Limitadores de carga funcionam corretamente?'),
(36, 'Esteiras transportadoras possuem proteção?'),
(37, 'Botões de emergência estão funcionando?'),
(38, 'Sensores de segurança estão operacionais?'),
(39, 'Grades de proteção estão instaladas?'),
(40, 'Travamentos de segurança (lockout) disponíveis?'),
(41, 'Procedimento LOTO está sendo seguido?'),
(42, 'Áreas de risco estão demarcadas?'),
(43, 'Altura de empilhamento está conforme norma?'),
(44, 'Corredores de circulação estão livres?'),
(45, 'Faixas de pedestres estão pintadas?'),
(46, 'Espelhos de segurança estão instalados?'),
(47, 'Velocidade de veículos internos é controlada?'),
(48, 'Estacionamento está organizado?'),
(49, 'Docas de carga estão em bom estado?'),
(50, 'Niveladores de doca funcionam corretamente?'),
(51, 'Calços de caminhão estão disponíveis?'),
(52, 'Iluminação externa é adequada?'),
(53, 'Cercas e portões estão em bom estado?'),
(54, 'Sistema de CFTV está operacional?'),
(55, 'Controle de acesso funciona corretamente?'),
(56, 'Visitantes recebem orientações de segurança?'),
(57, 'Crachás de identificação são utilizados?'),
(58, 'Registro de entrada/saída é mantido?'),
(59, 'Áreas restritas estão sinalizadas?'),
(60, 'Cofres e armários estão trancados?'),
(61, 'Documentos confidenciais estão protegidos?'),
(62, 'Backup de dados é realizado regularmente?'),
(63, 'Computadores possuem antivírus atualizado?'),
(64, 'Senhas são trocadas periodicamente?'),
(65, 'Rede WiFi é segura?'),
(66, 'Há política de mesa limpa?'),
(67, 'Lixeiras estão em quantidade adequada?'),
(68, 'Coleta seletiva é praticada?'),
(69, 'Resíduos perigosos são descartados corretamente?'),
(70, 'Há contenção para vazamentos?'),
(71, 'Caixa de gordura é limpa regularmente?'),
(72, 'Tratamento de efluentes está funcionando?'),
(73, 'Licenças ambientais estão em dia?'),
(74, 'Monitoramento de emissões é realizado?'),
(75, 'Ruído está dentro dos limites?'),
(76, 'Ergonomia dos postos foi avaliada?'),
(77, 'Cadeiras e mesas são adequadas?'),
(78, 'Pausas para descanso são respeitadas?'),
(79, 'Ginástica laboral é oferecida?'),
(80, 'Bebedouros estão funcionando e limpos?'),
(81, 'Refeitório atende normas de higiene?'),
(82, 'Vestiários estão limpos e organizados?'),
(83, 'Banheiros possuem material de higiene?'),
(84, 'Ar condicionado é mantido regularmente?'),
(85, 'Filtros de ar são trocados no prazo?'),
(86, 'Dedetização é realizada periodicamente?'),
(87, 'Controle de pragas está em dia?'),
(88, 'Jardins e áreas verdes são mantidos?'),
(89, 'Calçadas e acessos estão em bom estado?'),
(90, 'Acessibilidade para PCDs está garantida?');