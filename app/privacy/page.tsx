import Link from "next/link";

export const metadata = {
  title: "プライバシーポリシー｜となり",
  description:
    "夫婦の会話を支えるアプリ「となり」のプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <header className="legal-header">
          <p className="legal-eyebrow">TONARI POLICY</p>
          <h1 className="legal-title">プライバシーポリシー</h1>
          <p className="legal-lead">
            「となり」でお預かりする情報と、
            <br />
            その大切な取り扱いについてご説明します。
          </p>
        </header>

        <article className="legal-card">
          <section className="legal-section">
            <h2>1．基本方針</h2>
            <p>
              「となり」の運営者（以下「運営者」といいます）は、
              利用者のプライバシーを尊重し、個人情報その他の利用者に
              関する情報を、適用される法令に従って適切に取り扱います。
            </p>
          </section>

          <section className="legal-section">
            <h2>2．取得する情報</h2>
            <p>本サービスでは、次の情報を取得することがあります。</p>
            <ul>
              <li>利用者が登録する呼び名・表示名</li>
              <li>質問への回答、パートナーとの回答履歴</li>
              <li>パートナー招待およびペアを識別するための情報</li>
              <li>匿名認証により発行される利用者識別子</li>
              <li>
                IPアドレス、端末・ブラウザ情報、アクセス日時、
                操作履歴、エラー情報などの利用状況
              </li>
              <li>お問い合わせ時に利用者から提供される情報</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3．利用目的</h2>
            <p>取得した情報は、次の目的で利用します。</p>
            <ul>
              <li>本サービスの提供、本人確認およびペア機能の実現</li>
              <li>質問、回答履歴およびAIコメントの保存・表示</li>
              <li>不具合の調査、セキュリティ確保および不正利用防止</li>
              <li>サービス品質、操作性および機能の改善</li>
              <li>お問い合わせへの対応</li>
              <li>法令または利用規約に違反する行為への対応</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4．AIによる回答分析</h2>
            <p>
              二人の回答がそろった場合、本サービスは回答内容および
              質問内容をOpenAIのAPIへ送信し、会話のきっかけとなる
              コメントを生成することがあります。
            </p>
            <p>
              AIのコメントは参考情報であり、医療・心理・法律その他の
              専門的な診断や助言ではありません。回答には、第三者の
              秘密情報、特に慎重な取り扱いが必要な情報、入力する必要の
              ない個人情報を記載しないでください。
            </p>
          </section>

          <section className="legal-section">
            <h2>5．外部サービスの利用</h2>
            <p>
              本サービスは、提供・保存・AI生成などのため、主に次の
              外部サービスを利用します。
            </p>
            <ul>
              <li>Supabase：認証、データベースおよび情報の保存</li>
              <li>Vercel：アプリの配信およびサーバー処理</li>
              <li>OpenAI：質問およびAIコメントの生成</li>
            </ul>
            <p>
              これらのサービスの利用に伴い、情報が国外のサーバーで
              取り扱われる場合があります。運営者は、サービス提供に
              必要な範囲で委託先を選定し、適切な管理に努めます。
            </p>
          </section>

          <section className="legal-section">
            <h2>6．第三者提供</h2>
            <p>
              運営者は、法令で認められる場合、利用者の同意がある場合、
              または本サービスの提供に必要な業務委託の場合を除き、
              利用者の個人データを第三者へ提供しません。
            </p>
          </section>

          <section className="legal-section">
            <h2>7．安全管理</h2>
            <p>
              運営者は、情報への不正アクセス、漏えい、滅失または毀損を
              防ぐため、アクセス制御、認証、通信の暗号化、秘密鍵の
              サーバー側管理など、必要かつ適切な安全管理措置に努めます。
            </p>
          </section>

          <section className="legal-section">
            <h2>8．保存期間と削除</h2>
            <p>
              情報は、本サービスの提供に必要な期間、または法令上必要な
              期間保存します。利用者から適切な方法で削除の申し出があり、
              法令上またはサービス運営上保持する必要がない場合は、
              合理的な期間内に対応します。
            </p>
            <p>
              匿名認証を利用しているため、端末やブラウザのデータを
              消去すると、本人確認ができず、保存済みデータへアクセス
              できなくなる場合があります。
            </p>
          </section>

          <section className="legal-section">
            <h2>9．開示・訂正・利用停止等</h2>
            <p>
              利用者は、法令に定める範囲で、保有個人データの開示、
              訂正、追加、削除、利用停止等を求めることができます。
              本人確認が必要となる場合があります。
            </p>
          </section>

          <section className="legal-section">
            <h2>10．未成年者の利用</h2>
            <p>
              未成年者が本サービスを利用する場合は、必要に応じて
              親権者その他の法定代理人の同意を得てください。
            </p>
          </section>

          <section className="legal-section">
            <h2>11．内容の変更</h2>
            <p>
              運営者は、法令やサービス内容の変更に応じて本ポリシーを
              改定することがあります。重要な変更がある場合は、
              本サービス内その他の適切な方法でお知らせします。
            </p>
          </section>

          <section className="legal-section">
            <h2>12．お問い合わせ</h2>
            <p>
              本ポリシーおよび利用者情報の取り扱いに関するお問い合わせは、
              本サービス内に表示するお問い合わせ窓口までご連絡ください。
            </p>
            <div className="legal-note">
              公開前に、運営者名と連絡先メールアドレスを
              お問い合わせページへ必ず掲載してください。
            </div>
          </section>

          <p className="legal-updated">制定日：2026年7月31日</p>
        </article>

        <nav className="legal-footer" aria-label="関連ページ">
          <Link className="legal-link" href="/terms">
            利用規約
          </Link>
          <Link className="legal-link" href="/home">
            ホームへ戻る
          </Link>
        </nav>
      </div>
      
      <style>{`
        .legal-page {
          min-height: 100vh;
          padding: 28px 18px 64px;
          background:
            radial-gradient(circle at top, #fff8f3 0, transparent 38%),
            var(--tonari-bg, #f8f3ee);
          color: var(--tonari-text, #4f4139);
        }

        .legal-shell {
          width: min(100%, 760px);
          margin: 0 auto;
        }

        .legal-header {
          padding: 28px 22px;
          border: 1px solid #ead8cd;
          border-radius: 28px;
          background: rgba(255, 252, 249, 0.94);
          text-align: center;
          box-shadow: 0 14px 35px rgba(92, 70, 58, 0.08);
        }

        .legal-eyebrow {
          margin: 0;
          color: var(--tonari-sage-deep, #66805f);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
        }

        .legal-title {
          margin: 10px 0 0;
          font-family: "Zen Old Mincho", serif;
          font-size: clamp(26px, 7vw, 36px);
          font-weight: 600;
          line-height: 1.45;
        }

        .legal-lead {
          margin: 12px 0 0;
          color: var(--tonari-text-soft, #7a6d65);
          font-size: 13px;
          line-height: 1.9;
        }

        .legal-card {
          margin-top: 18px;
          padding: 26px 22px;
          border: 1px solid #eaded6;
          border-radius: 25px;
          background: #fffdfb;
          box-shadow: 0 10px 28px rgba(92, 70, 58, 0.06);
        }

        .legal-section + .legal-section {
          margin-top: 30px;
          padding-top: 27px;
          border-top: 1px solid #eee3dc;
        }

        .legal-section h2 {
          margin: 0 0 12px;
          font-family: "Zen Old Mincho", serif;
          font-size: 19px;
          font-weight: 600;
          line-height: 1.6;
        }

        .legal-section p,
        .legal-section li {
          color: var(--tonari-text-soft, #70645d);
          font-size: 14px;
          line-height: 1.95;
        }

        .legal-section p {
          margin: 0;
        }

        .legal-section p + p {
          margin-top: 12px;
        }

        .legal-section ul,
        .legal-section ol {
          margin: 10px 0 0;
          padding-left: 1.35em;
        }

        .legal-note {
          margin-top: 20px;
          padding: 16px;
          border-radius: 18px;
          background: #f2f6ef;
          color: #5f705a;
          font-size: 13px;
          line-height: 1.8;
        }

        .legal-footer {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px 18px;
          margin-top: 24px;
          font-size: 13px;
        }

        .legal-link {
          color: var(--tonari-brown, #725d50);
          font-weight: 700;
          text-decoration: none;
        }

        .legal-link:hover {
          text-decoration: underline;
        }

        .legal-updated {
          margin: 24px 0 0;
          color: var(--tonari-text-soft, #80736b);
          font-size: 12px;
          text-align: right;
        }

        @media (max-width: 520px) {
          .legal-page {
            padding: 18px 12px 48px;
          }

          .legal-header,
          .legal-card {
            padding-left: 18px;
            padding-right: 18px;
          }
        }
      `}</style>

    </main>
  );
}