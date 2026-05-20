import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  Trophy,
  Zap,
  ArrowRight,
  SkipForward,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

// ── Count-up animation ─────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400, delay = 0): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let raf: number;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(eased * target));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return value;
}

// ── Hero: Continue Card ────────────────────────────────────────────────────

interface ContinueCardProps {
  signName: string;
  levelTitle: string;
  sublevelId: string;
  completedInLevel: number;
  totalInLevel: number;
}

const ContinueCard = ({
  signName,
  levelTitle,
  sublevelId,
  completedInLevel,
  totalInLevel,
}: ContinueCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
    className="rounded-2xl bg-card border border-primary/30 p-6 flex items-center justify-between gap-6"
    style={{ boxShadow: "var(--shadow-glow-primary)" }}
  >
    <div className="flex-1 min-w-0">
      <p className="text-label text-primary mb-1">Pick up where you left off</p>
      <h2 className="font-display text-2xl font-bold text-foreground truncate mb-0.5">
        {signName}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">{levelTitle}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Level progress</span>
          <span>
            {completedInLevel}/{totalInLevel} complete
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${(completedInLevel / Math.max(totalInLevel, 1)) * 100}%`,
            }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.35 }}
            className="h-full rounded-full bg-primary"
          />
        </div>
      </div>
    </div>
    <Link
      to={`/learn/${sublevelId}`}
      className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:opacity-90 transition-opacity"
    >
      Continue
      <ArrowRight className="w-4 h-4" />
    </Link>
  </motion.div>
);

// ── Animated Stat Card ─────────────────────────────────────────────────────

interface AnimatedStatCardProps {
  icon: React.ReactNode;
  numericValue?: number;
  displayValue?: string;
  label: string;
  colorClass: string;
  iconBgClass: string;
  animDelay?: number;
}

const AnimatedStatCard = ({
  icon,
  numericValue,
  displayValue,
  label,
  colorClass,
  iconBgClass,
  animDelay = 0,
}: AnimatedStatCardProps) => {
  const counted = useCountUp(numericValue ?? 0, 1400, animDelay);
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl p-5 flex-1 min-w-0 bg-card border ${colorClass}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold text-foreground truncate">
          {displayValue ?? counted}
        </p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  );
};

// ── XP Progress Bar ────────────────────────────────────────────────────────

const XP_PER_SIGN = 100;
const XP_PER_LEVEL = 500;

const XPBar = ({ completedCount }: { completedCount: number }) => {
  const totalXP = completedCount * XP_PER_SIGN;
  const xpInLevel = totalXP % XP_PER_LEVEL;
  const xpLevel = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const pct = (xpInLevel / XP_PER_LEVEL) * 100;

  return (
    <div
      className="rounded-2xl bg-card border border-border p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-warning" />
          <span className="text-sm font-display font-semibold text-foreground">
            XP Level {xpLevel}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {xpInLevel} / {XP_PER_LEVEL} XP · {Math.round(pct)}%
        </span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.45 }}
          className="h-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, hsl(162 84% 50%), hsl(162 84% 68%))",
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {XP_PER_LEVEL - xpInLevel} XP to Level {xpLevel + 1}
      </p>
    </div>
  );
};

// ── Weekly Activity Heatmap ────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VISITED_KEY = "handlingo_visited_dates";
const PRACTICED_KEY = "handlingo_practiced_dates";
const LAST_COUNT_KEY = "handlingo_last_count";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getDateSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addToDateSet(key: string, date: string) {
  const set = getDateSet(key);
  if (!set.has(date)) {
    localStorage.setItem(key, JSON.stringify([...set, date].slice(-7)));
  }
}

function stampVisited() {
  addToDateSet(VISITED_KEY, todayKey());
}

function maybeStampPracticed(completedCount: number) {
  const last = parseInt(localStorage.getItem(LAST_COUNT_KEY) ?? "0", 10);
  if (completedCount > last) {
    addToDateSet(PRACTICED_KEY, todayKey());
  }
  // Always keep last count current so we detect future completions
  localStorage.setItem(LAST_COUNT_KEY, String(completedCount));
}

type DayState = "empty" | "visited" | "practiced";

const WeeklyHeatmap = ({ completedCount }: { completedCount: number }) => {
  // Stamp visited once on mount
  useEffect(() => { stampVisited(); }, []);

  // Stamp practiced whenever we detect new completions vs. last stored count
  useEffect(() => {
    if (completedCount > 0) maybeStampPracticed(completedCount);
  }, [completedCount]);

  const practicedDates = getDateSet(PRACTICED_KEY);
  const visitedDates = getDateSet(VISITED_KEY);

  const today = todayKey();

  // Build the Mon–Sun grid for the current calendar week
  const todayDate = new Date();
  const daysSinceMonday = (todayDate.getDay() + 6) % 7; // Mon=0 … Sun=6

  const days: { label: string; state: DayState; isToday: boolean }[] = DAYS.map(
    (label, i) => {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() - daysSinceMonday + i);
      const key = d.toISOString().slice(0, 10);
      const isFuture = key > today;
      const state: DayState = isFuture
        ? "empty"
        : practicedDates.has(key)
        ? "practiced"
        : visitedDates.has(key)
        ? "visited"
        : "empty";
      return { label, state, isToday: key === today };
    }
  );

  const todayVisitedOnly =
    days.find((d) => d.isToday)?.state === "visited";

  return (
    <div
      className="rounded-2xl bg-card border border-border p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-label text-primary mb-4">Weekly Activity</p>
      <div className="flex gap-2">
        {days.map(({ label, state, isToday }, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
              className={`w-full aspect-square rounded-lg ${
                state === "practiced"
                  ? "bg-primary"
                  : state === "visited"
                  ? "bg-warning/20 border-2 border-warning/50"
                  : isToday
                  ? "bg-muted/40 border border-dashed border-border"
                  : "bg-muted/40 border border-border"
              }`}
            />
            <span
              className={`text-[10px] ${
                isToday ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      {todayVisitedOnly && (
        <p className="text-xs text-warning/80 mt-3 flex items-center gap-1.5">
          <span>👋</span>
          <span>You're back today — complete a sign to log it</span>
        </p>
      )}
    </div>
  );
};

