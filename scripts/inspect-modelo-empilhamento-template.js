/* eslint-disable no-console */
/**
 * Inspeciona o template "public/Modelo Planos Empilhados.xlsx":
 * imprime os headers (linha 2 do modelo) com o índice da coluna (A, B, C, …).
 */
const path = require('path');
const XLSX = require('xlsx');

const colLetter = (i) => {
  let s = '';
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
};

const file = path.join(__dirname, '..', 'public', 'Modelo Planos Empilhados.xlsx');
const wb = XLSX.readFile(file, { cellDates: false });
console.log('Abas:', wb.SheetNames.join(', '));

for (const sheetName of wb.SheetNames) {
  console.log('\n=== Aba:', sheetName, '===');
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  console.log(`Total linhas: ${aoa.length}`);
  for (let r = 0; r < Math.min(3, aoa.length); r++) {
    console.log(`\nLinha ${r + 1}:`);
    aoa[r].forEach((cell, i) => {
      if (cell !== '' && cell !== null && cell !== undefined) {
        const v = typeof cell === 'string' ? cell.replace(/\r?\n/g, ' \\n ') : cell;
        console.log(`  ${colLetter(i).padEnd(3)} (idx ${String(i).padStart(2)}): ${JSON.stringify(v)}`);
      }
    });
  }
}
