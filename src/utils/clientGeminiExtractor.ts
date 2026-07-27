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
You are an expert Garments Sewing Thread Work Order & Booking PDF Parser AI.
Extract all sewing thread booking line items from the provided PDF document.

### Required Fields for each item:
1. buyer: Buyer / Brand Name (e.g., Loomlink Aps, H&M, Zara)
2. job_no: Job Number / Work Order No (e.g., GMST-26-01688)
3. style: Style Name / Description (e.g., BET100724 - BOX FIT T-SHIRT)
4. order_no: Order / PO Number (e.g., 202659)
5. sr_gt: SR / GT Reference Number (e.g., GMST-FB-26-01447)
6. s_thread_ref: Sewing Thread Store Reference Key (e.g., GMST-TB-26-00831)
7. count: Thread Count / Ticket / Spec (e.g., 100 % Spun Polyester Sewing Thread 40/2)
8. meter: Meter or Cone length (e.g., 2000)
9. per_body_consm: Per Body Consumption (Number)
10. colour: Thread Colour Name (e.g., BLACK, NAVY, WHITE)
11. pantone: Pantone Code / Shade No (e.g., BET BLACK, 19-4005 TCX)
12. booking_qty: Booking Quantity in Cones or Yds (Number). Must be a clean number!
13. rcvd_date: Received Date if present
14. rcvd_challan: Received Challan No
15. receive_qty: Received Quantity (Number)
16. issue_date: Issue Date
17. issue_challan: Issue Challan No
18. issue_qty: Issued Quantity (Number)
19. balance_qty: Balance Quantity (Number)
20. supplier: Thread Supplier / Factory Name (e.g., Gms Yarn Dyeing)
21. qc_not_ok: QC Status boolean (false = QC OK, true = QC NOT OK)
22. remarks: Any extra remarks

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
