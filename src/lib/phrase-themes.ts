import { createHash, randomInt } from 'node:crypto';

type ThemeContext = {
  occasion: string;
  themes: readonly string[];
  guidance?: string;
};

type SeasonalThemePeriod = ThemeContext & {
  start: Date;
  end: Date;
};

export type PhraseTheme = {
  key: string;
  occasion: string;
  theme: string;
  guidance?: string;
};

const DEFAULT_THEMES = [
  'Sorte e coincidências',
  'Comemoração e torcida',
  'Expectativa e suspense',
  'Pequenas alegrias do dia a dia',
  'Sonhos e desejos',
  'Reviravoltas e surpresas',
  'Música e festa',
  'Hábitos e situações de trabalho',
];

const NEW_YEAR_THEMES = [
  'Planos e desejos para o novo ano',
  'Recomeços e primeiras conquistas',
  'Promessas e novos hábitos',
  'Calendários e agendas novas',
  'Energia e disposição de janeiro',
  'Férias e retorno à rotina',
  'Superstições de Ano Novo',
  'Novidades e surpresas do ano',
];

const HALLOWEEN_THEMES = [
  'Fantasmas e assombrações',
  'Bruxas e magia',
  'Fantasias e máscaras',
  'Monstros e criaturas imaginárias',
  'Gostosuras e travessuras',
  'Casas mal-assombradas',
  'Abóboras e decoração de Halloween',
  'Sustos em situações do dia a dia',
];

const BLUE_NOVEMBER_THEMES = [
  'Autocuidado na rotina',
  'Tempo para cuidar de si',
  'Lembretes e organização da agenda',
  'Bem-estar e hábitos saudáveis',
  'Apoio entre amigos',
  'Equilíbrio entre trabalho e descanso',
  'Pequenas atitudes de cuidado',
  'Cuidado com a saúde ao longo do ano',
];

const BLACK_FRIDAY_THEMES = [
  'Carrinhos de compras',
  'Cupons e promoções',
  'Listas de desejos',
  'Frete e entregas',
  'Filas e compras pela internet',
  'Pesquisa de preços',
  'Compras por impulso',
  'Expectativa por uma boa oferta',
];

const CHRISTMAS_THEMES = [
  'Presentes e embrulhos',
  'Amigo secreto',
  'Ceia e receitas de família',
  'Papai Noel e renas',
  'Árvores e decoração de Natal',
  'Reuniões de família',
  'Tradições e brincadeiras natalinas',
  'Preparativos de última hora',
];

const SUMMER_THEMES = [
  'Calor e dias de sol',
  'Praia e piscina',
  'Férias e passeios',
  'Sorvetes e bebidas geladas',
  'Ventiladores e ar-condicionado',
  'Chinelos e roupas de verão',
  'Sombra e descanso',
  'Planos para aproveitar dias mais longos',
];

const NEW_YEARS_EVE_THEMES = [
  'Contagem regressiva e expectativa',
  'Retrospectivas e histórias do ano',
  'Roupa branca e preparativos para a virada',
  'Brindes e comemorações',
  'Simpatias e tradições de Réveillon',
  'Mensagens e votos de boas festas',
  'Listas de desejos para o próximo ano',
  'Festas e encontros de fim de ano',
];

const BRAZIL_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getBrazilCalendarDate = (date: Date): Date => {
  const parts = Object.fromEntries(
    BRAZIL_DATE_FORMATTER.formatToParts(date).map(({ type, value }) => [
      type,
      value,
    ]),
  );

  // UTC representa apenas o dia do calendário brasileiro, sem a hora da chamada.
  return new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
};

const getSeasonalThemePeriods = (year: number): SeasonalThemePeriod[] => {
  const firstNovemberWeekday = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  // A quarta sexta-feira de novembro sempre cai entre os dias 22 e 28.
  const blackFriday = new Date(
    Date.UTC(year, 10, 22 + ((5 - firstNovemberWeekday + 7) % 7)),
  );

  // Limites inclusivos; os períodos são recriados para o ano de cada chamada.
  return [
    {
      occasion: 'Ano Novo',
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year, 0, 7)),
      themes: NEW_YEAR_THEMES,
    },
    {
      occasion: 'Dia das Bruxas (Halloween)',
      start: new Date(Date.UTC(year, 9, 25)),
      end: new Date(Date.UTC(year, 9, 31)),
      themes: HALLOWEEN_THEMES,
    },
    {
      occasion: 'Novembro Azul',
      start: new Date(Date.UTC(year, 10, 1)),
      end: new Date(Date.UTC(year, 10, 7)),
      themes: BLUE_NOVEMBER_THEMES,
      guidance:
        'Incentive o autocuidado e a conscientização sobre a saúde do homem com respeito. Não faça piadas sobre doenças, exames ou masculinidade, nem dê orientações médicas.',
    },
    {
      occasion: 'Black Friday',
      start: blackFriday,
      end: blackFriday,
      themes: BLACK_FRIDAY_THEMES,
    },
    {
      occasion: 'Natal',
      start: new Date(Date.UTC(year, 11, 19)),
      end: new Date(Date.UTC(year, 11, 25)),
      themes: CHRISTMAS_THEMES,
    },
    {
      occasion: 'Início do Verão',
      start: new Date(Date.UTC(year, 11, 21)),
      end: new Date(Date.UTC(year, 11, 27)),
      themes: SUMMER_THEMES,
    },
    {
      occasion: 'Véspera de Ano Novo',
      start: new Date(Date.UTC(year, 11, 25)),
      end: new Date(Date.UTC(year, 11, 31)),
      themes: NEW_YEARS_EVE_THEMES,
    },
  ];
};

export const getPhraseThemes = (now = new Date()): PhraseTheme[] => {
  const today = getBrazilCalendarDate(now);
  const occasions = getSeasonalThemePeriods(today.getUTCFullYear()).filter(
    ({ start, end }) => today >= start && today <= end,
  );
  const contexts: ThemeContext[] = occasions.length
    ? occasions
    : [{ occasion: 'Dia a dia', themes: DEFAULT_THEMES }];

  return contexts.flatMap(({ occasion, themes, guidance }) =>
    themes.map((theme) => ({
      // A chave permanece a mesma se a lista for reordenada.
      key: createHash('sha256').update(`${occasion}\0${theme}`).digest('hex'),
      occasion,
      theme,
      guidance,
    })),
  );
};

export const selectPhraseTheme = (
  themes: readonly PhraseTheme[],
  lastThemeKey: string | null,
): PhraseTheme => {
  if (themes.length === 0) {
    throw new Error('Não há temas disponíveis para a chamada.');
  }

  const alternatives = themes.filter(({ key }) => key !== lastThemeKey);
  const candidates = alternatives.length ? alternatives : themes;

  return candidates[randomInt(candidates.length)];
};
