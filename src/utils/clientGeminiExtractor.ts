import { GoogleGenAI, Type } from "@google/genai";
import { PDFDocument } from "pdf-lib";
import { convertPdfToJpegImages } from "./pdfToImage";

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Exported Helper function to return extracted items while keeping all valid table rows
export function deduplicateExtractedItems(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  return items;
}

// Helper function to check if a header string is valid and not a placeholder/total
export function isValidHeaderValue(val: any): boolean {
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
}

// Exported Helper function to forward-fill header info across multi-page / continuation rows
export function forwardFillHeaderInfo(items: any[]): any[] {
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

    let cleanCountVal = (item.count || '').toString().trim();
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
      meter: finalMeter,
      size: finalMeter
    };
  });
}

export async function extractPdfClientSide(
  base64Data: string | string[],
  mimeType: string = 'application/pdf',
  customApiKey?: string,
  options?: {
    aiProvider?: 'gemini' | 'openrouter';
    openRouterKey?: string;
    openRouterModel?: string;
  }
): Promise<any[]> {
  const provider = options?.aiProvider || (localStorage.getItem('ai_provider') as 'gemini' | 'openrouter') || 'gemini';
  const openRouterKey = options?.openRouterKey || localStorage.getItem('openrouter_api_key') || '';
  const openRouterModel = options?.openRouterModel || localStorage.getItem('openrouter_model') || 'qwen/qwen-2.5-vl-72b-instruct:free';
  let lastErrText = '';

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

  // OpenRouter Client-Side Processing
  if (provider === 'openrouter') {
    if (!openRouterKey) {
      throw new Error("Please enter your OpenRouter API Key (sk-or-v1-...) to use Qwen Free AI.");
    }

    const contentItems: any[] = [{ type: 'text', text: promptText + "\nRespond STRICTLY with a valid JSON array of objects." }];

    let imageList: string[] = [];
    if (Array.isArray(base64Data)) {
      imageList = base64Data;
    } else if (mimeType.includes('pdf') || base64Data.startsWith('data:application/pdf') || (!base64Data.startsWith('data:image/') && base64Data.length > 500)) {
      try {
        console.log("[Client OpenRouter Extractor] Converting PDF pages to JPEG images...");
        const converted = await convertPdfToJpegImages(base64Data);
        imageList = converted.pages.map(p => p.dataUrl);
      } catch (pdfErr) {
        console.warn("PDF conversion failed, attempting raw:", pdfErr);
        imageList = [base64Data];
      }
    } else {
      imageList = [base64Data];
    }

    imageList.forEach(b => {
      const u = b.startsWith('data:') ? b : `data:image/jpeg;base64,${b}`;
      contentItems.push({ type: 'image_url', image_url: { url: u } });
    });

    const openRouterModelsToTry = Array.from(new Set([
      openRouterModel,
      openRouterModel ? (openRouterModel.includes(':free') ? openRouterModel : `${openRouterModel}:free`) : '',
      'google/gemini-2.0-flash-exp:free',
      'qwen/qwen-2.5-vl-72b-instruct:free'
    ])).filter(Boolean);

    let json: any = null;
    lastErrText = '';
    let hasZeroCredits = false;

    for (const mName of openRouterModelsToTry) {
      if (hasZeroCredits && !mName.includes(':free')) {
        console.log(`[Client OpenRouter Extractor] Skipping paid model ${mName} due to zero account balance.`);
        continue;
      }

      let currentMaxTokens = mName.includes(':free') ? 4096 : 1800;
      let modelSuccess = false;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterKey}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Sewing Thread Manager',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: mName,
              messages: [{ role: 'user', content: contentItems }],
              max_tokens: currentMaxTokens
            })
          });

          if (res.ok) {
            json = await res.json();
            modelSuccess = true;
            break;
          } else {
            const errText = await res.text();
            lastErrText = `OpenRouter (${mName}) Error (${res.status}): ${errText}`;

            const isZeroBalance = res.status === 402 && (
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
                  console.log(`[Client OpenRouter Extractor] Reducing max_tokens for ${mName} from ${currentMaxTokens} to ${affordable - 10} based on account balance.`);
                  currentMaxTokens = Math.max(20, affordable - 10);
                  continue;
                }
              }
              console.log(`[Client OpenRouter Extractor] Paid model ${mName} failed with 402 Insufficient Credits. Switching to :free models.`);
              break;
            }

            if (res.status === 402 && currentMaxTokens > 800) {
              console.log(`[Client OpenRouter Extractor] 402 Payment Required for ${mName}. Reducing max_tokens to 800 and retrying...`);
              currentMaxTokens = 800;
              continue;
            }

            console.log(`[Client OpenRouter Extractor] Model ${mName} returned ${res.status}. Trying next fallback...`);
            break;
          }
        } catch (err: any) {
          lastErrText = err?.message || String(err);
          break;
        }
      }

      if (modelSuccess && json) {
        break;
      }
    }

      if (json) {
        const txt = json?.choices?.[0]?.message?.content || '';
        const match = txt.match(/\[\s*\{[\s\S]*\}\s*\]/);
        let rawItems: any[] = [];
        if (match) {
          try { rawItems = JSON.parse(match[0]); } catch {}
        } else {
          try { rawItems = JSON.parse(txt); } catch {}
        }

        const parsed = (Array.isArray(rawItems) ? rawItems : []).map(item => ({
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
          remarks: item.remarks || '',
          doc_grand_total: item.doc_grand_total || item.item_total || item.grand_total || null
        }));

        if (parsed.length > 0) {
          return parsed;
        }
        console.warn(`[Client OpenRouter Extractor] OpenRouter returned 0 items. Trying Gemini fallback...`);
      } else {
        console.warn(`[Client OpenRouter Extractor] All OpenRouter models failed (${lastErrText}). Trying Gemini fallback...`);
      }
    }

    // Gemini Client-Side Processing
    const apiKey =
      customApiKey ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      localStorage.getItem('gemini_api_key') ||
      '';

    if (!apiKey) {
      throw new Error(
        `OpenRouter Error: ${lastErrText || 'All models failed.'}. Please enter a valid Gemini or OpenRouter Key.`
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const firstBase64 = Array.isArray(base64Data) ? base64Data[0] : base64Data;
    let cleanBase64 = firstBase64.includes(',') ? firstBase64.split(',')[1] : firstBase64;

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

    const extractChunk = async (chunkData: string | string[]): Promise<any[]> => {
      const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'];
    let response: any = null;
    let lastError: any = null;

    const contents: any[] = [];
    if (Array.isArray(chunkData)) {
      chunkData.forEach(b => {
        let clean = b.includes(',') ? b.split(',')[1] : b;
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: clean } });
      });
    } else {
      let clean = chunkData.includes(',') ? chunkData.split(',')[1] : chunkData;
      contents.push({ inlineData: { mimeType: mimeType, data: clean } });
    }
    contents.push({ text: promptText });

    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
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
                    remarks: { type: Type.STRING },
                  },
                },
              },
            },
          });

          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          if (isRateLimitError(err)) {
            if (attempt === 0) {
              console.warn(`[Client PDF Extractor] Rate limited on ${modelName}. Waiting 3s...`);
              await new Promise(r => setTimeout(r, 3000));
            } else {
              console.warn(`[Client PDF Extractor] Gemini API quota limit on ${modelName}, trying fallback model...`);
              break;
            }
          } else if (isUnavailableError(err)) {
            if (attempt === 0) {
              console.warn(`[Client PDF Extractor] Model ${modelName} high demand (503). Retrying in 2s...`);
              await new Promise(r => setTimeout(r, 2000));
            } else {
              console.warn(`[Client PDF Extractor] Model ${modelName} unavailable, trying fallback model...`);
              break;
            }
          } else {
            console.warn(`Client Gemini model ${modelName} error (${err?.message || err}), trying next attempt/model...`);
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
        throw new Error("Gemini API free tier rate limit reached (429). Please wait 15–30 seconds before retrying.");
      }
      throw lastError || new Error("Failed to extract PDF data using Gemini AI.");
    }

    try {
      const parsed = JSON.parse(response.text || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const extractPdfByPages = async (pdfDoc: PDFDocument, totalPages: number, pagesPerChunk: number): Promise<any[]> => {
    const items: any[] = [];
    for (let i = 0; i < totalPages; i += pagesPerChunk) {
      const endPage = Math.min(i + pagesPerChunk, totalPages);
      console.log(`[Client PDF Extractor] Processing pages ${i + 1} to ${endPage} of ${totalPages}...`);
      try {
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
          items.push(...chunkResult);
        }
      } catch (chunkErr: any) {
        if (isRateLimitError(chunkErr)) {
          throw chunkErr;
        }
        console.warn(`[Client PDF Extractor] Chunk ${i + 1}-${endPage} extraction failed:`, chunkErr?.message || chunkErr);
      }

      if (endPage < totalPages) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return items;
  };

  let rawItems: any[] = [];
  try {
    const uint8Bytes = base64ToUint8Array(cleanBase64);
    const pdfDoc = await PDFDocument.load(uint8Bytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    console.log(`[Client PDF Extractor] PDF loaded with ${totalPages} pages.`);
    if (totalPages <= 2) {
      try {
        rawItems = await extractChunk(cleanBase64);
        console.log(`[Client PDF Extractor] Single-call extraction successful: extracted ${rawItems.length} items.`);
      } catch (singleCallErr: any) {
        if (isRateLimitError(singleCallErr)) {
          throw singleCallErr;
        }
        console.warn(`[Client PDF Extractor] Single-call extraction failed on ${totalPages}-page PDF. Splitting page by page...`);
        rawItems = await extractPdfByPages(pdfDoc, totalPages, 1);
      }
    } else {
      console.log(`[Client PDF Extractor] Processing multi-page PDF (${totalPages} pages) in 2-page chunks...`);
      rawItems = await extractPdfByPages(pdfDoc, totalPages, 2);
    }
  } catch (err: any) {
    if (isRateLimitError(err)) {
      throw err;
    }
    console.warn("Client pdf-lib chunking failed, extracting full document:", err);
    rawItems = await extractChunk(cleanBase64);
  }

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
          remarks: item.remarks || ''
        };
      });

    const filled = forwardFillHeaderInfo(mapped);

    parsedData = filled.filter((item: any) => {
      const col = item.colour.toUpperCase();
      const job = item.job_no;
      if (/^\d{1,2}$/.test(col) && (!job || job.includes(','))) return false;
      if (col.includes('TOTAL') || col.includes('SUMMARY') || col.includes('RECAP') || col.includes('GRAND')) return false;
      if (job.includes(',')) return false;
      return col.length > 0 && item.booking_qty > 0;
    });
  }

  return deduplicateExtractedItems(parsedData);
}
