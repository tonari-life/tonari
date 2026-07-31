"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getCurrentTimeJST, getTodayJST } from "../../lib/date";

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

type Answer = {
  user_id: string;
  answer_text: string;
};

type HomeStatus =
  | "loading"
  | "no_question"
  | "not_answered"
  | "waiting_partner"
  | "waiting_partner_answer"
  | "both_answered"
  | "error";

function HomeIllustration() {
  return (
    <svg
      viewBox="0 0 520 300"
      role="img"
      aria-label="カフェで向かい合って話す男女"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <linearGradient id="roomBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbf7f3" />
          <stop offset="100%" stopColor="#f2e6dd" />
        </linearGradient>

        <linearGradient id="skinA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3c3a6" />
          <stop offset="100%" stopColor="#dda17f" />
        </linearGradient>

        <linearGradient id="skinB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4c7aa" />
          <stop offset="100%" stopColor="#e6a98a" />
        </linearGradient>
      </defs>

      <rect width="520" height="300" rx="34" fill="url(#roomBg)" />
      <rect x="35" y="46" width="150" height="125" rx="6" fill="#fffdfb" opacity="0.92" />
      <path d="M85 46V171M135 46V171M35 108H185" stroke="#eadfd7" strokeWidth="6" />
      <path d="M262 0V35" stroke="#a98a78" strokeWidth="5" />
      <path d="M219 72C225 45 239 34 262 34C285 34 299 45 305 72Z" fill="#c9a88f" />
      <ellipse cx="262" cy="76" rx="16" ry="8" fill="#f4dfc8" opacity="0.75" />
      <path d="M437 222V112" stroke="#7f9278" strokeWidth="7" strokeLinecap="round" />
      <path d="M437 145C460 139 473 121 472 100C449 102 437 119 437 145Z" fill="#a9b99f" />
      <path d="M437 173C412 168 398 151 398 129C421 130 436 147 437 173Z" fill="#bcc9b5" />
      <path d="M437 198C460 194 475 180 478 160C456 158 440 173 437 198Z" fill="#9eae97" />
      <rect x="412" y="216" width="50" height="34" rx="10" fill="#d7bca9" />
      <ellipse cx="260" cy="248" rx="185" ry="15" fill="#e6d7cc" opacity="0.65" />
      <rect x="106" y="220" width="308" height="16" rx="8" fill="#a88672" />
      <path d="M133 236V281M387 236V281" stroke="#7d6253" strokeWidth="12" strokeLinecap="round" />
      <path d="M150 241C145 194 160 155 199 144C226 137 253 153 263 181L275 241Z" fill="#8f7464" />
      <circle cx="201" cy="124" r="39" fill="url(#skinA)" />
      <path d="M163 112C165 86 181 71 204 71C226 71 241 83 244 104C232 94 216 91 201 92C188 93 175 100 163 112Z" fill="#59443a" />
      <path d="M166 117C171 106 177 102 184 98" stroke="#59443a" strokeWidth="8" strokeLinecap="round" />
      <circle cx="188" cy="124" r="3.5" fill="#4a3932" />
      <circle cx="216" cy="124" r="3.5" fill="#4a3932" />
      <path d="M190 140C198 146 207 146 215 139" stroke="#8f5542" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M224 155C244 169 253 184 255 202" stroke="#8f7464" strokeWidth="16" strokeLinecap="round" />
      <path d="M370 241C375 194 360 155 321 144C294 137 267 153 257 181L245 241Z" fill="#d58d71" />
      <circle cx="319" cy="124" r="39" fill="url(#skinB)" />
      <path d="M283 110C286 82 304 67 326 69C348 71 362 86 363 110C349 99 336 95 321 95C306 95 294 100 283 110Z" fill="#5d4539" />
      <path d="M355 111C362 122 362 146 357 163C350 155 344 145 341 134Z" fill="#5d4539" />
      <circle cx="305" cy="124" r="3.5" fill="#4a3932" />
      <circle cx="333" cy="124" r="3.5" fill="#4a3932" />
      <path d="M305 140C313 146 322 146 330 139" stroke="#8f5542" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M296 155C276 169 267 184 265 202" stroke="#d58d71" strokeWidth="16" strokeLinecap="round" />
      <rect x="231" y="194" width="52" height="34" rx="11" fill="#fffdfb" />
      <path d="M283 201H292C302 201 310 209 310 219C310 229 302 237 292 237H283" stroke="#ad8f7e" strokeWidth="6" fill="none" />
      <path d="M244 186C236 176 244 168 249 162M263 186C255 176 263 168 268 162" stroke="#b79b8c" strokeWidth="5" strokeLinecap="round" />
      <path d="M260 50C265 37 281 37 286 50C291 64 276 74 260 85C244 74 229 64 234 50C239 37 255 37 260 50Z" fill="#df9f82" />
      <circle cx="222" cy="86" r="6" fill="#df9f82" opacity="0.7" />
      <circle cx="299" cy="88" r="6" fill="#aebda8" opacity="0.85" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18 }}>
      <path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18 }}>
      <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 20, height: 20 }}>
      <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 19c.5-3.5 2.4-5.3 5.5-5.3s5 1.8 5.5 5.3M14 15c.8-.8 1.8-1.2 3-1.2 2.3 0 3.7 1.4 4 4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 20, height: 20 }}>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19 13.5v-3l-2-.7a7.5 7.5 0 0 0-.7-1.7l.9-1.9-2.1-2.1-1.9.9a7.5 7.5 0 0 0-1.7-.7L10.5 2h-3l-.7 2a7.5 7.5 0 0 0-1.7.7l-1.9-.9-2.1 2.1.9 1.9a7.5 7.5 0 0 0-.7 1.7L0 10.5v3l2 .7a7.5 7.5 0 0 0 .7 1.7l-.9 1.9 2.1 2.1 1.9-.9a7.5 7.5 0 0 0 1.7.7l.7 2h3l.7-2a7.5 7.5 0 0 0 1.7-.7l1.9.9 2.1-2.1-.9-1.9a7.5 7.5 0 0 0 .7-1.7Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(1.5 0)" />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [myAnswered, setMyAnswered] = useState(false);
  const [partnerAnswered, setPartnerAnswered] = useState(false);
  const [status, setStatus] = useState<HomeStatus>("loading");
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadHome = useCallback(
    async (showLoading: boolean) => {
      try {
        if (showLoading) {
          setStatus("loading");
        }

        setMessage("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          router.replace("/");
          return;
        }

        const userId = session.user.id;
        const today = getTodayJST();

        const { data: questionData, error: questionError } = await supabase
          .from("daily_questions")
          .select("id, question_text")
          .eq("question_date", today)
          .maybeSingle();

        if (questionError) {
          throw new Error(
            `今日の質問を取得できませんでした：${questionError.message}`
          );
        }

        if (!questionData) {
          setQuestion(null);
          setCouple(null);
          setMyAnswered(false);
          setPartnerAnswered(false);
          setStatus("no_question");
          setLastUpdated(getCurrentTimeJST());
          return;
        }

        setQuestion(questionData);

        const { data: coupleData, error: coupleError } = await supabase
          .from("couples")
          .select("id, owner_id, partner_id, invite_code")
          .or(`owner_id.eq.${userId},partner_id.eq.${userId}`)
          .limit(1)
          .maybeSingle();

        if (coupleError) {
          throw new Error(
            `ペア情報を取得できませんでした：${coupleError.message}`
          );
        }

        const currentCouple = coupleData as Couple | null;
        setCouple(currentCouple);

        let partnerId: string | null = null;

        if (currentCouple) {
          partnerId =
            currentCouple.owner_id === userId
              ? currentCouple.partner_id
              : currentCouple.owner_id;
        }

        const targetUserIds = [userId];

        if (partnerId) {
          targetUserIds.push(partnerId);
        }

        const { data: answersData, error: answersError } = await supabase
          .from("answers")
          .select("user_id, answer_text")
          .eq("question_id", questionData.id)
          .in("user_id", targetUserIds);

        if (answersError) {
          throw new Error(
            `回答状況を取得できませんでした：${answersError.message}`
          );
        }

        const answers = (answersData ?? []) as Answer[];

        const myAnswer = answers.find((item) => item.user_id === userId);

        const partnerAnswer = partnerId
          ? answers.find((item) => item.user_id === partnerId)
          : undefined;

        const hasMyAnswer = Boolean(myAnswer?.answer_text?.trim());
        const hasPartnerAnswer = Boolean(partnerAnswer?.answer_text?.trim());

        setMyAnswered(hasMyAnswer);
        setPartnerAnswered(hasPartnerAnswer);

        if (!hasMyAnswer) {
          setStatus("not_answered");
        } else if (!currentCouple || !currentCouple.partner_id) {
          setStatus("waiting_partner");
        } else if (!hasPartnerAnswer) {
          setStatus("waiting_partner_answer");
        } else {
          setStatus("both_answered");
        }

        setLastUpdated(getCurrentTimeJST());
      } catch (error) {
        console.error("ホーム画面読み込みエラー:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "ホーム画面の読み込み中にエラーが発生しました。"
        );

        setStatus("error");
      }
    },
    [router]
  );

  useEffect(() => {
    loadHome(true);

    const channel = supabase
      .channel("home-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answers",
        },
        () => loadHome(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couples",
        },
        () => loadHome(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadHome]);

  const goToResult = () => {
    if (!couple?.invite_code) {
      return;
    }

    router.push(`/result?code=${encodeURIComponent(couple.invite_code)}`);
  };

  const handleMainAction = () => {
    if (status === "not_answered") {
      router.push("/question");
    }

    if (status === "waiting_partner") {
      router.push("/invite");
    }

    if (status === "both_answered") {
      goToResult();
    }
  };

  const actionLabel =
    status === "not_answered"
      ? "今日の質問に答える"
      : status === "waiting_partner"
        ? "パートナーを招待する"
        : status === "both_answered"
          ? "二人の答えを見る"
          : "";

  const showNavigation =
    status !== "loading" && status !== "error";

  return (
    <main className="tonari-page">
      <style>{`
        .tonari-page {
          background:
            radial-gradient(
              circle at 15% 0%,
              rgba(247, 183, 176, 0.18),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 15%,
              rgba(169, 197, 161, 0.18),
              transparent 28%
            ),
            #fbf6f1;
        }

        .home-wrap {
          width: 100%;
          max-width: 430px;
          margin: 0 auto;
        }

        .home-shell {
          min-height: calc(100vh - 48px);
          padding: 24px 22px 24px;
          border: 1px solid rgba(234, 223, 215, 0.95);
          border-radius: 34px;
          background: rgba(255, 253, 251, 0.98);
          box-shadow: 0 28px 72px rgba(94, 73, 60, 0.13);
        }

        .home-brand-hero {
          position: relative;
          overflow: hidden;
          padding: 22px 18px 24px;
          border: 1px solid #efd9cf;
          border-radius: 28px;
          background:
            radial-gradient(
              circle at 92% 8%,
              rgba(247, 183, 176, 0.28),
              transparent 28%
            ),
            linear-gradient(
              145deg,
              #fff9f4 0%,
              #fff4ec 50%,
              #f3f7ef 100%
            );
          box-shadow: 0 16px 36px
            rgba(102, 74, 58, 0.08);
        }

        .home-brand-logo {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .home-brand-image {
          width: 94px;
          height: 94px;
          border-radius: 27px;
          box-shadow:
            0 12px 28px
            rgba(112, 82, 66, 0.14);
        }

        .home-brand-name {
          margin: 0;
          color: #6f452c;
          font-family:
            "Zen Old Mincho", serif;
          font-size: 40px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0.08em;
        }

        .home-brand-tagline {
          margin: 10px 0 0;
          color: #876959;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.75;
          letter-spacing: 0.03em;
        }

        .home-brand-message {
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid
            rgba(194, 147, 126, 0.28);
        }

        .home-brand-message-label {
          margin: 0;
          color: #d38176;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .home-heading {
          margin: 10px 0 0;
          color: #463a33;
          font-family: "Zen Old Mincho", serif;
          font-size: 29px;
          font-weight: 600;
          line-height: 1.48;
          letter-spacing: 0.01em;
        }

        .home-question-card {
          width: 100%;
          overflow: hidden;
          margin-top: 22px;
          padding: 0;
          border: 1px solid #eadfd7;
          border-radius: 24px;
          background:
            linear-gradient(
              180deg,
              #fffaf6 0%,
              #fffdfb 100%
            );
          box-shadow: 0 14px 34px rgba(94, 73, 60, 0.08);
          text-align: left;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .home-question-card:not(:disabled) {
          cursor: pointer;
        }

        .home-question-card:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(94, 73, 60, 0.12);
        }

        .home-question-visual {
          position: relative;
          min-height: 208px;
          display: grid;
          place-items: center;
          overflow: hidden;
          padding: 18px;
          background:
            radial-gradient(
              circle at 50% 38%,
              rgba(255, 255, 255, 0.95),
              transparent 36%
            ),
            linear-gradient(
              145deg,
              #fff6ef 0%,
              #fde7de 52%,
              #eef4ea 100%
            );
        }

        .home-question-orbit {
          position: absolute;
          border-radius: 50%;
          border: 1px solid
            rgba(255, 255, 255, 0.72);
        }

        .home-question-orbit-a {
          width: 220px;
          height: 220px;
          top: -75px;
          right: -55px;
        }

        .home-question-orbit-b {
          width: 150px;
          height: 150px;
          bottom: -55px;
          left: -30px;
        }

        .home-question-visual-center {
          position: relative;
          z-index: 2;
          text-align: center;
        }

        .home-question-visual-label {
          margin: 0;
          color: #d27f73;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .home-question-visual-copy {
          margin: 12px 0 0;
          color: #6f4a36;
          font-family:
            "Zen Old Mincho", serif;
          font-size: 19px;
          font-weight: 600;
          line-height: 1.8;
          text-align: center;
        }

        .home-question-leaf {
          position: absolute;
          z-index: 1;
          width: 92px;
          height: 140px;
        }

        .home-question-leaf::before {
          content: "";
          position: absolute;
          left: 44px;
          top: 6px;
          width: 2px;
          height: 124px;
          border-radius: 999px;
          background: #9ab18f;
          transform: rotate(12deg);
          transform-origin: bottom;
          opacity: 0.8;
        }

        .home-question-leaf span {
          position: absolute;
          width: 31px;
          height: 16px;
          border-radius: 100% 0 100% 0;
          background: linear-gradient(
            135deg,
            #c8d8bf,
            #9fb691
          );
          opacity: 0.86;
        }

        .home-question-leaf span:nth-child(1) {
          left: 16px;
          top: 20px;
          transform: rotate(-34deg);
        }

        .home-question-leaf span:nth-child(2) {
          right: 8px;
          top: 48px;
          transform: rotate(34deg) scaleX(-1);
        }

        .home-question-leaf span:nth-child(3) {
          left: 12px;
          top: 76px;
          transform: rotate(-30deg);
        }

        .home-question-leaf span:nth-child(4) {
          right: 2px;
          top: 100px;
          transform: rotate(30deg) scaleX(-1);
        }

        .home-question-leaf-left {
          left: -4px;
          bottom: -18px;
          transform: rotate(-18deg);
        }

        .home-question-leaf-right {
          right: -8px;
          top: -10px;
          transform: rotate(155deg) scale(0.92);
          opacity: 0.78;
        }

        .home-status-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 14px;
        }

        .home-navigation {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .home-navigation-button {
          width: 100%;
          min-height: 62px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid #eadfd7;
          border-radius: 19px;
          background: #fffdfb;
          color: #6b5b4d;
          cursor: pointer;
          box-shadow: 0 7px 20px rgba(94, 73, 60, 0.05);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .home-navigation-button:hover {
          transform: translateY(-1px);
          background: #fffaf6;
          box-shadow: 0 11px 25px rgba(94, 73, 60, 0.09);
        }

        .home-navigation-left {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
        }

        .home-navigation-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #f3e8e0;
          color: #987d6d;
        }

        .home-navigation-title {
          display: block;
          color: #5f5047;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.4;
        }

        .home-navigation-copy {
          display: block;
          margin-top: 3px;
          color: #a08b7f;
          font-size: 11px;
          line-height: 1.45;
        }

        .home-trust-card {
          margin-top: 18px;
          padding: 15px 16px;
          border: 1px solid #dce6d8;
          border-radius: 18px;
          background: #f3f7f1;
          text-align: center;
        }

        .home-trust-title {
          margin: 0;
          color: #64785e;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .home-trust-copy {
          margin: 7px 0 0;
          color: #788571;
          font-size: 11px;
          line-height: 1.75;
        }

        .home-legal {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px 16px;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid #eee3dc;
        }

        .home-legal-link {
          color: #8f7b6e;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
        }

        .home-legal-link:hover {
          text-decoration: underline;
        }

        .home-copyright {
          margin: 10px 0 0;
          color: #b1a097;
          font-size: 10px;
          text-align: center;
        }

        @keyframes homePulse {
          0%,
          100% {
            opacity: 0.48;
            transform: scale(1);
          }

          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        @media (max-width: 480px) {
          .tonari-page {
            padding: 0;
          }

          .home-wrap {
            max-width: none;
          }

          .home-shell {
            min-height: 100vh;
            padding: 21px 18px 26px;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .home-brand-hero {
            padding: 19px 16px 21px;
            border-radius: 24px;
          }

          .home-brand-image {
            width: 82px;
            height: 82px;
            border-radius: 23px;
          }

          .home-brand-name {
            font-size: 35px;
          }

          .home-heading {
            font-size: 27px;
          }
        }

        @media (max-width: 360px) {
          .home-status-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="home-wrap">
        <div className="home-shell">
          <header className="home-brand-hero">
            <div className="home-brand-logo">
              <Image
                src="/icon-512.png"
                alt="となり"
                width={112}
                height={112}
                priority
                className="home-brand-image"
              />

              <div>
                <p className="home-brand-name">
                  となり
                </p>

                <p className="home-brand-tagline">
                  ふたりの気持ちを、
                  <br />
                  毎日そっとつなぐアプリ
                </p>
              </div>
            </div>

            <div className="home-brand-message">
              <p className="home-brand-message-label">
                TODAY&apos;S TONARI
              </p>

              <h1 className="home-heading">
                こんにちは。
                <br />
                今日はこの質問です。
              </h1>
            </div>
          </header>

          {status === "loading" && (
            <div
              style={{
                display: "grid",
                minHeight: 390,
                placeItems: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    margin: "0 auto",
                    borderRadius: "50%",
                    background: "#f0e4dc",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#a38b7a",
                      animation: "homePulse 1.3s ease-in-out infinite",
                    }}
                  />
                </div>

                <p className="tonari-copy" style={{ marginTop: 15 }}>
                  今日の状況を確認しています…
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div
              className="tonari-alert tonari-alert-error"
              style={{ marginTop: 24 }}
            >
              {message}

              <button
                type="button"
                className="tonari-button tonari-button-brown"
                onClick={() => loadHome(true)}
                style={{ marginTop: 16 }}
              >
                もう一度読み込む
              </button>
            </div>
          )}

          {status === "no_question" && (
            <div
              className="tonari-card-soft tonari-center"
              style={{
                marginTop: 24,
                padding: 26,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: '"Zen Old Mincho", serif',
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                今日の質問はまだありません。
              </p>

              <p className="tonari-copy" style={{ marginTop: 10 }}>
                質問が届くまで、少しだけお待ちください。
              </p>
            </div>
          )}

          {question && status !== "loading" && status !== "error" && (
            <>
              <button
                type="button"
                className="home-question-card"
                onClick={handleMainAction}
                disabled={status === "waiting_partner_answer"}
              >
                <div className="home-question-visual">
                  <div className="home-question-orbit home-question-orbit-a" />
                  <div className="home-question-orbit home-question-orbit-b" />

                  <div
                    className="home-question-leaf home-question-leaf-left"
                    aria-hidden="true"
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>

                  <div
                    className="home-question-leaf home-question-leaf-right"
                    aria-hidden="true"
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="home-question-visual-center">
                    <p className="home-question-visual-label">
                      今日のひとこと
                    </p>

                    <p className="home-question-visual-copy">
                      今日のひとことが、
                      <br />
                      明日のふたりをもっと近くに。
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: "18px 20px 21px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#a38b7a",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.09em",
                    }}
                  >
                    今日の質問
                  </p>

                  <p
                    style={{
                      margin: "12px 0 0",
                      color: "#463a33",
                      fontFamily: '"Zen Old Mincho", serif',
                      fontSize: 24,
                      fontWeight: 600,
                      lineHeight: 1.55,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {question.question_text}
                  </p>

                  {status === "waiting_partner_answer" && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 15,
                        color: "#8e7868",
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      <LockIcon />

                      <span>
                        お互いの答えがそろうまで
                        <br />
                        答えは見えません
                      </span>
                    </div>
                  )}
                </div>
              </button>

              <div className="home-status-grid">
                <div
                  style={{
                    padding: "16px 17px",
                    border: `1px solid ${
                      myAnswered ? "#d6e2d3" : "#eadfd7"
                    }`,
                    borderRadius: 18,
                    background: myAnswered ? "#f2f7f0" : "#fffaf6",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#8e7868",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    あなた
                  </p>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: myAnswered ? "#6f8768" : "#9a7967",
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    {myAnswered ? "回答しました" : "未回答です"}
                  </p>
                </div>

                <div
                  style={{
                    padding: "16px 17px",
                    border: `1px solid ${
                      partnerAnswered ? "#d6e2d3" : "#eadfd7"
                    }`,
                    borderRadius: 18,
                    background: partnerAnswered ? "#f2f7f0" : "#fbf6f2",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#8e7868",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    パートナー
                  </p>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: partnerAnswered ? "#6f8768" : "#8e7868",
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    {partnerAnswered
                      ? "回答しました"
                      : couple?.partner_id
                        ? "回答を待っています"
                        : "未参加です"}
                  </p>
                </div>
              </div>

              {status !== "waiting_partner_answer" && (
                <button
                  type="button"
                  className={`tonari-button ${
                    status === "waiting_partner"
                      ? "tonari-button-primary"
                      : "tonari-button-brown"
                  }`}
                  onClick={handleMainAction}
                  style={{ marginTop: 16 }}
                >
                  {actionLabel}
                </button>
              )}

              {status === "waiting_partner_answer" && (
                <div
                  className="tonari-card-soft"
                  style={{
                    marginTop: 16,
                    padding: "17px 18px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#6b5b4d",
                      fontFamily: '"Zen Old Mincho", serif',
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.7,
                    }}
                  >
                    お互いの答えがそろうのを待っています
                  </p>

                  <p
                    className="tonari-copy"
                    style={{
                      marginTop: 7,
                      fontSize: 13,
                    }}
                  >
                    相手が回答すると、自動で切り替わります。
                  </p>
                </div>
              )}
            </>
          )}

          {showNavigation && (
            <div className="home-navigation">
              <button
                type="button"
                className="home-navigation-button"
                onClick={() => router.push("/partner")}
              >
                <span className="home-navigation-left">
                  <span className="home-navigation-icon">
                    <PeopleIcon />
                  </span>

                  <span>
                    <span className="home-navigation-title">
                      ふたりの設定
                    </span>

                    <span className="home-navigation-copy">
                      パートナーとの接続を確認します
                    </span>
                  </span>
                </span>

                <span
                  style={{
                    color: "#a38b7a",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <ChevronIcon />
                </span>
              </button>

              <button
                type="button"
                className="home-navigation-button"
                onClick={() => router.push("/settings")}
              >
                <span className="home-navigation-left">
                  <span className="home-navigation-icon">
                    <SettingsIcon />
                  </span>

                  <span>
                    <span className="home-navigation-title">
                      アカウント設定
                    </span>

                    <span className="home-navigation-copy">
                      名前・契約・ログアウトを管理します
                    </span>
                  </span>
                </span>

                <span
                  style={{
                    color: "#a38b7a",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <ChevronIcon />
                </span>
              </button>
            </div>
          )}

          <section className="home-trust-card" aria-label="安心して使うための案内">
            <p className="home-trust-title">
              二人の答えを、大切に扱います
            </p>
            <p className="home-trust-copy">
              回答は二人の会話のために保存され、
              AIコメントの生成に必要な範囲で利用されます。
            </p>
          </section>

          <nav className="home-legal" aria-label="法務ページ">
            <Link className="home-legal-link" href="/terms">
              利用規約
            </Link>
            <Link className="home-legal-link" href="/privacy">
              プライバシーポリシー
            </Link>
          </nav>

          <p className="home-copyright">
            © 2026 となり
          </p>
        </div>

        <p className="tonari-footer-copy">
          今日が、一番若い二人の日。
        </p>

        {lastUpdated && process.env.NODE_ENV === "development" && (
          <p
            style={{
              margin: "8px 0 0",
              textAlign: "center",
              color: "#b8a49a",
              fontSize: 11,
            }}
          >
            最終確認 {lastUpdated}
          </p>
        )}
      </section>
    </main>
  );
}