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

type OpenAIContentItem = {
  type?: string;
  text?: string;
};

type OpenAIOutputItem = {
  type?: string;
  content?: OpenAIContentItem[];
};

type OpenAIResponse = {
  id?: string;
  status?: string;
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: unknown;
  incomplete_details?: unknown;
};

function extractOutputText(data: OpenAIResponse) {
  if (
    typeof data.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  const outputTexts =
    data.output
      ?.flatMap((item) => item.content ?? [])
      .filter(
        (item) =>
          item.type === "output_text" ||
          typeof item.text === "string"
      )
      .map((item) =>
        typeof item.text === "string"
          ? item.text.trim()
          : ""
      )
      .filter(Boolean) ?? [];

  if (outputTexts.length > 0) {
    return outputTexts.join("\n").trim();
  }

  return "";
}

function cleanInsight(text: string) {
  return text
    .replace(/^["「『]|["」』]$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 800);
}

function logStep(
  step: string,
  details?: unknown
) {
  if (typeof details === "undefined") {
    console.log(`[insights] ${step}`);
    return;
  }

  console.log(
    `[insights] ${step}`,
    JSON.stringify(details, null, 2)
  );
}

export async function POST(
  request: NextRequest
) {
  const startedAt = Date.now();

  try {
    logStep("request-started");

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const openAiApiKey =
      process.env.OPENAI_API_KEY;

    logStep("environment-check", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasSupabaseSecretKey:
        Boolean(supabaseSecretKey),
      hasOpenAiApiKey:
        Boolean(openAiApiKey),
    });

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
      logStep("missing-access-token");

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
      logStep("user-check-failed", {
        message: userError?.message,
      });

      return NextResponse.json(
        {
          ok: false,
          error:
            "ログイン情報を確認できませんでした。",
        },
        { status: 401 }
      );
    }

    logStep("user-confirmed", {
      userId: user.id,
    });

    let body: InsightRequest;

    try {
      body =
        (await request.json()) as InsightRequest;
    } catch (error) {
      logStep("invalid-json", {
        message:
          error instanceof Error
            ? error.message
            : String(error),
      });

      return NextResponse.json(
        {
          ok: false,
          error:
            "送信内容が正しくありません。",
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

    logStep("request-body", {
      coupleId,
      questionId,
    });

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

    logStep("couple-confirmed", {
      coupleId: couple.id,
      ownerId: couple.owner_id,
      partnerId: couple.partner_id,
    });

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
      logStep("cached-insight-returned");

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

    logStep("answers-confirmed", {
      ownerAnswerLength:
        ownerAnswer.length,
      partnerAnswerLength:
        partnerAnswer.length,
    });

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
      "・見出し、箇条書きは使わない",
      "・名前の後ろに「さん」を付けない",
      "・回答にない事実を作らない",
      "",
      `質問：${question.question_text}`,
      `${ownerName}の回答：${ownerAnswer}`,
      `${partnerName}の回答：${partnerAnswer}`,
    ].join("\n");

    logStep("openai-request-started", {
      model: "gpt-5-mini",
      promptLength: prompt.length,
    });

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
          reasoning: {
            effort: "low",
          },
          max_output_tokens: 1000,
        }),
        cache: "no-store",
      }
    );

    const openAiRawText =
      await openAiResponse.text();

    let openAiData: OpenAIResponse = {};

    try {
      openAiData = JSON.parse(
        openAiRawText
      ) as OpenAIResponse;
    } catch {
      logStep(
        "openai-invalid-json",
        {
          status:
            openAiResponse.status,
          body:
            openAiRawText.slice(
              0,
              2000
            ),
        }
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "となりAIから正しい形式の返答を受け取れませんでした。",
        },
        { status: 502 }
      );
    }

    logStep("openai-response", {
      httpStatus:
        openAiResponse.status,
      responseId:
        openAiData.id,
      responseStatus:
        openAiData.status,
      outputTextLength:
        openAiData.output_text?.length ??
        0,
      outputTypes:
        openAiData.output?.map(
          (item) => ({
            type: item.type,
            contentTypes:
              item.content?.map(
                (content) =>
                  content.type
              ) ?? [],
            textLengths:
              item.content?.map(
                (content) =>
                  content.text?.length ??
                  0
              ) ?? [],
          })
        ) ?? [],
      incompleteDetails:
        openAiData.incomplete_details,
      apiError:
        openAiData.error,
    });

    if (!openAiResponse.ok) {
      console.error(
        "[insights] OpenAI API error",
        openAiRawText
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

    const extractedText =
      extractOutputText(openAiData);

    const insight =
      cleanInsight(extractedText);

    logStep("text-extraction", {
      extractedLength:
        extractedText.length,
      cleanedLength:
        insight.length,
      preview:
        insight.slice(0, 200),
    });

    if (insight.length < 20) {
      console.error(
        "[insights] Empty OpenAI output",
        openAiRawText
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "となりAIのコメントが空でした。",
        },
        { status: 502 }
      );
    }

    logStep("supabase-save-started", {
      coupleId,
      questionId,
      insightLength:
        insight.length,
    });

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
      logStep("supabase-save-failed", {
        message: saveError.message,
        code: saveError.code,
        details: saveError.details,
        hint: saveError.hint,
      });

      throw new Error(
        `AIコメントを保存できませんでした：${saveError.message}`
      );
    }

    logStep("request-completed", {
      durationMs:
        Date.now() - startedAt,
      savedLength:
        savedInsight.insight_text.length,
    });

    return NextResponse.json({
      ok: true,
      cached: false,
      insight:
        savedInsight.insight_text,
    });
  } catch (error) {
    console.error(
      "[insights] unhandled-error",
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