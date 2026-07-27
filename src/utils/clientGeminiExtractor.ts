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
You are an expert Data Extraction AI for Garments Drawstring Booking Reports.
Your task is to analyze the uploaded PDF Work Order / Booking Report and extract every single drawstring booking line item.
Map the extracted data EXACTLY into the JSON schema matching the Supabase table structure (\`supabase_drawstring_all_rows\`).

### Output Schema Rules:
- Return ONLY a valid JSON Array of objects. Do not wrap in extra markdown or plain text explanations.
- Extract each row representing an individual drawstring color/size/quantity booking.

### JSON Fields to extract per line item:
1. "buyer": String (Buyer Name from Header, e.g. "Bestseller A/S")
2. "job_no": String (Job No, e.g. "GMST-26-01543")
3. "style": String (Combine Style Ref and Style Desc, e.g. "12137054 - JJECORP OLD LOGO SWEAT HOOD NOOS")
4. "order_no": String (PO No, e.g. "GMT4728405")
5. "sr_gt": String (Fabric Booking No, e.g. "GMST-FB-26-01361")
6. "s_thread_ref": String (Trims / Drawstring Booking No, e.g. "GMST-TB-26-00782")
7. "count": String (Item Description / Specification, e.g. "1 cm cotton Flat drawstring with Plastic tips Length 120 Cm")
8. "meter": String or null (Item Size / Finish Length, e.g. "120 CM" or "118 CM")
9. "per_body_consm": Number or null (Cost/Dzn Rate or Consumption rate)
10. "colour": String (Item Color / Garment Color, e.g. "LIGHT GREY MELANGE")
11. "pantone": String or null (Pantone code or Garment Size if specified, e.g. "XS", "S", "M")
12. "booking_qty": Number (WO Qty / Order Quantity)
13. "rcvd_date": null
14. "rcvd_challan": null
15. "receive_qty": 0
16. "issue_date": null
17. "issue_challan": null
18. "issue_qty": 0
19. "balance_qty": Number (Same value as "booking_qty")
20. "supplier": String (Supplier Name from Header, e.g. "Gms Trims Limited")
21. "qc_not_ok": null
22. "remarks": String or null (Line remarks if present)

### Execution:
Analyze the input PDF thoroughly across all pages, create a record for each item row, and return the complete JSON Array.
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
                job_no: { type: Type.STRING },
                style: { type: Type.STRING },
                order_no: { type: Type.STRING },
                sr_gt: { type: Type.STRING },
                s_thread_ref: { type: Type.STRING },
                count: { type: Type.STRING },
                meter: { type: Type.STRING },
                per_body_consm: { type: Type.NUMBER },
                colour: { type: Type.STRING },
                pantone: { type: Type.STRING },
                booking_qty: { type: Type.NUMBER },
                rcvd_date: { type: Type.STRING },
                rcvd_challan: { type: Type.STRING },
                receive_qty: { type: Type.NUMBER },
                issue_date: { type: Type.STRING },
                issue_challan: { type: Type.STRING },
                issue_qty: { type: Type.NUMBER },
                balance_qty: { type: Type.NUMBER },
                supplier: { type: Type.STRING },
                qc_not_ok: { type: Type.BOOLEAN },
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
        const rawBQty = Number(item.booking_qty) || 0;
        const cleanBQty = Math.round((rawBQty + Number.EPSILON) * 100) / 100;
        return {
          ...item,
          booking_qty: cleanBQty,
          balance_qty: cleanBQty,
        };
      });
    }
  } catch (err) {
    console.error("Failed to parse client-side Gemini output:", textOutput);
  }

  return parsedData;
}
