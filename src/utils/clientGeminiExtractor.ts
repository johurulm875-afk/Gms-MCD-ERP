import { GoogleGenAI, Type } from "@google/genai";

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
Your task is to analyze the uploaded PDF Work Order / Booking Report and extract EVERY SINGLE booking table line item across ALL pages (from Page 1 to Page 31).

CRITICAL EXTRACTION RULES:
1. COMPLETE DOCUMENT COVERAGE: Read every page from Page 1 to the end (Page 31). Do NOT stop after 10 or 20 rows.
2. NO TRUNCATION & NO DEDUPLICATION: Every single table row in every Job/PO section in the PDF MUST be extracted as an individual object in the JSON Array. Even if colors or item descriptions repeat across different rows or POs, keep EVERY row as a distinct object.
3. HIERARCHICAL FIELD EXTRACTION FOR EACH ROW:
   - Header Info:
     * Buyer Name -> "buyer" (e.g. "Bestseller A/S")
     * Booking No / Trims Ref -> "s_thread_ref" (e.g. "GMST-TB-26-00840")
     * Supplier Name -> "supplier" (e.g. "GMS Composite Knitting Ind. Ltd.")
     * Booking Date -> "booking_date" (e.g. "27-07-2026")
   - Job/PO Section Header (Each section in PDF has its own Job/PO details):
     * Job NO -> "job_no" (e.g. "GMST-26-01588", "GMST-26-01651")
     * Fabric Booking No -> "sr_gt" (e.g. "GMST-FB-26-01401", "GMST-FB-26-01431")
     * PO No -> "order_no" (e.g. "GMT4710074", "GMT4710500")
     * Style Ref & Description -> "style" (e.g. "12156101 - JJEORGANIC BASIC TEE SS O-NECK NOOS", "12151955 - JJECORP LOGO TEE SS O-NECK NOOS")
   - Table Row Columns:
     * Item Description -> "count" (e.g. "50/2; 100% Spun Polyester; 4000 Mtr/Cone")
     * Order Qty -> "order_qty" (Numeric order quantity e.g. 36, 1188, 7932, 15180, 16320)
     * Gmts Color -> "colour" (Full Gmts Color string, e.g. "PREMIUM BLACK", "MOONBEAM DETAIL:SMALL PRINT/MOONBEAM", "PINK-A-BOO DETAIL:SLIM FIT", "SLATE GRAY DETAIL:SMALL PRINT")
     * Item Color -> "item_color" (Item Color string e.g. "PREMIUM BLACK", "MOONBEAM", "PINK-A-BOO", "SLATE GRAY")
     * WO Qty / Booking Qty -> "booking_qty" (Extract clean numeric WO Qty in Cones, e.g. 1.0, 53.0, 386.0730, 739.0618)
     * Cone Length / Meter -> "meter" (e.g. "4000")
     * Line Remarks -> "remarks" (Any row remarks or "0")

Extract ALL pages thoroughly into a single JSON Array containing ALL items from Page 1 to Page 31.
`;

  const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
  let response: any = null;
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
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
      console.warn(`Client Gemini model ${modelName} failed/busy:`, err);
      lastError = err;
    }
  }

  if (!response || !response.text) {
    throw lastError || new Error("Failed to extract PDF data using Gemini AI.");
  }

  const textOutput = response.text || '[]';
  let parsedData: any[] = [];
  try {
    parsedData = JSON.parse(textOutput);
    if (Array.isArray(parsedData)) {
      parsedData = parsedData.map((item: any) => {
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
  } catch (err) {
    console.error("Failed to parse client-side Gemini output:", textOutput);
  }

  return parsedData;
}
