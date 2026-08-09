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

    let rawItems: any[] = [];

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
   - Extract ONLY from the detailed Job/PO breakdown tables in pages 1 to N where each section has ONE SINGLE Job No (e.g. "GMST-26-01588"), ONE SINGLE PO No (e.g. "GMT4713194" / "GMT4710716"), and individual Garment Colors (e.g. "CHAMBRAY BLUE", "SLATE GRAY", "STORMY WEATHER", "PINK-A-BOO", "DEAUVILLE MAUVE", "BEACH SAND").
   - DO NOT combine multiple Job Nos, PO Nos, or Styles into comma-separated strings.
   - DO NOT combine quantities across different POs or colors into 1 summary object.

3. MANDATORY CROSS-PAGE BREAK & CONTINUATION ROW EXTRACTION:
   - CRITICAL: Tables in booking PDFs frequently split across page breaks, horizontal divider lines, browser print footers (e.g. "https://logic.gmsbd.com/...", "page X of Y"), or page margins!
   - You MUST extract ALL continuation rows that appear BELOW page breaks, horizontal lines, or URL footers (e.g. STORMY WEATHER, PINK-A-BOO, DEAUVILLE MAUVE, BEACH SAND).
   - INHERIT HEADERS FROM PAGE 1: On Page 2+ or lower continuation sections, the top header box (Job NO, Fabric Booking No, PO No, Style Ref) is NOT repeated and columns on the left are blank. You MUST copy / inherit the active Job NO, Fabric Booking No, PO No, Style Ref, Store Ref, Buyer, Supplier, Booking Date, and Count from Page 1 / preceding section for ALL continuation rows until a new Job NO header section appears!
   - WHEN MULTIPLE IMAGES ARE PROVIDED (Image 1 = Page 1 Reference Header Page, Image 2 = Continuation Target Page):
     * ONLY extract line items present on IMAGE 2! DO NOT re-extract items from Image 1.
     * Fill in any blank Job NO, Fabric Booking No, PO No, Style Ref, Store Ref, Buyer, Supplier, Count, Cone Length for Image 2 using the Header values from Image 1!
   - NEVER skip rows below a footer/URL line or page break. Every single color row must be extracted.

