import { GoogleGenAI, Type } from "@google/genai";
import { PDFDocument } from "pdf-lib";

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function extractPdfClientSide(
  base64Data: string,
  mimeType: string = 'application/pdf',
  customApiKey?: string
): Promise<any[]> {
  const apiKey =
    customApiKey ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    localStorage.getItem('gemini_api_key') ||
    '';

  if (!apiKey) {
    throw new Error(
      "GitHub Pages (Static Host) detected! Please enter your Gemini API Key in the PDF upload window to parse PDFs directly on GitHub Pages."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  let cleanBase64 = base64Data;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

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
   - Every single line item for every color must have its own JSON object containing its exact \`job_no\`, \`order_no\`, \`style\`, \`colour\`, \`item_color\`, \`count\`, \`meter\`, and numeric \`booking_qty\`.

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

  const extractChunk = async (chunkBase64: string): Promise<any[]> => {
    const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
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
                  data: chunkBase64,
                },
              },
              {
                text: promptText,
              },
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
          const errStr = String(err?.message || err);
          const isRateLimit = errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('rate-limit');
          if (isRateLimit && attempt < 2) {
            console.warn(`[Client PDF Extractor] Rate limited on ${modelName} (attempt ${attempt + 1}). Waiting 7 seconds before retrying...`);
            await new Promise(r => setTimeout(r, 7000));
          } else if (attempt < 2) {
            console.warn(`Client Gemini model ${modelName} attempt ${attempt + 1} failed (${errStr}), retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
          } else {
            console.warn(`Client Gemini model ${modelName} failed after 3 attempts (${errStr}), trying fallback model...`);
            break;
          }
        }
      }
      if (response && response.text) {
        break;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("Failed to extract PDF data using Gemini AI.");
    }

    try {
      const parsed = JSON.parse(response.text || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  let rawItems: any[] = [];
  try {
    const uint8Bytes = base64ToUint8Array(cleanBase64);
    const pdfDoc = await PDFDocument.load(uint8Bytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    if (totalPages === 1) {
      rawItems = await extractChunk(cleanBase64);
    } else {
      console.log(`[Client PDF Extractor] Processing ${totalPages} pages in 5-page chunks...`);
      const PAGES_PER_CHUNK = 5;
      for (let i = 0; i < totalPages; i += PAGES_PER_CHUNK) {
        const endPage = Math.min(i + PAGES_PER_CHUNK, totalPages);
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

        if (endPage < totalPages) {
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    }
  } catch (err) {
    console.warn("Client pdf-lib chunking failed, extracting full document:", err);
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

  return parsedData;
}
