export type Pessoa = {
  id: number;
  nome: string;
  pontos: number;
  time_id: number;
  created_at: string;
  updated_at: string;
};

export type CreatePessoaRequest = {
  nome: string;
  timeId: number;
};

export type UpdatePontosRequest = {
  acao: 'aumentar' | 'diminuir' | 'sorteio';
};

export type ApiResponse<T> = {
  data?: T;
  error?: string;
};
