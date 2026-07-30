"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function StartPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const checkCurrentUser = async () => {
      try {
        setChecking(true);
        setMessage("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            `ログイン情報を確認できませんでした：${sessionError.message}`
          );
        }

        if (!session?.user) {
          if (active) {
            setChecking(false);
          }

          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          throw new Error(
            `プロフィールを確認できませんでした：${profileError.message}`
          );
        }

        if (!active) {
          return;
        }

        if (profile?.display_name?.trim()) {
          router.replace("/home");
          return;
        }

        setChecking(false);
      } catch (error) {
        console.error("開始画面の確認エラー:", error);

        if (!active) {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "開始画面の読み込み中にエラーが発生しました。"
        );

        setChecking(false);
      }
    };

    checkCurrentUser();

    return () => {
      active = false;
    };
  }, [router]);

  const startTonari = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setMessage("お名前を入力してください。");
      return;
    }

    if (trimmedDisplayName.length > 30) {
      setMessage("お名前は30文字以内で入力してください。");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      let {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          `ログイン情報を確認できませんでした：${sessionError.message}`
        );
      }

      if (!session?.user) {
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error || !data.user) {
          throw new Error(
            `利用開始の準備に失敗しました：${
              error?.message ?? "ユーザーを作成できませんでした"
            }`
          );
        }

        session = data.session;
      }

      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("ログイン情報を取得できませんでした。");
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            display_name: trimmedDisplayName,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        throw new Error(
          `お名前を保存できませんでした：${profileError.message}`
        );
      }

      router.push("/intro");
    } catch (error) {
      console.error("利用開始エラー:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "利用開始の処理中にエラーが発生しました。"
      );

      setSaving(false);
    }
  };

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #fffaf7 0%, #f5ebe4 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          color: "#433832",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              letterSpacing: "0.12em",
              color: "#a07f70",
            }}
          >
            となり
          </p>

          <p
            style={{
              margin: "18px 0 0",
              fontSize: "17px",
              color: "#746159",
            }}
          >
            今日の準備をしています…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #fffaf7 0%, #f5ebe4 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        color: "#433832",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "520px",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: "30px",
            padding: "42px 28px",
            boxShadow: "0 18px 50px rgba(88, 64, 52, 0.1)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              letterSpacing: "0.12em",
              color: "#a07f70",
            }}
          >
            となり
          </p>

          <h1
            style={{
              margin: "22px 0 0",
              fontSize: "34px",
              lineHeight: 1.5,
              fontWeight: 700,
              color: "#3f3530",
            }}
          >
            今日も、
            <br />
            少しだけ話そう。
          </h1>

          <p
            style={{
              margin: "20px 0 0",
              fontSize: "16px",
              lineHeight: 1.9,
              color: "#806c62",
            }}
          >
            一日ひとつの質問から、
            <br />
            二人の会話を始めます。
          </p>

          <form onSubmit={startTonari}>
            <label
              htmlFor="displayName"
              style={{
                display: "block",
                marginTop: "34px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: 700,
                color: "#765f54",
              }}
            >
              お名前
            </label>

            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例：だいすけ"
              maxLength={30}
              disabled={saving}
              autoComplete="nickname"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: "10px",
                border: "1px solid #dfcec5",
                borderRadius: "17px",
                padding: "17px 18px",
                backgroundColor: "#fffdfc",
                color: "#433832",
                fontSize: "17px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                marginTop: "20px",
                border: "none",
                borderRadius: "17px",
                padding: "18px 20px",
                backgroundColor: saving ? "#9e918b" : "#403630",
                color: "#ffffff",
                fontSize: "18px",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 10px 25px rgba(64, 54, 48, 0.18)",
              }}
            >
              {saving ? "準備しています…" : "となりを始める"}
            </button>
          </form>

          {message && (
            <div
              style={{
                marginTop: "18px",
                padding: "15px",
                borderRadius: "15px",
                backgroundColor: "#fff0ee",
                color: "#a94b43",
                fontSize: "14px",
                lineHeight: 1.7,
              }}
            >
              {message}
            </div>
          )}

          <p
            style={{
              margin: "26px 0 0",
              fontSize: "13px",
              lineHeight: 1.8,
              color: "#9b877e",
            }}
          >
            お名前は、パートナーとの画面で使います。
          </p>
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