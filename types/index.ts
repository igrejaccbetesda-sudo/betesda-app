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
  foto_drive_file_id?: string;
  tipo_imagem?: "foto" | "logo" | "logo_escuro" | "logo_claro";
}
