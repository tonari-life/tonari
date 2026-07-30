"use client";

import { useEffect, useRef, useState } from "react";
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

type MessageTone = "error" | "info";

const MAX_ANSWER_LENGTH = 300;
const DRAFT_STORAGE_KEY = "tonari-question-draft";

function LeafIllustration() {
  return (
    <svg
      viewBox="0 0 150 120"
      role="img"
      aria-label="小さな植物のイラスト"
      className="question-illustration-svg"
    >
      <ellipse cx="76" cy="105" rx="44" ry="8" fill="#eadfd7" />

      <rect
        x="61"
        y="78"
        width="31"
        height="25"
        rx="8"
        fill="#d7bca9"
      />

      <path
        d="M76 79V38"
        stroke="#7f9278"
        strokeWidth="6"
        strokeLinecap="round"
      />

      <path
        d="M76 57C55 56 42 44 41 25C60 25 73 38 76 57Z"
        fill="#b7c5b2"
      />

      <path
        d="M76 48C94 47 106 36 110 20C92 18 79 30 76 48Z"
        fill="#8fa186"
      />

      <circle
        cx="120"
        cy="71"
        r="7"
        fill="#dda187"
        opacity="0.7"
      />
    </svg>
  );
}

export default function QuestionPage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] =
    useState<MessageTone>("error");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    let active = true;

    const loadQuestion = async () => {
      try {
        setLoading(true);
        setMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/");
          return;
        }

        const today = getTodayJST();

        const { data, error } = await supabase
          .from("daily_questions")
          .select("id, question_text")
          .eq("question_date", today)
          .maybeSingle();

        if (!active) {
          return;
        }

        if (error) {
          setMessageTone("error");
          setMessage(`質問の取得エラー：${error.message}`);
          return;
        }

        if (!data) {
          setQuestion(null);
          setMessageTone("info");
          setMessage("今日の質問はまだ登録されていません");
          return;
        }

        const { data: existingAnswer, error: answerError } =
          await supabase
            .from("answers")
            .select("id")
            .eq("user_id", user.id)
            .eq("question_id", data.id)
            .maybeSingle();

        if (!active) {
          return;
        }

        if (answerError) {
          setMessageTone("error");
          setMessage(
            `回答状況の確認エラー：${answerError.message}`
          );
          return;
        }

        if (existingAnswer) {
          router.replace("/home");
          return;
        }

        setQuestion(data);

        const draftKey = `${DRAFT_STORAGE_KEY}-${data.id}`;
        const savedDraft = window.localStorage.getItem(draftKey);

        if (savedDraft) {
          setAnswer(savedDraft.slice(0, MAX_ANSWER_LENGTH));
          setDraftRestored(true);
        }
      } catch (error) {
        console.error("質問の取得エラー:", error);

        if (!active) {
          return;
        }

        setMessageTone("error");
        setMessage(
          error instanceof Error
            ? `質問の取得エラー：${error.message}`
            : "質問の取得中にエラーが発生しました"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadQuestion();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!question) {
      return;
    }

    const timer = window.setTimeout(() => {
      const key = `${DRAFT_STORAGE_KEY}-${question.id}`;

      if (answer.trim()) {
        window.localStorage.setItem(key, answer);
      } else {
        window.localStorage.removeItem(key);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [answer, question]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(
      textarea.scrollHeight,
      205
    )}px`;
  }, [answer]);

  const saveAnswer = async () => {
    if (saving) {
      return;
    }

    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
      setMessageTone("error");
      setMessage("回答を入力してください");
      textareaRef.current?.focus();
      return;
    }

    if (!question) {
      setMessageTone("error");
      setMessage("今日の質問がありません");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessageTone("error");
        setMessage("ログイン情報を取得できませんでした");
        return;
      }

      const { data: existingAnswer, error: answerCheckError } =
        await supabase
          .from("answers")
          .select("id")
          .eq("user_id", user.id)
          .eq("question_id", question.id)
          .maybeSingle();

      if (answerCheckError) {
        setMessageTone("error");
        setMessage(
          `回答状況の確認エラー：${answerCheckError.message}`
        );
        return;
      }

      if (existingAnswer) {
        router.replace("/home");
        return;
      }

      const { error } = await supabase.from("answers").insert({
        user_id: user.id,
        question_id: question.id,
        answer_text: trimmedAnswer,
      });

      if (error) {
        setMessageTone("error");
        setMessage(`保存エラー：${error.message}`);
        return;
      }

      window.localStorage.removeItem(
        `${DRAFT_STORAGE_KEY}-${question.id}`
      );

      router.push("/invite");
    } catch (error) {
      console.error("回答保存エラー:", error);

      setMessageTone("error");
      setMessage(
        error instanceof Error
          ? `保存エラー：${error.message}`
          : "回答の保存中にエラーが発生しました"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      maxWidth={430}
      fullHeight
      className="question-page-shell"
      panelClassName="question-panel"
    >
      <div className="question-content">
        <TopBar
          left={
            <button
              type="button"
              className="tonari-icon-button question-close-button"
              onClick={() => router.push("/home")}
              aria-label="ホームに戻る"
            >
              <span aria-hidden="true">×</span>
            </button>
          }
        />

        {loading ? (
          <div className="question-loading">
            <div
              className="question-loading-spinner"
              aria-hidden="true"
            />

            <p className="tonari-copy">
              今日の質問を読み込んでいます…
            </p>
          </div>
        ) : question ? (
          <>
            <section className="question-heading">
              <div className="question-heading-copy">
                <p className="tonari-eyebrow">今日の質問</p>

                <h1 className="question-main-title">
                  {question.question_text}
                </h1>
              </div>

              <div className="question-illustration">
                <LeafIllustration />
              </div>
            </section>

            <section className="question-answer-card">
              <label
                htmlFor="tonari-answer"
                className="question-answer-label"
              >
                あなたの答え
              </label>

              <textarea
                id="tonari-answer"
                ref={textareaRef}
                value={answer}
                maxLength={MAX_ANSWER_LENGTH}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  setMessage("");
                  setDraftRestored(false);
                }}
                placeholder="思いついたことを自由に書いてみましょう…"
                disabled={saving}
                className="tonari-textarea question-textarea"
                aria-describedby="question-answer-help question-answer-count"
              />

              <div className="question-input-footer">
                <p
                  id="question-answer-help"
                  className="question-input-help"
                >
                  {draftRestored
                    ? "前回の入力内容を復元しました"
                    : answer.trim()
                      ? "入力内容はこの端末に一時保存されます"
                      : "あなたの言葉で大丈夫です"}
                </p>

                <p
                  id="question-answer-count"
                  className={`question-character-count ${
                    answer.length >= MAX_ANSWER_LENGTH
                      ? "question-character-count-limit"
                      : ""
                  }`}
                  aria-live="polite"
                >
                  {answer.length}/{MAX_ANSWER_LENGTH}
                </p>
              </div>
            </section>

            {message && (
              <div
                className={`tonari-alert ${
                  messageTone === "error"
                    ? "tonari-alert-error"
                    : "tonari-alert-info"
                } question-message`}
                role={
                  messageTone === "error" ? "alert" : "status"
                }
              >
                {message}
              </div>
            )}

            <button
              type="button"
              className="tonari-button tonari-button-primary question-save-button"
              onClick={saveAnswer}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span
                    className="question-button-spinner"
                    aria-hidden="true"
                  />
                  保存しています…
                </>
              ) : (
                "保存する"
              )}
            </button>
          </>
        ) : (
          <>
            <div className="tonari-card-soft question-empty-card">
              <div className="question-empty-illustration">
                <LeafIllustration />
              </div>

              <p className="question-empty-title">
                今日の質問はまだありません。
              </p>

              <p className="tonari-copy question-empty-copy">
                質問が届くまで、少し待ってみてください。
              </p>
            </div>

            {message && (
              <div
                className={`tonari-alert ${
                  messageTone === "error"
                    ? "tonari-alert-error"
                    : "tonari-alert-info"
                } question-message`}
                role={
                  messageTone === "error" ? "alert" : "status"
                }
              >
                {message}
              </div>
            )}

            <button
              type="button"
              className="tonari-button tonari-button-soft question-home-button"
              onClick={() => router.push("/home")}
            >
              ホームに戻る
            </button>
          </>
        )}
      </div>

      <style jsx global>{`
        .question-page-shell {
          max-width: 430px;
        }

        .question-panel {
          min-height: calc(100vh - 84px);
          border-radius: 34px;
        }

        .question-content {
          padding: 22px 22px 26px;
        }

        .question-close-button {
          font-size: 23px;
          line-height: 1;
        }

        .question-heading {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 104px;
          gap: 16px;
          align-items: end;
          margin-top: 28px;
        }

        .question-heading-copy {
          min-width: 0;
        }

        .question-main-title {
          margin: 17px 0 0;
          color: var(--tonari-text);
          font-family: "Zen Old Mincho", serif;
          font-size: 31px;
          font-weight: 600;
          line-height: 1.55;
          letter-spacing: 0.01em;
          overflow-wrap: anywhere;
        }

        .question-illustration {
          width: 104px;
          height: 92px;
        }

        .question-illustration-svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        .question-answer-card {
          margin-top: 27px;
          padding: 16px;
          border: 1px solid var(--tonari-border);
          border-radius: 24px;
          background: #fffaf6;
          box-shadow: var(--tonari-shadow-sm);
        }

        .question-answer-label {
          display: block;
          margin: 0 0 10px 3px;
          color: var(--tonari-brown-soft);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .question-textarea {
          min-height: 205px;
          overflow: hidden;
        }

        .question-input-footer {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-top: 10px;
        }

        .question-input-help {
          min-width: 0;
          margin: 0;
          color: #9b877e;
          font-size: 12px;
          line-height: 1.65;
        }

        .question-character-count {
          flex-shrink: 0;
          margin: 0;
          color: #9b877e;
          font-size: 12px;
          line-height: 1.65;
          white-space: nowrap;
        }

        .question-character-count-limit {
          color: var(--tonari-danger);
          font-weight: 700;
        }

        .question-message {
          margin-top: 16px;
        }

        .question-save-button,
        .question-home-button {
          margin-top: 18px;
        }

        .question-loading {
          display: grid;
          min-height: 430px;
          place-items: center;
          align-content: center;
          gap: 18px;
          text-align: center;
        }

        .question-loading-spinner,
        .question-button-spinner {
          border-radius: 50%;
          animation: question-spin 850ms linear infinite;
        }

        .question-loading-spinner {
          width: 34px;
          height: 34px;
          border: 3px solid var(--tonari-border);
          border-top-color: var(--tonari-sage-deep);
        }

        .question-button-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
        }

        .question-empty-card {
          margin-top: 28px;
          padding: 28px 22px;
          text-align: center;
        }

        .question-empty-illustration {
          width: 130px;
          height: 105px;
          margin: 0 auto;
        }

        .question-empty-title {
          margin: 8px 0 0;
          color: var(--tonari-text);
          font-family: "Zen Old Mincho", serif;
          font-size: 21px;
          font-weight: 600;
          line-height: 1.7;
        }

        .question-empty-copy {
          margin-top: 10px;
        }

        @keyframes question-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 560px) {
          .question-page-shell {
            min-height: 100vh;
          }

          .question-panel {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .question-content {
            padding: 20px 18px 28px;
          }

          .question-heading {
            grid-template-columns: minmax(0, 1fr) 90px;
            gap: 10px;
            margin-top: 25px;
          }

          .question-main-title {
            font-size: 28px;
            line-height: 1.55;
          }

          .question-illustration {
            width: 90px;
            height: 82px;
          }
        }

        @media (max-width: 370px) {
          .question-heading {
            grid-template-columns: 1fr;
          }

          .question-illustration {
            display: none;
          }

          .question-main-title {
            font-size: 26px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .question-loading-spinner,
          .question-button-spinner {
            animation: none;
          }
        }
      `}</style>
    </AppShell>
  );
}