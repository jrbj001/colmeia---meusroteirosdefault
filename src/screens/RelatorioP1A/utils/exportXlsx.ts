import * as XLSX from 'xlsx';
import { ColmeiaRow, Dimension, ExibidorRow, ModeloRow } from '../types';

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
