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
            <section className="question-heading question-brand-hero">
              <div
                className="question-brand-leaf question-brand-leaf-left"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
              </div>

              <div
                className="question-brand-leaf question-brand-leaf-right"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className="question-heading-copy">
                <p className="question-brand-kicker">
                  TODAY&apos;S QUESTION
                </p>

                <p className="tonari-eyebrow question-brand-eyebrow">
                  今日の質問
                </p>

                <h1 className="question-main-title">
                  {question.question_text}
                </h1>

                <p className="question-heading-subcopy">
                  正解はありません。
                  <br />
                  今の気持ちを、あなたの言葉で。
                </p>
              </div>

              <div className="question-illustration">
                <LeafIllustration />
              </div>
            </section>

            <section className="question-answer-card">
              <div className="question-answer-card-header">
                <div>
                  <p className="question-answer-eyebrow">
                    YOUR ANSWER
                  </p>

                  <label
                    htmlFor="tonari-answer"
                    className="question-answer-label"
                  >
                    あなたの答え
                  </label>
                </div>

                <div
                  className="question-answer-mark"
                  aria-hidden="true"
                >
                  <span>✎</span>
                </div>
              </div>

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

            <div className="question-reassurance">
              <span
                className="question-reassurance-dot"
                aria-hidden="true"
              />

              <p>
                回答はあとから二人で見返せます。
              </p>
            </div>

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
                <>
                  <span>この答えを届ける</span>
                  <span
                    className="question-save-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="tonari-card-soft question-empty-card">
              <div className="question-empty-illustration">
                <LeafIllustration />
              </div>

              <p className="question-empty-eyebrow">
                TODAY&apos;S QUESTION
              </p>

              <p className="question-empty-title">
                今日の質問は、まだ届いていません。
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


        /* -------------------------------------------------
           Brand redesign
        -------------------------------------------------- */

        .question-page-shell {
          position: relative;
          max-width: 430px;
        }

        .question-page-shell::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(
              circle at 16% 9%,
              rgba(239, 201, 184, 0.28),
              transparent 34%
            ),
            radial-gradient(
              circle at 87% 21%,
              rgba(188, 210, 179, 0.26),
              transparent 35%
            ),
            linear-gradient(
              180deg,
              #f8f0e9 0%,
              #f5ece5 58%,
              #f8f3ef 100%
            );
        }

        .question-panel {
          position: relative;
          overflow: hidden;
          min-height: calc(100vh - 84px);
          border: 1px solid rgba(219, 196, 182, 0.7);
          border-radius: 34px;
          background:
            linear-gradient(
              180deg,
              rgba(255, 252, 249, 0.97),
              rgba(251, 247, 243, 0.97)
            );
          box-shadow:
            0 28px 80px rgba(98, 70, 55, 0.11);
        }

        .question-panel::before {
          content: "";
          position: absolute;
          top: -125px;
          right: -115px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(222, 235, 216, 0.67),
              rgba(222, 235, 216, 0)
            );
          pointer-events: none;
        }

        .question-content {
          position: relative;
          z-index: 1;
          padding: 22px 22px 28px;
        }

        .question-close-button {
          border: 1px solid rgba(219, 194, 180, 0.75);
          background: rgba(255, 250, 247, 0.88);
          color: #795a49;
          box-shadow:
            0 8px 20px rgba(101, 74, 59, 0.09);
          backdrop-filter: blur(8px);
        }

        .question-brand-hero {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 102px;
          gap: 14px;
          align-items: end;
          margin-top: 24px;
          padding: 31px 24px 28px;
          border: 1px solid rgba(227, 200, 184, 0.84);
          border-radius: 30px;
          background:
            radial-gradient(
              circle at 48% -5%,
              rgba(255, 255, 255, 0.94),
              transparent 45%
            ),
            linear-gradient(
              145deg,
              #fff8f4 0%,
              #f8eee8 52%,
              #edf4ea 100%
            );
          box-shadow:
            0 20px 48px rgba(100, 73, 57, 0.11);
        }

        .question-brand-hero::before,
        .question-brand-hero::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .question-brand-hero::before {
          top: -72px;
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

        .question-brand-hero::after {
          right: -50px;
          bottom: -76px;
          width: 180px;
          height: 180px;
          background:
            radial-gradient(
              circle,
              rgba(198, 216, 190, 0.52),
              rgba(198, 216, 190, 0)
            );
        }

        .question-heading-copy {
          position: relative;
          z-index: 2;
          min-width: 0;
        }

        .question-brand-kicker {
          margin: 0;
          color: #b88774;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.24em;
        }

        .question-brand-eyebrow {
          margin-top: 10px;
          color: #899d80;
        }

        .question-main-title {
          margin: 16px 0 0;
          color: #583f32;
          font-family: "Zen Old Mincho", serif;
          font-size: clamp(28px, 6.2vw, 36px);
          font-weight: 600;
          line-height: 1.6;
          letter-spacing: 0.01em;
          text-wrap: balance;
          overflow-wrap: anywhere;
        }

        .question-heading-subcopy {
          margin: 15px 0 0;
          color: #8c7265;
          font-size: 13px;
          line-height: 1.9;
        }

        .question-illustration {
          position: relative;
          z-index: 2;
          width: 102px;
          height: 94px;
          margin-bottom: 4px;
          opacity: 0.95;
          filter: drop-shadow(
            0 10px 14px rgba(102, 80, 66, 0.08)
          );
        }

        .question-brand-leaf {
          position: absolute;
          z-index: 1;
          width: 90px;
          height: 130px;
          opacity: 0.66;
          pointer-events: none;
        }

        .question-brand-leaf::before {
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

        .question-brand-leaf span {
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

        .question-brand-leaf span:nth-child(1) {
          left: 17px;
          top: 21px;
          transform: rotate(-34deg);
        }

        .question-brand-leaf span:nth-child(2) {
          right: 6px;
          top: 47px;
          transform: rotate(34deg) scaleX(-1);
        }

        .question-brand-leaf span:nth-child(3) {
          left: 12px;
          top: 74px;
          transform: rotate(-31deg);
        }

        .question-brand-leaf span:nth-child(4) {
          right: 0;
          top: 96px;
          transform: rotate(30deg) scaleX(-1);
        }

        .question-brand-leaf-left {
          left: -16px;
          bottom: -35px;
          transform: rotate(-19deg) scale(0.84);
        }

        .question-brand-leaf-right {
          top: -29px;
          right: -18px;
          transform: rotate(158deg) scale(0.72);
          opacity: 0.5;
        }

        .question-answer-card {
          position: relative;
          overflow: hidden;
          margin-top: 22px;
          padding: 22px 20px 19px;
          border: 1px solid rgba(229, 200, 183, 0.84);
          border-radius: 28px;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(255, 255, 255, 0.9),
              transparent 38%
            ),
            linear-gradient(
              145deg,
              #fffaf7,
              #f8eee8
            );
          box-shadow:
            0 17px 40px rgba(92, 67, 53, 0.1);
        }

        .question-answer-card::after {
          content: "";
          position: absolute;
          right: -52px;
          bottom: -72px;
          width: 170px;
          height: 170px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(221, 189, 171, 0.25),
              rgba(221, 189, 171, 0)
            );
          pointer-events: none;
        }

        .question-answer-card-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 13px;
        }

        .question-answer-eyebrow {
          margin: 0;
          color: #b48a77;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.2em;
        }

        .question-answer-label {
          display: block;
          margin: 4px 0 0;
          color: #704f3f;
          font-family: "Zen Old Mincho", serif;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .question-answer-mark {
          display: grid;
          width: 43px;
          height: 43px;
          flex: 0 0 43px;
          place-items: center;
          border: 1px solid rgba(213, 180, 162, 0.62);
          border-radius: 50%;
          background:
            linear-gradient(
              145deg,
              #f7e4da,
              #eed2c4
            );
          color: #8d624f;
          font-size: 18px;
          box-shadow:
            0 9px 20px rgba(103, 75, 59, 0.09);
        }

        .question-textarea {
          position: relative;
          z-index: 1;
          min-height: 205px;
          overflow: hidden;
          border: 1px solid rgba(217, 193, 179, 0.78);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.72);
          color: #533e33;
          font-size: 16px;
          line-height: 1.95;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 8px 20px rgba(94, 68, 53, 0.05);
        }

        .question-textarea:focus {
          border-color: #bb8d75;
          box-shadow:
            0 0 0 4px rgba(190, 143, 117, 0.11),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          outline: none;
        }

        .question-textarea::placeholder {
          color: #b19b8f;
        }

        .question-input-footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-top: 11px;
          padding: 0 2px;
        }

        .question-input-help,
        .question-character-count {
          color: #9a8377;
        }

        .question-message {
          margin-top: 15px;
          border-radius: 18px;
        }

        .question-reassurance {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          color: #8d786d;
          font-size: 12px;
          line-height: 1.6;
          text-align: center;
        }

        .question-reassurance p {
          margin: 0;
        }

        .question-reassurance-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 7px;
          border-radius: 50%;
          background: #a9bd9f;
          box-shadow:
            0 0 0 4px rgba(169, 189, 159, 0.13);
        }

        .question-save-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 58px;
          margin-top: 14px;
          border: 1px solid rgba(105, 72, 54, 0.18);
          border-radius: 20px;
          background:
            linear-gradient(
              135deg,
              #76513f,
              #5d3e30
            );
          color: #fffaf7;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.04em;
          box-shadow:
            0 16px 30px rgba(79, 51, 38, 0.21);
        }

        .question-save-button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow:
            0 19px 34px rgba(79, 51, 38, 0.25);
        }

        .question-save-arrow {
          font-size: 18px;
          line-height: 1;
          transition: transform 180ms ease;
        }

        .question-save-button:not(:disabled):hover
        .question-save-arrow {
          transform: translateX(3px);
        }

        .question-loading {
          min-height: 430px;
          margin-top: 24px;
          border: 1px solid rgba(220, 201, 189, 0.64);
          border-radius: 27px;
          background: rgba(255, 251, 248, 0.7);
        }

        .question-loading-spinner {
          border-color: rgba(199, 216, 191, 0.65);
          border-top-color: #78906f;
        }

        .question-empty-card {
          position: relative;
          overflow: hidden;
          margin-top: 25px;
          padding: 31px 22px 29px;
          border: 1px solid rgba(218, 199, 187, 0.82);
          border-radius: 29px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255, 255, 255, 0.9),
              transparent 38%
            ),
            linear-gradient(
              145deg,
              #fffaf7,
              #f5eee9 58%,
              #edf4ea
            );
          box-shadow:
            0 18px 43px rgba(94, 69, 55, 0.1);
          text-align: center;
        }

        .question-empty-card::after {
          content: "";
          position: absolute;
          right: -52px;
          bottom: -69px;
          width: 170px;
          height: 170px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(187, 211, 177, 0.36),
              rgba(187, 211, 177, 0)
            );
        }

        .question-empty-illustration,
        .question-empty-eyebrow,
        .question-empty-title,
        .question-empty-copy {
          position: relative;
          z-index: 1;
        }

        .question-empty-eyebrow {
          margin: 7px 0 0;
          color: #a77e6a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
        }

        .question-empty-title {
          margin-top: 12px;
          color: #584034;
          font-size: 21px;
        }

        .question-home-button {
          margin-top: 18px;
          border: 1px solid rgba(214, 191, 177, 0.86);
          background: #fff8f4;
          color: #704e3d;
          box-shadow:
            0 10px 24px rgba(91, 65, 51, 0.08);
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
            grid-template-columns: minmax(0, 1fr) 84px;
            gap: 10px;
            margin-top: 20px;
          }

          .question-brand-hero {
            padding: 28px 19px 25px;
            border-radius: 26px;
          }

          .question-main-title {
            font-size: 28px;
            line-height: 1.58;
          }

          .question-heading-subcopy {
            font-size: 12px;
          }

          .question-illustration {
            width: 84px;
            height: 78px;
          }

          .question-answer-card {
            padding: 20px 17px 18px;
            border-radius: 25px;
          }

          .question-textarea {
            min-height: 190px;
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

          .question-brand-leaf-right {
            display: none;
          }

          .question-answer-card-header {
            align-items: flex-start;
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