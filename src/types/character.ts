export type CharacterOption = {
  id: number;
  slug: string;
  nome: string;
  // Endereço da rota que serve o blob; o banco armazena a coluna imagem (BYTEA).
  imagem_url: string | null;
  mode: '2d' | '3d';
};

export type Character = Omit<CharacterOption, 'mode' | 'imagem_url'> & {
  estilo: string;
  fish_voice_id: string;
};

export type CharacterPhrase = {
  id: number;
  tipo: 'bordao' | 'frase' | 'piada';
  texto: string;
};
