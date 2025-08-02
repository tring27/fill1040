import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';

interface VariableMap {
  [variable: string]: string | number;
}

const xlsxInput = document.getElementById('xlsxFile') as HTMLInputElement;
const downloadBtn = document.getElementById('downloadPdf') as HTMLButtonElement;

export const allSheetsData: { [sheetName: string]: VariableMap } = {};

async function printPdfFields() {
  const formUrl = '/forms/f1040.pdf'; // Update path if needed
  const pdfBytes = await fetch(formUrl).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`Total PDF fields found: ${fields.length}`);
  fields.forEach((field, idx) => {
    console.log(`${idx + 1}. Field name:`, field.getName());
  });
}

xlsxInput.addEventListener('change', async () => {
  const file = xlsxInput.files?.[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  // Stores parsed data per sheet
  // const allSheetsData: { [sheetName: string]: VariableMap } = {};

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const sheetDict: VariableMap = {};

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const variable = row[0];
      const value = row[1];

      if (variable == null || variable === '') {
        // Stop processing this sheet on first empty variable cell
        break;
      }

      sheetDict[String(variable)] = value;
      console.log(`[${sheetName}] ${variable} = ${value}`);
    }

    allSheetsData[sheetName] = sheetDict;
  });

  // Optional: log the entire result
  console.log('Parsed Excel Data:', allSheetsData);
});


downloadBtn.addEventListener('click', async () => {

  if (sheetData.length === 0) {
    alert('Please upload an XLSX file first.');
    return;
  }

  const formUrl = '/forms/f1040.pdf';
  const pdfBytes = await fetch(formUrl).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  fields.forEach((field, idx) => {
    const name = field.getName();

    try {
      field.setText(`Field #${idx + 1}`);
      console.log(`Filled field "${name}" with value: Field #${idx + 1}`);
    } catch (err) {
      console.warn(`Could not fill field "${name}"`, err);
    }
  });

  const filledPdfBytes = await pdfDoc.save();
  const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'all-fields-filled.pdf';
  a.click();
});