"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type IntroStep = {
  eyebrow: string;
  title: string;
  description: string;
  scene: "question" | "secret" | "conversation";
};

const steps: IntroStep[] = [
  {
    eyebrow: "毎日、ひとつだけ",
    title: "二人に同じ質問が届きます。",
    description:
      "忙しい日でも、答えるのは30秒。思いついたことを、そのまま言葉にできます。",
    scene: "question",
  },
  {
    eyebrow: "答えは、まだひみつ",
    title: "お互いが答えるまで見えません。",
    description:
      "先に相手の答えを見ないからこそ、自分の気持ちを素直に残せます。",
    scene: "secret",
  },
  {
    eyebrow: "違いも、会話になる",
    title: "答えが今日の話題になります。",
    description:
      "同じでも、違っても大丈夫。その答えが、二人を少し近づけます。",
    scene: "conversation",
  },
];

function QuestionScene() {
  return (
    <svg
      viewBox="0 0 360 220"
      role="img"
      aria-label="二人に同じ質問が届くイラスト"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id="questionBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffaf7" />
          <stop offset="100%" stopColor="#f2e5dc" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="360" height="220" rx="32" fill="url(#questionBg)" />
      <circle cx="180" cy="108" r="70" fill="#ead8cc" opacity="0.65" />

      <rect x="47" y="72" width="91" height="128" rx="23" fill="#403630" />
      <rect x="222" y="72" width="91" height="128" rx="23" fill="#403630" />

      <rect x="56" y="84" width="73" height="94" rx="15" fill="#fffaf7" />
      <rect x="231" y="84" width="73" height="94" rx="15" fill="#fffaf7" />

      <circle cx="92" cy="189" r="4" fill="#d8c4b8" />
      <circle cx="268" cy="189" r="4" fill="#d8c4b8" />

      <path
        d="M78 108H108M78 122H115M78 136H101"
        stroke="#9a7d6e"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M253 108H283M246 122H283M259 136H283"
        stroke="#9a7d6e"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path
        d="M142 76C152 56 166 45 180 45C194 45 208 56 218 76"
        stroke="#403630"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="4 10"
      />

      <rect x="140" y="18" width="80" height="52" rx="18" fill="#ffffff" />
      <path
        d="M172 70L180 79L188 70"
        fill="#ffffff"
      />
      <text
        x="180"
        y="51"
        textAnchor="middle"
        fontSize="25"
        fontWeight="700"
        fill="#403630"
      >
        ？
      </text>

      <circle cx="36" cy="37" r="7" fill="#d4a996" opacity="0.7" />
      <circle cx="325" cy="43" r="10" fill="#b9c7b4" opacity="0.7" />
      <circle cx="329" cy="184" r="6" fill="#d4a996" opacity="0.55" />
    </svg>
  );
}

function SecretScene() {
  return (
    <svg
      viewBox="0 0 360 220"
      role="img"
      aria-label="答えが秘密に守られているイラスト"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id="secretBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffaf7" />
          <stop offset="100%" stopColor="#eee3db" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="360" height="220" rx="32" fill="url(#secretBg)" />

      <rect x="38" y="55" width="113" height="135" rx="26" fill="#f7eee8" />
      <rect x="209" y="55" width="113" height="135" rx="26" fill="#f7eee8" />

      <circle cx="95" cy="95" r="22" fill="#d4a996" />
      <path d="M62 166C66 135 80 121 95 121C110 121 124 135 128 166" fill="#403630" />

      <circle cx="266" cy="95" r="22" fill="#b9c7b4" />
      <path d="M233 166C237 135 251 121 266 121C281 121 295 135 299 166" fill="#403630" />

      <rect x="139" y="82" width="82" height="78" rx="22" fill="#403630" />
      <path
        d="M156 82V69C156 55.745 166.745 45 180 45C193.255 45 204 55.745 204 69V82"
        stroke="#403630"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="180" cy="116" r="8" fill="#fffaf7" />
      <path d="M180 124V139" stroke="#fffaf7" strokeWidth="7" strokeLinecap="round" />

      <path
        d="M137 46C124 38 111 35 98 36M223 46C236 38 249 35 262 36"
        stroke="#c7b3a8"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="3 9"
      />

      <circle cx="31" cy="37" r="8" fill="#b9c7b4" opacity="0.65" />
      <circle cx="329" cy="180" r="8" fill="#d4a996" opacity="0.65" />
    </svg>
  );
}

function ConversationScene() {
  return (
    <svg
      viewBox="0 0 360 220"
      role="img"
      aria-label="二人が会話を楽しむイラスト"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id="conversationBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffaf7" />
          <stop offset="100%" stopColor="#f1e6de" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="360" height="220" rx="32" fill="url(#conversationBg)" />

      <rect x="66" y="150" width="228" height="14" rx="7" fill="#a98675" />
      <path d="M87 164V199M273 164V199" stroke="#806c63" strokeWidth="9" strokeLinecap="round" />

      <circle cx="120" cy="93" r="25" fill="#d4a996" />
      <path d="M78 153C82 119 99 106 120 106C141 106 158 119 162 153" fill="#403630" />

      <circle cx="240" cy="93" r="25" fill="#b9c7b4" />
      <path d="M198 153C202 119 219 106 240 106C261 106 278 119 282 153" fill="#403630" />

      <path
        d="M133 92C137 96 141 96 145 92M215 92C219 96 223 96 227 92"
        stroke="#403630"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      <rect x="157" y="130" width="46" height="24" rx="8" fill="#ffffff" />
      <path d="M166 154L172 163L178 154" fill="#ffffff" />
      <path d="M168 141H192" stroke="#a98675" strokeWidth="4" strokeLinecap="round" />

      <path
        d="M138 51C147 38 162 31 180 31C198 31 213 38 222 51"
        stroke="#403630"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="4 10"
      />
      <path
        d="M180 18C183 10 194 10 197 18C200 27 190 33 180 40C170 33 160 27 163 18C166 10 177 10 180 18Z"
        fill="#d4a996"
      />

      <circle cx="31" cy="41" r="8" fill="#d4a996" opacity="0.55" />
      <circle cx="327" cy="42" r="10" fill="#b9c7b4" opacity="0.55" />
    </svg>
  );
}

