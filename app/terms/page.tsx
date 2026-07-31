import Link from "next/link";

export const metadata = {
  title: "利用規約｜となり",
  description:
    "夫婦の会話を支えるアプリ「となり」の利用規約です。",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <header className="legal-header">
          <p className="legal-eyebrow">TONARI TERMS</p>
          <h1 className="legal-title">利用規約</h1>
          <p className="legal-lead">
            二人が安心して使える場所を守るための、
            <br />
            「となり」のお約束です。
          </p>
        </header>

        <article className="legal-card">
          <section className="legal-section">
            <h2>第1条（適用）</h2>
            <p>
              本規約は、「となり」の運営者（以下「運営者」といいます）が
              提供する本サービスの利用条件を定めるものです。利用者は、
              本規約に同意した上で本サービスを利用するものとします。
            </p>
          </section>

          <section className="legal-section">
            <h2>第2条（サービス内容）</h2>
            <p>
              本サービスは、日々の質問、回答の共有、履歴表示および
              AIによるコメントなどを通して、パートナー同士の会話の
              きっかけを提供するサービスです。
            </p>
            <p>
              本サービスは、夫婦関係その他の人間関係の改善や特定の結果を
              保証するものではありません。
            </p>
          </section>

          <section className="legal-section">
            <h2>第3条（利用環境とアカウント管理）</h2>
            <ol>
              <li>
                利用者は、自己の責任と費用で端末、通信環境その他の
                利用環境を準備します。
              </li>
              <li>
                本サービスは匿名認証を利用する場合があります。
                ブラウザデータの削除、端末変更その他の理由により、
                保存済みデータへアクセスできなくなることがあります。
              </li>
              <li>
                招待URLやペア情報は第三者へ不用意に共有せず、
                利用者自身の責任で管理してください。
              </li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>第4条（回答内容）</h2>
            <ol>
              <li>
                利用者は、自らの責任で回答その他の情報を入力します。
              </li>
              <li>
                相手の回答を、相手の同意なく公開、転載または第三者へ
                提供しないでください。
              </li>
              <li>
                第三者の個人情報、秘密情報、違法な情報、または入力する
                必要のない機微な情報を投稿しないでください。
              </li>
              <li>
                利用者は、入力内容について必要な権利または権限を
                有していることを保証します。
              </li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>第5条（AI機能）</h2>
            <ol>
              <li>
                本サービスは、質問や二人の回答を基に、外部のAIサービスを
                使用してコメントを生成することがあります。
              </li>
              <li>
                AIによる出力には、誤り、不適切な表現または利用者の意図に
                合わない内容が含まれる可能性があります。
              </li>
              <li>
                AIの出力は参考情報であり、医療、心理、法律、金銭その他の
                専門的な診断または助言ではありません。
              </li>
              <li>
                AIの出力だけを根拠に重要な判断をせず、必要に応じて
                適切な専門家へ相談してください。
              </li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>第6条（禁止事項）</h2>
            <p>利用者は、次の行為をしてはなりません。</p>
            <ul>
              <li>法令または公序良俗に違反する行為</li>
              <li>他者への脅迫、嫌がらせ、差別、誹謗中傷または権利侵害</li>
              <li>不正アクセス、解析、改ざんまたは過度な負荷を与える行為</li>
              <li>他の利用者になりすます行為</li>
              <li>招待コードその他の認証情報を不正に取得・使用する行為</li>
              <li>本サービスを営利目的で無断利用または転売する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>その他、運営者が不適切と合理的に判断する行為</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>第7条（知的財産権）</h2>
            <p>
              本サービスのデザイン、プログラム、文章、ロゴその他の
              コンテンツに関する権利は、運営者または正当な権利者に
              帰属します。利用者が入力した回答の権利は、原則として
              当該利用者に留保されます。
            </p>
            <p>
              利用者は、サービス提供、保存、表示、AIコメント生成、
              不具合対応および安全管理に必要な範囲で、運営者が入力内容を
              取り扱うことを許諾します。
            </p>
          </section>

          <section className="legal-section">
            <h2>第8条（サービスの変更・中断・終了）</h2>
            <p>
              運営者は、保守、障害、セキュリティ上の必要、外部サービスの
              仕様変更その他の事情により、本サービスの全部または一部を
              変更、中断または終了することがあります。
            </p>
          </section>

          <section className="legal-section">
            <h2>第9条（利用制限）</h2>
            <p>
              運営者は、利用者が本規約に違反した場合、セキュリティ上
              必要な場合、またはサービス運営に重大な支障がある場合、
              事前の通知なく利用制限、データの非表示またはアクセス停止を
              行うことがあります。
            </p>
          </section>

          <section className="legal-section">
            <h2>第10条（免責）</h2>
            <ol>
              <li>
                運営者は、本サービスが常に正確、安全、完全または
                中断なく利用できることを保証しません。
              </li>
              <li>
                利用者間の会話、関係、紛争および利用者が入力した内容に
                ついては、利用者自身が責任を負います。
              </li>
              <li>
                運営者の故意または重過失による場合を除き、本サービスの
                利用または利用不能により生じた損害について、運営者は
                法令上許される範囲で責任を負いません。
              </li>
              <li>
                消費者契約法その他の強行法規により免責が認められない
                場合は、その範囲で本条は適用されません。
              </li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>第11条（規約の変更）</h2>
            <p>
              運営者は、法令の変更、サービス内容の変更その他必要がある
              場合、本規約を変更することがあります。重要な変更については、
              本サービス内その他の適切な方法でお知らせします。
            </p>
          </section>

          <section className="legal-section">
            <h2>第12条（準拠法・裁判管轄）</h2>
            <p>
              本規約は日本法を準拠法とします。本サービスに関して紛争が
              生じた場合、当事者間で誠実に協議し、解決しない場合は、
              法令により認められる範囲で、運営者の所在地を管轄する
              日本の裁判所を第一審の合意管轄裁判所とします。
            </p>
          </section>

          <section className="legal-section">
            <h2>第13条（お問い合わせ）</h2>
            <p>
              本規約に関するお問い合わせは、本サービス内に表示する
              お問い合わせ窓口までご連絡ください。
            </p>
            <div className="legal-note">
              公開前に、運営者名と連絡先メールアドレスを
              お問い合わせページへ必ず掲載してください。
            </div>
          </section>

          <p className="legal-updated">制定日：2026年7月31日</p>
        </article>

        <nav className="legal-footer" aria-label="関連ページ">
          <Link className="legal-link" href="/privacy">
            プライバシーポリシー
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