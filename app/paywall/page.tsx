"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import AppShell from "../../components/layout/AppShell";
import TopBar from "../../components/layout/TopBar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type AccessStatus = {
  has_access: boolean;
  billing_owner_id: string;
  subscription_status:
    | "trial"
    | "active"
    | "past_due"
    | "canceled"
    | "expired";
  trial_ends_at: string | null;
  current_period_end: string | null;
  is_trial: boolean;
};

type Plan = "monthly" | "yearly";

type MessageTone = "info" | "error";

function LockIllustration() {
  return (
    <svg
      viewBox="0 0 220 170"
      role="img"
      aria-label="鍵と二つのカップのイラスト"
      className="paywall-illustration-svg"
    >
      <ellipse cx="110" cy="149" rx="78" ry="12" fill="#eadfd7" />

      <rect
        x="78"
        y="67"
        width="65"
        height="64"
        rx="21"
        fill="#fffaf6"
        stroke="#dccbc1"
        strokeWidth="2"
      />

      <path
        d="M91 68V53C91 39 99 31 110 31C121 31 129 39 129 53V68"
        fill="none"
        stroke="#8b776b"
        strokeWidth="8"
        strokeLinecap="round"
      />

      <circle cx="110" cy="94" r="7" fill="#d7a48d" />

      <path
        d="M110 99V112"
        stroke="#d7a48d"
        strokeWidth="6"
        strokeLinecap="round"
      />

      <path
        d="M50 116H79V139H61C55 139 50 134 50 128V116Z"
        fill="#f2e5dc"
      />

      <path
        d="M143 116H172V128C172 134 167 139 161 139H143V116Z"
        fill="#e4ece1"
      />

      <path
        d="M48 119H41C34 119 29 124 29 131C29 138 34 143 41 143H52"
        fill="none"
        stroke="#ab8f7f"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path
        d="M174 119H181C188 119 193 124 193 131C193 138 188 143 181 143H170"
        fill="none"
        stroke="#7f9877"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <circle cx="184" cy="48" r="8" fill="#d7a48d" opacity="0.7" />

      <path
        d="M38 82C47 69 57 64 68 64"
        fill="none"
        stroke="#9eb096"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <span className="paywall-check-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          d="M5 12.5L9.3 17L19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function formatJapaneseDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function PaywallPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  const [selectedPlan, setSelectedPlan] =
    useState<Plan>("monthly");

  const [accessStatus, setAccessStatus] =
    useState<AccessStatus | null>(null);

  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] =
    useState<MessageTone>("info");

  useEffect(() => {
    let active = true;

    const loadAccessStatus = async () => {
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

        const { data, error } = await supabase.rpc(
          "get_my_access_status"
        );

        if (error) {
          throw new Error(
            `契約情報を確認できませんでした：${error.message}`
          );
        }

        const status = (
          Array.isArray(data) ? data[0] : data
        ) as AccessStatus | null;

        if (!active) {
          return;
        }

        if (!status) {
          throw new Error("契約情報が見つかりませんでした。");
        }

        setAccessStatus(status);

        if (status.has_access) {
          router.replace("/home");
        }
      } catch (error) {
        console.error("契約状態確認エラー:", error);

        if (!active) {
          return;
        }

        setMessageTone("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "契約情報の読み込みに失敗しました。"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAccessStatus();

    return () => {
      active = false;
    };
  }, [router]);

  const startCheckout = async () => {
    try {
      setCheckingOut(true);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            plan: selectedPlan,
            successUrl: `${window.location.origin}/payment-success`,
            cancelUrl: `${window.location.origin}/paywall`,
          },
        }
      );

      if (error) {
        throw new Error(
          `決済画面を開けませんでした：${error.message}`
        );
      }

      const checkoutUrl = data?.url;

      if (!checkoutUrl || typeof checkoutUrl !== "string") {
        throw new Error("決済ページのURLを取得できませんでした。");
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("決済開始エラー:", error);

      setMessageTone("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "決済の開始に失敗しました。"
      );

      setCheckingOut(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  const trialEndDate = formatJapaneseDate(
    accessStatus?.trial_ends_at ?? null
  );

  return (
    <AppShell
      maxWidth={660}
      fullHeight
      className="paywall-page-shell"
      panelClassName="paywall-panel"
    >
      <div className="paywall-content">
        <TopBar />

        {loading ? (
          <section className="paywall-loading">
            <span
              className="paywall-spinner"
              aria-hidden="true"
            />

            <p className="tonari-copy">
              ご利用状況を確認しています…
            </p>
          </section>
        ) : (
          <>
            <header className="paywall-heading">
              <div className="paywall-illustration">
                <LockIllustration />
              </div>

              <p className="tonari-eyebrow">
                となり プレミアム
              </p>

              <h1 className="paywall-title">
                無料体験が
                <br />
                終了しました
              </h1>

              <p className="tonari-copy paywall-heading-copy">
                二人の時間を、これからも。
                <br />
                1つの契約でパートナーと一緒に使えます。
              </p>

              {trialEndDate && (
                <p className="paywall-trial-date">
                  無料体験終了日：{trialEndDate}
                </p>
              )}
            </header>

            {message && (
              <div
                className={`paywall-message paywall-message-${messageTone}`}
                role={
                  messageTone === "error"
                    ? "alert"
                    : "status"
                }
              >
                {message}
              </div>
            )}

            <section className="paywall-benefits-card">
              <h2 className="paywall-section-title">
                プレミアムでできること
              </h2>

              <div className="paywall-benefit-list">
                <div className="paywall-benefit">
                  <CheckIcon />

                  <div>
                    <p>毎日の質問に回答</p>
                    <span>
                      一日ひとつ、二人を知る質問が届きます
                    </span>
                  </div>
                </div>

                <div className="paywall-benefit">
                  <CheckIcon />

                  <div>
                    <p>二人の答えを共有</p>
                    <span>
                      同じところも違うところも比べられます
                    </span>
                  </div>
                </div>

                <div className="paywall-benefit">
                  <CheckIcon />

                  <div>
                    <p>1契約で二人利用可能</p>
                    <span>
                      パートナー側の追加料金はありません
                    </span>
                  </div>
                </div>

                <div className="paywall-benefit">
                  <CheckIcon />

                  <div>
                    <p>これまでの回答を保存</p>
                    <span>
                      二人の小さな記録を残していけます
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="paywall-plan-section">
              <h2 className="paywall-section-title">
                プランを選択
              </h2>

              <button
                type="button"
                className={`paywall-plan-card ${
                  selectedPlan === "monthly"
                    ? "paywall-plan-card-selected"
                    : ""
                }`}
                onClick={() => setSelectedPlan("monthly")}
                aria-pressed={selectedPlan === "monthly"}
              >
                <span
                  className={`paywall-radio ${
                    selectedPlan === "monthly"
                      ? "paywall-radio-selected"
                      : ""
                  }`}
                  aria-hidden="true"
                />

                <span className="paywall-plan-main">
                  <strong>月額プラン</strong>
                  <small>いつでも解約できます</small>
                </span>

                <span className="paywall-price">
                  <strong>480円</strong>
                  <small>／月</small>
                </span>
              </button>

              <button
                type="button"
                className={`paywall-plan-card paywall-yearly-card ${
                  selectedPlan === "yearly"
                    ? "paywall-plan-card-selected"
                    : ""
                }`}
                onClick={() => setSelectedPlan("yearly")}
                aria-pressed={selectedPlan === "yearly"}
              >
                <span className="paywall-recommend-badge">
                  2か月分お得
                </span>

                <span
                  className={`paywall-radio ${
                    selectedPlan === "yearly"
                      ? "paywall-radio-selected"
                      : ""
                  }`}
                  aria-hidden="true"
                />

                <span className="paywall-plan-main">
                  <strong>年額プラン</strong>
                  <small>月額換算 約400円</small>
                </span>

                <span className="paywall-price">
                  <strong>4,800円</strong>
                  <small>／年</small>
                </span>
              </button>
            </section>

            <button
              type="button"
              className="tonari-button tonari-button-brown paywall-checkout-button"
              onClick={startCheckout}
              disabled={checkingOut}
            >
              {checkingOut
                ? "決済画面を準備しています…"
                : selectedPlan === "monthly"
                  ? "月額480円で続ける"
                  : "年額4,800円で続ける"}
            </button>

            <p className="paywall-payment-note">
              安全なStripe決済画面へ移動します。
              <br />
              購入前に金額を確認できます。
            </p>

            <button
              type="button"
              className="paywall-logout-button"
              onClick={logout}
              disabled={checkingOut}
            >
              ログアウトする
            </button>

            <footer className="paywall-footer">
              <p>となり</p>
              <span>ふたりを知る、毎日の質問</span>
            </footer>
          </>
        )}
      </div>

      <style jsx global>{`
        .paywall-page-shell {
          max-width: 660px;
        }

        .paywall-panel {
          min-height: calc(100vh - 84px);
          border-radius: 34px;
        }

        .paywall-content {
          padding: 24px 28px 36px;
        }

        .paywall-loading {
          display: grid;
          min-height: 620px;
          place-items: center;
          align-content: center;
          gap: 18px;
          text-align: center;
        }

        .paywall-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--tonari-border);
          border-top-color: var(--tonari-sage-deep);
          border-radius: 50%;
          animation: paywall-spin 850ms linear infinite;
        }

        .paywall-heading {
          margin-top: 22px;
          text-align: center;
        }

        .paywall-illustration {
          width: 190px;
          height: 145px;
          margin: 0 auto 4px;
        }

        .paywall-illustration-svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        .paywall-title {
          margin: 15px 0 0;
          color: var(--tonari-text);
          font-family: "Zen Old Mincho", serif;
          font-size: clamp(32px, 8vw, 42px);
          font-weight: 600;
          line-height: 1.5;
          letter-spacing: 0.01em;
        }

        .paywall-heading-copy {
          margin-top: 13px;
        }

        .paywall-trial-date {
          display: inline-block;
          margin: 17px 0 0;
          padding: 8px 13px;
          border: 1px solid var(--tonari-border);
          border-radius: var(--tonari-radius-pill);
          background: var(--tonari-surface-soft);
          color: var(--tonari-text-soft);
          font-size: 12px;
          font-weight: 600;
        }

        .paywall-message {
          margin-top: 22px;
          padding: 14px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.7;
          text-align: center;
        }

        .paywall-message-info {
          border: 1px solid var(--tonari-border);
          background: var(--tonari-surface-soft);
          color: var(--tonari-text-soft);
        }

        .paywall-message-error {
          border: 1px solid #edc5c1;
          background: #fff1ef;
          color: #a4433c;
        }

        .paywall-benefits-card {
          margin-top: 29px;
          padding: 24px;
          border: 1px solid #d9e2d5;
          border-radius: 24px;
          background: #f4f7f2;
          box-shadow: var(--tonari-shadow-sm);
        }

        .paywall-section-title {
          margin: 0;
          color: var(--tonari-text);
          font-family: "Zen Old Mincho", serif;
          font-size: 21px;
          font-weight: 600;
          text-align: center;
        }

        .paywall-benefit-list {
          display: grid;
          gap: 20px;
          margin-top: 22px;
        }

        .paywall-benefit {
          display: flex;
          align-items: flex-start;
          gap: 13px;
        }

        .paywall-check-icon {
          display: flex;
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #dce8d8;
          color: #5f7759;
        }

        .paywall-check-icon svg {
          width: 17px;
          height: 17px;
        }

        .paywall-benefit p {
          margin: 1px 0 0;
          color: var(--tonari-text);
          font-size: 15px;
          font-weight: 700;
        }

        .paywall-benefit span {
          display: block;
          margin-top: 5px;
          color: var(--tonari-text-soft);
          font-size: 13px;
          line-height: 1.65;
        }

        .paywall-plan-section {
          margin-top: 30px;
        }

        .paywall-plan-card {
          position: relative;
          display: flex;
          width: 100%;
          min-height: 92px;
          margin-top: 15px;
          padding: 19px 18px;
          border: 1px solid var(--tonari-border);
          border-radius: 20px;
          align-items: center;
          gap: 14px;
          background: #fffdfb;
          color: var(--tonari-text);
          cursor: pointer;
          font: inherit;
          text-align: left;
          box-shadow: var(--tonari-shadow-sm);
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease,
            transform 160ms ease;
        }

        .paywall-plan-card:hover {
          transform: translateY(-1px);
        }

        .paywall-plan-card-selected {
          border: 2px solid var(--tonari-brown-soft);
          box-shadow: 0 12px 30px rgba(95, 70, 57, 0.13);
        }

        .paywall-yearly-card {
          margin-top: 13px;
          padding-top: 24px;
        }

        .paywall-recommend-badge {
          position: absolute;
          top: -11px;
          right: 18px;
          padding: 5px 10px;
          border-radius: var(--tonari-radius-pill);
          background: var(--tonari-apricot);
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
        }

        .paywall-radio {
          display: block;
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          border: 2px solid #cdbeb5;
          border-radius: 50%;
          background: #ffffff;
        }

        .paywall-radio-selected {
          border: 6px solid var(--tonari-brown-soft);
        }

        .paywall-plan-main {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
        }

        .paywall-plan-main strong {
          font-size: 16px;
        }

        .paywall-plan-main small {
          margin-top: 5px;
          color: var(--tonari-text-soft);
          font-size: 12px;
        }

        .paywall-price {
          display: flex;
          flex-shrink: 0;
          align-items: baseline;
        }

        .paywall-price strong {
          font-family: "Zen Old Mincho", serif;
          font-size: 21px;
        }

        .paywall-price small {
          margin-left: 3px;
          color: var(--tonari-text-soft);
          font-size: 12px;
        }

        .paywall-checkout-button {
          min-height: 58px;
          margin-top: 24px;
          font-size: 16px;
        }

        .paywall-checkout-button:disabled {
          cursor: not-allowed;
          opacity: 0.62;
        }

        .paywall-payment-note {
          margin: 13px 0 0;
          color: var(--tonari-text-soft);
          font-size: 12px;
          line-height: 1.75;
          text-align: center;
        }

        .paywall-logout-button {
          display: block;
          margin: 25px auto 0;
          border: 0;
          background: transparent;
          color: var(--tonari-text-soft);
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .paywall-logout-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .paywall-footer {
          margin-top: 31px;
          text-align: center;
        }

        .paywall-footer p {
          margin: 0;
          color: var(--tonari-text);
          font-family: "Zen Old Mincho", serif;
          font-size: 18px;
          font-weight: 600;
        }

        .paywall-footer span {
          display: block;
          margin-top: 5px;
          color: var(--tonari-text-soft);
          font-size: 12px;
        }

        @keyframes paywall-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 560px) {
          .paywall-page-shell {
            min-height: 100vh;
          }

          .paywall-panel {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .paywall-content {
            padding: 20px 18px 30px;
          }

          .paywall-heading {
            margin-top: 18px;
          }

          .paywall-title {
            font-size: 32px;
          }

          .paywall-benefits-card {
            padding: 21px 19px;
          }

          .paywall-plan-card {
            padding: 18px 15px;
          }

          .paywall-price strong {
            font-size: 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .paywall-spinner {
            animation: none;
          }

          .paywall-plan-card {
            transition: none;
          }
        }
      `}</style>
    </AppShell>
  );
}