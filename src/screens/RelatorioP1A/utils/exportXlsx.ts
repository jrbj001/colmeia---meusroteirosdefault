import * as XLSX from 'xlsx';
import { ColmeiaRow, Dimension, ExibidorRow, ModeloRow } from '../types';

/* ─────────────────────────────────────────────────────────────────────────────
   Export "empilhado" — dados brutos do stage para todos os roteiros
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Larguras (em caracteres) para cada coluna do export empilhado.
 * A ordem deve bater com as colunas retornadas pelo handler.
 */
const COLUNAS_EMPILHADO: Array<{ key: string; label: string; wch: number }> = [
  { key: 'Roteiro PK',              label: 'Roteiro PK',              wch: 12  },
  { key: 'Nome do roteiro',         label: 'Nome do roteiro',         wch: 40  },
  { key: 'Usuário',                 label: 'Usuário',                 wch: 22  },
  { key: 'Agência',                 label: 'Agência',                 wch: 22  },
  { key: 'Data criação roteiro',    label: 'Data criação roteiro',    wch: 22  },
  { key: 'Semana',                  label: 'Semana',                  wch: 9   },
  { key: 'Data da semana',          label: 'Data da semana',          wch: 16  },
  { key: 'Marca',                   label: 'Marca',                   wch: 22  },
  { key: 'Campanha',                label: 'Campanha',                wch: 30  },
  { key: 'Produto',                 label: 'Produto',                 wch: 22  },
  { key: 'Cidade',                  label: 'Cidade',                  wch: 20  },
  { key: 'UF',                      label: 'UF',                      wch: 6   },
  { key: 'GEO',                     label: 'GEO',                     wch: 14  },
  { key: 'Exibidor (raw)',          label: 'Exibidor (raw)',          wch: 22  },
  { key: 'Exibidor P1A',            label: 'Exibidor P1A',            wch: 20  },
  { key: 'Tipo P1A',                label: 'Tipo P1A',                wch: 18  },
  { key: 'Negociação P1A',          label: 'Negociação P1A',          wch: 18  },
  { key: 'Faturável',               label: 'Faturável',               wch: 10  },
  { key: 'Qtd semanas (flight)',    label: 'Qtd sem. (flight)',       wch: 16  },
  { key: 'Faces vias públicas',     label: 'Faces vias públicas',     wch: 18  },
  { key: 'Localidades indoor',      label: 'Localidades indoor',      wch: 18  },
  { key: 'Investimento',            label: 'Investimento',            wch: 16  },
  { key: 'Impactos indoor',         label: 'Impactos indoor',         wch: 16  },
  { key: 'Valor líquido',           label: 'Valor líquido',           wch: 16  },
  { key: 'Total faces (TT)',        label: 'Total faces (TT)',        wch: 14  },
  { key: 'Divisor flight/face',     label: 'Divisor flight/face',     wch: 18  },
  { key: 'Impacto IPV',             label: 'Impacto IPV',             wch: 16  },
  { key: 'Atualizado em (stage)',   label: 'Atualizado em (stage)',   wch: 22  },
];

export interface EmpilhadoRow {
  [key: string]: unknown;
}

export function exportP1aEmpilhado(rows: EmpilhadoRow[], reportPks: number[]) {
  if (rows.length === 0) return;

  const wb = XLSX.utils.book_new();

  // Garante a ordem das colunas e usa labels amigáveis como cabeçalhos
  const headers = COLUNAS_EMPILHADO.map((c) => c.label);
  const data: unknown[][] = [headers];

  for (const row of rows) {
    data.push(
      COLUNAS_EMPILHADO.map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '';
        // Formatar datas como string legível (evita número serial do Excel)
        if (
          typeof val === 'string' &&
          /^\d{4}-\d{2}-\d{2}T/.test(val)
        ) {
          return new Date(val).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
        return val;
      }),
    );
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Larguras das colunas
  ws['!cols'] = COLUNAS_EMPILHADO.map((c) => ({ wch: c.wch }));

  // Freeze na linha de cabeçalho
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, 'Empilhamento P1A');

  const pksStr = reportPks.slice(0, 5).join('-') + (reportPks.length > 5 ? '-etc' : '');
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `P1A_Empilhado_${pksStr}_${date}.xlsx`);
}

interface ExportArgs {
  filename?: string;
  dimension: Dimension;
  dimensionValue: string | null;
  colmeiaRows: ColmeiaRow[];
  exibidorRows: ExibidorRow[];
  modeloRows: ModeloRow[];
}

/**
 * Exporta as 3 abas + abas "(raw)" do Relatório P1A em um único .xlsx.
 *
 * Versão "simples" usando a lib `xlsx` que já temos no projeto. Não traz
 * cores/merges/freeze do workbook original — esse enriquecimento pode ser
 * adicionado em fase futura (com `xlsx-js-style` ou `exceljs`).
 */
export function exportP1aWorkbook({
  filename,
  dimension,
  dimensionValue,
  colmeiaRows,
  exibidorRows,
  modeloRows,
}: ExportArgs) {
  const wb = XLSX.utils.book_new();

  if (colmeiaRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(colmeiaRows),
      truncSheetName('5 Colmeia (raw)'),
    );
  }
  if (exibidorRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(exibidorRows),
      truncSheetName('6 Exibidor (raw)'),
    );
  }
  if (modeloRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(modeloRows),
      truncSheetName('7 Modelo P1A (raw)'),
    );
  }

  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ aviso: 'Sem dados para exportar' }]),
      'Vazio',
    );
  }

  const safeDim = dimensionValue ? `_${dimensionValue.replace(/[^\w]+/g, '-')}` : '';
  const finalName =
    filename || `Relatorio_P1A_${dimension}${safeDim}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

function truncSheetName(name: string): string {
  // Excel limita a 31 caracteres
  return name.length > 31 ? name.slice(0, 31) : name;
}
