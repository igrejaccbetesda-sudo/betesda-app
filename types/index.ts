export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  icone: string;
  ordem: number;
}

export interface Empresa {
  id: string;
  nome: string;
  categoria_id: string;
  descricao: string;
  whatsapp: string;
  endereco: string;
  bairro: string;
  instagram: string;
  site: string;
  foto_url: string;
  responsavel: string;
  status: string;
  dias_funcionamento: number[];
  horario_abertura: string;
  horario_fechamento: string;
  created_at: string;
}