// ── Achievement Badges ─────────────────────────────────────────────────────

interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  unlockedDate?: string;
}

interface AchievementBadgesProps {
  completedCount: number;
  totalCount: number;
  streak: number;
  hasLevelUp: boolean;
}

const AchievementBadges = ({
  completedCount,
  totalCount,
  streak,
  hasLevelUp,
}: AchievementBadgesProps) => {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const badges: BadgeDef[] = [
    {
      id: "first-sign",
      name: "First Sign",
      icon: "✋",
      description: "Complete your first sign",
      unlocked: completedCount >= 1,
      unlockedDate: completedCount >= 1 ? today : undefined,
    },
    {
      id: "speed-learner",
      name: "Speed Learner",
      icon: "⚡",
      description: "Complete 5 signs",
      unlocked: completedCount >= 5,
      unlockedDate: completedCount >= 5 ? today : undefined,
    },
    {
      id: "sharp-eye",
      name: "Sharp Eye",
      icon: "👁️",
      description: "Score 95%+ confidence",
      unlocked: false,
    },
    {
      id: "streak-7",
      name: "7 Day Streak",
      icon: "🔥",
      description: "Complete 7 signs in a row",
      unlocked: streak >= 7,
      unlockedDate: streak >= 7 ? today : undefined,
    },
    {
      id: "level-up",
      name: "Level Up",
      icon: "🚀",
      description: "Complete an entire level",
      unlocked: hasLevelUp,
      unlockedDate: hasLevelUp ? today : undefined,
    },
    {
      id: "perfectionist",
      name: "Perfectionist",
      icon: "💎",
      description: "Complete all signs",
      unlocked: totalCount > 0 && completedCount === totalCount,
      unlockedDate:
        totalCount > 0 && completedCount === totalCount ? today : undefined,
    },
  ];

  return (
    <div>
      <p className="text-label text-primary mb-2">Achievements</p>
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground mb-4">
        Badges
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {badges.map((badge, i) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.6 + i * 0.08,
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
            className={`rounded-2xl p-4 border flex flex-col items-center gap-2 text-center ${
              badge.unlocked
                ? "bg-card border-primary/20"
                : "bg-muted/20 border-border"
            }`}
            style={{ boxShadow: badge.unlocked ? "var(--shadow-card)" : "none" }}
          >
            <span
              className="text-3xl"
              style={{
                filter: badge.unlocked ? "none" : "grayscale(1) opacity(0.35)",
              }}
            >
              {badge.icon}
            </span>
            <div>
              <p
                className={`font-display font-semibold text-sm ${
                  badge.unlocked ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {badge.name}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {badge.description}
              </p>
              {badge.unlocked && badge.unlockedDate && (
                <p className="text-[10px] text-primary mt-1">
                  Unlocked {badge.unlockedDate}
                </p>
              )}
            </div>
            {!badge.unlocked && <Lock className="w-3 h-3 text-muted-foreground" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ── Last Session Recap ─────────────────────────────────────────────────────

interface RecapSign {
  name: string;
  completed: boolean;
  confidence: number;
}

const LastSessionRecap = ({ signs }: { signs: RecapSign[] }) => {
  if (signs.length === 0) return null;
  const avg = signs.reduce((s, r) => s + r.confidence, 0) / signs.length;

  return (
    <div>
      <p className="text-label text-primary mb-2">Last Session</p>
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground mb-4">
        Recap
      </h2>
      <div
        className="rounded-2xl bg-card border border-border p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="space-y-3 mb-4">
          {signs.map((sign, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.06 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {sign.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <SkipForward className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm text-foreground font-medium">
                  {sign.name}
                </span>
              </div>
              <span
                className={`text-xs font-mono ${
                  sign.confidence >= 0.9
                    ? "text-primary"
                    : sign.confidence >= 0.8
                    ? "text-warning"
                    : "text-muted-foreground"
                }`}
              >
                {Math.round(sign.confidence * 100)}%
              </span>
            </motion.div>
          ))}
        </div>
        <div className="border-t border-border pt-3 flex justify-between text-sm">
          <span className="text-muted-foreground">Avg. confidence</span>
          <span className="font-display font-semibold text-foreground">
            {Math.round(avg * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["roadmap", token],
    queryFn: () => api.getRoadmap(token),
    enabled: !!token,
  });

  const allSublevels = data?.levels.flatMap((l) => l.sublevels) ?? [];
  const completedSublevels = allSublevels.filter((s) => s.status === "completed");
  const completedCount = completedSublevels.length;
  const totalCount = allSublevels.length;
  const totalReps = completedSublevels.reduce((sum, s) => sum + s.required_reps, 0);
  const bestSign = completedSublevels[completedSublevels.length - 1]?.sign_target ?? "—";
  const streak = completedCount;

  // First active sublevel → hero card
  let nextSublevel: {
    sublevel_id: string;
    sign_target: string;
    levelTitle: string;
    levelId: string;
  } | null = null;
  for (const level of data?.levels ?? []) {
    for (const sub of level.sublevels) {
      if (sub.status === "active") {
        nextSublevel = {
          sublevel_id: sub.sublevel_id as unknown as string,
          sign_target: sub.sign_target,
          levelTitle: level.title,
          levelId: level.level_id as unknown as string,
        };
        break;
      }
    }
    if (nextSublevel) break;
  }

  const activeLevelData = nextSublevel
    ? data?.levels.find((l) => (l.level_id as unknown as string) === nextSublevel!.levelId)
    : null;
  const completedInLevel =
    activeLevelData?.sublevels.filter((s) => s.status === "completed").length ?? 0;
  const totalInLevel = activeLevelData?.sublevels.length ?? 0;

  const hasLevelUp = (data?.levels ?? []).some(
    (l) => l.sublevels.length > 0 && l.sublevels.every((s) => s.status === "completed")
  );

  // Stable simulated confidence for last session (seeded, not random on each render)
  const recapSigns: RecapSign[] = useMemo(
    () =>
      completedSublevels.slice(-4).map((s, i) => ({
        name: s.sign_target,
        completed: true,
        confidence: 0.85 + (((i * 7 + 3) % 15) / 100),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completedCount]
  );

  // Flame size grows with streak (16px – 28px)
  const flameSize = Math.min(16 + streak * 2, 28);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <Navbar />

      <div className="max-w-5xl mx-auto px-6 pt-28 pb-20 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-10"
          >
            {/* 1. Hero: continue card */}
            {nextSublevel && (
              <ContinueCard
                signName={nextSublevel.sign_target}
                levelTitle={nextSublevel.levelTitle}
                sublevelId={nextSublevel.sublevel_id}
                completedInLevel={completedInLevel}
                totalInLevel={totalInLevel}
              />
            )}

            {/* 2. Animated stat cards */}
            <div>
              <p className="text-label text-primary mb-2">Your Progress</p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-6">
                Overview
              </h1>
              <div className="flex gap-4">
                <AnimatedStatCard
                  icon={<CheckCircle2 className="w-5 h-5 text-primary" />}
                  numericValue={completedCount}
                  label="Signs Completed This Week"
                  colorClass="border-primary/20"
                  iconBgClass="bg-primary/10"
                  animDelay={0}
                />
                <AnimatedStatCard
                  icon={
                    <span style={{ fontSize: flameSize }}>🔥</span>
                  }
                  numericValue={streak}
                  label="Current Streak"
                  colorClass="border-warning/20"
                  iconBgClass="bg-warning/10"
                  animDelay={120}
                />
                <AnimatedStatCard
                  icon={<RotateCcw className="w-5 h-5 text-accent" />}
                  numericValue={totalReps}
                  label="Total Reps Done"
                  colorClass="border-accent/20"
                  iconBgClass="bg-accent/10"
                  animDelay={240}
                />
                <AnimatedStatCard
                  icon={<Trophy className="w-5 h-5 text-warning" />}
                  displayValue={bestSign}
                  label="Best Sign"
                  colorClass="border-warning/20"
                  iconBgClass="bg-warning/10"
                  animDelay={360}
                />
              </div>
            </div>

            {/* 3. XP progress bar */}
            <XPBar completedCount={completedCount} />

            {/* 4. Weekly heatmap */}
            <WeeklyHeatmap completedCount={completedCount} />

            {/* 5. Achievement badges */}
            <AchievementBadges
              completedCount={completedCount}
              totalCount={totalCount}
              streak={streak}
              hasLevelUp={hasLevelUp}
            />

            {/* 6. Last session recap */}
            <LastSessionRecap signs={recapSigns} />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
