import * as pdfjsLib from 'pdfjs-dist';

// Dynamically match worker version to pdfjsLib API version
if (pdfjsLib.version) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface PdfPageImage {
  pageNum: number;
  dataUrl: string;
}

export async function getPdfTotalPages(pdfBase64: string): Promise<number> {
  try {
    let cleanBase64 = pdfBase64;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (err) {
    console.error("Error getting PDF page count:", err);
    return 1;
  }
}

export async function convertPdfToJpegImages(
  pdfBase64: string,
  startPage: number = 1,
  endPage?: number,
  onPageRendered?: (pageNum: number, totalPages: number) => void
): Promise<{ pages: PdfPageImage[]; totalPages: number }> {
  try {
    let cleanBase64 = pdfBase64;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    const fromPage = Math.max(1, startPage);
    const toPage = endPage ? Math.min(totalPages, endPage) : totalPages;

    const pages: PdfPageImage[] = [];

    for (let pageNum = fromPage; pageNum <= toPage; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await (page.render as any)({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      pages.push({ pageNum, dataUrl });

      if (onPageRendered) {
        onPageRendered(pageNum, totalPages);
      }
    }

    return { pages, totalPages };
  } catch (err: any) {
    console.error("PDF to Image conversion error:", err);
    throw new Error("Could not render PDF pages as images: " + (err?.message || String(err)));
  }
}

