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
function getGenAIClient(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
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

// Endpoint: Extract Sewing Thread Booking Report from PDF or Images
app.post('/api/extract-sewing-thread-pdf', async (req, res) => {
  try {
    const {
      pdfBase64,
      imagesBase64,
      mimeType = 'application/pdf',
      apiKey,
      aiProvider = 'gemini',
      openRouterKey,
      openRouterModel = 'qwen/qwen-2.5-vl-72b-instruct:free'
    } = req.body || {};

    if (!pdfBase64 && (!Array.isArray(imagesBase64) || imagesBase64.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Missing pdfBase64 or imagesBase64 data in request body.'
      });
    }

    const promptText = `
You are an expert Data Extraction AI for Garments Sewing Thread / Trims Booking Reports V2 / Work Orders.
Your task is to analyze the uploaded PDF Work Order / Booking Report page(s) or Image(s) and extract EVERY SINGLE individual booking table line item.

CRITICAL EXTRACTION RULES (STRICT LINE-BY-LINE PER ROW):
1. IGNORE SUMMARY / GRAND TOTAL / RECAP TABLES AT THE END OF PDF/IMAGE:
   - Garments PDF Work Orders have a SUMMARY / RECAP table at the end listing items like "Item 7: (40/2; 100% Spun Polyester) Total Cones: 4624" with multiple comma-separated Job Nos. YOU MUST IGNORE AND SKIP THIS SUMMARY TABLE COMPLETELY. DO NOT EXTRACT IT.
   - NEVER extract rows where Garment Color is a number like "7" or "1", or where Job No is a comma-separated list of multiple jobs.

2. EXTRACT ONLY DETAILED COLOR BREAKDOWN ROWS:
   - Extract ONLY from the detailed Job/PO breakdown tables in pages 1 to N where each section has ONE SINGLE Job No (e.g. "GMST-26-01630"), ONE SINGLE PO No (e.g. "12298993"), and individual Garment Colors (e.g. "PREMIUM BLACK", "MOONBEAM", "PINK-A-BOO", etc.).
   - DO NOT combine multiple Job Nos, PO Nos, or Styles into comma-separated strings (e.g. DO NOT write "GMST-26-01630, GMST-26-01631").
   - DO NOT combine quantities across different POs or colors into 1 summary object.
   - Each Job section in the PDF has its OWN single Job No (e.g. "GMST-26-01630"), its OWN single PO No (e.g. "12298993"), and its OWN single Style.

3. MANDATORY INDIVIDUAL ROW EXTRACTION:
   - Extract EVERY SINGLE table row in EVERY Job/PO section as an individual JSON object in the array.
   - Every single line item for every color must have its own JSON object containing its exact job_no, order_no, style, colour, item_color, count, meter, and numeric booking_qty.

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

Extract ALL individual color breakdown table rows into a JSON Array.
`;

    // 1. Handle OpenRouter AI Provider (Qwen 2.5 VL / OpenRouter Vision Models)
    if (aiProvider === 'openrouter') {
      if (!openRouterKey) {
        return res.status(400).json({
          success: false,
          error: 'Please enter your OpenRouter API Key (sk-or-v1-...) in settings to use Qwen AI.'
        });
      }

      console.log(`[OpenRouter Extractor] Extracting using model ${openRouterModel}...`);
      const contentItems: any[] = [{ type: 'text', text: promptText + "\nRespond STRICTLY with a valid JSON array of objects." }];

      if (Array.isArray(imagesBase64) && imagesBase64.length > 0) {
        imagesBase64.forEach(img => {
          const urlStr = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
          contentItems.push({ type: 'image_url', image_url: { url: urlStr } });
        });
      } else if (pdfBase64) {
        const urlStr = pdfBase64.startsWith('data:') ? pdfBase64 : `data:${mimeType};base64,${pdfBase64}`;
        contentItems.push({ type: 'image_url', image_url: { url: urlStr } });
      }

      const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://ai.studio',
          'X-Title': 'Garments Sewing Thread Manager',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: openRouterModel || 'qwen/qwen-2.5-vl-72b-instruct:free',
          messages: [{ role: 'user', content: contentItems }]
        })
      });

      if (!openRouterRes.ok) {
        const errText = await openRouterRes.text();
        return res.status(openRouterRes.status).json({
          success: false,
          error: `OpenRouter API Error (${openRouterRes.status}): ${errText}`
        });
      }

      const orData = await openRouterRes.json();
      const rawText = orData?.choices?.[0]?.message?.content || '';
      const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      let rawItems: any[] = [];
      if (jsonMatch) {
        try { rawItems = JSON.parse(jsonMatch[0]); } catch {}
      } else {
        try { rawItems = JSON.parse(rawText); } catch {}
      }

      const parsedData = (Array.isArray(rawItems) ? rawItems : []).map((item: any) => ({
        buyer: item.buyer || item.buyer_name || '',
        booking_date: item.booking_date || item.date || '',
        job_no: item.job_no || '',
        sr_gt: item.sr_gt || item.fabric_booking || '',
        order_no: item.order_no || item.po_no || '',
        s_thread_ref: item.s_thread_ref || item.trims_booking || item.booking_no || '',
        style: item.style || '',
        count: item.count || item.thread_count || item.item_description || '40/2',
        colour: item.colour || item.color || item.gmts_color || '',
        item_color: item.item_color || item.colour || '',
        meter: String(item.meter || item.cone_length || '4000'),
        pantone: item.pantone || '',
        order_qty: Number(item.order_qty) || 0,
        booking_qty: Number(item.booking_qty || item.wo_qty || item.order_qty) || 0,
        supplier: item.supplier || '',
        remarks: item.remarks || ''
      }));

      return res.json({ success: true, count: parsedData.length, data: parsedData });
    }

    // 2. Default: Gemini API Extractor
    const ai = getGenAIClient(apiKey);

    const isRateLimitError = (err: any): boolean => {
      if (!err) return false;
      const errStr = String(err?.message || err).toLowerCase();
      return (
        errStr.includes('429') ||
        errStr.includes('quota') ||
        errStr.includes('resource_exhausted') ||
        errStr.includes('rate limit') ||
        errStr.includes('rate-limit') ||
        errStr.includes('free tier') ||
        errStr.includes('limit reached')
      );
    };

    const isUnavailableError = (err: any): boolean => {
      if (!err) return false;
      const errStr = String(err?.message || err).toLowerCase();
      return errStr.includes('503') || errStr.includes('unavailable') || errStr.includes('high demand');
    };

    // Extract chunk using Gemini API
    const extractChunk = async (chunkData: { data: string; mimeType: string }[]): Promise<any[]> => {
      const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'];
      let response: any = null;
      let lastError: any = null;

      const contents: any[] = chunkData.map(c => ({
        inlineData: {
          mimeType: c.mimeType || 'application/pdf',
          data: c.data.replace(/^data:.*?;base64,/, '')
        }
      }));
      contents.push({ text: promptText });

      for (const modelName of modelsToTry) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents,
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
            if (isRateLimitError(err)) {
              if (attempt === 0) {
                console.warn(`[PDF Extractor] Rate limited on ${modelName}. Waiting 3s for quota reset...`);
                await new Promise(r => setTimeout(r, 3000));
              } else {
                console.warn(`[PDF Extractor] Gemini API quota limit on ${modelName}, trying fallback model...`);
                break; // Try next model in list
              }
            } else if (isUnavailableError(err)) {
              if (attempt === 0) {
                console.warn(`[PDF Extractor] Model ${modelName} high demand (503). Retrying in 2s...`);
                await new Promise(r => setTimeout(r, 2000));
              } else {
                console.warn(`[PDF Extractor] Model ${modelName} unavailable, trying fallback model...`);
                break;
              }
            } else {
              console.warn(`Model ${modelName} error (${err?.message || err}), trying next attempt/model...`);
              break;
            }
          }
        }
        if (response && response.text) {
          break;
        }
      }

      if (!response || !response.text) {
        if (isRateLimitError(lastError)) {
          throw new Error("Gemini API free tier rate limit reached. Please wait 15–30 seconds before retrying or switch to Qwen OpenRouter API Key.");
        }
        throw lastError || new Error("Failed to extract chunk data.");
      }

      try {
        const parsed = JSON.parse(response.text);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    let rawItems: any[] = [];

    if (Array.isArray(imagesBase64) && imagesBase64.length > 0) {
      console.log(`[Image Extractor] Processing ${imagesBase64.length} image files via Gemini API...`);
      const chunkData = imagesBase64.map(img => ({
        data: img.replace(/^data:.*?;base64,/, ''),
        mimeType: img.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
      }));
      rawItems = await extractChunk(chunkData);
    } else {
      const cleanBase64 = (pdfBase64 || '').replace(/^data:application\/pdf;base64,/, '').replace(/^data:.*?;base64,/, '');

      const extractPdfByPages = async (pdfDoc: PDFDocument, totalPages: number, pagesPerChunk: number): Promise<any[]> => {
        const items: any[] = [];
        for (let i = 0; i < totalPages; i += pagesPerChunk) {
          const endPage = Math.min(i + pagesPerChunk, totalPages);
          console.log(`[PDF Extractor] Processing pages ${i + 1} to ${endPage} of ${totalPages}...`);
          try {
            const subDoc = await PDFDocument.create();
            const pageIndices = [];
            for (let j = i; j < endPage; j++) {
              pageIndices.push(j);
            }

            const copiedPages = await subDoc.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach(p => subDoc.addPage(p));

            const subBase64 = await subDoc.saveAsBase64();
            const chunkResult = await extractChunk([{ data: subBase64, mimeType: 'application/pdf' }]);
            if (Array.isArray(chunkResult)) {
              items.push(...chunkResult);
            }
          } catch (chunkErr: any) {
            if (isRateLimitError(chunkErr)) {
              throw chunkErr;
            }
            console.warn(`[PDF Extractor] Chunk ${i + 1}-${endPage} extraction failed:`, chunkErr?.message || chunkErr);
          }

          if (endPage < totalPages) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
        return items;
      };

      try {
        const pdfBuffer = Buffer.from(cleanBase64, 'base64');
        const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        const totalPages = pdfDoc.getPageCount();

        console.log(`[PDF Extractor] PDF loaded with ${totalPages} pages.`);
        if (totalPages <= 2) {
          try {
            rawItems = await extractChunk([{ data: cleanBase64, mimeType: 'application/pdf' }]);
            console.log(`[PDF Extractor] Single-call extraction successful: extracted ${rawItems.length} items.`);
          } catch (singleCallErr: any) {
            if (isRateLimitError(singleCallErr)) {
              throw singleCallErr;
            }
            console.warn(`[PDF Extractor] Single-call extraction failed on ${totalPages}-page PDF. Splitting page by page...`);
            rawItems = await extractPdfByPages(pdfDoc, totalPages, 1);
          }
        } else {
          console.log(`[PDF Extractor] Processing multi-page PDF (${totalPages} pages) in 2-page chunks...`);
          rawItems = await extractPdfByPages(pdfDoc, totalPages, 2);
        }
      } catch (pdfErr: any) {
        if (isRateLimitError(pdfErr)) {
          throw pdfErr;
        }
        console.warn("pdf-lib chunking failed, falling back to full PDF extraction:", pdfErr);
        rawItems = await extractChunk([{ data: cleanBase64, mimeType: 'application/pdf' }]);
      }
    }

    let parsedData: any[] = [];
    if (Array.isArray(rawItems)) {
      parsedData = rawItems
        .map((item: any) => {
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
        })
        .filter((item: any) => {
          const col = item.colour.toUpperCase();
          const job = item.job_no;
          // Skip summary rows where color is a number e.g. "7" or "1"
          if (/^\d+$/.test(col)) return false;
          // Skip summary rows with summary keywords
          if (col.includes('TOTAL') || col.includes('SUMMARY') || col.includes('RECAP') || col.includes('GRAND')) return false;
          // Skip if job_no is a comma-separated list of multiple job numbers from summary table
          if (job.includes(',')) return false;
          // Must have valid color and positive quantity
          return col.length > 0 && item.booking_qty > 0;
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
