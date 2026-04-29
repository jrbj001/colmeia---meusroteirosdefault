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

export const InventarioSchema = z.object({
  codigo_ativo: z.string().min(1, 'Cód do ativo é obrigatório'),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  ambiente: z.string().nullable(),
  formato_midia: z.string().nullable(),
  tipo_midia: z.string().nullable(),
  tipo_ambiente_indoor: z.string().nullable(),
  nome_fantasia: z.string().nullable(),
  valor_tabela: z.number().nullable(),
  periodo_tabela: z.string().nullable(),
  area_total_largura: z.number().nullable(),
  area_total_altura: z.number().nullable(),
  area_total_unidade: z.string().nullable(),
  area_visual_largura: z.number().nullable(),
  area_visual_altura: z.number().nullable(),
  area_visual_unidade: z.string().nullable(),
  substrato: z.string().nullable(),
  especificacoes: z.string().nullable(),
  secundagem: z.string().nullable(),
  observacoes: z.string().nullable(),
});

export type Inventario = z.infer<typeof InventarioSchema>;

export interface ParseInventarioResult {
  records: Inventario[];
  errors: Array<{ line: number; message: string }>;
}

const mapRow = (row: Record<string, unknown>): Inventario => {
  return {
    codigo_ativo: parseString(row['Cód do ativo']) || '',
    latitude: parseNumber(row['LATITUDE']),
    longitude: parseNumber(row['LONGITUDE']),
    ambiente: parseString(row['AMBIENTE']),
    formato_midia: parseString(row['FORMATO DE MÍDIA']),
    tipo_midia: parseString(row['TIPO DE MÍDIA']),
    tipo_ambiente_indoor: parseString(row['TIPO DE AMBIENTE INDOOR']),
    nome_fantasia: parseString(row['NOME FANTASIA']),
    valor_tabela: parseNumber(row['VALOR TABELA']),
    periodo_tabela: parseString(row['PERÍODO TABELA']),
    area_total_largura: parseNumber(row['ÁREA TOTAL: LARGURA']),
    area_total_altura: parseNumber(row['ÁREA TOTAL: ALTURA']),
    area_total_unidade: parseString(row['ÁREA TOTAL: UNIDADE']),
    area_visual_largura: parseNumber(row['ÁREA VISUAL: LARGURA']),
    area_visual_altura: parseNumber(row['ÁREA VISUAL: ALTURA']),
    area_visual_unidade: parseString(row['ÁREA VISUAL: UNIDADE']),
    substrato: parseString(row['SUBSTRATO']),
    especificacoes: parseString(row['ESPECIFICAÇÕES']),
    secundagem: parseString(row['SECUNDAGEM']),
    observacoes: parseString(row['OBSERVAÇÕES']),
  };
};

export const parseInventarioXLSXFile = async (file: File): Promise<ParseInventarioResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: 1,
    defval: '',
  });

  const errors: Array<{ line: number; message: string }> = [];
  const records: Inventario[] = [];

  rawData.forEach((row, index) => {
    const mapped = mapRow(row);
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