4. HIERARCHICAL FIELD EXTRACTION FOR EACH ROW:
   - Header Info:
     * Buyer Name -> "buyer" (e.g. "Bestseller A/S")
     * Booking No / Trims Ref -> "s_thread_ref" (e.g. "GMST-TB-26-00840")
     * Supplier Name -> "supplier" (e.g. "GMS Composite Knitting Ind. Ltd.")
     * Booking Date -> "booking_date" (e.g. "27-07-2026")
   - Job/PO Section Header (Each section in PDF has its own single Job/PO details):
     * Job NO -> "job_no" (e.g. "GMST-26-01588")
     * Fabric Booking No -> "sr_gt" (e.g. "GMST-FB-26-01401")
     * PO No -> "order_no" (e.g. "GMT4713194")
     * Style Ref & Description -> "style" (e.g. "12156101 - JJEORGANIC BASIC TEE SS O-NECK NOOS")
   - Table Row Columns:
     * Item Description -> "count" (e.g. "50/2; 100% Spun Polyester; 4000 Mtr/Cone")
     * Order Qty -> "order_qty" (Numeric order quantity e.g. 4000, 2000, 1000)
     * Gmts Color -> "colour" (Full Gmts Color string, e.g. "CHAMBRAY BLUE", "SLATE GRAY", "STORMY WEATHER", "PINK-A-BOO", "DEAUVILLE MAUVE", "BEACH SAND")
     * Item Color -> "item_color" (Item Color string e.g. "CHAMBRAY BLUE", "SLATE GRAY")
     * WO Qty / Booking Qty -> "booking_qty" (Extract clean numeric WO Qty in Cones for THIS specific row, e.g. 181.0, 90.0, 45.0)
     * Cone Length / Meter -> "meter" (e.g. "4000")
     * Line Remarks -> "remarks" (Any row remarks or "0")
     * Document Printed Grand Total -> "doc_grand_total" (Extract printed Item Total or Document Grand Total e.g. 541.00 or 1250)

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

      const openRouterModelsToTry = Array.from(new Set([
        openRouterModel,
        openRouterModel ? (openRouterModel.includes(':free') ? openRouterModel : `${openRouterModel}:free`) : '',
        'google/gemini-2.0-flash-exp:free',
        'qwen/qwen-2.5-vl-72b-instruct:free'
      ])).filter(Boolean);

      let openRouterRes: any = null;
      let lastOpenRouterErr: string = '';
      let hasZeroCredits = false;

      for (const mName of openRouterModelsToTry) {
        if (hasZeroCredits && !mName.includes(':free')) {
          console.log(`[OpenRouter Extractor] Skipping paid model ${mName} due to zero account balance.`);
          continue;
        }

        let currentMaxTokens = mName.includes(':free') ? 4096 : 1800;
        let modelSuccess = false;

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openRouterKey}`,
                'HTTP-Referer': 'https://ai.studio',
                'X-Title': 'Garments Sewing Thread Manager',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: mName,
                messages: [{ role: 'user', content: contentItems }],
                max_tokens: currentMaxTokens
              })
            });

            if (response.ok) {
              openRouterRes = await response.json();
              modelSuccess = true;
              break;
            } else {
              const errText = await response.text();
              lastOpenRouterErr = `OpenRouter (${mName}) Error (${response.status}): ${errText}`;

              const isZeroBalance = response.status === 402 && (
                errText.includes('never purchased credits') ||
                errText.includes('Insufficient credits') ||
                errText.includes('requires more credits')
              );

              if (isZeroBalance) {
                hasZeroCredits = true;
                const affordMatch = errText.match(/can only afford (\d+)/i);
                if (affordMatch && affordMatch[1]) {
                  const affordable = parseInt(affordMatch[1], 10);
                  if (affordable > 20 && affordable < currentMaxTokens) {
                    console.log(`[OpenRouter Extractor] Reducing max_tokens for ${mName} from ${currentMaxTokens} to ${affordable - 10} based on account balance.`);
                    currentMaxTokens = Math.max(20, affordable - 10);
                    continue;
                  }
                }
                console.log(`[OpenRouter Extractor] Paid model ${mName} failed with 402 Insufficient Credits. Switching to :free models.`);
                break;
              }

              if (response.status === 402 && currentMaxTokens > 800) {
                console.log(`[OpenRouter Extractor] 402 Payment Required for ${mName}. Reducing max_tokens to 800 and retrying...`);
                currentMaxTokens = 800;
                continue;
              }

              console.log(`[OpenRouter Extractor] Model ${mName} returned ${response.status}. Trying next fallback...`);
              break;
            }
          } catch (fetchErr: any) {
            lastOpenRouterErr = fetchErr?.message || String(fetchErr);
            break;
          }
        }

        if (modelSuccess && openRouterRes) {
          break;
        }
      }

      if (openRouterRes) {
        const orData = openRouterRes;
        const rawText = orData?.choices?.[0]?.message?.content || '';
        const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          try { rawItems = JSON.parse(jsonMatch[0]); } catch {}
        } else {
          try { rawItems = JSON.parse(rawText); } catch {}
        }
        if (!Array.isArray(rawItems) || rawItems.length === 0) {
          console.warn(`[OpenRouter Extractor] OpenRouter returned 0 items. Falling back to Gemini API...`);
        }
      } else {
        console.warn(`[OpenRouter Extractor] All OpenRouter models failed (${lastOpenRouterErr}). Falling back to Gemini API...`);
      }

      if ((!Array.isArray(rawItems) || rawItems.length === 0) && !apiKey && !process.env.GEMINI_API_KEY) {
        return res.status(400).json({
          success: false,
          error: lastOpenRouterErr || 'Failed to extract with OpenRouter models and no Gemini API Key available.'
        });
      }
    }

    // 2. Default: Gemini API Extractor (if OpenRouter was not used or yielded 0 items)
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
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

    rawItems = [];

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
  }

// Helper function to check if a header string is valid and not a placeholder/total
const isValidHeaderValue = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  const s = val.toString().trim();
  if (s.length === 0) return false;

  const u = s.toUpperCase();
  const invalidPlaceholders = [
    '-', '--', '---', '----', 'N/A', 'NA', 'N/R', 'NONE', 'BLANK', 'NULL', 'UNDEFINED',
    '.', '/', 'SAME', 'SAME AS ABOVE', 'AS ABOVE', '1ST PAGE', 'HEADER', 'SEE ABOVE',
    'TOTAL', 'GRAND TOTAL', 'SUBTOTAL', 'SUMMARY', 'RECAP', 'N.A', 'N.A.', '0', 'N/O'
  ];
  if (invalidPlaceholders.includes(u)) return false;
  if (u.includes('TOTAL') || u.includes('SUMMARY') || u.includes('RECAP')) return false;

  return true;
};

// Helper function to forward-fill header info across multi-page / continuation rows
const forwardFillHeaderInfo = (items: any[]): any[] => {
  if (!Array.isArray(items) || items.length === 0) return items;

  let activeHeader = {
    buyer: '',
    booking_date: '',
    job_no: '',
    sr_gt: '',
    order_no: '',
    s_thread_ref: '',
    style: '',
    count: '',
    supplier: '',
    meter: ''
  };

  return items.map((item) => {
    const rawJob = (item.job_no || item.ref_no_job_no || '').toString().trim();
    const rawSrGt = (item.sr_gt || item.sr_gt_no || item.fabric_booking || item.fabric_booking_no || '').toString().trim();
    const rawOrderNo = (item.order_no || item.po_no || '').toString().trim();
    const rawBuyer = (item.buyer || item.buyer_name || '').toString().trim();
    const rawSThreadRef = (item.s_thread_ref || item.store_ref || item.booking_no || item.trims_booking || '').toString().trim();
    const rawStyle = (item.style || '').toString().trim();
    const rawSupplier = (item.supplier || '').toString().trim();
    const rawBookingDate = (item.booking_date || item.date || '').toString().trim();

    let cleanCountVal = (item.count || item.thread_count || '').toString().trim();
    const itemDesc = (item.item_name || item.item_description || '').toString().trim();
    if (!isValidHeaderValue(cleanCountVal) && itemDesc) {
      if (itemDesc.includes(';') || itemDesc.includes(',')) {
        const parts = itemDesc.split(/[,;]/);
        for (const p of parts) {
          const trimmed = p.trim();
          if (/^\d{2,3}\/\d{1,2}/.test(trimmed)) {
            cleanCountVal = trimmed;
            break;
          }
        }
      }
      if (!isValidHeaderValue(cleanCountVal) && /^\d{2,3}\/\d{1,2}/.test(itemDesc)) {
        cleanCountVal = itemDesc;
      }
    } else if (cleanCountVal.includes(';') || cleanCountVal.includes(',')) {
      const parts = cleanCountVal.split(/[,;]/);
      for (const p of parts) {
        const trimmed = p.trim();
        if (/^\d{2,3}\/\d{1,2}/.test(trimmed)) {
          cleanCountVal = trimmed;
          break;
        }
      }
    }

    let cleanMeterVal = (item.meter || item.cone_meter || item.length || item.size || '').toString().trim();
    if (cleanMeterVal.toUpperCase().includes('CM') || cleanMeterVal.toLowerCase().includes('114')) {
      cleanMeterVal = '';
    }
    if (!isValidHeaderValue(cleanMeterVal) && itemDesc) {
      const match = itemDesc.match(/(\d{3,5})\s*Mtr/i);
      if (match) {
        cleanMeterVal = match[1];
      }
    }

    // Update activeHeader ONLY if a valid non-placeholder value is present
    if (isValidHeaderValue(rawJob) && !rawJob.includes(',')) {
      activeHeader.job_no = rawJob;
    }
    if (isValidHeaderValue(rawSrGt) && !rawSrGt.includes(',')) {
      activeHeader.sr_gt = rawSrGt;
    }
    if (isValidHeaderValue(rawOrderNo) && !rawOrderNo.includes(',')) {
      activeHeader.order_no = rawOrderNo;
    }
    if (isValidHeaderValue(rawBuyer)) {
      activeHeader.buyer = rawBuyer;
    }
    if (isValidHeaderValue(rawSThreadRef)) {
      activeHeader.s_thread_ref = rawSThreadRef;
    }
    if (isValidHeaderValue(rawStyle)) {
      activeHeader.style = rawStyle;
    }
    if (isValidHeaderValue(cleanCountVal)) {
      activeHeader.count = cleanCountVal;
    }
    if (isValidHeaderValue(rawSupplier)) {
      activeHeader.supplier = rawSupplier;
    }
    if (isValidHeaderValue(rawBookingDate)) {
      activeHeader.booking_date = rawBookingDate;
    }
    if (isValidHeaderValue(cleanMeterVal)) {
      activeHeader.meter = cleanMeterVal;
    }

    // Determine final inherited fields
    const finalJob = isValidHeaderValue(rawJob) ? rawJob : activeHeader.job_no;
    const finalSrGt = isValidHeaderValue(rawSrGt) ? rawSrGt : activeHeader.sr_gt;
    const finalOrderNo = isValidHeaderValue(rawOrderNo) ? rawOrderNo : activeHeader.order_no;
    const finalBuyer = isValidHeaderValue(rawBuyer) ? rawBuyer : (activeHeader.buyer || 'BESTSELLER A/S');
    const finalSThreadRef = isValidHeaderValue(rawSThreadRef) ? rawSThreadRef : activeHeader.s_thread_ref;
    const finalStyle = isValidHeaderValue(rawStyle) ? rawStyle : activeHeader.style;
    const finalCount = isValidHeaderValue(cleanCountVal) ? cleanCountVal : (activeHeader.count || '40/2');
    const finalSupplier = isValidHeaderValue(rawSupplier) ? rawSupplier : activeHeader.supplier;
    const finalBookingDate = isValidHeaderValue(rawBookingDate) ? rawBookingDate : activeHeader.booking_date;
    const finalMeter = isValidHeaderValue(cleanMeterVal) ? cleanMeterVal : (activeHeader.meter || '4000');

    return {
      ...item,
      buyer: finalBuyer,
      buyer_name: finalBuyer,
      booking_date: finalBookingDate,
      job_no: finalJob,
      ref_no_job_no: finalJob,
      sr_gt: finalSrGt,
      sr_gt_no: finalSrGt,
      order_no: finalOrderNo,
      po_no: finalOrderNo,
      s_thread_ref: finalSThreadRef,
      store_ref: finalSThreadRef,
      style: finalStyle,
      count: finalCount,
      thread_count: finalCount,
      item_name: 'Spun Polyester Thread',
      supplier: finalSupplier,
      meter: finalMeter
    };
  });
};

    let parsedData: any[] = [];
    if (Array.isArray(rawItems)) {
      const mapped = rawItems
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
            remarks: item.remarks || '',
            doc_grand_total: item.doc_grand_total || item.item_total || item.grand_total || null
          };
        });

      // Apply forward-fill pass so all continuation rows carry Page 1 header info
      const filled = forwardFillHeaderInfo(mapped);

      const filtered = filled.filter((item: any) => {
        const col = (item.colour || item.color || item.pantone || item.shade_no || '').toString().toUpperCase().trim();
        const job = (item.job_no || '').toString();
        // Skip summary rows where color is a single digit and no valid job/po exists
        if (/^\d{1,2}$/.test(col) && (!job || job.includes(','))) return false;
        // Skip summary rows with summary keywords
        if (col.includes('TOTAL') || col.includes('SUMMARY') || col.includes('RECAP') || col.includes('GRAND TOTAL')) return false;
        // Skip if job_no is a comma-separated list of multiple job numbers from summary table
        if (job.includes(',')) return false;
        // Must have positive quantity
        return Number(item.booking_qty) > 0;
      });

      // Retain ALL extracted table rows accurately without dropping duplicate quantities
      parsedData = filtered;
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
