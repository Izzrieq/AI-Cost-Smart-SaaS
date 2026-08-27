import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODEL_NAMES = [
  "gemini-2.0-flash",        
  "gemini-2.0-flash-lite",   
  "gemini-2.5-flash",        
  "gemini-3.5-flash",        
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

function getRetryDelay(err: GeminiError): number | null {
  if (!err.errorDetails || !Array.isArray(err.errorDetails)) {
    return null;
  }
  for (const detail of err.errorDetails) {
    if (detail.retryDelay) {
      const match = String(detail.retryDelay).match(/([\d.]+)s/);
      if (match) {
        return parseFloat(match[1]) * 1000;
      }
    }
  }
  return null;
}

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

      if (error.status === 503 || error.status === 429) {
        const delay = getRetryDelay(error) || (Math.pow(2, attempt) * 1000 + Math.random() * 1000);
        console.warn(
          `Model ${modelName} ${error.status} (attempt ${attempt + 1}/${maxAttempts}), retrying in ${Math.round(delay)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.warn(`Model ${modelName} failed with status ${error.status}:`, error.message);
      break;
    }
  }

  throw lastError || new Error(`Failed to generate content with model ${modelName}`);
}

export async function POST(req: Request) {
  console.log("API Key (last 4 chars):", process.env.GEMINI_API_KEY?.slice(-4));
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

        if (error.status === 429) {
          console.warn(`⚠️ Quota exceeded for ${modelName}, trying next model...`);
          continue;
        }

        if (error.status === 404) {
          console.warn(`⚠️ Model ${modelName} not found, trying next model...`);
          continue;
        }
      }
    }

    if (!result) {
      console.error("All models failed. Last error:", lastError);

      // ─── Check if it's a billing/credit issue ──────────────────
      const isBillingError = lastError?.message?.includes("prepayment credits are depleted") ||
                             lastError?.message?.includes("billing");

      if (isBillingError) {
        return NextResponse.json(
          {
            reply: "Maaf, kredit prabayar AI telah habis. Sila tambah kredit atau tunggu sehingga esok untuk kuota percuma. 💳\n\n💡 Tips: Anda boleh dapatkan API key baru di https://aistudio.google.com/",
            success: false,
          },
          { status: 429 }
        );
      }

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