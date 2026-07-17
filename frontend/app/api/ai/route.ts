import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── Models to try (most preferred first) ──────────────────────
const MODEL_NAMES = [
  "gemini-3.5-flash",     // ✅ Ada kuota: 10/20 RPD
  "gemini-2.5-flash",     // ✅ Ada kuota: 3/20 RPD
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-pro",
];

interface GeminiError extends Error {
  status?: number;
  statusText?: string;
  errorDetails?: ErrorDetail[];
}

interface ErrorDetail {
  retryDelay?: string;
  [key: string]: unknown;
}

// ─── Extract retry delay from error ────────────────────────────
function getRetryDelay(err: GeminiError): number | null {
  if (!err.errorDetails || !Array.isArray(err.errorDetails)) {
    return null;
  }
  for (const detail of err.errorDetails) {
    if (detail.retryDelay) {
      const match = String(detail.retryDelay).match(/([\d.]+)s/);
      if (match) {
        return parseFloat(match[1]) * 1000; // convert to ms
      }
    }
  }
  return null;
}

// ─── Generate with retry for a single model ────────────────────
async function generateWithRetry(
  modelName: string,
  context: string,
  maxAttempts = 2
) {
  const model = genAI.getGenerativeModel({ model: modelName });
  let lastError: GeminiError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await model.generateContentStream(context);
      return result;
    } catch (err) {
      const error = err as GeminiError;
      lastError = error;

      // Retry only for 503 (Service Unavailable) or 429 (Rate Limit)
      if (error.status === 503 || error.status === 429) {
        const delay = getRetryDelay(error) || (Math.pow(2, attempt) * 1000 + Math.random() * 1000);
        console.warn(
          `Model ${modelName} ${error.status} (attempt ${attempt + 1}/${maxAttempts}), retrying in ${Math.round(delay)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // For other errors (404, 400, etc.), don't retry
      console.warn(`Model ${modelName} failed with status ${error.status}:`, error.message);
      break;
    }
  }

  throw lastError || new Error(`Failed to generate content with model ${modelName}`);
}

export async function POST(req: Request) {
  try {
    const { prompt, stats, products } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { reply: "Sila masukkan soalan anda.", success: false },
        { status: 400 }
      );
    }

    const context = `
      Anda adalah AI perniagaan untuk platform CostSmart.

      Statistik perniagaan:
      - Jumlah produk: ${stats?.totalProducts || 0}
      - Margin purata: ${stats?.marginPurata || 0}%
      - Jumlah kos: RM ${stats?.totalKos || 0}
      - Produk terkini: ${JSON.stringify(products || [])}

      Soalan pengguna: ${prompt}

      Berikan cadangan yang:
      1. Spesifik dan boleh tindakan
      2. Berdasarkan data yang diberikan
      3. Gunakan Bahasa Melayu (jika pengguna guna BM) atau English
      4. Profesional dan membantu
      5. Jangan berikan nasihat kewangan profesional (disclaimer)
    `;

    let result = null;
    let lastError: GeminiError | null = null;

    // ─── Try each model in order ──────────────────────────────────
    for (const modelName of MODEL_NAMES) {
      try {
        console.log(`🔄 Trying model: ${modelName}...`);
        result = await generateWithRetry(modelName, context);
        console.log(`✅ Model ${modelName} succeeded!`);
        break;
      } catch (err) {
        const error = err as GeminiError;
        lastError = error;
        console.warn(`❌ Model ${modelName} failed:`, error.message);
        
        // If quota exceeded (429), skip to next model
        if (error.status === 429) {
          console.warn(`⚠️ Quota exceeded for ${modelName}, trying next model...`);
          continue;
        }
        
        // For 404 (model not found), skip to next model
        if (error.status === 404) {
          console.warn(`⚠️ Model ${modelName} not found, trying next model...`);
          continue;
        }
        
        // For other errors, we might want to retry the same model later,
        // but for simplicity, continue to next model
      }
    }

    if (!result) {
      console.error("All models failed. Last error:", lastError);

      if (lastError?.status === 503) {
        return NextResponse.json(
          {
            reply: "Maaf, model AI sedang sibuk. Sila cuba dalam beberapa minit. 🔄",
            success: false,
          },
          { status: 503 }
        );
      }

      if (lastError?.status === 429) {
        return NextResponse.json(
          {
            reply: "Maaf, had permintaan percuma AI hari ini telah dicapai untuk semua model. Sila cuba esok pagi. 🕒",
            success: false,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          reply: "Maaf, tiada model AI yang tersedia pada masa ini. Sila cuba sebentar lagi. 🤖",
          success: false,
        },
        { status: 500 }
      );
    }

    // ─── Stream response ──────────────────────────────────────────
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify({ chunk: text }) + "\n")
            );
          }
          controller.close();
        } catch (err) {
          console.error("Streaming error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "application/x-ndjson",
      },
    });
  } catch (error: unknown) {
    console.error("AI Error:", error);
    const err = error as GeminiError;

    if (err.status === 429) {
      return NextResponse.json(
        {
          reply: "Maaf, had permintaan percuma AI hari ini telah dicapai. Sila cuba esok pagi. 🕒",
          success: false,
        },
        { status: 429 }
      );
    }

    if (err.status === 503) {
      return NextResponse.json(
        {
          reply: "Maaf, model AI sedang sibuk. Sila cuba dalam beberapa minit. 🔄",
          success: false,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        reply: "Maaf, saya tidak dapat memproses permintaan anda. Sila cuba sebentar lagi. 🤖",
        success: false,
      },
      { status: 500 }
    );
  }
}