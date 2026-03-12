export type Time = {
  id: number;
  nome: string;
  created_at: string;
  updated_at: string;
  totalPessoas?: number;
  totalPontos?: number;
};

export type TimeResponse = {
  id: number;
  nome: string;
  created_at: string;
  updated_at: string;
  total_pessoas?: number;
  total_pontos?: number;
};

export type CreateTimeRequest = {
  nome: string;
};
