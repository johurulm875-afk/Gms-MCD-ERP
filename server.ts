import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { PDFDocument } from 'pdf-lib';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body parser limit for base64 PDF uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Initialize GoogleGenAI client lazily on the server
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint: Extract Sewing Thread Booking Report from PDF
app.post('/api/extract-sewing-thread-pdf', async (req, res) => {
  try {
    const { pdfBase64, mimeType = 'application/pdf' } = req.body || {};

    if (!pdfBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing pdfBase64 data in request body.'
      });
    }

    // Clean base64 string if data URL prefix exists
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').replace(/^data:.*?;base64,/, '');

    const ai = getGenAIClient();

    const promptText = `
You are an expert Data Extraction AI for Garments Sewing Thread / Trims Booking Reports V2 / Work Orders.
Your task is to analyze the uploaded PDF Work Order / Booking Report page(s) and extract EVERY SINGLE individual booking table line item.

CRITICAL EXTRACTION RULES (STRICT LINE-BY-LINE PER ROW):
1. ABSOLUTELY NO MERGING / NO COMBINING / NO AGGREGATION:
   - DO NOT combine multiple Job Nos, PO Nos, or Styles into comma-separated strings (e.g. DO NOT write "GMST-26-01630, GMST-26-01631").
   - DO NOT combine quantities across different POs or colors into 1 summary object.
   - Each Job section in the PDF has its OWN single Job No (e.g. "GMST-26-01630"), its OWN single PO No (e.g. "12298993"), and its OWN single Style.
   - Each row inside the table is for a specific Garments Color / Item Color.

2. MANDATORY INDIVIDUAL ROW EXTRACTION:
   - Extract EVERY SINGLE table row in EVERY Job/PO section as an individual JSON object in the array.
   - Every single line item for every color must have its own JSON object containing its exact job_no, order_no, style, colour, item_color, count, meter, and numeric booking_qty.

3. IGNORE SUMMARY / GRAND TOTAL TABLES:
   - Ignore any overall summary table at the end or top that aggregates total cones across all jobs. Extract ONLY the detailed line-item table rows from each Job/PO breakdown section.

4. HIERARCHICAL FIELD EXTRACTION FOR EACH ROW:
   - Header Info:
     * Buyer Name -> "buyer" (e.g. "Bestseller A/S")
     * Booking No / Trims Ref -> "s_thread_ref" (e.g. "GMST-TB-26-00840")
     * Supplier Name -> "supplier" (e.g. "GMS Composite Knitting Ind. Ltd.")
     * Booking Date -> "booking_date" (e.g. "27-07-2026")
   - Job/PO Section Header (Each section in PDF has its own single Job/PO details):
     * Job NO -> "job_no" (e.g. "GMST-26-01588")
     * Fabric Booking No -> "sr_gt" (e.g. "GMST-FB-26-01401")
     * PO No -> "order_no" (e.g. "GMT4710074")
     * Style Ref & Description -> "style" (e.g. "12156101 - JJEORGANIC BASIC TEE SS O-NECK NOOS")
   - Table Row Columns:
     * Item Description -> "count" (e.g. "50/2; 100% Spun Polyester; 4000 Mtr/Cone")
     * Order Qty -> "order_qty" (Numeric order quantity e.g. 36, 1188, 7932, 15180, 16320)
     * Gmts Color -> "colour" (Full Gmts Color string, e.g. "PREMIUM BLACK", "MOONBEAM DETAIL:SMALL PRINT/MOONBEAM")
     * Item Color -> "item_color" (Item Color string e.g. "PREMIUM BLACK", "MOONBEAM")
     * WO Qty / Booking Qty -> "booking_qty" (Extract clean numeric WO Qty in Cones for THIS specific row, e.g. 1.0, 53.0, 386.07)
     * Cone Length / Meter -> "meter" (e.g. "4000")
     * Line Remarks -> "remarks" (Any row remarks or "0")

Extract ALL individual table rows into a JSON Array.
`;

    // Function to extract items from a single base64 chunk with retry on 429
    const extractChunk = async (chunkBase64: string): Promise<any[]> => {
      const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
      let response: any = null;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: chunkBase64
                  }
                },
                {
                  text: promptText
                }
              ],
              config: {
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      buyer: { type: Type.STRING },
                      booking_date: { type: Type.STRING },
                      job_no: { type: Type.STRING },
                      sr_gt: { type: Type.STRING },
                      order_no: { type: Type.STRING },
                      s_thread_ref: { type: Type.STRING },
                      style: { type: Type.STRING },
                      count: { type: Type.STRING },
                      colour: { type: Type.STRING },
                      item_color: { type: Type.STRING },
                      meter: { type: Type.STRING },
                      pantone: { type: Type.STRING },
                      order_qty: { type: Type.NUMBER },
                      booking_qty: { type: Type.NUMBER },
                      supplier: { type: Type.STRING },
                      remarks: { type: Type.STRING }
                    }
                  }
                }
              }
            });

            if (response && response.text) {
              break;
            }
          } catch (err: any) {
            lastError = err;
            const errStr = String(err?.message || err);
            const isRateLimit = errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('rate-limit');
            if (isRateLimit && attempt < 2) {
              console.warn(`[PDF Extractor] Rate limited on ${modelName} (attempt ${attempt + 1}). Waiting 7 seconds before retrying...`);
              await new Promise(r => setTimeout(r, 7000));
            } else {
              console.warn(`Model ${modelName} failed or busy (${errStr}), trying fallback model...`);
              break; // Try next model in list
            }
          }
        }
        if (response && response.text) {
          break;
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error("Failed to extract chunk data.");
      }

      try {
        const parsed = JSON.parse(response.text);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    // Split multi-page PDF into 5-page chunks so Gemini never truncates large documents and stays within API limits
    let rawItems: any[] = [];
    try {
      const pdfBuffer = Buffer.from(cleanBase64, 'base64');
      const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();

      if (totalPages === 1) {
        rawItems = await extractChunk(cleanBase64);
      } else {
        console.log(`[PDF Extractor] Multi-page PDF detected with ${totalPages} pages. Processing in 5-page chunks...`);
        const PAGES_PER_CHUNK = 5;
        for (let i = 0; i < totalPages; i += PAGES_PER_CHUNK) {
          const endPage = Math.min(i + PAGES_PER_CHUNK, totalPages);
          console.log(`[PDF Extractor] Processing pages ${i + 1} to ${endPage} of ${totalPages}...`);

          const subDoc = await PDFDocument.create();
          const pageIndices = [];
          for (let j = i; j < endPage; j++) {
            pageIndices.push(j);
          }

          const copiedPages = await subDoc.copyPages(pdfDoc, pageIndices);
          copiedPages.forEach(p => subDoc.addPage(p));

          const subBase64 = await subDoc.saveAsBase64();
          const chunkResult = await extractChunk(subBase64);
          if (Array.isArray(chunkResult)) {
            rawItems.push(...chunkResult);
          }

          // Delay 1.2s between chunks to prevent API rate limiting
          if (endPage < totalPages) {
            await new Promise(r => setTimeout(r, 1200));
          }
        }
        console.log(`[PDF Extractor] Successfully extracted ${rawItems.length} items across all ${totalPages} pages.`);
      }
    } catch (pdfErr) {
      console.warn("pdf-lib chunking failed, falling back to full PDF extraction:", pdfErr);
      rawItems = await extractChunk(cleanBase64);
    }

    let parsedData: any[] = [];
    if (Array.isArray(rawItems)) {
      parsedData = rawItems.map((item: any) => {
        const rawBQty = Number(item.booking_qty || item.wo_qty || item.order_qty) || 0;
        const cleanBQty = Math.round((rawBQty + Number.EPSILON) * 100) / 100;

        const colorVal = (item.colour || item.color || item.gmts_color || item.item_color || '').toString().trim();
        const countVal = (item.count || item.item_name || item.item_description || item.description || '').toString().trim();
        let meterVal = (item.meter || item.cone_meter || item.length || '').toString().trim();
        if (meterVal.toUpperCase().includes('CM') || meterVal.toLowerCase().includes('114')) {
          meterVal = '';
        }
        const jobNoVal = (item.job_no || item.ref_no_job_no || '').toString().trim();
        const srGtVal = (item.sr_gt || item.sr_gt_no || item.fabric_booking_no || '').toString().trim();
        const poNoVal = (item.order_no || item.po_no || '').toString().trim();
        const buyerVal = (item.buyer || item.buyer_name || 'BESTSELLER A/S').toString().trim();
        const storeRefVal = (item.s_thread_ref || item.store_ref || item.booking_no || '').toString().trim();

        return {
          buyer: buyerVal,
          buyer_name: buyerVal,
          booking_date: item.booking_date || item.date || '',
          job_no: jobNoVal,
          ref_no_job_no: jobNoVal,
          sr_gt: srGtVal,
          sr_gt_no: srGtVal,
          order_no: poNoVal,
          po_no: poNoVal,
          s_thread_ref: storeRefVal,
          store_ref: storeRefVal,
          style: item.style || '',
          count: countVal,
          item_name: countVal,
          colour: colorVal,
          color: colorVal,
          meter: meterVal,
          size: meterVal,
          pantone: item.pantone || item.gmts_size || '',
          booking_qty: cleanBQty,
          wo_qty: cleanBQty,
          balance_qty: cleanBQty,
          due_qty: cleanBQty,
          receive_qty: 0,
          issue_qty: 0,
          supplier: item.supplier || '',
          remarks: item.remarks || ''
        };
      });
    }

    return res.json({
      success: true,
      count: parsedData.length,
      data: parsedData
    });
  } catch (error: any) {
    console.error("Error in /api/extract-sewing-thread-pdf:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to extract PDF data using Gemini AI.'
    });
  }
});

// Vite & Static file setup
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler for Express to ensure all error responses are JSON
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Express Error Handler:", err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

setupServer();
