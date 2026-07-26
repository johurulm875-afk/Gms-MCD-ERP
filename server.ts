import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
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

    const promptText = `You are an expert Data Extraction AI for Garments Sewing Thread Booking Reports.
Your task is to analyze the uploaded PDF Work Order / Booking Report and extract every thread booking line item.
Map the extracted data EXACTLY into the following JSON schema matching the Supabase table structure (\`supabase_sewing_thread_all_rows\`):

### Output Schema Rules:
- Return ONLY a valid JSON Array of objects. Do not wrap in extra markdown or plain text explanations.
- Extract each row representing an individual sewing thread color/quantity booking.

### JSON Fields to extract per line item:
1. "buyer": String (Buyer Name from Header, e.g. "Bestseller A/S")
2. "job_no": String (Job No, e.g. "GMST-26-01330")
3. "style": String (Combine Style Ref and Style Desc, e.g. "12300670 - JJEACE SWEAT CREW NECK NOOS")
4. "order_no": String (PO No, e.g. "GMT4693237")
5. "sr_gt": String (Fabric Booking No, e.g. "GMST-FB-26-01173")
6. "s_thread_ref": String (Trims Booking No, e.g. "GMST-TB-26-00641")
7. "count": String (Item Description / Thread Specification, e.g. "50/2 100% Spun Polyester")
8. "meter": String (Cone Length if available, e.g. "4000M")
9. "per_body_consm": Number or null (Cost/Dzn or Consumption rate)
10. "colour": String (Item Color / Garment Color, e.g. "TURBULENCE")
11. "pantone": String or null (Pantone code if specified)
12. "booking_qty": Number (WO Qty / Cone Quantity)
13. "rcvd_date": null
14. "rcvd_challan": null
15. "receive_qty": 0
16. "issue_date": null
17. "issue_challan": null
18. "issue_qty": 0
19. "balance_qty": Number (Same value as "booking_qty")
20. "supplier": String (Supplier Name from Header)
21. "qc_not_ok": null
22. "remarks": String or null (Line remarks if present)

### Execution:
Analyze the input PDF thoroughly across all pages, create a record for each item row, and return the complete JSON Array.`;

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
                data: cleanBase64
              }
            },
            {
              text: promptText
            }
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
                  remarks: { type: Type.STRING }
                }
              }
            }
          }
        });

        if (response && response.text) {
          break; // Successfully generated!
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or busy (${err?.message || err}), trying fallback model...`);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("Failed to extract PDF data: AI models are currently busy. Please try again in a moment.");
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
            balance_qty: cleanBQty
          };
        });
      }
    } catch (parseErr) {
      console.warn("Failed to parse Gemini output directly:", textOutput);
    }

    return res.json({
      success: true,
      count: Array.isArray(parsedData) ? parsedData.length : 0,
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
