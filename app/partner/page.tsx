"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
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

export default function PartnerPage() {
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [answer, setAnswer] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const preparePartnerPage = async () => {
      try {
        setLoading(true);
        setMessage("");

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code")?.trim() ?? "";

        if (!code) {
          setMessage(
            "招待コードが見つかりません。送られてきた招待リンクをもう一度開いてください。"
          );
          setLoading(false);
          return;
        }

        setInviteCode(code);

        let {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          setMessage(
            `ログイン情報の確認に失敗しました：${sessionError.message}`
          );
          setLoading(false);
          return;
        }

        if (!session?.user) {
          const { data, error } =
            await supabase.auth.signInAnonymously();

          if (error || !data.user) {
            setMessage(
              `参加の準備に失敗しました：${
                error?.message ?? "ユーザーを作成できませんでした"
              }`
            );
            setLoading(false);
            return;
          }

          session = data.session;
        }

        const userId = session?.user?.id;

        if (!userId) {
          setMessage("ログイン情報を取得できませんでした。");
          setLoading(false);
          return;
        }

        /*
         * ページを再読み込みした場合に、
         * すでにペア参加済みか確認します。
         */
        const { data: existingCouples, error: coupleCheckError } =
          await supabase
            .from("couples")
            .select("id, owner_id, partner_id, invite_code")
            .or(`owner_id.eq.${userId},partner_id.eq.${userId}`)
            .limit(1);

        if (coupleCheckError) {
          setMessage(
            `ペア情報の確認に失敗しました：${coupleCheckError.message}`
          );
          setLoading(false);
          return;
        }

        const existingCouple = existingCouples?.[0] as
          | Couple
          | undefined;

        if (existingCouple) {
          if (
            existingCouple.invite_code.toLowerCase() !==
            code.toLowerCase()
          ) {
            setMessage(
              "このアカウントは、すでに別のパートナーと登録されています。"
            );
            setLoading(false);
            return;
          }

          setJoined(true);
        } else {
          /*
           * 初めて招待リンクを開いた場合は、
           * 招待コードを使ってペアに参加します。
           */
          const { error: joinError } = await supabase.rpc(
            "join_couple_by_code",
            {
              p_invite_code: code,
            }
          );

          if (joinError) {
            setMessage(
              `招待への参加に失敗しました：${joinError.message}`
            );
            setLoading(false);
            return;
          }

          setJoined(true);
        }

        const today = getTodayJST();

        const { data: questionData, error: questionError } =
          await supabase
            .from("daily_questions")
            .select("id, question_text")
            .eq("question_date", today)
            .single();

        if (questionError) {
          setMessage(
            `今日の質問を取得できませんでした：${questionError.message}`
          );
          setLoading(false);
          return;
        }

        setQuestion(questionData);

        /*
         * すでに回答している場合は、
         * 入力欄に保存済みの回答を表示します。
         */
        const { data: existingAnswer, error: answerError } =
          await supabase
            .from("answers")
            .select("answer_text")
            .eq("user_id", userId)
            .eq("question_id", questionData.id)
            .maybeSingle();

        if (answerError) {
          console.error("回答確認エラー:", answerError);
        }

        if (existingAnswer?.answer_text) {
          setAnswer(existingAnswer.answer_text);
        }
      } catch (error) {
        console.error("パートナーページ準備エラー:", error);

        setMessage(
          "エラーが発生しました。招待リンクをもう一度開いてください。"
        );
      } finally {
        setLoading(false);
      }
    };

    preparePartnerPage();
  }, []);

  const saveAnswer = async () => {
    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
      setMessage("回答を入力してください。");
      return;
    }

    if (!question) {
      setMessage("今日の質問を取得できていません。");
      return;
    }

    if (!joined) {
      setMessage("パートナー登録が完了していません。");
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
        setMessage("ログイン情報を取得できませんでした。");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("answers").upsert(
        {
          user_id: user.id,
          question_id: question.id,
          answer_text: trimmedAnswer,
        },
        {
          onConflict: "user_id,question_id",
        }
      );

      if (error) {
        setMessage(`回答を保存できませんでした：${error.message}`);
        setSaving(false);
        return;
      }

      window.location.href = `/result?code=${encodeURIComponent(
        inviteCode
      )}`;
    } catch (error) {
      console.error("回答保存エラー:", error);
      setMessage("回答の保存中にエラーが発生しました。");
      setSaving(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #fffaf7 0%, #f5ebe4 100%)",
        padding: "40px 20px",
        color: "#433832",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.94)",
            borderRadius: "30px",
            padding: "38px 26px",
            boxShadow: "0 18px 50px rgba(88, 64, 52, 0.1)",
          }}
        >
          <p
            style={{
              margin: 0,
              textAlign: "center",
              fontSize: "14px",
              letterSpacing: "0.12em",
              color: "#a07f70",
            }}
          >
            となり
          </p>

          {loading ? (
            <div
              style={{
                padding: "70px 10px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "17px",
                  color: "#746159",
                }}
              >
                招待の内容を確認しています…
              </p>
            </div>
          ) : message && !question ? (
            <div
              style={{
                marginTop: "30px",
                padding: "20px",
                borderRadius: "18px",
                backgroundColor: "#fff0ee",
                color: "#a94b43",
                fontSize: "15px",
                lineHeight: 1.8,
                textAlign: "center",
              }}
            >
              {message}
            </div>
          ) : (
            <>
              <div
                style={{
                  marginTop: "24px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    color: "#98796b",
                  }}
                >
                  パートナーから質問が届いています
                </p>

                <p
                  style={{
                    margin: "22px 0 0",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#9a8175",
                  }}
                >
                  今日の質問
                </p>

                <h1
                  style={{
                    margin: "12px 0 0",
                    fontSize: "32px",
                    lineHeight: 1.5,
                    fontWeight: 700,
                    color: "#3f3530",
                  }}
                >
                  {question?.question_text}
                </h1>
              </div>

              <textarea
                rows={6}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="思いついたことを、そのまま書いてください"
                disabled={saving}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: "34px",
                  border: "1px solid #dfcec5",
                  borderRadius: "20px",
                  padding: "18px",
                  backgroundColor: "#fffdfc",
                  color: "#433832",
                  fontSize: "17px",
                  lineHeight: 1.8,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />

              <button
                type="button"
                onClick={saveAnswer}
                disabled={saving}
                style={{
                  width: "100%",
                  marginTop: "22px",
                  border: "none",
                  borderRadius: "17px",
                  padding: "18px 20px",
                  backgroundColor: saving ? "#9e918b" : "#403630",
                  color: "#ffffff",
                  fontSize: "18px",
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow:
                    "0 10px 25px rgba(64, 54, 48, 0.18)",
                }}
              >
                {saving
                  ? "回答を保存しています…"
                  : "回答して、二人の答えを見る"}
              </button>

              {message && (
                <div
                  style={{
                    marginTop: "18px",
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "#fff0ee",
                    color: "#a94b43",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    textAlign: "center",
                  }}
                >
                  {message}
                </div>
              )}

              <p
                style={{
                  margin: "24px 0 0",
                  textAlign: "center",
                  fontSize: "13px",
                  lineHeight: 1.8,
                  color: "#9b877e",
                }}
              >
                回答するまで、
                <br />
                パートナーの答えは表示されません。
              </p>
            </>
          )}
        </div>

        <p
          style={{
            margin: "22px 0 0",
            textAlign: "center",
            fontSize: "13px",
            color: "#a28d83",
          }}
        >
          今日が、一番若い二人の日。
        </p>
      </section>
    </main>
  );
}