function Scene({ type }: { type: IntroStep["scene"] }) {
  if (type === "question") return <QuestionScene />;
  if (type === "secret") return <SecretScene />;
  return <ConversationScene />;
}

export default function IntroPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "back">("next");
  const touchStartX = useRef<number | null>(null);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  const moveTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    setDirection(nextIndex > currentStep ? "next" : "back");
    setCurrentStep(nextIndex);
  };

  const goNext = () => {
    if (isLastStep) {
      router.push("/question");
      return;
    }

    moveTo(currentStep + 1);
  };

  const goBack = () => {
    moveTo(currentStep - 1);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
      if (event.key === "Enter") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = touchEndX - touchStartX.current;

    if (distance <= -50) goNext();
    if (distance >= 50) goBack();

    touchStartX.current = null;
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #fffdfb 0%, #f8f0ea 48%, #f1e6de 100%)",
        padding: "24px 18px",
        color: "#433832",
        display: "flex",
        alignItems: "center",
      }}
    >
      <style>{`
        @keyframes introFadeNext {
          from { opacity: 0; transform: translateX(22px) scale(0.985); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }

        @keyframes introFadeBack {
          from { opacity: 0; transform: translateX(-22px) scale(0.985); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }

        @media (max-width: 560px) {
          .intro-card {
            padding: 26px 18px 22px !important;
            border-radius: 26px !important;
          }

          .intro-scene {
            height: 210px !important;
          }

          .intro-title {
            font-size: 28px !important;
          }

          .intro-copy {
            font-size: 15px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .intro-content {
            animation: none !important;
          }
        }
      `}</style>

      <section
        style={{
          width: "100%",
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >
        <div
          className="intro-card"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.96)",
            borderRadius: "34px",
            padding: "32px 28px 26px",
            boxShadow: "0 24px 70px rgba(88, 64, 52, 0.12)",
            border: "1px solid rgba(229, 215, 206, 0.8)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                letterSpacing: "0.16em",
                color: "#9a7564",
                fontWeight: 700,
              }}
            >
              となり
            </p>

            <button
              type="button"
              onClick={() => router.push("/question")}
              style={{
                border: "none",
                backgroundColor: "transparent",
                color: "#9b877e",
                fontSize: "13px",
                cursor: "pointer",
                padding: "8px 0",
              }}
            >
              スキップ
            </button>
          </div>

          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              marginTop: "20px",
              touchAction: "pan-y",
            }}
          >
            <div
              key={currentStep}
              className="intro-content"
              style={{
                animation:
                  direction === "next"
                    ? "introFadeNext 320ms ease both"
                    : "introFadeBack 320ms ease both",
              }}
            >
              <div
                className="intro-scene"
                style={{
                  width: "100%",
                  height: "230px",
                  borderRadius: "28px",
                  overflow: "hidden",
                  boxShadow: "inset 0 0 0 1px rgba(223, 204, 193, 0.7)",
                }}
              >
                <Scene type={step.scene} />
              </div>

              <div
                style={{
                  marginTop: "26px",
                  textAlign: "center",
                  padding: "0 8px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#a07f70",
                  }}
                >
                  {step.eyebrow}
                </p>

                <h1
                  className="intro-title"
                  style={{
                    margin: "12px 0 0",
                    fontSize: "32px",
                    lineHeight: 1.45,
                    color: "#3f3530",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {step.title}
                </h1>

                <p
                  className="intro-copy"
                  style={{
                    margin: "16px auto 0",
                    maxWidth: "520px",
                    fontSize: "16px",
                    lineHeight: 1.9,
                    color: "#806c63",
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "26px",
              display: "flex",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {steps.map((item, index) => (
              <button
                key={item.eyebrow}
                type="button"
                onClick={() => moveTo(index)}
                aria-label={`${index + 1}ページ目を表示`}
                aria-current={currentStep === index ? "step" : undefined}
                style={{
                  width: currentStep === index ? "30px" : "8px",
                  height: "8px",
                  border: "none",
                  borderRadius: "999px",
                  padding: 0,
                  backgroundColor:
                    currentStep === index ? "#403630" : "#d9c9c0",
                  cursor: "pointer",
                  transition: "all 180ms ease",
                }}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: "24px",
              display: "grid",
              gridTemplateColumns: isFirstStep ? "1fr" : "104px 1fr",
              gap: "12px",
            }}
          >
            {!isFirstStep && (
              <button
                type="button"
                onClick={goBack}
                style={{
                  border: "1px solid #dbc9bf",
                  borderRadius: "17px",
                  padding: "17px 12px",
                  backgroundColor: "#ffffff",
                  color: "#725e55",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                戻る
              </button>
            )}

            <button
              type="button"
              onClick={goNext}
              style={{
                width: "100%",
                border: "none",
                borderRadius: "17px",
                padding: "18px 20px",
                backgroundColor: "#403630",
                color: "#ffffff",
                fontSize: "18px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 12px 28px rgba(64, 54, 48, 0.2)",
              }}
            >
              {isLastStep ? "はじめる" : "次へ"}
            </button>
          </div>
        </div>

        <p
          style={{
            margin: "20px 0 0",
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