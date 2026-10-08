// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err: any) {
    console.error('[PdfParser] Failed to parse PDF buffer:', err);
    return '';
  }
}

export async function extractTextFromBase64Pdf(base64Str: string): Promise<string> {
  try {
    const cleanBase64 = base64Str.replace(/^data:application\/pdf;base64,/, '').trim();
    const buffer = Buffer.from(cleanBase64, 'base64');
    return extractTextFromPdfBuffer(buffer);
  } catch (err) {
    console.error('[PdfParser] Failed to decode base64 PDF:', err);
    return '';
  }
}
