import * as XLSX from 'xlsx';
import { z } from 'zod';

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const cleaned = String(value)
    .replace('R$', '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

// Normaliza chaves do Excel que podem ter \r\n e espaços extras
const col = (row: Record<string, unknown>, key: string): unknown => {
  // Tentativa direta
  if (key in row) return row[key];
  // Tentativa normalizando \r\n e espaços
  const normalized = key.replace(/\r?\n/g, '\n');
  const found = Object.keys(row).find(
    (k) => k.replace(/\r?\n/g, '\n').trim() === normalized.trim()
  );
  return found !== undefined ? row[found] : '';
};

export const InventarioSchema = z.object({
  // codigo_ativo é auto-gerado se ausente no template
  codigo_ativo: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  praca: z.string().nullable(),
  uf: z.string().nullable(),
  ambiente: z.string().nullable(),
  formato_midia: z.string().nullable(),
  tipo_midia: z.string().nullable(),
  tipo_ambiente_indoor: z.string().nullable(),
  valor_tabela: z.number().nullable(),
  periodo_tabela: z.string().nullable(),
  area_total_largura: z.number().nullable(),
  area_total_altura: z.number().nullable(),
  area_visual_largura: z.number().nullable(),
  area_visual_altura: z.number().nullable(),
  secundagem: z.string().nullable(),
  numero_maximo_slots: z.number().nullable(),
  pixels_especificacoes: z.string().nullable(),
  substrato: z.string().nullable(),
  acabamento: z.string().nullable(),
  observacoes: z.string().nullable(),
});

export type Inventario = z.infer<typeof InventarioSchema>;

export interface ParseInventarioResult {
  records: Inventario[];
  errors: Array<{ line: number; message: string }>;
}

const mapRow = (row: Record<string, unknown>, lineIndex: number): Inventario => {
  return {
    codigo_ativo: parseString(col(row, 'Cód do ativo')) ?? `LINHA_${lineIndex + 1}`,
    latitude: parseNumber(col(row, 'LATITUDE')),
    longitude: parseNumber(col(row, 'LONGITUDE')),
    praca: parseString(col(row, 'Praça')),
    uf: parseString(col(row, 'UF')),
    ambiente: parseString(col(row, 'AMBIENTE')),
    formato_midia: parseString(col(row, 'FORMATO DE MÍDIA')),
    tipo_midia: parseString(col(row, 'TIPO DE MÍDIA')),
    tipo_ambiente_indoor: parseString(col(row, 'TIPO DE AMBIENTE INDOOR')),
    valor_tabela: parseNumber(col(row, 'VALOR TABELA')),
    periodo_tabela: parseString(col(row, 'PERÍODO TABELA')),
    area_total_largura: parseNumber(col(row, 'SE ESTÁTICO\nÁREA TOTAL: LARGURA (metros)')),
    area_total_altura: parseNumber(col(row, 'SE ESTÁTICO\nÁREA TOTAL: ALTURA\n(metros)')),
    area_visual_largura: parseNumber(col(row, 'SE ESTÁTICO\nÁREA VISUAL: LARGURA\n(metros)')),
    area_visual_altura: parseNumber(col(row, 'SE ESTÁTICO\nÁREA VISUAL: ALTURA\n(metros)')),
    secundagem: parseString(col(row, 'SE DIGITAL\nSECUNDAGEM')),
    numero_maximo_slots: parseNumber(col(row, 'SE DIGITAL\nNUMERO MAXIMO DE SLOTS')),
    pixels_especificacoes: parseString(col(row, 'SE DIGITAL\nPIXELS\n(Especificações)')),
    substrato: parseString(col(row, 'SUBSTRATO \n(Tipo de material)\nEscolher')),
    acabamento: parseString(col(row, 'ACABAMENTO\n(Ilhos, corda, etc)')),
    observacoes: parseString(col(row, 'OBSERVAÇÕES')),
  };
};

export const parseInventarioXLSXFile = async (file: File): Promise<ParseInventarioResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Garante que lê sempre a aba "Pontos de mídia" se existir, senão a primeira
  const sheetName =
    workbook.SheetNames.find((n) => n.toLowerCase().includes('pontos')) ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // range: 1 → pula a linha de grupo (PONTO DE MÍDIA / CUSTOS E ESPECIFICAÇÕES)
  // usa a linha 2 como cabeçalho e linha 3+ como dados
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: 1,
    defval: '',
  });

  const errors: Array<{ line: number; message: string }> = [];
  const records: Inventario[] = [];

  rawData.forEach((row, index) => {
    const mapped = mapRow(row, index);
    const result = InventarioSchema.safeParse(mapped);
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join('; ');
      errors.push({ line: index + 3, message });
      return;
    }
    records.push(result.data);
  });

  return { records, errors };
};
