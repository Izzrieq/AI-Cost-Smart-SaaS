import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── Model percuma ──────────────────────────────────────────────────
const MODEL_NAME = "gemini-2.0-flash"; // percuma dengan had harian

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

export async function POST(req: Request) {
  try {
    const { prompt, stats, products } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { reply: "Sila masukkan soalan anda.", success: false },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        result = await model.generateContentStream(context);
        break;
      } catch (err) {
        const error = err as GeminiError;
        lastError = error;

        if (error.status === 503 || error.status === 429) {
          const retryDelay = getRetryDelay(error) || (Math.pow(2, attempt) * 1000 + Math.random() * 1000);
          console.warn(
            `AI service ${error.status} (attempt ${attempt + 1}/${maxAttempts}), retrying in ${Math.round(retryDelay)}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        console.error(`AI error ${error.status}:`, error.message);
        break;
      }
    }

    if (!result) {
      console.error("All retry attempts failed. Last error:", lastError);

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
            reply: "Maaf, had permintaan percuma AI hari ini telah dicapai. Sila cuba esok pagi. 🕒",
            success: false,
          },
          { status: 429 }
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
          reply: "Maaf, had permintaan percuma AI hari ini telah dicapai. Sila cuba esok pagi.",
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