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

type Profile = {
  display_name: string | null;
};

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

type Subscription = {
  plan: "couple_monthly" | "couple_yearly";
  subscription_status:
    | "trial"
    | "active"
    | "past_due"
    | "canceled"
    | "expired";
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

type MessageTone = "success" | "error" | "info";

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

function getPlanName(plan: Subscription["plan"] | null) {
  if (plan === "couple_yearly") {
    return "年額プラン";
  }

  if (plan === "couple_monthly") {
    return "月額プラン";
  }

  return "未契約";
}

function getStatusLabel(
  status: Subscription["subscription_status"] | null
) {
  switch (status) {
    case "trial":
      return "無料体験中";

    case "active":
      return "利用中";

    case "past_due":
      return "お支払い確認中";

    case "canceled":
      return "解約済み";

    case "expired":
      return "利用期限終了";

    default:
      return "未確認";
  }
}

function getStatusClass(
  status: Subscription["subscription_status"] | null
) {
  switch (status) {
    case "trial":
      return "settings-status-trial";

    case "active":
      return "settings-status-active";

    case "past_due":
      return "settings-status-warning";

    case "canceled":
    case "expired":
      return "settings-status-inactive";

    default:
      return "settings-status-inactive";
  }
}

export default function SettingsPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [originalName, setOriginalName] = useState("");

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [accessStatus, setAccessStatus] =
    useState<AccessStatus | null>(null);

  const [isBillingOwner, setIsBillingOwner] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [openingPortal, setOpeningPortal] =
    useState(false);
  const [loggingOut, setLoggingOut] =
    useState(false);
  const [deletingAccount, setDeletingAccount] =
    useState(false);

  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] =
    useState<MessageTone>("info");

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);

  const [deleteConfirmText, setDeleteConfirmText] =
    useState("");

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
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

        const [
          profileResult,
          accessResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .maybeSingle(),

          supabase.rpc("get_my_access_status"),
        ]);

        if (profileResult.error) {
          throw new Error(
            `プロフィールを取得できませんでした：${profileResult.error.message}`
          );
        }

        if (accessResult.error) {
          throw new Error(
            `契約情報を取得できませんでした：${accessResult.error.message}`
          );
        }

        const profile =
          profileResult.data as Profile | null;

        const loadedAccessStatus = (
          Array.isArray(accessResult.data)
            ? accessResult.data[0]
            : accessResult.data
        ) as AccessStatus | null;

        if (!loadedAccessStatus) {
          throw new Error(
            "契約情報が見つかりませんでした。"
          );
        }

        const name =
          profile?.display_name?.trim() ?? "";

        const billingOwnerId =
          loadedAccessStatus.billing_owner_id;

        const subscriptionResult = await supabase
          .from("subscriptions")
          .select(
            `
              plan,
              subscription_status,
              trial_ends_at,
              current_period_end,
              cancel_at_period_end,
              stripe_customer_id,
              stripe_subscription_id
            `
          )
          .eq("owner_id", billingOwnerId)
          .maybeSingle();

        if (subscriptionResult.error) {
          throw new Error(
            `プラン情報を取得できませんでした：${subscriptionResult.error.message}`
          );
        }

        if (!active) {
          return;
        }

        setDisplayName(name);
        setOriginalName(name);

        setAccessStatus(loadedAccessStatus);

        setSubscription(
          subscriptionResult.data as Subscription | null
        );

        setIsBillingOwner(
          billingOwnerId === user.id
        );
      } catch (error) {
        console.error(
          "設定画面読み込みエラー:",
          error
        );

        if (!active) {
          return;
        }

        setMessageTone("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "設定画面の読み込みに失敗しました。"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, [router]);

  const saveDisplayName = async () => {
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setMessageTone("error");
      setMessage(
        "ニックネームを入力してください。"
      );
      return;
    }

    if (trimmedName.length > 20) {
      setMessageTone("error");
      setMessage(
        "ニックネームは20文字以内で入力してください。"
      );
      return;
    }

    try {
      setSavingName(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            display_name: trimmedName,
          },
          {
            onConflict: "id",
          }
        );

      if (error) {
        throw new Error(
          `ニックネームを保存できませんでした：${error.message}`
        );
      }

      setDisplayName(trimmedName);
      setOriginalName(trimmedName);

      setMessageTone("success");
      setMessage(
        "ニックネームを変更しました。"
      );
    } catch (error) {
      console.error(
        "ニックネーム保存エラー:",
        error
      );

      setMessageTone("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "ニックネームの保存に失敗しました。"
      );
    } finally {
      setSavingName(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      setOpeningPortal(true);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/");
        return;
      }

      if (!isBillingOwner) {
        setMessageTone("info");
        setMessage(
          "契約の変更は、ペアを招待した方のアカウントから行ってください。"
        );
        return;
      }

      if (!subscription?.stripe_customer_id) {
        setMessageTone("info");
        setMessage(
          "現在、Stripeで管理する有料契約はありません。"
        );
        return;
      }

      const { data, error } =
        await supabase.functions.invoke(
          "create-customer-portal",
          {
            body: {
              returnUrl:
                `${window.location.origin}/settings`,
            },
          }
        );

      if (error) {
        throw new Error(
          `契約管理画面を開けませんでした：${error.message}`
        );
      }

      const portalUrl = data?.url;

      if (
        !portalUrl ||
        typeof portalUrl !== "string"
      ) {
        throw new Error(
          data?.error ??
            "契約管理画面のURLを取得できませんでした。"
        );
      }

      window.location.href = portalUrl;
    } catch (error) {
      console.error(
        "契約管理画面エラー:",
        error
      );

      setMessageTone("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "契約管理画面を開けませんでした。"
      );
    } finally {
      setOpeningPortal(false);
    }
  };

  const logout = async () => {
    try {
      setLoggingOut(true);
      setMessage("");

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw new Error(
          `ログアウトできませんでした：${error.message}`
        );
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(
        "ログアウトエラー:",
        error
      );

      setMessageTone("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "ログアウトに失敗しました。"
      );

      setLoggingOut(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmText !== "退会する") {
      setMessageTone("error");
      setMessage(
        "確認欄に「退会する」と入力してください。"
      );
      return;
    }

    try {
      setDeletingAccount(true);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/");
        return;
      }

      const { data, error } =
        await supabase.functions.invoke(
          "delete-account",
          {
            body: {
              confirmation: "退会する",
            },
          }
        );

      if (error) {
        throw new Error(
          `退会処理に失敗しました：${error.message}`
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error ??
            "退会処理を完了できませんでした。"
        );
      }

      await supabase.auth.signOut();

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(
        "退会処理エラー:",
        error
      );

      setMessageTone("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "退会処理に失敗しました。"
      );

      setDeletingAccount(false);
    }
  };

  const hasNameChanged =
    displayName.trim() !==
    originalName.trim();

  const canDelete =
    deleteConfirmText === "退会する" &&
    !deletingAccount;

  const planName = getPlanName(
    subscription?.plan ?? null
  );

  const statusLabel = getStatusLabel(
    subscription?.subscription_status ?? null
  );

  const statusClass = getStatusClass(
    subscription?.subscription_status ?? null
  );

  const trialEndDate = formatJapaneseDate(
    subscription?.trial_ends_at ?? null
  );

  const currentPeriodEndDate =
    formatJapaneseDate(
      subscription?.current_period_end ?? null
    );

  const hasStripeSubscription =
    Boolean(
      subscription?.stripe_customer_id &&
        subscription?.stripe_subscription_id
    );

  return (
    <AppShell
      maxWidth={620}
      fullHeight
      className="settings-page-shell"
      panelClassName="settings-panel"
    >
      <div className="settings-content">
        <TopBar
          left={
            <button
              type="button"
              className="tonari-icon-button settings-back-button"
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

        <header className="settings-heading">
          <p className="tonari-eyebrow">
            アカウント
          </p>

          <h1 className="settings-title">
            設定
          </h1>

          <p className="tonari-copy settings-heading-copy">
            名前やプレミアム契約、
            <br />
            アカウントを管理できます。
          </p>
        </header>

        {message && (
          <div
            className={`settings-message settings-message-${messageTone}`}
            role={
              messageTone === "error"
                ? "alert"
                : "status"
            }
          >
            {message}
          </div>
        )}

        {loading ? (
          <section className="settings-loading">
            <span
              className="settings-spinner"
              aria-hidden="true"
            />

            <p className="tonari-copy">
              設定を読み込んでいます…
            </p>
          </section>
        ) : (
          <>
            <section className="settings-card settings-premium-card">
              <div className="settings-card-heading">
                <div className="settings-icon settings-icon-premium">
                  <span aria-hidden="true">
                    ◆
                  </span>
                </div>

                <div className="settings-card-heading-main">
                  <h2 className="settings-card-title">
                    となり プレミアム
                  </h2>

                  <p className="settings-card-description">
                    1つの契約で二人が利用できます。
                  </p>
                </div>

                <span
                  className={`settings-status ${statusClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="settings-plan-summary">
                <div className="settings-plan-row">
                  <span>現在のプラン</span>
                  <strong>{planName}</strong>
                </div>

                {subscription?.subscription_status ===
                  "trial" &&
                  trialEndDate && (
                    <div className="settings-plan-row">
                      <span>
                        無料体験終了日
                      </span>
                      <strong>
                        {trialEndDate}
                      </strong>
                    </div>
                  )}

                {subscription?.subscription_status ===
                  "active" &&
                  currentPeriodEndDate && (
                    <div className="settings-plan-row">
                      <span>
                        次回更新日
                      </span>
                      <strong>
                        {currentPeriodEndDate}
                      </strong>
                    </div>
                  )}

                {subscription?.cancel_at_period_end &&
                  currentPeriodEndDate && (
                    <div className="settings-cancel-notice">
                      {currentPeriodEndDate}
                      で契約終了予定です。
                    </div>
                  )}
              </div>

              {hasStripeSubscription &&
              isBillingOwner ? (
                <>
                  <button
                    type="button"
                    className="tonari-button tonari-button-brown settings-portal-button"
                    onClick={openCustomerPortal}
                    disabled={openingPortal}
                  >
                    {openingPortal
                      ? "契約管理画面を開いています…"
                      : "プラン・支払い方法を管理する"}
                  </button>

                  <p className="settings-portal-note">
                    Stripeの安全な管理画面で、
                    支払い方法の変更・請求履歴の確認・解約ができます。
                  </p>
                </>
              ) : !isBillingOwner ? (
                <div className="settings-partner-notice">
                  契約の変更は、ペアを招待した方のアカウントから行えます。
                </div>
              ) : accessStatus?.has_access ? (
                <div className="settings-partner-notice">
                  現在は無料体験期間中です。
                </div>
              ) : (
                <button
                  type="button"
                  className="tonari-button tonari-button-brown settings-portal-button"
                  onClick={() =>
                    router.push("/paywall")
                  }
                >
                  プレミアムを申し込む
                </button>
              )}
            </section>

            <section className="settings-card">
              <div className="settings-card-heading">
                <div className="settings-icon settings-icon-profile">
                  <span aria-hidden="true">
                    人
                  </span>
                </div>

                <div>
                  <h2 className="settings-card-title">
                    ニックネーム
                  </h2>

                  <p className="settings-card-description">
                    パートナーに表示される名前です。
                  </p>
                </div>
              </div>

              <label
                className="settings-label"
                htmlFor="displayName"
              >
                表示名
              </label>

              <input
                id="displayName"
                className="settings-input"
                type="text"
                value={displayName}
                maxLength={20}
                placeholder="ニックネームを入力"
                onChange={(event) => {
                  setDisplayName(
                    event.target.value
                  );
                  setMessage("");
                }}
                disabled={savingName}
              />

              <div className="settings-input-footer">
                <span>
                  {displayName.length}/20文字
                </span>
              </div>

              <button
                type="button"
                className="tonari-button tonari-button-brown settings-save-button"
                onClick={saveDisplayName}
                disabled={
                  savingName ||
                  !displayName.trim() ||
                  !hasNameChanged
                }
              >
                {savingName
                  ? "保存しています…"
                  : "名前を保存する"}
              </button>
            </section>

            <section className="settings-card">
              <div className="settings-card-heading">
                <div className="settings-icon settings-icon-logout">
                  <span aria-hidden="true">
                    ↪
                  </span>
                </div>

                <div>
                  <h2 className="settings-card-title">
                    ログアウト
                  </h2>

                  <p className="settings-card-description">
                    この端末からログアウトします。
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="tonari-button tonari-button-soft settings-logout-button"
                onClick={logout}
                disabled={loggingOut}
              >
                {loggingOut
                  ? "ログアウトしています…"
                  : "ログアウトする"}
              </button>
            </section>

            <section className="settings-danger-card">
              <div className="settings-card-heading">
                <div className="settings-icon settings-icon-danger">
                  <span aria-hidden="true">
                    !
                  </span>
                </div>

                <div>
                  <h2 className="settings-danger-title">
                    退会
                  </h2>

                  <p className="settings-card-description">
                    アカウントと保存された情報を削除します。
                  </p>
                </div>
              </div>

              <ul className="settings-delete-list">
                <li>
                  これまでの回答が削除されます
                </li>
                <li>
                  プロフィールが削除されます
                </li>
                <li>
                  パートナーとのペアが解除されます
                </li>
                <li>
                  削除後は元に戻せません
                </li>
              </ul>

              {hasStripeSubscription && (
                <div className="settings-delete-warning">
                  退会前に、プレミアム契約の解約手続きを行ってください。
                </div>
              )}

              <button
                type="button"
                className="settings-delete-open-button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setDeleteConfirmText("");
                  setMessage("");
                }}
              >
                退会手続きへ
              </button>
            </section>

            <footer className="settings-footer">
              <p>となり</p>
              <span>
                ふたりを知る、毎日の質問
              </span>
            </footer>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div
          className="settings-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !deletingAccount
            ) {
              setShowDeleteConfirm(false);
            }
          }}
        >
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <div className="settings-modal-danger-icon">
              <span aria-hidden="true">
                !
              </span>
            </div>

            <h2
              id="delete-account-title"
              className="settings-modal-title"
            >
              本当に退会しますか？
            </h2>

            <p className="settings-modal-copy">
              アカウントを削除すると、
              回答やペア情報を元に戻すことはできません。
            </p>

            {hasStripeSubscription && (
              <div className="settings-modal-subscription-warning">
                有料契約がある場合は、
                先に契約管理画面から解約してください。
              </div>
            )}

            <label
              className="settings-label settings-confirm-label"
              htmlFor="deleteConfirm"
            >
              確認のため「退会する」と入力してください
            </label>

            <input
              id="deleteConfirm"
              className="settings-input settings-delete-input"
              type="text"
              value={deleteConfirmText}
              placeholder="退会する"
              autoComplete="off"
              onChange={(event) => {
                setDeleteConfirmText(
                  event.target.value
                );
                setMessage("");
              }}
              disabled={deletingAccount}
            />

            <button
              type="button"
              className="settings-delete-final-button"
              onClick={deleteAccount}
              disabled={!canDelete}
            >
              {deletingAccount
                ? "退会処理中です…"
                : "アカウントを完全に削除する"}
            </button>

            <button
              type="button"
              className="settings-cancel-button"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText("");
              }}
              disabled={deletingAccount}
            >
              キャンセル
            </button>
          </section>
        </div>
      )}

      <style jsx global>{`
        .settings-page-shell {
          max-width: 620px;
        }

        .settings-panel {
          min-height: calc(100vh - 84px);
          border-radius: 34px;
        }

        .settings-content {
          padding: 24px 26px 34px;
        }

        .settings-back-button {
          font-size: 20px;
          line-height: 1;
        }

        .settings-heading {
          margin-top: 30px;
          text-align: center;
        }

        .settings-title {
          margin: 14px 0 0;
          color: var(--tonari-text);
          font-family: "Zen Old Mincho", serif;
          font-size: clamp(32px, 8vw, 40px);
          font-weight: 600;
          line-height: 1.5;
        }

        .settings-heading-copy {
          margin-top: 10px;
        }

        .settings-message {
          margin-top: 24px;
          padding: 14px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.7;
          text-align: center;
        }

        .settings-message-success {
          border: 1px solid #c9dac3;
          background: #eff6ec;
          color: #54704e;
        }

        .settings-message-error {
          border: 1px solid #edc5c1;
          background: #fff1ef;
          color: #a4433c;
        }

        .settings-message-info {
          border: 1px solid
            var(--tonari-border);
          background:
            var(--tonari-surface-soft);
          color:
            var(--tonari-text-soft);
        }

        .settings-loading {
          display: grid;
          min-height: 380px;
          place-items: center;
          align-content: center;
          gap: 18px;
          text-align: center;
        }

        .settings-spinner {
          width: 38px;
          height: 38px;
          border: 4px solid
            var(--tonari-border);
          border-top-color:
            var(--tonari-sage-deep);
          border-radius: 50%;
          animation: settings-spin 850ms
            linear infinite;
        }

        .settings-card,
        .settings-danger-card {
          margin-top: 24px;
          padding: 23px;
          border-radius: 24px;
          box-shadow:
            var(--tonari-shadow-sm);
        }

        .settings-card {
          border: 1px solid
            var(--tonari-border);
          background:
            var(--tonari-surface);
        }

        .settings-premium-card {
          border-color: #d8e2d4;
          background:
            linear-gradient(
              145deg,
              #f5f8f3 0%,
              #fffdfb 100%
            );
        }

        .settings-danger-card {
          border: 1px solid #ecc8c4;
          background: #fff8f7;
        }

        .settings-card-heading {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .settings-card-heading-main {
          min-width: 0;
          flex: 1;
        }

        .settings-icon {
          display: flex;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-family: sans-serif;
          font-size: 18px;
          font-weight: 700;
        }

        .settings-icon-premium {
          background: #dfe9db;
          color: #637b5d;
        }

        .settings-icon-profile {
          background: #f4e6dc;
          color: #9b715e;
        }

        .settings-icon-logout {
          background: #e9f0e6;
          color: #698064;
        }

        .settings-icon-danger {
          background: #f8dfdc;
          color: #b34b43;
        }

        .settings-card-title,
        .settings-danger-title {
          margin: 0;
          font-family:
            "Zen Old Mincho", serif;
          font-size: 20px;
          font-weight: 600;
        }

        .settings-card-title {
          color: var(--tonari-text);
        }

        .settings-danger-title {
          color: #a4433c;
        }

        .settings-card-description {
          margin: 5px 0 0;
          color:
            var(--tonari-text-soft);
          font-size: 13px;
          line-height: 1.6;
        }

        .settings-status {
          flex-shrink: 0;
          padding: 6px 10px;
          border-radius:
            var(--tonari-radius-pill);
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .settings-status-active {
          background: #dcebd7;
          color: #52704d;
        }

        .settings-status-trial {
          background: #f2e8dc;
          color: #8b6b58;
        }

        .settings-status-warning {
          background: #fff0d7;
          color: #9a6d22;
        }

        .settings-status-inactive {
          background: #eee8e4;
          color: #786b64;
        }

        .settings-plan-summary {
          display: grid;
          gap: 12px;
          margin-top: 22px;
          padding: 17px;
          border: 1px solid #dce5d8;
          border-radius: 17px;
          background: rgba(
            255,
            255,
            255,
            0.72
          );
        }

        .settings-plan-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color:
            var(--tonari-text-soft);
          font-size: 13px;
        }

        .settings-plan-row strong {
          color: var(--tonari-text);
          font-size: 14px;
          text-align: right;
        }

        .settings-cancel-notice,
        .settings-delete-warning,
        .settings-modal-subscription-warning {
          padding: 12px 14px;
          border: 1px solid #e9c8a9;
          border-radius: 14px;
          background: #fff7eb;
          color: #8a623d;
          font-size: 13px;
          line-height: 1.7;
        }

        .settings-portal-button {
          margin-top: 18px;
        }

        .settings-portal-note {
          margin: 11px 0 0;
          color:
            var(--tonari-text-soft);
          font-size: 11px;
          line-height: 1.7;
          text-align: center;
        }

        .settings-partner-notice {
          margin-top: 18px;
          padding: 14px 15px;
          border: 1px solid
            var(--tonari-border);
          border-radius: 15px;
          background:
            var(--tonari-surface-soft);
          color:
            var(--tonari-text-soft);
          font-size: 13px;
          line-height: 1.7;
          text-align: center;
        }

        .settings-label {
          display: block;
          margin-top: 22px;
          color: var(--tonari-text);
          font-size: 13px;
          font-weight: 700;
        }

        .settings-input {
          width: 100%;
          margin-top: 9px;
          padding: 15px 16px;
          border: 1px solid
            var(--tonari-border);
          border-radius: 15px;
          outline: none;
          background: #fffdfb;
          color: var(--tonari-text);
          font: inherit;
          font-size: 16px;
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .settings-input:focus {
          border-color:
            var(--tonari-sage-deep);
          box-shadow: 0 0 0 4px
            rgba(127, 152, 119, 0.12);
        }

        .settings-input:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .settings-input-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 7px;
          color:
            var(--tonari-text-soft);
          font-size: 12px;
        }

        .settings-save-button,
        .settings-logout-button {
          margin-top: 17px;
        }

        .settings-delete-list {
          margin: 20px 0 0;
          padding-left: 21px;
          color: #785f5c;
          font-size: 13px;
          line-height: 1.9;
        }

        .settings-delete-warning {
          margin-top: 16px;
        }

        .settings-delete-open-button {
          width: 100%;
          min-height: 50px;
          margin-top: 18px;
          border: 1px solid #db8f88;
          border-radius: 15px;
          background: transparent;
          color: #a4433c;
          cursor: pointer;
          font: inherit;
          font-size: 15px;
          font-weight: 700;
          transition:
            background 160ms ease,
            transform 160ms ease;
        }

        .settings-delete-open-button:hover {
          background: #fff0ee;
        }

        .settings-delete-open-button:active {
          transform: scale(0.99);
        }

        .settings-footer {
          margin-top: 30px;
          text-align: center;
        }

        .settings-footer p {
          margin: 0;
          color: var(--tonari-text);
          font-family:
            "Zen Old Mincho", serif;
          font-size: 18px;
          font-weight: 600;
        }

        .settings-footer span {
          display: block;
          margin-top: 5px;
          color:
            var(--tonari-text-soft);
          font-size: 12px;
        }

        .settings-modal-overlay {
          position: fixed;
          z-index: 1000;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background:
            rgba(43, 34, 30, 0.52);
          backdrop-filter: blur(5px);
        }

        .settings-modal {
          width: min(100%, 470px);
          padding: 28px 24px 24px;
          border: 1px solid #e9c5c1;
          border-radius: 26px;
          background: #fffdfc;
          box-shadow: 0 26px 70px
            rgba(47, 34, 29, 0.25);
          text-align: center;
          animation:
            settings-modal-in 220ms
            ease both;
        }

        .settings-modal-danger-icon {
          display: flex;
          width: 60px;
          height: 60px;
          margin: 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f8dfdc;
          color: #b34b43;
          font-size: 25px;
          font-weight: 800;
        }

        .settings-modal-title {
          margin: 18px 0 0;
          color: #8f3934;
          font-family:
            "Zen Old Mincho", serif;
          font-size: 24px;
          font-weight: 600;
          line-height: 1.6;
        }

        .settings-modal-copy {
          margin: 11px 0 0;
          color:
            var(--tonari-text-soft);
          font-size: 14px;
          line-height: 1.8;
        }

        .settings-modal-subscription-warning {
          margin-top: 16px;
          text-align: left;
        }

        .settings-confirm-label {
          text-align: left;
        }

        .settings-delete-input {
          border-color: #e2aaa5;
        }

        .settings-delete-input:focus {
          border-color: #b34b43;
          box-shadow: 0 0 0 4px
            rgba(179, 75, 67, 0.1);
        }

        .settings-delete-final-button,
        .settings-cancel-button {
          width: 100%;
          min-height: 52px;
          border-radius: 15px;
          cursor: pointer;
          font: inherit;
          font-size: 15px;
          font-weight: 700;
        }

        .settings-delete-final-button {
          margin-top: 18px;
          border: 0;
          background: #b34b43;
          color: #ffffff;
          box-shadow: 0 12px 28px
            rgba(179, 75, 67, 0.23);
        }

        .settings-delete-final-button:disabled {
          cursor: not-allowed;
          opacity: 0.42;
          box-shadow: none;
        }

        .settings-cancel-button {
          margin-top: 11px;
          border: 1px solid
            var(--tonari-border);
          background: #ffffff;
          color: var(--tonari-text);
        }

        .settings-cancel-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        @keyframes settings-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes settings-modal-in {
          from {
            opacity: 0;
            transform:
              translateY(12px)
              scale(0.98);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        @media (max-width: 560px) {
          .settings-page-shell {
            min-height: 100vh;
          }

          .settings-panel {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .settings-content {
            padding: 20px 18px 30px;
          }

          .settings-heading {
            margin-top: 26px;
          }

          .settings-card,
          .settings-danger-card {
            padding: 20px;
          }

          .settings-card-heading {
            align-items: flex-start;
          }

          .settings-status {
            margin-top: 3px;
          }

          .settings-plan-row {
            align-items: flex-start;
          }

          .settings-modal {
            padding: 25px 20px 21px;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .settings-spinner,
          .settings-modal {
            animation: none;
          }
        }
      `}</style>
    </AppShell>
  );
}