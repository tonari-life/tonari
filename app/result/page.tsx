"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import AppShell from "../../components/layout/AppShell";
import TopBar from "../../components/layout/TopBar";
import { getTodayJST } from "../../lib/date";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type DailyQuestion = {
  id: number;
  question_text: string;
};

type Couple = {
  id: string;
  owner_id: string;
  partner_id: string | null;
  invite_code: string;
};

type Answer = {
  user_id: string;
  answer_text: string;
};

type Profile = {
  id: string;
  display_name: string | null;
};

type ResultState =
  | "loading"
  | "waiting"
  | "ready"
  | "error";

type InsightState =
  | "idle"
  | "loading"
  | "ready"
  | "error";

const STOP_WORDS = new Set([
  "です",
  "ます",
  "でした",
  "ました",
  "して",
  "した",
  "する",
  "いる",
  "ある",
  "こと",
  "これ",
  "それ",
  "あれ",
  "ため",
  "よう",
  "から",
  "まで",
  "より",
  "ので",
  "けど",
  "でも",
  "そして",
  "あと",
  "今日",
  "最近",
  "自分",
  "相手",
  "あなた",
  "パートナー",
]);

function normalizeWords(text: string) {
  return text
    .toLowerCase()
    .replace(
      /[！!？?。、,.「」『』（）()【】[\]：:；;…・\n\r\t]/g,
      " "
    )
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 2 &&
        !STOP_WORDS.has(word)
    );
}

function findCommonWords(
  first: string,
  second: string
) {
  const firstWords = new Set(normalizeWords(first));
  const secondWords = new Set(
    normalizeWords(second)
  );

  return [...firstWords]
    .filter((word) => secondWords.has(word))
    .slice(0, 5);
}

