export interface Pessoa {
  id: number;
  nome: string;
  pontos: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePessoaRequest {
  nome: string;
}

export interface UpdatePontosRequest {
  acao: 'aumentar' | 'diminuir' | 'sorteio';
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
