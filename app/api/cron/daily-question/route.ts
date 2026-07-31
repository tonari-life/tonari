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
  output_text?: string;
  output?: OpenAIOutput[];
};

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

  for (const outputItem of data.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (
        contentItem.type === "output_text" &&
        typeof contentItem.text === "string"
      ) {
        return contentItem.text;
      }
    }
  }

  return "";
}

function cleanQuestion(value: string) {
  return value
    .trim()
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^質問[:：]\s*/, "")
    .replace(/^[0-9０-９]+[.．、)]\s*/, "")
    .replace(/^["'「『]+/, "")
    .replace(/["'」』]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");

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

    const { data: recentQuestions, error: recentError } =
      await supabase
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
          max_output_tokens: 120,
        }),
      }
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();

      throw new Error(
        `OpenAI APIエラー (${openAIResponse.status})：${errorText.slice(
          0,
          500
        )}`
      );
    }

    const openAIData =
      (await openAIResponse.json()) as OpenAIResponse;

    const questionText = cleanQuestion(
      extractOutputText(openAIData)
    );

    const questionLength = [...questionText].length;

    if (
      questionLength < 15 ||
      questionLength > 60 ||
      questionText.includes("\n")
    ) {
      throw new Error(
        `生成された質問の形式が不正です：${questionLength}文字`
      );
    }

    const duplicate = (recentQuestions ?? []).some(
      (item) =>
        item.question_text.trim() === questionText
    );

    if (duplicate) {
      throw new Error(
        "過去と同じ質問が生成されたため、登録を中止しました。"
      );
    }

    const { data: insertedQuestion, error: insertError } =
      await supabase
        .from("daily_questions")
        .insert({
          question_date: today,
          question_text: questionText,
        })
        .select("id, question_date, question_text")
        .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({
          ok: true,
          created: false,
          reason: "already_created_by_another_request",
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