import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import JSZip from 'jszip';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

/**
 * Filter out PDF internal syntax and binary stream gibberish.
 */
function isGarbagePdfLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (
    lower.includes('flatedecode') ||
    lower.includes('endstream') ||
    lower.includes('endobj') ||
    lower.includes('startxref') ||
    lower.includes('trailer') ||
    lower.includes('/font') ||
    lower.includes('/pages') ||
    lower.includes('/type') ||
    lower.startsWith('%pdf') ||
    lower.match(/^\d+\s+\d+\s+obj/)
  ) {
    return true;
  }

  // Check proportion of non-alphabetical characters or random symbols
  const letters = line.replace(/[^A-Za-z0-9]/g, '').length;
  if (line.length > 20 && letters / line.length < 0.4) {
    return true;
  }

  return false;
}

/**
 * Extracts clean, human-readable text from an uploaded PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const numPages = Math.min(pdf.numPages, 30); // Inspect up to 30 pages
  const pagePromises = Array.from({ length: numPages }, async (_, i) => {
    try {
      const page = await pdf.getPage(i + 1);
      const textContent = await page.getTextContent();
      const pageLines = textContent.items
        .map((item: any) => (item.str || '').trim())
        .filter((str: string) => str.length > 0 && !isGarbagePdfLine(str));
      return pageLines.join(' ');
    } catch (e) {
      return '';
    }
  });

  const results = await Promise.all(pagePromises);
  const cleanText = results.filter((t) => t.length > 0).join('\n\n').trim();

  if (cleanText.length > 30) {
    return cleanText;
  }

  throw new Error('No selectable text found in the PDF. It may be a scanned image or protected.');
}

/**
 * Extracts clean, human-readable text from a Word document (.docx)
 * Uses mammoth as primary engine with JSZip XML fallback
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Method 1: Mammoth extraction (Industry standard for DOCX to Text)
  try {
    const mammothResult = await mammoth.extractRawText({ arrayBuffer });
    const text = (mammothResult.value || '').trim();
    if (text.length > 20) {
      return text;
    }
  } catch (mErr) {
    console.warn('Mammoth extraction notice, trying JSZip fallback:', mErr);
  }

  // Method 2: JSZip extraction of word/document.xml
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXmlFile = zip.file('word/document.xml');
    if (documentXmlFile) {
      const xmlContent = await documentXmlFile.async('text');
      
      // Extract all text inside <w:t>...</w:t> tags
      const matches = xmlContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (matches && matches.length > 0) {
        const textParts = matches.map((m) => m.replace(/<[^>]+>/g, ''));
        const combined = textParts.join(' ').replace(/\s+/g, ' ').trim();
        if (combined.length > 20) {
          return combined;
        }
      }
    }
  } catch (zErr) {
    console.warn('JSZip DOCX extraction fallback notice:', zErr);
  }

  throw new Error('Could not extract text from this Word document. Please ensure the file is not corrupted.');
}

/**
 * Extracts clean text from a PowerPoint presentation (.pptx)
 * Uses JSZip to extract text from each slide XML
 */
export async function extractTextFromPPTX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slideFiles = Object.keys(zip.files).filter((path) =>
      path.match(/^ppt\/slides\/slide\d+\.xml$/i)
    );

    // Sort slide files in natural numerical order
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    const slideTexts: string[] = [];

    for (let i = 0; i < Math.min(slideFiles.length, 50); i++) {
      const slideFile = zip.file(slideFiles[i]);
      if (slideFile) {
        const xml = await slideFile.async('text');
        // In PPTX, text is in <a:t>...</a:t>
        const matches = xml.match(/<a:t>([^<]+)<\/a:t>/g);
        if (matches && matches.length > 0) {
          const slideWords = matches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ');
          slideTexts.push(`[Slide ${i + 1}]: ${slideWords}`);
        }
      }
    }

    const fullPptText = slideTexts.join('\n\n').trim();
    if (fullPptText.length > 20) {
      return fullPptText;
    }
  } catch (err) {
    console.warn('PPTX extraction error:', err);
  }

  throw new Error('No readable text found in PowerPoint slides.');
}

/**
 * Unified document parser supporting PDF, Word (DOCX), PowerPoint (PPTX), and plain text
 */
export async function extractTextFromDocument(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  // 1. PDF
  if (name.endsWith('.pdf') || type === 'application/pdf') {
    return await extractTextFromPDF(file);
  }

  // 2. Word (DOCX)
  if (
    name.endsWith('.docx') ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.doc') ||
    type === 'application/msword'
  ) {
    return await extractTextFromDOCX(file);
  }

  // 3. PowerPoint (PPTX)
  if (
    name.endsWith('.pptx') ||
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    name.endsWith('.ppt') ||
    type === 'application/vnd.ms-powerpoint'
  ) {
    return await extractTextFromPPTX(file);
  }

  // 4. Plain Text, Markdown, CSV
  if (
    type.includes('text') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.tsv')
  ) {
    const raw = await file.text();
    if (raw.trim().length > 10) {
      return raw.trim();
    }
  }

  // 5. General fallback
  const rawText = await file.text();
  const clean = rawText.replace(/[^A-Za-z0-9\s.,?!:;'"()\-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length > 40) {
    return clean;
  }

  throw new Error(`Unsupported or unreadable file format (${file.name}). Please upload a PDF, Word DOCX, PPTX, or TXT file.`);
}
