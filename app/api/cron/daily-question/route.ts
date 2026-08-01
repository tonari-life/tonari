import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OpenAIContent = {
  type?: string;
  text?: string;
};

type OpenAIOutput = {
  type?: string;
  content?: OpenAIContent[];
};

type OpenAIResponse = {
  id?: string;
  status?: string;
  output_text?: string;
  output?: OpenAIOutput[];
  error?: unknown;
  incomplete_details?: unknown;
};

const FALLBACK_QUESTIONS = [
  "最近、二人で一緒に笑ったことは何ですか？",
  "今度の休みに、二人でしてみたいことは何ですか？",
  "相手に最近ありがとうと思ったことは何ですか？",
  "子どもの頃に好きだった遊びは何ですか？",
  "最近、相手に聞いてみたいと思ったことは何ですか？",
  "二人でまた行きたい場所はどこですか？",
  "今日あった小さな良いことは何ですか？",
  "相手の素敵だと思うところを一つ挙げるなら何ですか？",
  "最近食べておいしかったものは何ですか？",
  "これから二人で楽しみにしたいことは何ですか？",
  "一日の中で一番ほっとする時間はいつですか？",
  "今、相手に伝えたい優しいひと言は何ですか？",
  "二人の思い出で、もう一度体験したい日はいつですか？",
  "最近、頑張ったと思うことは何ですか？",
];

function getTodayJST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function extractOutputText(data: OpenAIResponse) {
  if (
    typeof data.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  const texts =
    data.output
      ?.flatMap((outputItem) => outputItem.content ?? [])
      .map((contentItem) =>
        typeof contentItem.text === "string"
          ? contentItem.text.trim()
          : ""
      )
      .filter(Boolean) ?? [];

  return texts.join("\n").trim();
}

function cleanQuestion(value: string) {
  return value
    .trim()
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^質問[:：]\s*/, "")
    .replace(/^[0-9０-９]+[.．、)]\s*/, "")
    .replace(/^[\"'「『]+/, "")
    .replace(/[\"'」』]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function selectFallbackQuestion(
  today: string,
  recentQuestionTexts: string[]
) {
  const dayNumber = Number(today.replaceAll("-", ""));
  const startIndex = Number.isFinite(dayNumber)
    ? dayNumber % FALLBACK_QUESTIONS.length
    : 0;

  for (
    let offset = 0;
    offset < FALLBACK_QUESTIONS.length;
    offset += 1
  ) {
    const candidate =
      FALLBACK_QUESTIONS[
        (startIndex + offset) % FALLBACK_QUESTIONS.length
      ];

    if (!recentQuestionTexts.includes(candidate)) {
      return candidate;
    }
  }

  return FALLBACK_QUESTIONS[startIndex];
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization =
      request.headers.get("authorization");

    if (
      !cronSecret ||
      authorization !== `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const openAIApiKey =
      process.env.OPENAI_API_KEY;

    if (!supabaseUrl) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL が設定されていません。"
      );
    }

    if (!supabaseSecretKey) {
      throw new Error(
        "SUPABASE_SECRET_KEY が設定されていません。"
      );
    }

    if (!openAIApiKey) {
      throw new Error(
        "OPENAI_API_KEY が設定されていません。"
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const today = getTodayJST();

    const {
      data: existingQuestion,
      error: existingError,
    } = await supabase
      .from("daily_questions")
      .select("id, question_text")
      .eq("question_date", today)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `既存質問の確認に失敗しました：${existingError.message}`
      );
    }

    if (existingQuestion) {
      return NextResponse.json({
        ok: true,
        created: false,
        reason: "already_exists",
        date: today,
        question: existingQuestion.question_text,
      });
    }

    const {
      data: recentQuestions,
      error: recentError,
    } = await supabase
      .from("daily_questions")
      .select("question_text, question_date")
      .order("question_date", {
        ascending: false,
      })
      .limit(30);

    if (recentError) {
      throw new Error(
        `過去の質問取得に失敗しました：${recentError.message}`
      );
    }

    const recentQuestionTexts = (recentQuestions ?? []).map(
      (item) => item.question_text.trim()
    );

    const recentQuestionList = (recentQuestions ?? [])
      .map(
        (item, index) =>
          `${index + 1}. ${item.question_text}`
      )
      .join("\n");

    const prompt = `
あなたは、夫婦やパートナー同士の会話を自然に増やす日本語アプリ「となり」の質問編集者です。

今日の日付は ${today} です。
毎日1つだけ表示する質問を作ってください。

条件:
- 日本語で1問だけ
- 15文字以上、60文字以内
- 答えやすく、正解がない
- 重すぎず、会話が少し広がる
- 相手を責める内容、性的内容、政治、宗教、病気、収入、離婚を直接扱わない
- 「はい／いいえ」だけで終わりにくい
- 最近使った質問と内容が重ならない
- 前置き、番号、説明、引用符は付けない
- 質問文だけを出力する

最近使った質問:
${recentQuestionList || "まだありません"}
`.trim();

    let questionText = "";
    let usedFallback = false;

    try {
      const openAIResponse = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAIApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-5-mini",
            input: prompt,
            reasoning: {
              effort: "low",
            },
            max_output_tokens: 600,
          }),
          cache: "no-store",
        }
      );

      const rawText = await openAIResponse.text();

      if (!openAIResponse.ok) {
        console.error(
          "OpenAI APIエラー:",
          openAIResponse.status,
          rawText.slice(0, 2000)
        );
      } else {
        const openAIData =
          JSON.parse(rawText) as OpenAIResponse;

        console.log(
          "質問生成OpenAIレスポンス:",
          JSON.stringify({
            id: openAIData.id,
            status: openAIData.status,
            outputTextLength:
              openAIData.output_text?.length ?? 0,
            outputTypes:
              openAIData.output?.map((item) => ({
                type: item.type,
                contentTypes:
                  item.content?.map(
                    (content) => content.type
                  ) ?? [],
                textLengths:
                  item.content?.map(
                    (content) =>
                      content.text?.length ?? 0
                  ) ?? [],
              })) ?? [],
            incompleteDetails:
              openAIData.incomplete_details,
            apiError: openAIData.error,
          })
        );

        questionText = cleanQuestion(
          extractOutputText(openAIData)
        );
      }
    } catch (openAIError) {
      console.error(
        "OpenAI質問生成処理エラー:",
        openAIError
      );
    }

    const generatedLength = [...questionText].length;
    const isInvalidQuestion =
      generatedLength < 15 ||
      generatedLength > 60 ||
      questionText.includes("\n") ||
      recentQuestionTexts.includes(questionText);

    if (isInvalidQuestion) {
      questionText = selectFallbackQuestion(
        today,
        recentQuestionTexts
      );
      usedFallback = true;

      console.warn(
        "AI質問を利用できなかったため予備質問を使用:",
        {
          generatedLength,
          fallbackQuestion: questionText,
        }
      );
    }

    const {
      data: insertedQuestion,
      error: insertError,
    } = await supabase
      .from("daily_questions")
      .insert({
        question_date: today,
        question_text: questionText,
        category: "conversation",
      })
      .select(
        "id, question_date, question_text, category"
      )
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({
          ok: true,
          created: false,
          reason:
            "already_created_by_another_request",
          date: today,
        });
      }

      throw new Error(
        `質問の保存に失敗しました：${insertError.message}`
      );
    }

    return NextResponse.json({
      ok: true,
      created: true,
      usedFallback,
      question: insertedQuestion,
    });
  } catch (error) {
    console.error(
      "毎日の質問自動生成エラー:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "不明なエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}