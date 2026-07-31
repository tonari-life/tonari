"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import AppShell from "../../components/layout/AppShell";
import TopBar from "../../components/layout/TopBar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Couple = {
  id: string;
  owner_id: string;
  partner_id: string | null;
  invite_code: string;
};

type Profile = {
  id: string;
  display_name: string | null;
};

type QuestionRow = {
  id: number;
  question_text: string;
  question_date: string;
};

type AnswerRow = {
  question_id: number;
  user_id: string;
  answer_text: string;
};

type InsightRow = {
  question_id: number;
  insight_text: string;
};

type HistoryItem = {
  questionId: number;
  questionText: string;
  questionDate: string;
  myAnswer: string;
  partnerAnswer: string;
  insight: string;
};

type PageState = "loading" | "ready" | "empty" | "error";

function formatJapaneseDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

function formatMonthKey(value: string) {
  return value.slice(0, 7);
}

function formatMonthTitle(value: string) {
  const [year, month] = value.split("-");
  const monthNumber = Number(month);

  if (!year || Number.isNaN(monthNumber)) {
    return value;
  }

  return `${year}年${monthNumber}月`;
}

function LeafDecoration({
  position,
}: {
  position: "left" | "right";
}) {
  return (
    <div
      className={`history-leaf history-leaf-${position}`}
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function AnswerBlock({
  variant,
  name,
  answer,
}: {
  variant: "mine" | "partner";
  name: string;
  answer: string;
}) {
  return (
    <div
      className={`history-answer-block ${
        variant === "mine"
          ? "history-answer-mine"
          : "history-answer-partner"
      }`}
    >
      <div className="history-answer-heading">
        <span
          className="history-answer-dot"
          aria-hidden="true"
        />

        <div>
          <p className="history-answer-name">{name}</p>
          <p className="history-answer-caption">この日のこたえ</p>
        </div>
      </div>

      <p className="history-answer-text">
        {answer || "まだ回答がありません"}
      </p>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();

  const [state, setState] = useState<PageState>("loading");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [myName, setMyName] = useState("あなた");
  const [partnerName, setPartnerName] = useState("パートナー");
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(null);

  const groupedHistory = useMemo(() => {
    const groups = new Map<string, HistoryItem[]>();

    history.forEach((item) => {
      const key = formatMonthKey(item.questionDate);
      const current = groups.get(key) ?? [];
      current.push(item);
      groups.set(key, current);
    });

    return [...groups.entries()];
  }, [history]);

  const completedCount = useMemo(
    () =>
      history.filter(
        (item) =>
          item.myAnswer.trim() &&
          item.partnerAnswer.trim()
      ).length,
    [history]
  );

  const loadHistory = useCallback(async () => {
    try {
      setState("loading");
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/");
        return;
      }

      const { data: coupleRows, error: coupleError } =
        await supabase
          .from("couples")
          .select("id, owner_id, partner_id, invite_code")
          .or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`)
          .limit(1);

      if (coupleError) {
        setState("error");
        setMessage(
          `ペア情報を取得できませんでした：${coupleError.message}`
        );
        return;
      }

      const couple = (coupleRows?.[0] ?? null) as Couple | null;

      if (!couple) {
        setHistory([]);
        setState("empty");
        setMessage(
          "まだパートナーとの履歴がありません。"
        );
        return;
      }

      const isOwner = couple.owner_id === user.id;
      const otherUserId = isOwner
        ? couple.partner_id
        : couple.owner_id;

      const profileIds = [
        user.id,
        ...(otherUserId ? [otherUserId] : []),
      ];

      const { data: profileRows, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", profileIds);

      if (profileError) {
        setState("error");
        setMessage(
          `名前を取得できませんでした：${profileError.message}`
        );
        return;
      }

      const profiles = (profileRows ?? []) as Profile[];
      const myProfile = profiles.find(
        (profile) => profile.id === user.id
      );
      const partnerProfile = otherUserId
        ? profiles.find(
            (profile) => profile.id === otherUserId
          )
        : null;

      setMyName(
        myProfile?.display_name?.trim() || "あなた"
      );
      setPartnerName(
        partnerProfile?.display_name?.trim() || "パートナー"
      );

      const answerUserIds = [
        couple.owner_id,
        ...(couple.partner_id ? [couple.partner_id] : []),
      ];

      const { data: answerRows, error: answerError } =
        await supabase
          .from("answers")
          .select("question_id, user_id, answer_text")
          .in("user_id", answerUserIds);

      if (answerError) {
        setState("error");
        setMessage(
          `回答履歴を取得できませんでした：${answerError.message}`
        );
        return;
      }

      const answers = (answerRows ?? []) as AnswerRow[];

      if (answers.length === 0) {
        setHistory([]);
        setState("empty");
        setMessage(
          "二人の回答がたまると、ここに思い出が並びます。"
        );
        return;
      }

      const questionIds = [
        ...new Set(answers.map((answer) => answer.question_id)),
      ];

      const [
        { data: questionRows, error: questionError },
        { data: insightRows, error: insightError },
      ] = await Promise.all([
        supabase
          .from("daily_questions")
          .select("id, question_text, question_date")
          .in("id", questionIds)
          .order("question_date", { ascending: false }),
        supabase
          .from("daily_insights")
          .select("question_id, insight_text")
          .eq("couple_id", couple.id)
          .in("question_id", questionIds),
      ]);

      if (questionError) {
        setState("error");
        setMessage(
          `質問履歴を取得できませんでした：${questionError.message}`
        );
        return;
      }

      if (insightError) {
        console.warn(
          "AIコメント履歴の取得エラー:",
          insightError
        );
      }

      const questions = (questionRows ?? []) as QuestionRow[];
      const insights = (insightRows ?? []) as InsightRow[];

      const myAnswers = new Map<number, string>();
      const partnerAnswers = new Map<number, string>();
      const insightMap = new Map<number, string>();

      answers.forEach((answer) => {
        if (answer.user_id === user.id) {
          myAnswers.set(
            answer.question_id,
            answer.answer_text ?? ""
          );
        } else if (
          otherUserId &&
          answer.user_id === otherUserId
        ) {
          partnerAnswers.set(
            answer.question_id,
            answer.answer_text ?? ""
          );
        }
      });

      insights.forEach((item) => {
        insightMap.set(
          item.question_id,
          item.insight_text ?? ""
        );
      });

      const items: HistoryItem[] = questions.map((question) => ({
        questionId: question.id,
        questionText: question.question_text,
        questionDate: question.question_date,
        myAnswer: myAnswers.get(question.id) ?? "",
        partnerAnswer:
          partnerAnswers.get(question.id) ?? "",
        insight: insightMap.get(question.id) ?? "",
      }));

      setHistory(items);
      setOpenQuestionId(items[0]?.questionId ?? null);
      setState(items.length > 0 ? "ready" : "empty");
    } catch (error) {
      console.error("履歴画面エラー:", error);

      setState("error");
      setMessage(
        error instanceof Error
          ? `履歴の読み込み中にエラーが発生しました：${error.message}`
          : "履歴の読み込み中にエラーが発生しました。"
      );
    }
  }, [router]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <AppShell
      maxWidth={720}
      fullHeight
      className="history-page-shell"
      panelClassName="history-panel"
    >
      <div className="history-content">
        <TopBar
          left={
            <button
              type="button"
              className="tonari-icon-button history-back-button"
              onClick={() => router.push("/home")}
              aria-label="ホームに戻る"
            >
              <span aria-hidden="true">←</span>
            </button>
          }
        />

        <header className="history-hero">
          <LeafDecoration position="left" />
          <LeafDecoration position="right" />

          <div className="history-hero-inner">
            <p className="history-kicker">
              OUR MEMORIES
            </p>

            <p className="tonari-eyebrow history-eyebrow">
              二人の履歴
            </p>

            <h1 className="history-title">
              これまでの
              <br />
              「となり」
            </h1>

            <p className="history-copy">
              あの日の質問と、二人の言葉。
              <br />
              少しずつ積み重なった時間です。
            </p>
          </div>
        </header>

        {state === "loading" && (
          <section className="history-loading">
            <span
              className="history-spinner"
              aria-hidden="true"
            />

            <p className="tonari-copy">
              二人の思い出を読み込んでいます…
            </p>
          </section>
        )}

        {state === "error" && (
          <>
            <div
              className="tonari-alert tonari-alert-error history-error"
              role="alert"
            >
              {message}
            </div>

            <button
              type="button"
              className="tonari-button tonari-button-soft history-retry-button"
              onClick={() => void loadHistory()}
            >
              もう一度読み込む
            </button>
          </>
        )}

        {state === "empty" && (
          <section className="history-empty-card">
            <div
              className="history-empty-icon"
              aria-hidden="true"
            >
              ✦
            </div>

            <p className="history-empty-kicker">
              YOUR STORY STARTS HERE
            </p>

            <h2 className="history-empty-title">
              これから二人の言葉が、
              <br />
              ここに並んでいきます。
            </h2>

            <p className="history-empty-copy">
              {message ||
                "今日の質問に答えると、最初の思い出が保存されます。"}
            </p>

            <button
              type="button"
              className="tonari-button tonari-button-brown history-empty-button"
              onClick={() => router.push("/home")}
            >
              ホームに戻る
            </button>
          </section>
        )}

        {state === "ready" && (
          <>
            <section className="history-summary">
              <div className="history-summary-item">
                <p className="history-summary-number">
                  {history.length}
                </p>
                <p className="history-summary-label">
                  答えた質問
                </p>
              </div>

              <span
                className="history-summary-divider"
                aria-hidden="true"
              />

              <div className="history-summary-item">
                <p className="history-summary-number">
                  {completedCount}
                </p>
                <p className="history-summary-label">
                  二人で答えた日
                </p>
              </div>
            </section>

            <div className="history-groups">
              {groupedHistory.map(([monthKey, items]) => (
                <section
                  key={monthKey}
                  className="history-month-group"
                >
                  <div className="history-month-heading">
                    <span
                      className="history-month-line"
                      aria-hidden="true"
                    />

                    <h2>{formatMonthTitle(monthKey)}</h2>

                    <span
                      className="history-month-line"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="history-list">
                    {items.map((item) => {
                      const isOpen =
                        openQuestionId === item.questionId;

                      return (
                        <article
                          key={item.questionId}
                          className={`history-card ${
                            isOpen ? "history-card-open" : ""
                          }`}
                        >
                          <button
                            type="button"
                            className="history-card-toggle"
                            onClick={() =>
                              setOpenQuestionId(
                                isOpen
                                  ? null
                                  : item.questionId
                              )
                            }
                            aria-expanded={isOpen}
                          >
                            <div>
                              <p className="history-card-date">
                                {formatJapaneseDate(
                                  item.questionDate
                                )}
                              </p>

                              <h3 className="history-card-question">
                                {item.questionText}
                              </h3>
                            </div>

                            <span
                              className="history-card-chevron"
                              aria-hidden="true"
                            >
                              {isOpen ? "−" : "＋"}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="history-card-body">
                              <div className="history-answer-grid">
                                <AnswerBlock
                                  variant="mine"
                                  name={myName}
                                  answer={item.myAnswer}
                                />

                                <AnswerBlock
                                  variant="partner"
                                  name={partnerName}
                                  answer={item.partnerAnswer}
                                />
                              </div>

                              <section className="history-insight">
                                <div className="history-insight-heading">
                                  <span
                                    className="history-insight-mark"
                                    aria-hidden="true"
                                  >
                                    ✦
                                  </span>

                                  <div>
                                    <p className="history-insight-eyebrow">
                                      この日のとなりAI
                                    </p>

                                    <h4>
                                      二人の答えから見えたこと
                                    </h4>
                                  </div>
                                </div>

                                <p className="history-insight-text">
                                  {item.insight ||
                                    "この日のAIコメントはまだ保存されていません。"}
                                </p>
                              </section>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <section className="history-ending-card">
              <div
                className="history-ending-dots"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </div>

              <p className="history-ending-eyebrow">
                OUR TONARI
              </p>

              <h2>
                一つひとつの答えが、
                <br />
                二人だけの物語になります。
              </h2>

              <p>
                また今日も、少しだけ
                <br />
                お互いを知っていきましょう。
              </p>
            </section>

            <button
              type="button"
              className="tonari-button tonari-button-soft history-home-button"
              onClick={() => router.push("/home")}
            >
              ホームに戻る
            </button>
          </>
        )}
      </div>

      <style jsx global>{`
        .history-page-shell {
          position: relative;
          max-width: 720px;
        }

        .history-page-shell::before {
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

        .history-panel {
          position: relative;
          overflow: hidden;
          min-height: calc(100vh - 84px);
          border: 1px solid rgba(218, 194, 180, 0.68);
          border-radius: 34px;
          background:
            linear-gradient(
              180deg,
              rgba(255, 252, 249, 0.97),
              rgba(251, 247, 243, 0.97)
            );
          box-shadow:
            0 28px 80px rgba(98, 71, 55, 0.11);
        }

        .history-panel::before {
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

        .history-content {
          position: relative;
          z-index: 1;
          padding: 26px 28px 30px;
        }

        .history-back-button {
          border: 1px solid rgba(217, 192, 178, 0.72);
          background: rgba(255, 250, 247, 0.88);
          color: #785848;
          font-size: 20px;
          line-height: 1;
          box-shadow:
            0 8px 20px rgba(105, 76, 59, 0.09);
          backdrop-filter: blur(8px);
        }

        .history-hero {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          margin-top: 24px;
          padding: 35px 28px 32px;
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
          text-align: center;
          box-shadow:
            0 20px 48px rgba(100, 73, 57, 0.11);
        }

        .history-hero::after {
          content: "";
          position: absolute;
          right: -54px;
          bottom: -82px;
          width: 190px;
          height: 190px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(199, 216, 191, 0.5),
              rgba(199, 216, 191, 0)
            );
          pointer-events: none;
        }

        .history-hero-inner {
          position: relative;
          z-index: 2;
        }

        .history-kicker {
          margin: 0;
          color: #b88774;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.24em;
        }

        .history-eyebrow {
          margin-top: 10px;
          color: #8da083;
        }

        .history-title {
          margin: 14px 0 0;
          color: #593f31;
          font-family: "Zen Old Mincho", serif;
          font-size: clamp(31px, 7vw, 40px);
          font-weight: 600;
          line-height: 1.55;
          letter-spacing: 0.02em;
        }

        .history-copy {
          margin: 15px 0 0;
          color: #8b7163;
          font-size: 14px;
          line-height: 1.9;
        }

        .history-leaf {
          position: absolute;
          z-index: 1;
          width: 90px;
          height: 130px;
          opacity: 0.68;
          pointer-events: none;
        }

        .history-leaf::before {
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

        .history-leaf span {
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

        .history-leaf span:nth-child(1) {
          left: 17px;
          top: 21px;
          transform: rotate(-34deg);
        }

        .history-leaf span:nth-child(2) {
          right: 6px;
          top: 47px;
          transform: rotate(34deg) scaleX(-1);
        }

        .history-leaf span:nth-child(3) {
          left: 12px;
          top: 74px;
          transform: rotate(-31deg);
        }

        .history-leaf span:nth-child(4) {
          right: 0;
          top: 96px;
          transform: rotate(30deg) scaleX(-1);
        }

        .history-leaf-left {
          left: -7px;
          bottom: -24px;
          transform: rotate(-20deg);
        }

        .history-leaf-right {
          top: -17px;
          right: -8px;
          transform: rotate(157deg) scale(0.9);
          opacity: 0.56;
        }

        .history-loading {
          display: grid;
          min-height: 320px;
          margin-top: 24px;
          place-items: center;
          align-content: center;
          gap: 18px;
          border: 1px solid rgba(219, 200, 188, 0.62);
          border-radius: 26px;
          background: rgba(255, 251, 248, 0.72);
          text-align: center;
        }

        .history-spinner {
          width: 38px;
          height: 38px;
          border: 4px solid rgba(205, 219, 198, 0.7);
          border-top-color: #738a6b;
          border-radius: 50%;
          animation: history-spin 850ms linear infinite;
        }

        .history-error {
          margin-top: 24px;
        }

        .history-retry-button {
          margin-top: 18px;
        }

        .history-empty-card {
          position: relative;
          overflow: hidden;
          margin-top: 25px;
          padding: 36px 25px 31px;
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

        .history-empty-icon {
          display: grid;
          width: 58px;
          height: 58px;
          margin: 0 auto;
          place-items: center;
          border: 1px solid rgba(152, 181, 141, 0.44);
          border-radius: 50%;
          background:
            linear-gradient(
              145deg,
              #e5efdf,
              #d2e4cb
            );
          color: #607957;
          font-size: 23px;
          box-shadow:
            0 12px 26px rgba(86, 113, 79, 0.14);
        }

        .history-empty-kicker {
          margin: 17px 0 0;
          color: #aa806d;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.19em;
        }

        .history-empty-title {
          margin: 12px 0 0;
          color: #563f34;
          font-family: "Zen Old Mincho", serif;
          font-size: 23px;
          font-weight: 600;
          line-height: 1.78;
        }

        .history-empty-copy {
          margin: 13px 0 0;
          color: #887267;
          font-size: 13px;
          line-height: 1.9;
        }

        .history-empty-button {
          margin-top: 23px;
        }

        .history-summary {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          margin-top: 23px;
          padding: 21px 18px;
          border: 1px solid rgba(226, 198, 182, 0.78);
          border-radius: 25px;
          background:
            linear-gradient(
              145deg,
              #fff9f5,
              #f6eee8
            );
          box-shadow:
            0 13px 32px rgba(92, 67, 53, 0.08);
        }

        .history-summary-item {
          text-align: center;
        }

        .history-summary-number {
          margin: 0;
          color: #654737;
          font-family: "Zen Old Mincho", serif;
          font-size: 30px;
          font-weight: 600;
          line-height: 1;
        }

        .history-summary-label {
          margin: 8px 0 0;
          color: #967c6f;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .history-summary-divider {
          width: 1px;
          height: 42px;
          background: rgba(195, 163, 146, 0.36);
        }

        .history-groups {
          margin-top: 30px;
        }

        .history-month-group + .history-month-group {
          margin-top: 34px;
        }

        .history-month-heading {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 15px;
        }

        .history-month-heading h2 {
          flex-shrink: 0;
          margin: 0;
          color: #886c5e;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.09em;
        }

        .history-month-line {
          width: 100%;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(190, 160, 144, 0.4),
              transparent
            );
        }

        .history-list {
          display: grid;
          gap: 15px;
        }

        .history-card {
          overflow: hidden;
          border: 1px solid rgba(221, 199, 186, 0.82);
          border-radius: 26px;
          background: rgba(255, 251, 248, 0.9);
          box-shadow:
            0 13px 34px rgba(92, 67, 53, 0.08);
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease;
        }

        .history-card-open {
          border-color: rgba(211, 178, 159, 0.92);
          box-shadow:
            0 18px 42px rgba(91, 66, 52, 0.11);
        }

        .history-card-toggle {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 21px;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .history-card-date {
          margin: 0;
          color: #9b7e70;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .history-card-question {
          margin: 8px 0 0;
          color: #563f34;
          font-family: "Zen Old Mincho", serif;
          font-size: 19px;
          font-weight: 600;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .history-card-chevron {
          display: grid;
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          place-items: center;
          border: 1px solid rgba(213, 184, 167, 0.7);
          border-radius: 50%;
          background: #fff8f4;
          color: #835e4c;
          font-size: 18px;
        }

        .history-card-body {
          padding: 0 20px 22px;
          animation: history-body-in 240ms ease both;
        }

        .history-answer-grid {
          display: grid;
          gap: 13px;
        }

        .history-answer-block {
          position: relative;
          overflow: hidden;
          padding: 18px;
          border-radius: 21px;
        }

        .history-answer-mine {
          border: 1px solid rgba(231, 199, 181, 0.86);
          background:
            linear-gradient(
              145deg,
              #fff9f5,
              #f9eee7
            );
        }

        .history-answer-partner {
          border: 1px solid rgba(198, 216, 191, 0.94);
          background:
            linear-gradient(
              145deg,
              #f8fbf6,
              #edf4ea
            );
        }

        .history-answer-heading {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .history-answer-dot {
          width: 11px;
          height: 11px;
          flex: 0 0 11px;
          border-radius: 50%;
        }

        .history-answer-mine .history-answer-dot {
          background: #daa88f;
          box-shadow:
            0 0 0 5px rgba(218, 168, 143, 0.14);
        }

        .history-answer-partner .history-answer-dot {
          background: #9fb495;
          box-shadow:
            0 0 0 5px rgba(159, 180, 149, 0.14);
        }

        .history-answer-name {
          margin: 0;
          color: #755343;
          font-size: 13px;
          font-weight: 800;
        }

        .history-answer-caption {
          margin: 3px 0 0;
          color: #9c867a;
          font-size: 10px;
          letter-spacing: 0.04em;
        }

        .history-answer-text {
          margin: 14px 0 0;
          padding: 14px 15px;
          border: 1px solid rgba(255, 255, 255, 0.76);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.58);
          color: #513e34;
          font-size: 15px;
          line-height: 1.95;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .history-insight {
          position: relative;
          overflow: hidden;
          margin-top: 14px;
          padding: 20px 19px;
          border: 1px solid rgba(194, 214, 185, 0.96);
          border-radius: 23px;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(255, 255, 255, 0.85),
              transparent 38%
            ),
            linear-gradient(
              145deg,
              #f8fbf6,
              #eaf3e7
            );
        }

        .history-insight-heading {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .history-insight-mark {
          display: grid;
          width: 43px;
          height: 43px;
          flex: 0 0 43px;
          place-items: center;
          border: 1px solid rgba(152, 181, 141, 0.44);
          border-radius: 50%;
          background:
            linear-gradient(
              145deg,
              #e5efdf,
              #d2e4cb
            );
          color: #607957;
          font-size: 18px;
        }

        .history-insight-eyebrow {
          margin: 0;
          color: #809775;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .history-insight h4 {
          margin: 4px 0 0;
          color: #4f4037;
          font-family: "Zen Old Mincho", serif;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.55;
        }

        .history-insight-text {
          margin: 15px 0 0;
          padding: 15px 16px;
          border: 1px solid rgba(255, 255, 255, 0.78);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.58);
          color: #4e443d;
          font-size: 13px;
          line-height: 2;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .history-ending-card {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          margin-top: 27px;
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
          color: #ffffff;
          text-align: center;
          box-shadow:
            0 20px 46px rgba(73, 48, 37, 0.22);
        }

        .history-ending-card::before,
        .history-ending-card::after {
          content: "";
          position: absolute;
          z-index: -1;
          border-radius: 50%;
        }

        .history-ending-card::before {
          top: -95px;
          right: -78px;
          width: 210px;
          height: 210px;
          background: rgba(230, 193, 172, 0.12);
        }

        .history-ending-card::after {
          bottom: -100px;
          left: -70px;
          width: 210px;
          height: 210px;
          background: rgba(171, 197, 160, 0.11);
        }

        .history-ending-dots {
          display: flex;
          justify-content: center;
          gap: 7px;
          margin-bottom: 12px;
        }

        .history-ending-dots span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #dfc6b7;
        }

        .history-ending-dots span:nth-child(2) {
          width: 7px;
          height: 7px;
          transform: translateY(-1px);
          background: #cbd8c5;
        }

        .history-ending-eyebrow {
          margin: 0;
          color: #dfc9bc;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.15em;
        }

        .history-ending-card h2 {
          margin: 12px 0 0;
          font-family: "Zen Old Mincho", serif;
          font-size: 22px;
          font-weight: 600;
          line-height: 1.86;
        }

        .history-ending-card p:last-child {
          margin: 13px 0 0;
          color: #eadfd8;
          font-size: 13px;
          line-height: 1.9;
        }

        .history-home-button {
          margin-top: 19px;
          border: 1px solid rgba(217, 193, 179, 0.85);
          background: #fff8f4;
          color: #6f4b3a;
          box-shadow:
            0 10px 24px rgba(89, 64, 50, 0.09);
        }

        @keyframes history-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes history-body-in {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 560px) {
          .history-page-shell {
            min-height: 100vh;
          }

          .history-panel {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .history-content {
            padding: 20px 18px 28px;
          }

          .history-hero {
            margin-top: 20px;
            padding: 30px 20px 27px;
            border-radius: 26px;
          }

          .history-leaf-left {
            left: -20px;
            bottom: -35px;
            transform: rotate(-20deg) scale(0.82);
          }

          .history-leaf-right {
            top: -32px;
            right: -22px;
            transform: rotate(157deg) scale(0.74);
          }

          .history-title {
            font-size: 31px;
          }

          .history-card-toggle {
            padding: 20px 18px;
          }

          .history-card-body {
            padding: 0 16px 18px;
          }

          .history-card-question {
            font-size: 18px;
          }
        }

        @media (max-width: 370px) {
          .history-summary {
            padding-inline: 12px;
          }

          .history-summary-number {
            font-size: 27px;
          }

          .history-card-toggle {
            gap: 12px;
          }

          .history-card-chevron {
            width: 34px;
            height: 34px;
            flex-basis: 34px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .history-spinner,
          .history-card-body {
            animation: none;
          }

          .history-card {
            transition: none;
          }
        }
      `}</style>
    </AppShell>
  );
}