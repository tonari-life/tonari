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

type ResultState =
  | "loading"
  | "waiting"
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
            今日の気持ち
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

  const [state, setState] =
    useState<ResultState>("loading");

  const [message, setMessage] =
    useState("");

  const commonWords = useMemo(
    () =>
      findCommonWords(
        myAnswer,
        partnerAnswer
      ),
    [myAnswer, partnerAnswer]
  );

  const loadResult = useCallback(async () => {
    try {
      setMessage("");

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
        setState("waiting");
        return;
      }

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

      const otherUserId = isOwner
        ? couple.partner_id
        : couple.owner_id;

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
  }, [router]);

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

        <header className="result-heading">
          <p className="tonari-eyebrow">
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
            <section className="result-answer-list">
              <AnswerCard
                variant="mine"
                label="あなた"
                answer={myAnswer}
              />

              <AnswerCard
                variant="partner"
                label="パートナー"
                answer={partnerAnswer}
              />
            </section>

            {commonWords.length > 0 && (
              <section className="result-common-card">
                <p className="result-common-label">
                  二人に共通していた言葉
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

            <section className="result-conversation-card">
              <p className="result-conversation-title">
                答えが違うからこそ、
                <br />
                今日、少し話してみませんか。
              </p>

              <p className="result-conversation-copy">
                同じ答えも、違う答えも、
                <br />
                二人を知るきっかけになります。
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

        .result-home-link {
          margin-top: 18px;
        }

        @keyframes result-spin {
          to {
            transform: rotate(360deg);
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
            margin-top: 26px;
          }

          .result-question {
            font-size: 30px;
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
          .result-waiting-dot,
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