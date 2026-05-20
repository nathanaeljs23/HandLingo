import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Lightbulb, Target, ArrowRight, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface LocationState {
  nextSublevelId: string | null;
  nextLevelId: string | null;
}

const SignCompletePage = () => {
  const { sublevelId } = useParams<{ sublevelId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const token = session?.access_token ?? "";

  const state = (location.state ?? {}) as Partial<LocationState>;
  const nextSublevelId = state.nextSublevelId ?? null;

  const { data: sublevel, isLoading } = useQuery({
    queryKey: ["sublevel", sublevelId, token],
    queryFn: () => api.getSublevel(token, sublevelId!),
    enabled: !!token && !!sublevelId,
  });

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [quizLocked, setQuizLocked] = useState(false);
  const [quizSkipped, setQuizSkipped] = useState(false);
  const [bonusEarned, setBonusEarned] = useState(false);

  const handleOptionClick = (idx: number) => {
    if (quizLocked || quizSkipped) return;
    setSelectedIndex(idx);
    setQuizLocked(true);
    if (idx === sublevel?.quiz_answer_index) {
      setBonusEarned(true);
    }
  };

  const handleContinue = () => {
    if (nextSublevelId) {
      navigate(`/learn/${nextSublevelId}`);
    } else {
      navigate("/learn");
    }
  };

  const handlePracticeAgain = () => {
    navigate(`/learn/${sublevelId}`);
  };

  if (isLoading || !sublevel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const signName = sublevel.sign_target.toUpperCase();
  const hasQuiz = sublevel.quiz_question && sublevel.quiz_options;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <Navbar />

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-24 relative z-10 space-y-8">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center gap-4"
        >
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
            className="w-24 h-24 rounded-full bg-primary/15 border-4 border-primary flex items-center justify-center"
            style={{ boxShadow: "var(--shadow-glow-primary)" }}
          >
            <motion.svg viewBox="0 0 24 24" className="w-12 h-12" initial="hidden" animate="visible">
              <motion.path
                d="M5 13l4 4L19 7"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                variants={{
                  hidden: { pathLength: 0, opacity: 0 },
                  visible: { pathLength: 1, opacity: 1, transition: { duration: 0.6, delay: 0.4, ease: "easeOut" } },
                }}
              />
            </motion.svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-2"
          >
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">Sign Complete!</h1>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="font-display font-bold text-lg text-primary tracking-widest">{signName}</span>
            </div>
            <p className="font-display text-xl font-bold text-primary">+50 XP</p>
          </motion.div>
        </motion.div>

        {/* ── When to use ── */}
        {sublevel.use_case && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 28 }}
            className="rounded-2xl bg-card border border-border p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-display font-semibold text-lg text-foreground">When to use this sign</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">{sublevel.use_case}</p>
          </motion.div>
        )}

        {/* ── Sentence examples ── */}
        {sublevel.sentence_examples && sublevel.sentence_examples.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, type: "spring", stiffness: 260, damping: 28 }}
            className="rounded-2xl bg-card border border-border p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-accent" />
              </div>
              <h2 className="font-display font-semibold text-lg text-foreground">Example sentences in ISL</h2>
            </div>
            <div className="space-y-5">
              {sublevel.sentence_examples.map((ex, i) => (
                <div key={i}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {ex.isl.map((word, wi) => (
                      <span key={wi} className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-secondary border border-border font-display font-bold text-sm text-foreground tracking-wide">
                          {word}
                        </span>
                        {wi < ex.isl.length - 1 && (
                          <span className="text-muted-foreground text-sm font-bold">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground italic">"{ex.english}"</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Cultural note ── */}
        {sublevel.cultural_note && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36, type: "spring", stiffness: 260, damping: 28 }}
            className="rounded-2xl bg-accent/5 border border-accent/25 p-6"
            style={{ boxShadow: "var(--shadow-glow-accent)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-accent" />
              </div>
              <h2 className="font-display font-semibold text-lg text-foreground">Deaf Culture Note</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">{sublevel.cultural_note}</p>
          </motion.div>
        )}

        {/* ── Bonus quiz ── */}
        {hasQuiz && !quizSkipped && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, type: "spring", stiffness: 260, damping: 28 }}
            className="rounded-2xl bg-card border border-border p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-start justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-semibold text-lg text-foreground">
                  Bonus Quiz 🎯 — earn +20 XP
                </h2>
              </div>
              {!quizLocked && (
                <button
                  onClick={() => setQuizSkipped(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
                >
                  Skip
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-5">Optional — no penalty for wrong answers</p>

            <p className="font-display font-medium text-foreground mb-4">{sublevel.quiz_question}</p>

            <div className="space-y-3">
              {sublevel.quiz_options!.map((opt, idx) => {
                const isCorrect = idx === sublevel.quiz_answer_index;
                const isSelected = idx === selectedIndex;

                let cardClass = "rounded-xl border p-4 text-sm font-medium transition-all cursor-pointer ";
                if (!quizLocked) {
                  cardClass += "bg-secondary border-border hover:border-primary/40 hover:bg-primary/5 text-foreground";
                } else if (isSelected && isCorrect) {
                  cardClass += "bg-primary/10 border-primary/40 text-primary cursor-default";
                } else if (isSelected && !isCorrect) {
                  cardClass += "bg-destructive/10 border-destructive/40 text-destructive cursor-default";
                } else if (!isSelected && isCorrect && quizLocked) {
                  cardClass += "bg-primary/10 border-primary/40 text-primary cursor-default";
                } else {
                  cardClass += "bg-secondary/50 border-border/50 text-muted-foreground cursor-default opacity-50";
                }

                return (
                  <motion.div
                    key={idx}
                    className={cardClass}
                    onClick={() => handleOptionClick(idx)}
                    whileHover={!quizLocked ? { scale: 1.01 } : {}}
                    whileTap={!quizLocked ? { scale: 0.99 } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt}</span>
                      {quizLocked && isCorrect && <Check className="w-4 h-4" />}
                      {quizLocked && isSelected && !isCorrect && <X className="w-4 h-4" />}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <AnimatePresence>
              {quizLocked && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 rounded-xl p-4 flex items-center gap-3 ${
                    bonusEarned ? "bg-primary/10 border border-primary/20" : "bg-destructive/10 border border-destructive/20"
                  }`}
                >
                  {bonusEarned ? (
                    <>
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-display font-semibold text-primary">Correct! +20 XP earned</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-destructive shrink-0" />
                      <span className="font-display font-semibold text-destructive">
                        Not quite — the correct answer is highlighted above
                      </span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-4 pt-2"
        >
          <Button
            variant="outline"
            size="lg"
            className="flex-1 gap-2 border-border text-foreground hover:bg-secondary"
            onClick={handlePracticeAgain}
          >
            <RotateCcw className="w-4 h-4" />
            Practice Again
          </Button>
          <Button
            variant="hero"
            size="lg"
            className="flex-1 gap-2"
            onClick={handleContinue}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default SignCompletePage;
