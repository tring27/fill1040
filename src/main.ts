import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { f1040 } from './mappings';

interface VariableMap {
  [key: string]: string | number;
}

const dictMap: { [key: string]: { [key: string]: string } } = {
  f1040
};

const xlsxInput = document.getElementById('xlsxFile') as HTMLInputElement;
const downloadBtn = document.getElementById('downloadPdf') as HTMLButtonElement;

const allSheetsData: { [pdfName: string]: VariableMap } = {};

xlsxInput.addEventListener('change', async () => {
  const file = xlsxInput.files?.[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  for (const key in allSheetsData) {
    delete allSheetsData[key];
  }

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const dictToUse = dictMap[sheetName];
    const fieldValues: VariableMap = {};

    for (const row of rows) {
      const [variable, value] = row;
      if (!variable || variable === undefined || variable === '') break;
      const mappedKey = dictToUse[variable];
      if (mappedKey) {
        fieldValues[mappedKey] = value;
      }
    }

    allSheetsData[sheetName] = fieldValues;
  });

  console.log('Parsed Excel Data:');
});

async function fillPdfWithData(pdfUrl: string, fieldValues: VariableMap): Promise<Uint8Array> {
  const pdfBytes = await fetch(pdfUrl).then(res => {
    if (!res.ok) throw new Error(`Failed to fetch PDF at ${pdfUrl}`);
    return res.arrayBuffer();
  });

  console.log(`🚀 fillPdfWithData called for ${pdfUrl}`);

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  fields.forEach(field => {
    const name = field.getName();
    const value = fieldValues[name];
    console.log(`Checking field: ${name}, value from data:`, value);
    if (value !== undefined) {
      try {
        field.setText(String(value));
        console.log(`✅ Added ${value} to field "${name}"`);
      } catch (err) {
        console.warn(`Could not fill field "${name}"`, err);
      }
    }
  });

  return await pdfDoc.save();
}

async function fillPdfWithUniqueValues(formName: string): Promise<void> {
  try {
    const { pdfDoc, fields } = await loadPdfFormFields(formName);

    fields.forEach((field, idx) => {
      const name = field.getName();
      try {
        field.setText(`Field #${idx + 1}`);
        console.log(`✅ Set "${name}" → "Field #${idx + 1}"`);
      } catch (err) {
        console.warn(`❌ Could not set field "${name}"`, err);
      }
    });

    const filledPdfBytes = await pdfDoc.save();
    const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${formName}_filled_with_unique_values.pdf`;
    a.click();
  } catch (err) {
    console.error(`❌ Failed to fill fields for "${formName}.pdf": ${err.message}`);
  }
}

async function printPdfFieldsForForm(formName: string): Promise<void> {
  const formUrl = `/forms/${formName}.pdf`;

  try {
    const pdfBytes = await fetch(formUrl).then(res => {
      if (!res.ok) throw new Error(`PDF "${formName}.pdf" not found.`);
      return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`📝 PDF "${formName}.pdf" has ${fields.length} fields:`);
    fields.forEach((field, idx) => {
      console.log(`${idx + 1}. ${field.getName()}`);
    });
  } catch (err) {
    console.error(`❌ Failed to print fields for "${formName}.pdf": ${err.message}`);
  }
}

downloadBtn.addEventListener('click', async () => {
  if (Object.keys(allSheetsData).length === 0) {
    alert('Please upload an Excel file first.');
    return;
  }

  const zip = new JSZip();

  for (const [sheetName, fieldValues] of Object.entries(allSheetsData)) {
    const pdfPath = `/forms/${sheetName}.pdf`;

    try {
      const filledPdf = await fillPdfWithData(pdfPath, fieldValues);
      zip.file(`${sheetName}_filled.pdf`, filledPdf);
      console.log(`Successfully filled and added ${sheetName}.pdf to zip.`);
    } catch (err) {
      alert(`Error processing "${sheetName}": ${err.message}`);
      console.error(err);
      return;
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filled_pdfs.zip';
  a.click();
});

// (async () => {
//   await printPdfFieldsForForm('f1040');
// })();






// import { PDFDocument } from 'pdf-lib';
// import * as XLSX from 'xlsx';

// interface VariableMap {
//   [variable: string]: string | number;
// }

// const xlsxInput = document.getElementById('xlsxFile') as HTMLInputElement;
// const downloadBtn = document.getElementById('downloadPdf') as HTMLButtonElement;

// export const allSheetsData: { [sheetName: string]: VariableMap } = {};

// async function printPdfFields() {
//   const formUrl = '/forms/f1040.pdf'; // Update path if needed
//   const pdfBytes = await fetch(formUrl).then(res => res.arrayBuffer());
//   const pdfDoc = await PDFDocument.load(pdfBytes);
//   const form = pdfDoc.getForm();
//   const fields = form.getFields();

//   console.log(`Total PDF fields found: ${fields.length}`);
//   fields.forEach((field, idx) => {
//     console.log(`${idx + 1}. Field name:`, field.getName());
//   });
// }

// xlsxInput.addEventListener('change', async () => {
//   const file = xlsxInput.files?.[0];
//   if (!file) return;

//   const data = await file.arrayBuffer();
//   const workbook = XLSX.read(data, { type: 'array' });

//   // Stores parsed data per sheet
//   // const allSheetsData: { [sheetName: string]: VariableMap } = {};

//   workbook.SheetNames.forEach(sheetName => {
//     const worksheet = workbook.Sheets[sheetName];
//     const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

//     const sheetDict: VariableMap = {};

//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i];
//       const variable = row[0];
//       const value = row[1];

//       if (variable == null || variable === '' || value == null || value === '') {
//         // Stop processing this sheet on first empty variable cell
//         break;
//       }

//       sheetDict[String(variable)] = value;
//       console.log(`[${sheetName}] ${variable} = ${value}`);
//     }

//     allSheetsData[sheetName] = sheetDict;
//   });

//   // Optional: log the entire result
//   console.log('Parsed Excel Data:', allSheetsData);
// });


// downloadBtn.addEventListener('click', async () => {

//   const formUrl = '/forms/f1040.pdf';
//   const pdfBytes = await fetch(formUrl).then(res => res.arrayBuffer());
//   const pdfDoc = await PDFDocument.load(pdfBytes);
//   const form = pdfDoc.getForm();
//   const fields = form.getFields();

//   fields.forEach((field, idx) => {
//     const name = field.getName();

//     try {
//       field.setText(`Field #${idx + 1}`);
//       console.log(`Filled field "${name}" with value: Field #${idx + 1}`);
//     } catch (err) {
//       console.warn(`Could not fill field "${name}"`, err);
//     }
//   });

//   const filledPdfBytes = await pdfDoc.save();
//   const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
//   const url = URL.createObjectURL(blob);

//   const a = document.createElement('a');
//   a.href = url;
//   a.download = 'all-fields-filled.pdf';
//   a.click();
// });




