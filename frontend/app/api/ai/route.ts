import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
];

type ProviderFailure = Error & {
  status?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

function asProviderFailure(message: string, status?: number): ProviderFailure {
  const error = new Error(message) as ProviderFailure;
  error.status = status;
  return error;
}

async function requestChatCompletion({
  provider,
  url,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
}: {
  provider: string;
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(provider === "OpenRouter"
        ? {
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "CostSmart",
          }
        : {}),
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;
  if (!response.ok) {
    throw asProviderFailure(
      data.error?.message || `${provider} returned HTTP ${response.status}`,
      response.status,
    );
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw asProviderFailure(`${provider} returned an empty response`);
  return text;
}

async function generateWithGemini(
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw asProviderFailure("GEMINI_API_KEY is not configured", 401);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
  });
  const result = await model.generateContent(userPrompt);
  const text = result.response.text().trim();
  if (!text) throw asProviderFailure("Gemini returned an empty response");
  return text;
}

function createReplyStream(reply: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      // Keep the existing NDJSON contract used by the home page chat client.
      controller.enqueue(encoder.encode(`${JSON.stringify({ chunk: reply })}\n`));
      controller.close();
    },
  });
}

export async function POST(req: Request) {
  try {
    const { prompt, stats, products } = await req.json();
    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { reply: "Sila masukkan soalan anda.", success: false },
        { status: 400 },
      );
    }

    const systemPrompt = `Anda adalah AI perniagaan untuk platform CostSmart.

Berikan cadangan yang spesifik, boleh dilakukan, dan berdasarkan data yang diberikan. Gunakan Bahasa Melayu jika pengguna menggunakan Bahasa Melayu, atau English jika pengguna menggunakan English. Kekalkan nada profesional dan jangan mendakwa sebagai penasihat kewangan profesional.`;

    const userPrompt = `Statistik perniagaan:
- Jumlah produk: ${stats?.totalProducts || 0}
- Margin purata: ${stats?.marginPurata || 0}%
- Jumlah kos: RM ${stats?.totalKos || 0}
- Produk terkini: ${JSON.stringify(products || [])}

Soalan pengguna: ${prompt.trim()}`;

    const attempts: Array<{ name: string; run: () => Promise<string> }> = [];

    if (process.env.GEMINI_API_KEY) {
      for (const model of GEMINI_MODELS) {
        attempts.push({
          name: `Gemini (${model})`,
          run: () => generateWithGemini(model, systemPrompt, userPrompt),
        });
      }
    }

    if (process.env.GROQ_API_KEY) {
      attempts.push({
        name: "Groq",
        run: () =>
          requestChatCompletion({
            provider: "Groq",
            url: "https://api.groq.com/openai/v1/chat/completions",
            apiKey: process.env.GROQ_API_KEY!,
            model: "openai/gpt-oss-20b",
            systemPrompt,
            userPrompt,
          }),
      });
    }

    if (process.env.OPENROUTER_API_KEY) {
      attempts.push({
        name: "OpenRouter free models",
        run: () =>
          requestChatCompletion({
            provider: "OpenRouter",
            url: "https://openrouter.ai/api/v1/chat/completions",
            apiKey: process.env.OPENROUTER_API_KEY!,
            // This router only selects models currently offered as free.
            model: "openrouter/free",
            systemPrompt,
            userPrompt,
          }),
      });
    }

    let lastError: ProviderFailure | undefined;
    let allAttemptsQuotaLimited = attempts.length > 0;
    let geminiPaymentExhausted = false;
    for (const attempt of attempts) {
      if (geminiPaymentExhausted && attempt.name.startsWith("Gemini")) continue;

      try {
        const reply = await attempt.run();
        console.info(`CostSmart AI answered with ${attempt.name}`);
        return new Response(createReplyStream(reply), {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      } catch (cause) {
        lastError = cause as ProviderFailure;
        const errorMessage = lastError.message.toLowerCase();
        if (
          attempt.name.startsWith("Gemini") &&
          (lastError.status === 402 ||
            errorMessage.includes("prepayment credits are depleted") ||
            errorMessage.includes("billing"))
        ) {
          geminiPaymentExhausted = true;
        }
        if (lastError.status !== 429) allAttemptsQuotaLimited = false;
        console.warn(`${attempt.name} failed; trying the next configured provider.`, {
          status: lastError.status,
          message: lastError.message,
        });
      }
    }

    if (attempts.length === 0) {
      return NextResponse.json(
        { reply: "Tiada penyedia AI dikonfigurasi. Sila tambah API key AI pada environment server.", success: false },
        { status: 503 },
      );
    }

    if (geminiPaymentExhausted) {
      const backupsConfigured = Boolean(
        process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY,
      );
      const reply = backupsConfigured
        ? "Kredit Gemini telah habis dan penyedia AI sandaran tidak tersedia. Semak API key serta had penggunaan Groq/OpenRouter."
        : "Kredit prabayar Gemini telah habis. Untuk terus menggunakan CostSmart AI secara percuma, tambah GROQ_API_KEY dan/atau OPENROUTER_API_KEY dalam frontend/.env.local, kemudian mulakan semula server. Tidak perlu tambah kredit Gemini jika anda menggunakan penyedia sandaran.";
      return NextResponse.json({ reply, success: false }, { status: 402 });
    }

    const status = allAttemptsQuotaLimited ? 429 : lastError?.status === 503 ? 503 : 502;
    const reply = allAttemptsQuotaLimited
      ? "Had penggunaan AI percuma buat masa ini telah dicapai pada semua penyedia. Sila cuba lagi kemudian."
      : "Maaf, semua penyedia AI sedang tidak tersedia. Sila cuba sebentar lagi.";

    return NextResponse.json({ reply, success: false }, { status });
  } catch (error) {
    console.error("AI request failed:", error);
    return NextResponse.json(
      { reply: "Maaf, saya tidak dapat memproses permintaan anda. Sila cuba sebentar lagi.", success: false },
      { status: 500 },
    );
  }
}
