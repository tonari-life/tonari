"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  status: "pending" | "active" | "disconnected";
};

type InviteResult = {
  couple_id: string;
  invite_code: string;
};

type JoinResult = {
  couple_id: string;
  owner_id: string;
  partner_id: string;
  invite_code: string;
  status: string;
};

type MessageTone = "success" | "error" | "info";

function normalizeInviteCode(value: string) {
  return value
    .replace(/\s/g, "")
    .toUpperCase()
    .slice(0, 8);
}

function LinkIllustration() {
  return (
    <svg
      viewBox="0 0 240 170"
      role="img"
      aria-label="二人がつながるイラスト"
      className="invite-illustration-svg"
    >
      <ellipse
        cx="120"
        cy="148"
        rx="89"
        ry="12"
        fill="#eadfd7"
      />

      <circle
        cx="76"
        cy="75"
        r="29"
        fill="#d9a38a"
      />

      <circle
        cx="164"
        cy="75"
        r="29"
        fill="#9cad94"
      />

      <path
        d="M49 136C49 108 60 94 76 94C92 94 103 108 103 136"
        fill="#a98775"
      />

      <path
        d="M137 136C137 108 148 94 164 94C180 94 191 108 191 136"
        fill="#c78369"
      />

      <circle
        cx="67"
        cy="72"
        r="3"
        fill="#49372e"
      />

      <circle
        cx="84"
        cy="72"
        r="3"
        fill="#49372e"
      />

      <path
        d="M68 83C73 87 79 87 84 83"
        fill="none"
        stroke="#49372e"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <circle
        cx="155"
        cy="72"
        r="3"
        fill="#49372e"
      />

      <circle
        cx="172"
        cy="72"
        r="3"
        fill="#49372e"
      />

      <path
        d="M156 83C161 87 167 87 172 83"
        fill="none"
        stroke="#49372e"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M102 89C110 79 115 76 120 76C125 76 130 79 138 89"
        fill="none"
        stroke="#c8957c"
        strokeWidth="7"
        strokeLinecap="round"
      />

      <path
        d="M120 38C112 27 94 33 94 47C94 59 106 67 120 78C134 67 146 59 146 47C146 33 128 27 120 38Z"
        fill="#dba088"
      />

      <path
        d="M36 60C43 49 49 45 60 42"
        fill="none"
        stroke="#9cad94"
        strokeWidth="6"
        strokeLinecap="round"
      />

      <path
        d="M180 42C191 45 197 49 204 60"
        fill="none"
        stroke="#d6a58d"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [creatingInvite, setCreatingInvite] =
    useState(false);
  const [joining, setJoining] = useState(false);
  const [copying, setCopying] = useState(false);

  const [currentUserId, setCurrentUserId] =
    useState("");
  const [couple, setCouple] =
    useState<Couple | null>(null);

  const [joinCode, setJoinCode] = useState("");

  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] =
    useState<MessageTone>("info");

  useEffect(() => {
    const codeFromUrl = searchParams.get("code");

    if (!codeFromUrl) {
      return;
    }

    setJoinCode(normalizeInviteCode(codeFromUrl));
    setMessageTone("info");
    setMessage(
      "招待コードを読み込みました。「このコードで参加する」を押してください。"
    );
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const loadInvitePage = async () => {
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

        const { data, error } = await supabase
          .from("couples")
          .select(
            "id, owner_id, partner_id, invite_code, status"
          )
          .or(
            `owner_id.eq.${user.id},partner_id.eq.${user.id}`
          )
          .in("status", ["pending", "active"])
          .maybeSingle();

        if (error) {
          throw new Error(
            `ペア情報を取得できませんでした：${error.message}`
          );
        }

        if (!active) {
          return;
        }

        setCurrentUserId(user.id);
        setCouple(data as Couple | null);
      } catch (error) {
        console.error(
          "招待画面読み込みエラー:",
          error
        );

        if (!active) {
          return;
        }

        setMessageTone("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "招待画面の読み込みに失敗しました。"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadInvitePage();

    return () => {
      active = false;
    };
  }, [router]);

  const createInvite = async () => {
    try {
      setCreatingInvite(true);
      setMessage("");

      const { data, error } = await supabase.rpc(
        "create_couple_invite"
      );

      if (error) {
        throw new Error(
          `招待コードを作成できませんでした：${error.message}`
        );
      }

      const result = (
        Array.isArray(data) ? data[0] : data
      ) as InviteResult | null;

      if (!result?.invite_code) {
        throw new Error(
          "招待コードを取得できませんでした。"
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      setCouple({
        id: result.couple_id,
        owner_id: user.id,
        partner_id: null,
        invite_code: result.invite_code,
        status: "pending",
      });

      setMessageTone("success");
      setMessage(
        "招待コードを作成しました。パートナーへ送ってください。"
      );
    } catch (error) {
      console.error(
        "招待コード作成エラー:",
        error
      );

      setMessageTone("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "招待コードの作成に失敗しました。"
      );
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyInviteCode = async () => {
    if (!couple?.invite_code) {
      return;
    }

    try {
      setCopying(true);

      await navigator.clipboard.writeText(
        couple.invite_code
      );

      setMessageTone("success");
      setMessage(
        "招待コードをコピーしました。"
      );
    } catch (error) {
      console.error(
        "招待コードコピーエラー:",
        error
      );

      setMessageTone("error");
      setMessage(
        "コピーできませんでした。招待コードを長押ししてコピーしてください。"
      );
    } finally {
      setCopying(false);
    }
  };

  const shareInviteCode = async () => {
    if (!couple?.invite_code) {
      return;
    }

    const inviteUrl =
      `${window.location.origin}/invite?code=` +
      encodeURIComponent(couple.invite_code);

    const shareText =
      `「となり」に招待します。\n\n` +
      `下のリンクをスマホで開いてください。\n` +
      `${inviteUrl}\n\n` +
      `招待コード：${couple.invite_code}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "となりへ招待",
          text: shareText,
          url: inviteUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(
        shareText
      );

      setMessageTone("success");
      setMessage(
        "招待リンクをコピーしました。LINEなどに貼り付けて送ってください。"
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "招待共有エラー:",
        error
      );

      setMessageTone("error");
      setMessage(
        "招待リンクを共有できませんでした。"
      );
    }
  };

  const joinCouple = async () => {
    const normalizedCode =
      normalizeInviteCode(joinCode);

    if (!normalizedCode) {
      setMessageTone("error");
      setMessage(
        "招待コードを入力してください。"
      );
      return;
    }

    if (normalizedCode.length !== 8) {
      setMessageTone("error");
      setMessage(
        "招待コードは8文字です。"
      );
      return;
    }

    try {
      setJoining(true);
      setMessage("");

      const { data, error } = await supabase.rpc(
        "join_couple_by_code",
        {
          code: normalizedCode,
        }
      );

      if (error) {
        throw new Error(
          error.message
            .replace(
              "Exception: ",
              ""
            )
            .replace(
              "P0001: ",
              ""
            )
        );
      }

      const result = (
        Array.isArray(data) ? data[0] : data
      ) as JoinResult | null;

      if (
        !result ||
        result.status !== "active"
      ) {
        throw new Error(
          "ペアを成立できませんでした。"
        );
      }

      setCouple({
        id: result.couple_id,
        owner_id: result.owner_id,
        partner_id: result.partner_id,
        invite_code: result.invite_code,
        status: "active",
      });

      setMessageTone("success");
      setMessage(
        "パートナーとのペアが成立しました。"
      );

      window.setTimeout(() => {
        router.replace("/home");
        router.refresh();
      }, 1000);
    } catch (error) {
      console.error(
        "ペア参加エラー:",
        error
      );

      setMessageTone("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "ペアへの参加に失敗しました。"
      );
    } finally {
      setJoining(false);
    }
  };

  const isOwner =
    couple?.owner_id === currentUserId;

  const isActiveCouple =
    couple?.status === "active" &&
    Boolean(couple.partner_id);

  return (
    <AppShell
      maxWidth={620}
      fullHeight
      className="invite-page-shell"
      panelClassName="invite-panel"
    >
      <div className="invite-content">
        <TopBar
          left={
            <button
              type="button"
              className="tonari-icon-button invite-back-button"
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

        {loading ? (
          <section className="invite-loading">
            <span
              className="invite-spinner"
              aria-hidden="true"
            />

            <p className="tonari-copy">
              ペア情報を確認しています…
            </p>
          </section>
        ) : (
          <>
            <header className="invite-heading">
              <div className="invite-illustration">
                <LinkIllustration />
              </div>

              <p className="tonari-eyebrow">
                ふたりで使う
              </p>

              <h1 className="invite-title">
                パートナーと
                <br />
                つながる
              </h1>

              <p className="tonari-copy invite-heading-copy">
                招待コードを使って、
                <br />
                二人のアカウントをつなぎます。
              </p>
            </header>

            {message && (
              <div
                className={`invite-message invite-message-${messageTone}`}
                role={
                  messageTone === "error"
                    ? "alert"
                    : "status"
                }
              >
                {message}
              </div>
            )}

            {isActiveCouple ? (
              <section className="invite-connected-card">
                <div className="invite-connected-icon">
                  <span aria-hidden="true">
                    ✓
                  </span>
                </div>

                <h2 className="invite-card-title">
                  ペアは成立しています
                </h2>

                <p className="invite-card-copy">
                  パートナーと「となり」を
                  <br />
                  一緒に利用できます。
                </p>

                <button
                  type="button"
                  className="tonari-button tonari-button-brown invite-home-button"
                  onClick={() =>
                    router.replace("/home")
                  }
                >
                  ホームへ戻る
                </button>
              </section>
            ) : couple &&
              couple.status === "pending" &&
              isOwner ? (
              <section className="invite-code-card">
                <p className="invite-card-eyebrow">
                  あなたの招待コード
                </p>

                <h2 className="invite-card-title">
                  パートナーに
                  <br />
                  このコードを送ってください
                </h2>

                <button
                  type="button"
                  className="invite-code-box"
                  onClick={copyInviteCode}
                  aria-label="招待コードをコピー"
                >
                  <span>
                    {couple.invite_code}
                  </span>

                  <small>
                    {copying
                      ? "コピー中…"
                      : "押してコピー"}
                  </small>
                </button>

                <button
                  type="button"
                  className="tonari-button tonari-button-brown invite-share-button"
                  onClick={shareInviteCode}
                >
                  招待リンクを送る
                </button>

                <div className="invite-waiting">
                  <span
                    className="invite-waiting-dot"
                    aria-hidden="true"
                  />

                  パートナーの参加を待っています
                </div>
              </section>
            ) : (
              <>
                <section className="invite-action-card">
                  <div className="invite-step-number">
                    1
                  </div>

                  <h2 className="invite-card-title">
                    パートナーを招待する
                  </h2>

                  <p className="invite-card-copy">
                    あなた専用の招待コードを発行します。
                  </p>

                  <button
                    type="button"
                    className="tonari-button tonari-button-brown invite-action-button"
                    onClick={createInvite}
                    disabled={creatingInvite}
                  >
                    {creatingInvite
                      ? "招待コードを作成しています…"
                      : "招待コードを作る"}
                  </button>
                </section>

                <div className="invite-divider">
                  <span>または</span>
                </div>

                <section className="invite-action-card">
                  <div className="invite-step-number invite-step-number-green">
                    2
                  </div>

                  <h2 className="invite-card-title">
                    招待コードで参加する
                  </h2>

                  <p className="invite-card-copy">
                    パートナーから届いた8文字のコードを入力します。
                  </p>

                  <label
                    className="invite-label"
                    htmlFor="joinCode"
                  >
                    招待コード
                  </label>

                  <input
                    id="joinCode"
                    className="invite-code-input"
                    type="text"
                    value={joinCode}
                    maxLength={8}
                    placeholder="例：A1B2C3D4"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => {
                      setJoinCode(
                        normalizeInviteCode(
                          event.target.value
                        )
                      );
                      setMessage("");
                    }}
                    disabled={joining}
                  />

                  <p className="invite-input-count">
                    {joinCode.length}/8文字
                  </p>

                  <button
                    type="button"
                    className="tonari-button tonari-button-soft invite-action-button"
                    onClick={joinCouple}
                    disabled={
                      joining ||
                      joinCode.length !== 8
                    }
                  >
                    {joining
                      ? "ペアをつないでいます…"
                      : "このコードで参加する"}
                  </button>
                </section>
              </>
            )}

            <footer className="invite-footer">
              <p>となり</p>
              <span>
                ふたりを知る、毎日の質問
              </span>
            </footer>
          </>
        )}
      </div>

      <style jsx global>{`
        .invite-page-shell {
          max-width: 620px;
        }

        .invite-panel {
          min-height: calc(100vh - 84px);
          border-radius: 34px;
        }

        .invite-content {
          padding: 24px 26px 34px;
        }

        .invite-back-button {
          font-size: 20px;
          line-height: 1;
        }

        .invite-loading {
          display: grid;
          min-height: 620px;
          place-items: center;
          align-content: center;
          gap: 18px;
          text-align: center;
        }

        .invite-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid
            var(--tonari-border);
          border-top-color:
            var(--tonari-sage-deep);
          border-radius: 50%;
          animation:
            invite-spin 850ms
            linear infinite;
        }

        .invite-heading {
          margin-top: 18px;
          text-align: center;
        }

        .invite-illustration {
          width: 210px;
          height: 150px;
          margin: 0 auto 4px;
        }

        .invite-illustration-svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        .invite-title {
          margin: 14px 0 0;
          color: var(--tonari-text);
          font-family:
            "Zen Old Mincho", serif;
          font-size:
            clamp(32px, 8vw, 41px);
          font-weight: 600;
          line-height: 1.5;
        }

        .invite-heading-copy {
          margin-top: 11px;
        }

        .invite-message {
          margin-top: 23px;
          padding: 14px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.7;
          text-align: center;
        }

        .invite-message-success {
          border: 1px solid #c9dac3;
          background: #eff6ec;
          color: #54704e;
        }

        .invite-message-error {
          border: 1px solid #edc5c1;
          background: #fff1ef;
          color: #a4433c;
        }

        .invite-message-info {
          border: 1px solid
            var(--tonari-border);
          background:
            var(--tonari-surface-soft);
          color:
            var(--tonari-text-soft);
        }

        .invite-action-card,
        .invite-code-card,
        .invite-connected-card {
          margin-top: 25px;
          padding: 25px 22px;
          border: 1px solid
            var(--tonari-border);
          border-radius: 24px;
          background:
            var(--tonari-surface);
          box-shadow:
            var(--tonari-shadow-sm);
          text-align: center;
        }

        .invite-code-card {
          border-color: #d7e2d3;
          background:
            linear-gradient(
              145deg,
              #f3f7f1,
              #fffdfb
            );
        }

        .invite-connected-card {
          border-color: #cbdcc6;
          background: #f1f7ef;
        }

        .invite-step-number {
          display: flex;
          width: 42px;
          height: 42px;
          margin: 0 auto 15px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f1e2d8;
          color: #946c58;
          font-family: sans-serif;
          font-size: 16px;
          font-weight: 800;
        }

        .invite-step-number-green {
          background: #e3ecdf;
          color: #61785b;
        }

        .invite-card-eyebrow {
          margin: 0;
          color:
            var(--tonari-sage-deep);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .invite-card-title {
          margin: 0;
          color: var(--tonari-text);
          font-family:
            "Zen Old Mincho", serif;
          font-size: 22px;
          font-weight: 600;
          line-height: 1.65;
        }

        .invite-card-eyebrow +
          .invite-card-title {
          margin-top: 11px;
        }

        .invite-card-copy {
          margin: 10px 0 0;
          color:
            var(--tonari-text-soft);
          font-size: 13px;
          line-height: 1.75;
        }

        .invite-action-button,
        .invite-share-button,
        .invite-home-button {
          margin-top: 20px;
        }

        .invite-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 22px 0 -3px;
          color:
            var(--tonari-text-soft);
          font-size: 12px;
        }

        .invite-divider::before,
        .invite-divider::after {
          height: 1px;
          flex: 1;
          background:
            var(--tonari-border);
          content: "";
        }

        .invite-label {
          display: block;
          margin-top: 21px;
          color: var(--tonari-text);
          font-size: 13px;
          font-weight: 700;
          text-align: left;
        }

        .invite-code-input {
          width: 100%;
          margin-top: 9px;
          padding: 16px;
          border: 1px solid
            var(--tonari-border);
          border-radius: 16px;
          outline: none;
          background: #fffdfb;
          color: var(--tonari-text);
          font-family: sans-serif;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-align: center;
          text-transform: uppercase;
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .invite-code-input:focus {
          border-color:
            var(--tonari-sage-deep);
          box-shadow: 0 0 0 4px
            rgba(127, 152, 119, 0.12);
        }

        .invite-code-input:disabled {
          cursor: not-allowed;
          opacity: 0.62;
        }

        .invite-input-count {
          margin: 7px 0 0;
          color:
            var(--tonari-text-soft);
          font-size: 11px;
          text-align: right;
        }

        .invite-code-box {
          display: flex;
          width: 100%;
          margin-top: 22px;
          padding: 21px 16px 17px;
          border: 2px dashed #bdcdb8;
          border-radius: 18px;
          flex-direction: column;
          align-items: center;
          background:
            rgba(255, 255, 255, 0.78);
          color: var(--tonari-text);
          cursor: pointer;
          font: inherit;
        }

        .invite-code-box span {
          font-family: sans-serif;
          font-size:
            clamp(28px, 8vw, 38px);
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        .invite-code-box small {
          margin-top: 8px;
          color:
            var(--tonari-text-soft);
          font-size: 11px;
          letter-spacing: 0;
        }

        .invite-waiting {
          display: flex;
          margin-top: 18px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color:
            var(--tonari-text-soft);
          font-size: 12px;
        }

        .invite-waiting-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background:
            var(--tonari-sage-deep);
          animation:
            invite-pulse 1.4s
            ease-in-out infinite;
        }

        .invite-connected-icon {
          display: flex;
          width: 66px;
          height: 66px;
          margin: 0 auto 17px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #dcebd7;
          color: #587252;
          font-family: sans-serif;
          font-size: 28px;
          font-weight: 800;
        }

        .invite-footer {
          margin-top: 30px;
          text-align: center;
        }

        .invite-footer p {
          margin: 0;
          color: var(--tonari-text);
          font-family:
            "Zen Old Mincho", serif;
          font-size: 18px;
          font-weight: 600;
        }

        .invite-footer span {
          display: block;
          margin-top: 5px;
          color:
            var(--tonari-text-soft);
          font-size: 12px;
        }

        @keyframes invite-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes invite-pulse {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(0.85);
          }

          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @media (max-width: 560px) {
          .invite-page-shell {
            min-height: 100vh;
          }

          .invite-panel {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .invite-content {
            padding: 20px 18px 30px;
          }

          .invite-heading {
            margin-top: 14px;
          }

          .invite-title {
            font-size: 32px;
          }

          .invite-action-card,
          .invite-code-card,
          .invite-connected-card {
            padding: 22px 18px;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .invite-spinner,
          .invite-waiting-dot {
            animation: none;
          }
        }
      `}</style>
    </AppShell>
  );
}