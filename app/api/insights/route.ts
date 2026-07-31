import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InsightRequest = {
  coupleId?: string;
  questionId?: number;
};

type AnswerRow = {
  user_id: string;
  answer_text: string;
};

function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const response = data as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: unknown;
      }>;
    }>;
  };

  if (
    typeof response.output_text === "string" &&
    response.output_text.trim()
  ) {
    return response.output_text.trim();
  }

  const texts =
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((item) =>
        typeof item.text === "string"
          ? item.text.trim()
          : ""
      )
      .filter(Boolean) ?? [];

  return texts.join("\n").trim();
}

function cleanInsight(text: string) {
  return text
    .replace(/^["「『]|["」』]$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 800);
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const openAiApiKey =
      process.env.OPENAI_API_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecretKey ||
      !openAiApiKey
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "サーバーの環境変数が不足しています。",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    const accessToken =
      authorization?.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "ログイン情報がありません。",
        },
        { status: 401 }
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "ログイン情報を確認できませんでした。",
        },
        { status: 401 }
      );
    }

    let body: InsightRequest;

    try {
      body =
        (await request.json()) as InsightRequest;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "送信内容が正しくありません。",
        },
        { status: 400 }
      );
    }

    const coupleId =
      typeof body.coupleId === "string"
        ? body.coupleId.trim()
        : "";

    const questionId =
      typeof body.questionId === "number"
        ? body.questionId
        : Number.NaN;

    if (
      !coupleId ||
      !Number.isInteger(questionId) ||
      questionId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "ペアまたは質問の情報が不足しています。",
        },
        { status: 400 }
      );
    }

    const {
      data: couple,
      error: coupleError,
    } = await supabase
      .from("couples")
      .select(
        "id, owner_id, partner_id"
      )
      .eq("id", coupleId)
      .maybeSingle();

    if (coupleError) {
      throw new Error(
        `ペア情報を取得できませんでした：${coupleError.message}`
      );
    }

    if (!couple) {
      return NextResponse.json(
        {
          ok: false,
          error: "ペアが見つかりません。",
        },
        { status: 404 }
      );
    }

    const isMember =
      couple.owner_id === user.id ||
      couple.partner_id === user.id;

    if (!isMember) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "このAIコメントを見る権限がありません。",
        },
        { status: 403 }
      );
    }

    if (!couple.partner_id) {
      return NextResponse.json(
        {
          ok: false,
          pending: true,
          error:
            "パートナーの参加を待っています。",
        },
        { status: 409 }
      );
    }

    const {
      data: existingInsight,
      error: existingInsightError,
    } = await supabase
      .from("daily_insights")
      .select("insight_text")
      .eq("couple_id", coupleId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (existingInsightError) {
      throw new Error(
        `AIコメントを取得できませんでした：${existingInsightError.message}`
      );
    }

    if (
      existingInsight?.insight_text?.trim()
    ) {
      return NextResponse.json({
        ok: true,
        cached: true,
        insight:
          existingInsight.insight_text.trim(),
      });
    }

    const {
      data: question,
      error: questionError,
    } = await supabase
      .from("daily_questions")
      .select("id, question_text")
      .eq("id", questionId)
      .maybeSingle();

    if (questionError) {
      throw new Error(
        `質問を取得できませんでした：${questionError.message}`
      );
    }

    if (!question) {
      return NextResponse.json(
        {
          ok: false,
          error: "質問が見つかりません。",
        },
        { status: 404 }
      );
    }

    const {
      data: answersData,
      error: answersError,
    } = await supabase
      .from("answers")
      .select("user_id, answer_text")
      .eq("question_id", questionId)
      .in("user_id", [
        couple.owner_id,
        couple.partner_id,
      ]);

    if (answersError) {
      throw new Error(
        `回答を取得できませんでした：${answersError.message}`
      );
    }

    const answers =
      (answersData ?? []) as AnswerRow[];

    const ownerAnswer =
      answers.find(
        (item) =>
          item.user_id === couple.owner_id
      )?.answer_text?.trim();

    const partnerAnswer =
      answers.find(
        (item) =>
          item.user_id === couple.partner_id
      )?.answer_text?.trim();

    if (!ownerAnswer || !partnerAnswer) {
      return NextResponse.json(
        {
          ok: false,
          pending: true,
          error:
            "二人の回答がそろっていません。",
        },
        { status: 409 }
      );
    }

    const {
      data: profilesData,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [
        couple.owner_id,
        couple.partner_id,
      ]);

    if (profilesError) {
      throw new Error(
        `名前を取得できませんでした：${profilesError.message}`
      );
    }

    const ownerName =
      profilesData?.find(
        (item) =>
          item.id === couple.owner_id
      )?.display_name?.trim() ||
      "一人目";

    const partnerName =
      profilesData?.find(
        (item) =>
          item.id === couple.partner_id
      )?.display_name?.trim() ||
      "二人目";

    const prompt = [
      "あなたは中年夫婦の会話をやさしく支える「となりAI」です。",
      "次の質問と二人の回答だけを材料に、温かい日本語のコメントを作ってください。",
      "",
      "【必ず守ること】",
      "・180〜300文字程度",
      "・二人を評価、採点、診断しない",
      "・性格、病気、心理状態などを断定しない",
      "・対立をあおらず、どちらか一方を責めない",
      "・共通点と違いの両方を肯定的に扱う",
      "・最後に、今日できる小さな会話のきっかけを一つ提案する",
      "・見出し、箇条書き、名前の後ろの「さん」は不要",
      "・回答にない事実を作らない",
      "",
      `質問：${question.question_text}`,
      `${ownerName}の回答：${ownerAnswer}`,
      `${partnerName}の回答：${partnerAnswer}`,
    ].join("\n");

    const openAiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${openAiApiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          input: prompt,
          max_output_tokens: 500,
        }),
        cache: "no-store",
      }
    );

    const openAiData =
      (await openAiResponse.json()) as unknown;

    if (!openAiResponse.ok) {
      console.error(
        "OpenAI API error:",
        openAiData
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "となりAIのコメントを作れませんでした。",
        },
        { status: 502 }
      );
    }

    const insight = cleanInsight(
      extractOutputText(openAiData)
    );

    if (insight.length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "となりAIのコメントが空でした。",
        },
        { status: 502 }
      );
    }

    const {
      data: savedInsight,
      error: saveError,
    } = await supabase
      .from("daily_insights")
      .upsert(
        {
          couple_id: coupleId,
          question_id: questionId,
          insight_text: insight,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "couple_id,question_id",
        }
      )
      .select("insight_text")
      .single();

    if (saveError) {
      throw new Error(
        `AIコメントを保存できませんでした：${saveError.message}`
      );
    }

    return NextResponse.json({
      ok: true,
      cached: false,
      insight:
        savedInsight.insight_text,
    });
  } catch (error) {
    console.error(
      "となりAI APIエラー:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "予期しないエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}