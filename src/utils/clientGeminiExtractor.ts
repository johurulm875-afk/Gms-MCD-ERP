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
You are an expert Data Extraction AI for Garments Drawstring Booking Reports V2 / Work Orders.
Your task is to analyze the uploaded PDF Work Order / Booking Report and extract EVERY SINGLE drawstring booking line item across ALL pages.

### Document Hierarchy & Field Extraction Rules:
1. Header Info (Common to all items in document unless specified):
   - Buyer Name -> "buyer" (e.g., "Bestseller A/S", "STANLEY STELLA")
   - Booking No / Trims Ref -> "s_thread_ref" (e.g., "GMST-TB-26-00782")
   - Supplier Name -> "supplier" (e.g., "Gms Trims Limited")
   - Booking Date -> "booking_date" (e.g., "14-07-2026")

2. Job Section Header (Each section in PDF has its own Job details):
   - Job NO -> "job_no" (e.g., "GMST-26-01543")
   - Fabric Booking No -> "sr_gt" (e.g., "GMST-FB-26-01361")
   - PO No -> "order_no" (e.g., "GMT4728405")
   - Style Ref & Desc -> "style" (e.g., "12137054 - JJECORP OLD LOGO SWEAT HOOD NOOS")

3. Table Line Items (Extract one JSON object per table row):
   - Item Description -> "count" (e.g., "1 cm cotton Flat drawstring with Plastic tips Length 120 Cm")
   - Gmts Color / Item Color -> "colour" (e.g., "LIGHT GREY MELANGE", "WHITE", "NAVY BLAZER", "PREMIUM BLACK")
   - Item Size / Finish Length -> "meter" (e.g., "120 CM", "118 CM", "114 CM")
   - Gmts Size -> "pantone" (e.g., "XS", "S", "M", "L", "XL", "XXL")
   - WO Qty / Booking Qty -> "booking_qty" (Extract clean numeric quantity, e.g., 20, 123, 285, 410, 308, 183)
   - Line Remarks -> "remarks" (Any row remarks if present)

Analyze all pages thoroughly. Extract EVERY single row in the tables into the JSON Array.
`;

  const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
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
                meter: { type: Type.STRING },
                pantone: { type: Type.STRING },
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
        const countVal = (item.count || item.item_name || item.item_description || item.description || 'DRAWSTRING').toString().trim();
        const meterVal = (item.meter || item.item_size || item.size || '114 CM').toString().trim();
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