function AnswerAvatar({
  variant,
}: {
  variant: "mine" | "partner";
}) {
  return (
    <div
      className={`result-avatar ${
        variant === "mine"
          ? "result-avatar-mine"
          : "result-avatar-partner"
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="18"
          r="8"
          fill="currentColor"
        />

        <path
          d="M10 42C11.5 31.5 16.5 27 24 27C31.5 27 36.5 31.5 38 42"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

function WaitingScene() {
  return (
    <svg
      viewBox="0 0 240 170"
      role="img"
      aria-label="温かい飲み物を待つイラスト"
      className="result-waiting-svg"
    >
      <ellipse
        cx="120"
        cy="143"
        rx="78"
        ry="14"
        fill="#eadbd2"
      />

      <path
        d="M81 67H151V122C151 133 142 142 131 142H101C90 142 81 133 81 122V67Z"
        fill="#fffaf7"
      />

      <path
        d="M151 82H166C180 82 191 93 191 107C191 121 180 132 166 132H151"
        fill="none"
        stroke="#a98b79"
        strokeWidth="9"
      />

      <path
        d="M94 82H137"
        stroke="#d5b4a4"
        strokeWidth="6"
        strokeLinecap="round"
      />

      <path
        d="M100 48C90 37 99 28 104 21"
        fill="none"
        stroke="#b89f91"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.78"
      />

      <path
        d="M120 48C110 37 119 28 124 21"
        fill="none"
        stroke="#b89f91"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.78"
      />

      <path
        d="M140 48C130 37 139 28 144 21"
        fill="none"
        stroke="#b89f91"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.78"
      />

      <path
        d="M54 113C61 84 78 73 95 72"
        fill="none"
        stroke="#7f9a78"
        strokeWidth="7"
        strokeLinecap="round"
      />

      <path
        d="M52 101C38 88 34 74 37 61C52 64 63 77 66 90"
        fill="#b7c5b2"
      />

      <path
        d="M58 116C42 118 30 125 24 136C38 141 53 136 62 127"
        fill="#9fb194"
      />

      <circle
        cx="203"
        cy="43"
        r="8"
        fill="#d9aa95"
        opacity="0.65"
      />
    </svg>
  );
}

function AnswerCard({
  variant,
  label,
  answer,
}: {
  variant: "mine" | "partner";
  label: string;
  answer: string;
}) {
  return (
    <article
      className={`result-answer-card ${
        variant === "mine"
          ? "result-answer-card-mine"
          : "result-answer-card-partner"
      }`}
    >
      <div className="result-answer-header">
        <AnswerAvatar variant={variant} />

        <div>
          <p className="result-answer-label">
            {label}
          </p>

          <p className="result-answer-subtitle">
            今日のこたえ
          </p>
        </div>
      </div>

      <p className="result-answer-text">
        {answer}
      </p>
    </article>
  );
}

export default function ResultPage() {
  const router = useRouter();

  const [question, setQuestion] =
    useState<DailyQuestion | null>(null);

  const [myAnswer, setMyAnswer] =
    useState("");

  const [partnerAnswer, setPartnerAnswer] =
    useState("");

  const [myName, setMyName] =
    useState("あなた");

  const [partnerName, setPartnerName] =
    useState("パートナー");

  const [state, setState] =
    useState<ResultState>("loading");

  const [message, setMessage] =
    useState("");

  const [insight, setInsight] =
    useState("");

  const [insightState, setInsightState] =
    useState<InsightState>("idle");

  const [insightError, setInsightError] =
    useState("");

  const commonWords = useMemo(
    () =>
      findCommonWords(
        myAnswer,
        partnerAnswer
      ),
    [myAnswer, partnerAnswer]
  );

  const loadInsight = useCallback(
    async (
      coupleId: string,
      questionId: number,
      accessToken: string
    ) => {
      try {
        setInsightState("loading");
        setInsightError("");

        const response = await fetch(
          "/api/insights",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              coupleId,
              questionId,
            }),
          }
        );

        const data = (await response.json()) as {
          ok?: boolean;
          insight?: string;
          error?: string;
          pending?: boolean;
        };

        if (!response.ok || !data.ok) {
          if (data.pending) {
            setInsightState("idle");
            return;
          }

          setInsightState("error");
          setInsightError(
            data.error ||
              "となりAIのコメントを読み込めませんでした。"
          );
          return;
        }

        const nextInsight =
          data.insight?.trim() ?? "";

        if (!nextInsight) {
          setInsightState("error");
          setInsightError(
            "となりAIのコメントが空でした。"
          );
          return;
        }

        setInsight(nextInsight);
        setInsightState("ready");
      } catch (error) {
        console.error(
          "となりAIの読み込みエラー:",
          error
        );

        setInsightState("error");
        setInsightError(
          "となりAIのコメントを読み込めませんでした。"
        );
      }
    },
    []
  );

  const loadResult = useCallback(async () => {
    try {
      setMessage("");
      setInsight("");
      setInsightState("idle");
      setInsightError("");

      const params = new URLSearchParams(
        window.location.search
      );

      const code =
        params.get("code")?.trim() ?? "";

      if (!code) {
        setState("error");
        setMessage(
          "招待コードが見つかりません。招待画面からもう一度開いてください。"
        );
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/");
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        router.replace("/");
        return;
      }

      const {
        data: coupleData,
        error: coupleError,
      } = await supabase
        .from("couples")
        .select(
          "id, owner_id, partner_id, invite_code"
        )
        .eq("invite_code", code)
        .maybeSingle();

      if (coupleError) {
        setState("error");
        setMessage(
          `ペア情報を取得できませんでした：${coupleError.message}`
        );
        return;
      }

      if (!coupleData) {
        setState("error");
        setMessage(
          "ペア情報が見つかりませんでした。"
        );
        return;
      }

      const couple =
        coupleData as Couple;

      const isOwner =
        couple.owner_id === user.id;

      const isPartner =
        couple.partner_id === user.id;

      if (!isOwner && !isPartner) {
        setState("error");
        setMessage(
          "この回答を見る権限がありません。"
        );
        return;
      }

      const today = getTodayJST();

      const {
        data: questionData,
        error: questionError,
      } = await supabase
        .from("daily_questions")
        .select("id, question_text")
        .eq("question_date", today)
        .maybeSingle();

      if (questionError) {
        setState("error");
        setMessage(
          `今日の質問を取得できませんでした：${questionError.message}`
        );
        return;
      }

      if (!questionData) {
        setState("error");
        setMessage(
          "今日の質問が登録されていません。"
        );
        return;
      }

      setQuestion(questionData);

      if (!couple.partner_id) {
        setMyAnswer("");
        setPartnerAnswer("");
        setMyName("あなた");
        setPartnerName("パートナー");
        setState("waiting");
        return;
      }

      const otherUserId = isOwner
        ? couple.partner_id
        : couple.owner_id;

      const {
        data: profilesData,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", [
          user.id,
          otherUserId,
        ]);

      if (profilesError) {
        setState("error");
        setMessage(
          `名前を取得できませんでした：${profilesError.message}`
        );
        return;
      }

      const profiles =
        (profilesData ?? []) as Profile[];

      const currentUserProfile =
        profiles.find(
          (item) => item.id === user.id
        );

      const partnerProfile =
        profiles.find(
          (item) => item.id === otherUserId
        );

      setMyName(
        currentUserProfile?.display_name?.trim() ||
          "あなた"
      );

      setPartnerName(
        partnerProfile?.display_name?.trim() ||
          "パートナー"
      );

      const {
        data: answersData,
        error: answersError,
      } = await supabase
        .from("answers")
        .select("user_id, answer_text")
        .eq(
          "question_id",
          questionData.id
        )
        .in("user_id", [
          couple.owner_id,
          couple.partner_id,
        ]);

      if (answersError) {
        setState("error");
        setMessage(
          `回答を取得できませんでした：${answersError.message}`
        );
        return;
      }

      const answers =
        (answersData ?? []) as Answer[];

      const currentUserAnswer =
        answers.find(
          (item) =>
            item.user_id === user.id
        );

      const otherUserAnswer =
        answers.find(
          (item) =>
            item.user_id === otherUserId
        );

      const currentAnswerText =
        currentUserAnswer?.answer_text ??
        "";

      const partnerAnswerText =
        otherUserAnswer?.answer_text ??
        "";

      setMyAnswer(currentAnswerText);
      setPartnerAnswer(
        partnerAnswerText
      );

      if (
        currentAnswerText.trim() &&
        partnerAnswerText.trim()
      ) {
        setState("ready");

        void loadInsight(
          couple.id,
          questionData.id,
          session.access_token
        );
      } else {
        setState("waiting");
      }
    } catch (error) {
      console.error(
        "回答比較画面エラー:",
        error
      );

      setState("error");
      setMessage(
        error instanceof Error
          ? `回答の読み込み中にエラーが発生しました：${error.message}`
          : "回答の読み込み中にエラーが発生しました。"
      );
    }
  }, [loadInsight, router]);

  useEffect(() => {
    setState("loading");
    void loadResult();

    const channel = supabase
      .channel("result-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answers",
        },
        () => {
          void loadResult();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couples",
        },
        () => {
          void loadResult();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [loadResult]);

  return (
    <AppShell
      maxWidth={720}
      fullHeight
      className="result-page-shell"
      panelClassName="result-panel"
    >
      <div className="result-content">
        <TopBar
          left={
            <button
              type="button"
              className="tonari-icon-button result-home-button"
              onClick={() =>
                router.push("/home")
              }
              aria-label="ホームに戻る"
            >
              <span aria-hidden="true">
                ←
              </span>
            </button>
          }
        />

        <header className="result-heading result-brand-hero">
          <div
            className="result-brand-leaf result-brand-leaf-left"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
            <span />
          </div>

          <div
            className="result-brand-leaf result-brand-leaf-right"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="result-brand-hero-inner">
            <p className="result-brand-kicker">
              TODAY&apos;S TONARI
            </p>

            <p className="tonari-eyebrow result-brand-eyebrow">
              今日の答え
            </p>

            {question ? (
              <h1 className="result-question">
                {question.question_text}
              </h1>
            ) : state === "loading" ? (
              <h1 className="result-question result-question-placeholder">
                二人の答え
              </h1>
            ) : null}

            <p className="tonari-copy result-heading-copy">
              同じところも、違うところも、
              <br />
              二人を知るきっかけになります。
            </p>
          </div>
        </header>

        {state === "loading" && (
          <section className="result-loading">
            <span
              className="result-spinner"
              aria-hidden="true"
            />

            <p className="tonari-copy">
              二人の答えを読み込んでいます…
            </p>
          </section>
        )}

        {state === "error" && (
          <>
            <div
              className="tonari-alert tonari-alert-error result-error"
              role="alert"
            >
              {message}
            </div>

            <button
              type="button"
              className="tonari-button tonari-button-soft result-retry-button"
              onClick={() => {
                setState("loading");
                void loadResult();
              }}
            >
              もう一度読み込む
            </button>

            <button
              type="button"
              className="tonari-button tonari-button-brown result-back-button"
              onClick={() =>
                router.push("/home")
              }
            >
              ホームに戻る
            </button>
          </>
        )}

        {state === "waiting" && (
          <section
            className="tonari-card-soft result-waiting-card"
            aria-live="polite"
          >
            <div className="result-waiting-illustration">
              <WaitingScene />
            </div>

            <h2 className="result-waiting-title">
              まだ二人の回答が
              <br />
              そろっていません。
            </h2>

            <p className="tonari-copy result-waiting-copy">
              二人とも回答すると、
              <br />
              この画面に答えが届きます。
            </p>

            <div className="result-waiting-status">
              <span
                className="result-waiting-dot"
                aria-hidden="true"
              />

              自動で更新しています
            </div>
          </section>
        )}

        {state === "ready" && (
          <>
            <section
              className="result-reveal-card result-reveal-brand"
              aria-live="polite"
            >
              <div className="result-reveal-glow" aria-hidden="true" />

              <div
                className="result-reveal-icon"
                aria-hidden="true"
              >
                <span>✓</span>
              </div>

              <p className="result-reveal-eyebrow">
                ふたりの答えがそろいました
              </p>

              <h2 className="result-reveal-title">
                今日も少しだけ、
                <br />
                お互いを知れました。
              </h2>

              <p className="result-reveal-copy">
                {myName}さんと{partnerName}さんの答えを、
                <br />
                ゆっくり見てみましょう。
              </p>

              <div className="result-reveal-divider" aria-hidden="true">
                <span />
                <i />
                <span />
              </div>
            </section>

            <section className="result-answer-list">
              <AnswerCard
                variant="mine"
                label={myName}
                answer={myAnswer}
              />

              <AnswerCard
                variant="partner"
                label={partnerName}
                answer={partnerAnswer}
              />
            </section>

            {commonWords.length > 0 && (
              <section className="result-common-card">
                <p className="result-common-label">
                  ✦ 今日の共通点
                </p>

                <p className="result-common-copy">
                  二人の答えに、同じ言葉がありました。
                </p>

                <div className="result-common-words">
                  {commonWords.map(
                    (word) => (
                      <span
                        key={word}
                        className="result-common-word"
                      >
                        {word}
                      </span>
                    )
                  )}
                </div>
              </section>
            )}

            <section
              className="result-insight-card"
              aria-live="polite"
            >
              <div className="result-insight-heading">
                <span
                  className="result-insight-mark"
                  aria-hidden="true"
                >
                  ✦
                </span>

                <div>
                  <p className="result-insight-eyebrow">
                    今日のとなりAI
                  </p>

                  <h2 className="result-insight-title">
                    ふたりの答えから見えたこと
                  </h2>
                </div>
              </div>

              {insightState === "loading" && (
                <div className="result-insight-loading">
                  <span
                    className="result-insight-spinner"
                    aria-hidden="true"
                  />

                  <p>
                    二人の答えを、やさしく読み解いています…
                  </p>
                </div>
              )}

              {insightState === "ready" && (
                <p className="result-insight-text">
                  {insight}
                </p>
              )}

              {insightState === "error" && (
                <div className="result-insight-error">
                  <p>{insightError}</p>

                  <button
                    type="button"
                    className="result-insight-retry"
                    onClick={() =>
                      void loadResult()
                    }
                  >
                    もう一度読み込む
                  </button>
                </div>
              )}

              {insightState === "idle" && (
                <p className="result-insight-text">
                  二人の回答がそろうと、ここに今日のコメントが届きます。
                </p>
              )}
            </section>

            <section className="result-conversation-card">
              <div
                className="result-conversation-decoration"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </div>

              <p className="result-conversation-eyebrow">
                今日の「となり」
              </p>

              <p className="result-conversation-title">
                同じところも、
                <br />
                違うところも、大切な二人らしさ。
              </p>

              <p className="result-conversation-copy">
                答えをきっかけに、
                <br />
                今日、少しだけ話してみませんか。
              </p>

              <p className="result-conversation-tomorrow">
                また明日も、となりで。
              </p>
            </section>

            <button
              type="button"
              className="tonari-button tonari-button-soft result-home-link"
              onClick={() =>
                router.push("/home")
              }
            >
              ホームに戻る
            </button>
          </>
        )}
      </div>

      <style jsx global>{`
        .result-page-shell {
          max-width: 720px;
        }

        .result-panel {
          min-height: calc(100vh - 84px);
          border-radius: 34px;
        }

        .result-content {
          padding: 26px 28px 30px;
        }

        .result-home-button {
          font-size: 20px;
          line-height: 1;
        }

        .result-heading {
          margin-top: 30px;
          text-align: center;
        }

        .result-question {
          max-width: 620px;
          margin: 17px auto 0;
          color: var(--tonari-text);
          font-family: "Zen Old Mincho", serif;
          font-size: clamp(
            31px,
            7vw,
            40px
          );
          font-weight: 600;
          line-height: 1.5;
          letter-spacing: 0.01em;
          overflow-wrap: anywhere;
        }

        .result-question-placeholder {
          color: var(
            --tonari-brown-soft
          );
        }

        .result-heading-copy {
          margin-top: 14px;
        }

        .result-loading {
          display: grid;
          min-height: 360px;
          place-items: center;
          align-content: center;
          gap: 18px;
          text-align: center;
        }

        .result-spinner {
          width: 38px;
          height: 38px;
          border: 4px solid
            var(--tonari-border);
          border-top-color:
            var(--tonari-sage-deep);
          border-radius: 50%;
          animation: result-spin 850ms
            linear infinite;
        }

        .result-error {
          margin-top: 28px;
        }

        .result-retry-button {
          margin-top: 18px;
        }

        .result-back-button {
          margin-top: 12px;
        }

        .result-waiting-card {
          margin-top: 30px;
          padding: 28px 22px 30px;
          text-align: center;
        }

        .result-waiting-illustration {
          width: 190px;
          height: 135px;
          margin: 0 auto;
        }

        .result-waiting-svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        .result-waiting-title {
          margin: 8px 0 0;
          color: var(--tonari-text);
          font-family: "Zen Old Mincho",
            serif;
          font-size: 23px;
          font-weight: 600;
          line-height: 1.65;
        }

        .result-waiting-copy {
          margin-top: 13px;
        }

        .result-waiting-status {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-top: 21px;
          padding: 9px 14px;
          border: 1px solid
            var(--tonari-border);
          border-radius:
            var(--tonari-radius-pill);
          background:
            var(--tonari-surface);
          color:
            var(--tonari-text-soft);
          font-size: 12px;
          font-weight: 600;
        }

        .result-waiting-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background:
            var(--tonari-sage-deep);
          box-shadow: 0 0 0 5px
            rgba(127, 152, 119, 0.13);
          animation:
            result-pulse 1.8s
            ease-in-out infinite;
        }

        .result-reveal-card {
          margin-top: 30px;
          padding: 25px 22px 26px;
          border: 1px solid #ead6ca;
          border-radius: 26px;
          background:
            linear-gradient(
              145deg,
              #fff8f3 0%,
              #f5eee8 58%,
              #eef4eb 100%
            );
          text-align: center;
          box-shadow:
            var(--tonari-shadow-sm);
          animation:
            result-reveal-in 520ms
            ease both;
        }

        .result-reveal-icon {
          display: flex;
          width: 54px;
          height: 54px;
          margin: 0 auto 13px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #dcebd7;
          color: #587252;
          font-family: sans-serif;
          font-size: 24px;
          font-weight: 800;
          box-shadow: 0 9px 20px
            rgba(88, 114, 82, 0.15);
        }

        .result-reveal-eyebrow {
          margin: 0;
          color:
            var(--tonari-sage-deep);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .result-reveal-title {
          margin: 10px 0 0;
          color: var(--tonari-text);
          font-family:
            "Zen Old Mincho", serif;
          font-size: 23px;
          font-weight: 600;
          line-height: 1.7;
        }

        .result-reveal-copy {
          margin: 10px 0 0;
          color:
            var(--tonari-text-soft);
          font-size: 13px;
          line-height: 1.8;
        }

        .result-answer-list {
          display: grid;
          gap: 16px;
          margin-top: 32px;
        }

        .result-answer-card {
          padding: 22px;
          border-radius: 24px;
          box-shadow:
            var(--tonari-shadow-sm);
          animation:
            result-card-in 420ms
            ease both;
        }

        .result-answer-card-mine {
          border: 1px solid #ead6ca;
          background: #fff8f3;
        }

        .result-answer-card-partner {
          border: 1px solid #d8e2d4;
          background: #f2f6f0;
          animation-delay: 120ms;
        }

        .result-answer-header {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .result-avatar {
          display: flex;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          box-shadow: 0 8px 18px
            rgba(88, 64, 52, 0.12);
        }

        .result-avatar svg {
          width: 30px;
          height: 30px;
          opacity: 0.86;
        }

        .result-avatar-mine {
          background: #d9aa95;
          color: #403630;
        }

        .result-avatar-partner {
          background: #b7c5b2;
          color: #403630;
        }

        .result-answer-label {
          margin: 0;
          color:
            var(--tonari-brown-soft);
          font-size: 13px;
          font-weight: 700;
        }

        .result-answer-card-partner
          .result-answer-label {
          color: #788a73;
        }

        .result-answer-subtitle {
          margin: 4px 0 0;
          color:
            var(--tonari-text-soft);
          font-size: 15px;
        }

        .result-answer-text {
          margin: 18px 0 0;
          color: var(--tonari-text);
          font-size: 18px;
          line-height: 1.95;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .result-common-card {
          margin-top: 20px;
          padding: 22px;
          border: 1px solid #e7d3c7;
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              #fff8f3 0%,
              #f4eee8 100%
            );
          text-align: center;
          animation:
            result-card-in 420ms
            ease 220ms both;
        }

        .result-common-label {
          margin: 0;
          color: #a07f70;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .result-common-copy {
          margin: 8px 0 0;
          color:
            var(--tonari-text-soft);
          font-size: 13px;
          line-height: 1.7;
        }

        .result-common-words {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 9px;
          margin-top: 14px;
        }

        .result-common-word {
          padding: 8px 13px;
          border: 1px solid #e7d3c7;
          border-radius:
            var(--tonari-radius-pill);
          background: #ffffff;
          color: #704f42;
          font-size: 15px;
          font-weight: 700;
        }

        .result-insight-card {
          margin-top: 20px;
          padding: 23px 22px 24px;
          border: 1px solid #d9e4d5;
          border-radius: 25px;
          background:
            linear-gradient(
              145deg,
              #f7faf5 0%,
              #eef4eb 100%
            );
          box-shadow:
            var(--tonari-shadow-sm);
        }

        .result-insight-heading {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .result-insight-mark {
          display: flex;
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #dcebd7;
          color: #587252;
          font-size: 20px;
          box-shadow: 0 8px 18px
            rgba(88, 114, 82, 0.14);
        }

        .result-insight-eyebrow {
          margin: 0;
          color:
            var(--tonari-sage-deep);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .result-insight-title {
          margin: 5px 0 0;
          color: var(--tonari-text);
          font-family:
            "Zen Old Mincho", serif;
          font-size: 18px;
          font-weight: 600;
          line-height: 1.55;
        }

        .result-insight-text {
          margin: 18px 0 0;
          color: var(--tonari-text);
          font-size: 14px;
          line-height: 2;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .result-insight-loading {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
          color:
            var(--tonari-text-soft);
          font-size: 13px;
          line-height: 1.7;
        }

        .result-insight-loading p,
        .result-insight-error p {
          margin: 0;
        }

        .result-insight-spinner {
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          border: 3px solid #d6e2d1;
          border-top-color:
            var(--tonari-sage-deep);
          border-radius: 50%;
          animation: result-spin 850ms
            linear infinite;
        }

        .result-insight-error {
          margin-top: 17px;
          color: #8f5f55;
          font-size: 13px;
          line-height: 1.7;
        }

        .result-insight-retry {
          margin-top: 11px;
          padding: 8px 12px;
          border: 1px solid #d7c2b8;
          border-radius: 999px;
          background: #fffaf7;
          color: var(--tonari-brown);
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        .result-conversation-card {
          margin-top: 22px;
          padding: 25px 22px;
          border-radius: 24px;
          background:
            var(--tonari-brown);
          color: #ffffff;
          text-align: center;
          box-shadow: 0 14px 32px
            rgba(64, 54, 48, 0.18);
          animation:
            result-card-in 420ms
            ease 320ms both;
        }

        .result-conversation-eyebrow {
          margin: 0 0 10px;
          color: #d9c7bc;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
        }

        .result-conversation-title {
          margin: 0;
          font-family: "Zen Old Mincho",
            serif;
          font-size: 21px;
          font-weight: 600;
          line-height: 1.8;
        }

        .result-conversation-copy {
          margin: 12px 0 0;
          color: #e8ddd6;
          font-size: 14px;
          line-height: 1.8;
        }

        .result-conversation-tomorrow {
          margin: 17px 0 0;
          color: #ffffff;
          font-family:
            "Zen Old Mincho", serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        .result-home-link {
          margin-top: 18px;
        }


        /* -------------------------------------------------
           Brand redesign
        -------------------------------------------------- */

        .result-page-shell {
          position: relative;
        }

        .result-page-shell::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(
              circle at 15% 8%,
              rgba(242, 203, 190, 0.28),
              transparent 34%
            ),
            radial-gradient(
              circle at 88% 18%,
              rgba(188, 208, 179, 0.25),
              transparent 35%
            ),
            linear-gradient(
              180deg,
              #f8f0e9 0%,
              #f4ece5 58%,
              #f7f2ed 100%
            );
        }

        .result-panel {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(218, 194, 180, 0.68);
          background:
            linear-gradient(
              180deg,
              rgba(255, 252, 249, 0.96),
              rgba(251, 247, 243, 0.96)
            );
          box-shadow:
            0 28px 80px rgba(98, 71, 55, 0.11);
        }

        .result-panel::before {
          content: "";
          position: absolute;
          top: -130px;
          right: -120px;
          width: 330px;
          height: 330px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(222, 235, 216, 0.7),
              rgba(222, 235, 216, 0)
            );
          pointer-events: none;
        }

        .result-content {
          position: relative;
          z-index: 1;
        }

        .result-home-button {
          border: 1px solid rgba(217, 192, 178, 0.72);
          background: rgba(255, 250, 247, 0.88);
          color: #785848;
          box-shadow:
            0 8px 20px rgba(105, 76, 59, 0.09);
          backdrop-filter: blur(8px);
        }

        .result-brand-hero {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          margin-top: 24px;
          padding: 34px 28px 32px;
          border: 1px solid rgba(226, 199, 184, 0.82);
          border-radius: 30px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255, 255, 255, 0.92),
              transparent 44%
            ),
            linear-gradient(
              145deg,
              #fff8f4 0%,
              #f8eee8 50%,
              #eef4eb 100%
            );
          box-shadow:
            0 20px 48px rgba(100, 73, 57, 0.11);
        }

        .result-brand-hero::before,
        .result-brand-hero::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .result-brand-hero::before {
          top: -70px;
          left: 50%;
          width: 220px;
          height: 220px;
          transform: translateX(-50%);
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.8),
              rgba(255, 255, 255, 0)
            );
        }

        .result-brand-hero::after {
          right: -54px;
          bottom: -82px;
          width: 190px;
          height: 190px;
          background:
            radial-gradient(
              circle,
              rgba(199, 216, 191, 0.5),
              rgba(199, 216, 191, 0)
            );
        }

        .result-brand-hero-inner {
          position: relative;
          z-index: 2;
        }

        .result-brand-kicker {
          margin: 0;
          color: #b88774;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.24em;
        }

        .result-brand-eyebrow {
          margin-top: 10px;
          color: #8da083;
        }

        .result-question {
          max-width: 590px;
          margin-top: 16px;
          color: #5a3f31;
          font-size: clamp(28px, 6.2vw, 38px);
          line-height: 1.55;
          text-wrap: balance;
        }

        .result-heading-copy {
          margin-top: 16px;
          color: #8b7163;
          font-size: 14px;
          line-height: 1.9;
        }

        .result-brand-leaf {
          position: absolute;
          z-index: 1;
          width: 90px;
          height: 130px;
          opacity: 0.7;
          pointer-events: none;
        }

        .result-brand-leaf::before {
          content: "";
          position: absolute;
          left: 44px;
          top: 8px;
          width: 2px;
          height: 112px;
          border-radius: 999px;
          background: #9bae90;
          transform: rotate(12deg);
          transform-origin: bottom;
        }

        .result-brand-leaf span {
          position: absolute;
          width: 30px;
          height: 15px;
          border-radius: 100% 0 100% 0;
          background:
            linear-gradient(
              135deg,
              #cbd9c4,
              #9db28f
            );
        }

        .result-brand-leaf span:nth-child(1) {
          left: 17px;
          top: 21px;
          transform: rotate(-34deg);
        }

        .result-brand-leaf span:nth-child(2) {
          right: 6px;
          top: 47px;
          transform: rotate(34deg) scaleX(-1);
        }

        .result-brand-leaf span:nth-child(3) {
          left: 12px;
          top: 74px;
          transform: rotate(-31deg);
        }

        .result-brand-leaf span:nth-child(4) {
          right: 0;
          top: 96px;
          transform: rotate(30deg) scaleX(-1);
        }

        .result-brand-leaf-left {
          left: -7px;
          bottom: -24px;
          transform: rotate(-20deg);
        }

        .result-brand-leaf-right {
          top: -17px;
          right: -8px;
          transform: rotate(157deg) scale(0.9);
          opacity: 0.58;
        }

        .result-loading {
          min-height: 300px;
          margin-top: 24px;
          border: 1px solid rgba(219, 200, 188, 0.62);
          border-radius: 26px;
          background: rgba(255, 251, 248, 0.72);
        }

        .result-waiting-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(218, 200, 188, 0.82);
          border-radius: 28px;
          background:
            linear-gradient(
              145deg,
              #fffaf7,
              #f4eee9 58%,
              #edf4ea
            );
          box-shadow:
            0 18px 42px rgba(93, 68, 54, 0.1);
        }

        .result-waiting-card::after {
          content: "";
          position: absolute;
          right: -40px;
          bottom: -54px;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(197, 215, 188, 0.48),
              rgba(197, 215, 188, 0)
            );
        }

        .result-reveal-card {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          margin-top: 28px;
          padding: 32px 24px 27px;
          border: 1px solid rgba(229, 200, 184, 0.88);
          border-radius: 30px;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(255, 255, 255, 0.98),
              transparent 43%
            ),
            linear-gradient(
              145deg,
              #fff7f2 0%,
              #f7ece5 52%,
              #eef4eb 100%
            );
          box-shadow:
            0 22px 54px rgba(99, 72, 56, 0.12);
        }

        .result-reveal-glow {
          position: absolute;
          inset: -60px auto auto 50%;
          z-index: -1;
          width: 260px;
          height: 180px;
          transform: translateX(-50%);
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.9),
              rgba(255, 255, 255, 0)
            );
        }

        .result-reveal-icon {
          width: 58px;
          height: 58px;
          border: 1px solid rgba(151, 176, 140, 0.46);
          background:
            linear-gradient(
              145deg,
              #e4efdf,
              #d2e3cc
            );
          color: #5f7957;
          box-shadow:
            0 12px 26px rgba(86, 113, 79, 0.16);
        }

        .result-reveal-icon span {
          transform: translateY(-1px);
        }

        .result-reveal-eyebrow {
          color: #829878;
          font-size: 11px;
          letter-spacing: 0.14em;
        }

        .result-reveal-title {
          margin-top: 11px;
          color: #563c2f;
          font-size: clamp(23px, 5.4vw, 28px);
          line-height: 1.72;
        }

        .result-reveal-copy {
          color: #8a7062;
          font-size: 13px;
          line-height: 1.9;
        }

        .result-reveal-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 18px;
        }

        .result-reveal-divider span {
          width: 38px;
          height: 1px;
          background: rgba(182, 149, 131, 0.38);
        }

        .result-reveal-divider i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #b89b8b;
        }

        .result-answer-list {
          gap: 18px;
          margin-top: 28px;
        }

        .result-answer-card {
          position: relative;
          overflow: hidden;
          padding: 24px;
          border-radius: 27px;
          box-shadow:
            0 16px 38px rgba(91, 67, 53, 0.1);
        }

        .result-answer-card::after {
          content: "";
          position: absolute;
          width: 128px;
          height: 128px;
          border-radius: 50%;
          pointer-events: none;
        }

        .result-answer-card-mine {
          border-color: rgba(231, 199, 181, 0.86);
          background:
            linear-gradient(
              145deg,
              #fff9f5,
              #f9eee7
            );
        }

        .result-answer-card-mine::after {
          top: -56px;
          right: -46px;
          background:
            radial-gradient(
              circle,
              rgba(230, 190, 171, 0.26),
              rgba(230, 190, 171, 0)
            );
        }

        .result-answer-card-partner {
          border-color: rgba(198, 216, 191, 0.94);
          background:
            linear-gradient(
              145deg,
              #f8fbf6,
              #edf4ea
            );
        }

        .result-answer-card-partner::after {
          right: -44px;
          bottom: -56px;
          background:
            radial-gradient(
              circle,
              rgba(175, 200, 164, 0.3),
              rgba(175, 200, 164, 0)
            );
        }

        .result-avatar {
          width: 52px;
          height: 52px;
          border: 1px solid rgba(255, 255, 255, 0.64);
        }

        .result-avatar-mine {
          background:
            linear-gradient(
              145deg,
              #e5bca8,
              #d9a58e
            );
        }

        .result-avatar-partner {
          background:
            linear-gradient(
              145deg,
              #c7d8c0,
              #aebeaa
            );
        }

        .result-answer-label {
          color: #805c4b;
          font-size: 14px;
        }

        .result-answer-subtitle {
          color: #9a8275;
          font-size: 12px;
          letter-spacing: 0.04em;
        }

        .result-answer-text {
          position: relative;
          z-index: 1;
          margin-top: 20px;
          padding: 18px 18px 19px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 19px;
          background: rgba(255, 255, 255, 0.62);
          color: #563f34;
          font-size: 17px;
          line-height: 2;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .result-common-card {
          margin-top: 21px;
          padding: 23px;
          border-color: rgba(226, 195, 178, 0.82);
          border-radius: 25px;
          background:
            linear-gradient(
              145deg,
              #fff9f5,
              #f6ece6
            );
          box-shadow:
            0 13px 32px rgba(92, 67, 53, 0.08);
        }

        .result-common-label {
          color: #9e7460;
        }

        .result-common-word {
          border-color: rgba(221, 187, 169, 0.84);
          background: rgba(255, 255, 255, 0.8);
          color: #725042;
          box-shadow:
            0 6px 15px rgba(92, 66, 52, 0.06);
        }

        .result-insight-card {
          position: relative;
          overflow: hidden;
          margin-top: 21px;
          padding: 25px 24px 26px;
          border-color: rgba(194, 214, 185, 0.96);
          border-radius: 28px;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(255, 255, 255, 0.86),
              transparent 37%
            ),
            linear-gradient(
              145deg,
              #f8fbf6,
              #eaf3e7
            );
          box-shadow:
            0 17px 40px rgba(75, 101, 69, 0.1);
        }

        .result-insight-card::after {
          content: "";
          position: absolute;
          right: -45px;
          bottom: -58px;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(162, 190, 151, 0.28),
              rgba(162, 190, 151, 0)
            );
          pointer-events: none;
        }

        .result-insight-heading,
        .result-insight-text,
        .result-insight-loading,
        .result-insight-error {
          position: relative;
          z-index: 1;
        }

        .result-insight-mark {
          width: 49px;
          height: 49px;
          flex-basis: 49px;
          border: 1px solid rgba(152, 181, 141, 0.44);
          background:
            linear-gradient(
              145deg,
              #e5efdf,
              #d2e4cb
            );
          color: #607957;
        }

        .result-insight-eyebrow {
          color: #809775;
        }

        .result-insight-title {
          color: #4f4037;
          font-size: 19px;
        }

        .result-insight-text {
          padding: 17px 18px;
          border: 1px solid rgba(255, 255, 255, 0.78);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.58);
          color: #4e443d;
          font-size: 14px;
          line-height: 2.05;
        }

        .result-conversation-card {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          margin-top: 23px;
          padding: 31px 24px 29px;
          border: 1px solid rgba(126, 87, 66, 0.3);
          border-radius: 28px;
          background:
            radial-gradient(
              circle at 50% -12%,
              rgba(255, 255, 255, 0.1),
              transparent 36%
            ),
            linear-gradient(
              145deg,
              #76513f,
              #583b2e
            );
          box-shadow:
            0 20px 46px rgba(73, 48, 37, 0.22);
        }

        .result-conversation-card::before,
        .result-conversation-card::after {
          content: "";
          position: absolute;
          z-index: -1;
          border-radius: 50%;
        }

        .result-conversation-card::before {
          top: -95px;
          right: -78px;
          width: 210px;
          height: 210px;
          background: rgba(230, 193, 172, 0.12);
        }

        .result-conversation-card::after {
          bottom: -100px;
          left: -70px;
          width: 210px;
          height: 210px;
          background: rgba(171, 197, 160, 0.11);
        }

        .result-conversation-decoration {
          display: flex;
          justify-content: center;
          gap: 7px;
          margin-bottom: 12px;
        }

        .result-conversation-decoration span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #dfc6b7;
          opacity: 0.88;
        }

        .result-conversation-decoration span:nth-child(2) {
          width: 7px;
          height: 7px;
          transform: translateY(-1px);
          background: #cbd8c5;
        }

        .result-conversation-eyebrow {
          color: #dfc9bc;
        }

        .result-conversation-title {
          font-size: 22px;
          line-height: 1.86;
        }

        .result-conversation-copy {
          color: #eadfd8;
        }

        .result-home-link {
          margin-top: 19px;
          border: 1px solid rgba(217, 193, 179, 0.85);
          background: #fff8f4;
          color: #6f4b3a;
          box-shadow:
            0 10px 24px rgba(89, 64, 50, 0.09);
        }

        @keyframes result-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes result-reveal-in {
          from {
            opacity: 0;
            transform:
              translateY(12px)
              scale(0.985);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        @keyframes result-card-in {
          from {
            opacity: 0;
            transform:
              translateY(14px)
              scale(0.99);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        @keyframes result-pulse {
          0%,
          100% {
            opacity: 0.55;
          }

          50% {
            opacity: 1;
          }
        }

        @media (max-width: 560px) {
          .result-page-shell {
            min-height: 100vh;
          }

          .result-panel {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .result-content {
            padding: 20px 18px 28px;
          }

          .result-heading {
            margin-top: 20px;
          }

          .result-brand-hero {
            padding: 29px 20px 27px;
            border-radius: 26px;
          }

          .result-brand-leaf {
            transform: scale(0.82);
          }

          .result-brand-leaf-left {
            left: -20px;
            bottom: -35px;
          }

          .result-brand-leaf-right {
            top: -32px;
            right: -22px;
            transform: rotate(157deg) scale(0.74);
          }

          .result-question {
            font-size: 28px;
          }

          .result-answer-card {
            padding: 20px;
          }

          .result-answer-text {
            font-size: 17px;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .result-spinner,
          .result-insight-spinner,
          .result-waiting-dot,
          .result-reveal-card,
          .result-answer-card,
          .result-common-card,
          .result-conversation-card {
            animation: none;
          }
        }
      `}</style>
    </AppShell>
  );
}