"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AppShell from "../../components/layout/AppShell";
import TopBar from "../../components/layout/TopBar";

type PageState = "checking" | "success" | "error";

function SuccessIcon() {
  return (
    <span className="payment-success-icon" aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="30" fill="currentColor" opacity="0.14" />
        <path
          d="M19 32.5L28 41L46 23"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function PaymentSuccessLoading() {
  return (
    <AppShell
      maxWidth={600}
      fullHeight
      className="payment-success-page-shell"
      panelClassName="payment-success-panel"
    >
      <div className="payment-success-content">
        <TopBar />

        <section className="payment-success-loading">
          <span
            className="payment-success-spinner"
            aria-hidden="true"
          />

          <p className="tonari-copy">
            お支払い状況を確認しています…
          </p>
        </section>
      </div>

      <PaymentSuccessStyles />
    </AppShell>
  );
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<PageState>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      setState("error");
      setMessage(
        "決済情報を確認できませんでした。Stripeの決済画面からもう一度お試しください。"
      );
      return;
    }

    setState("success");
  }, [searchParams]);

  return (
    <AppShell
      maxWidth={600}
      fullHeight
      className="payment-success-page-shell"
      panelClassName="payment-success-panel"
    >
      <div className="payment-success-content">
        <TopBar />

        {state === "checking" && (
          <section className="payment-success-loading">
            <span
              className="payment-success-spinner"
              aria-hidden="true"
            />

            <p className="tonari-copy">
              お支払い状況を確認しています…
            </p>
          </section>
        )}

        {state === "success" && (
          <>
            <header className="payment-success-heading">
              <SuccessIcon />

              <p className="tonari-eyebrow">
                お支払いが完了しました
              </p>

              <h1 className="payment-success-title">
                となり プレミアムへ
                <br />
                ようこそ
              </h1>

              <p className="tonari-copy payment-success-heading-copy">
                お申し込みありがとうございます。
                <br />
                二人の時間を、これからもお楽しみください。
              </p>
            </header>

            <section className="payment-success-card">
              <h2 className="payment-success-card-title">
                プレミアムが利用可能になります
              </h2>

              <p className="payment-success-card-copy">
                契約情報の反映には数秒かかる場合があります。
                <br />
                次の画面で利用状態を確認します。
              </p>
            </section>

            <button
              type="button"
              className="tonari-button tonari-button-brown payment-success-button"
              onClick={() => router.replace("/home")}
            >
              ホームへ進む
            </button>
          </>
        )}

        {state === "error" && (
          <>
            <div
              className="tonari-alert tonari-alert-error payment-success-error"
              role="alert"
            >
              {message}
            </div>

            <button
              type="button"
              className="tonari-button tonari-button-soft payment-success-button"
              onClick={() => router.replace("/paywall")}
            >
              プラン選択へ戻る
            </button>
          </>
        )}
      </div>

      <PaymentSuccessStyles />
    </AppShell>
  );
}

function PaymentSuccessStyles() {
  return (
    <style jsx global>{`
      .payment-success-page-shell {
        max-width: 600px;
      }

      .payment-success-panel {
        min-height: calc(100vh - 84px);
        border-radius: 34px;
      }

      .payment-success-content {
        padding: 24px 26px 34px;
      }

      .payment-success-loading {
        display: grid;
        min-height: 560px;
        place-items: center;
        align-content: center;
        gap: 18px;
        text-align: center;
      }

      .payment-success-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--tonari-border);
        border-top-color: var(--tonari-sage-deep);
        border-radius: 50%;
        animation: payment-success-spin 850ms linear infinite;
      }

      .payment-success-heading {
        margin-top: 54px;
        text-align: center;
      }

      .payment-success-icon {
        display: block;
        width: 82px;
        height: 82px;
        margin: 0 auto 22px;
        color: var(--tonari-sage-deep);
      }

      .payment-success-icon svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .payment-success-title {
        margin: 16px 0 0;
        color: var(--tonari-text);
        font-family: "Zen Old Mincho", serif;
        font-size: clamp(31px, 8vw, 40px);
        font-weight: 600;
        line-height: 1.55;
      }

      .payment-success-heading-copy {
        margin-top: 14px;
      }

      .payment-success-card {
        margin-top: 30px;
        padding: 25px 22px;
        border: 1px solid #d7e2d3;
        border-radius: 23px;
        background: #f2f7f0;
        box-shadow: var(--tonari-shadow-sm);
        text-align: center;
      }

      .payment-success-card-title {
        margin: 0;
        color: var(--tonari-text);
        font-family: "Zen Old Mincho", serif;
        font-size: 21px;
        font-weight: 600;
        line-height: 1.6;
      }

      .payment-success-card-copy {
        margin: 12px 0 0;
        color: var(--tonari-text-soft);
        font-size: 14px;
        line-height: 1.85;
      }

      .payment-success-button {
        margin-top: 22px;
      }

      .payment-success-error {
        margin-top: 40px;
      }

      @keyframes payment-success-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 560px) {
        .payment-success-page-shell {
          min-height: 100vh;
        }

        .payment-success-panel {
          min-height: 100vh;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }

        .payment-success-content {
          padding: 20px 18px 30px;
        }

        .payment-success-heading {
          margin-top: 46px;
        }

        .payment-success-title {
          font-size: 31px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .payment-success-spinner {
          animation: none;
        }
      }
    `}</style>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}