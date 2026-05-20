import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Volume2,
  ArrowLeft,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSignDetector } from "@/hooks/useSignDetector";

type FeedbackState =
  | "idle"
  | "detecting"
  | "success"
  | "low-confidence"
  | "no-hands"
  | "camera-denied"
  | "wrong_sign";

const LearningRoom = () => {
  const { sublevelId } = useParams<{ sublevelId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = session?.access_token ?? "";

  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [reps, setReps] = useState(0);
  const frameMotion = useMotionValue(0);
  const frameDisplay = useTransform(frameMotion, (v) => Math.round(v));

  const { data: sublevel, isLoading, isError, error } = useQuery({
    queryKey: ["sublevel", sublevelId, token],
    queryFn: () => api.getSublevel(token, sublevelId!),
    enabled: !!token && !!sublevelId,
    retry: false,
  });

  const progressMutation = useMutation({
    mutationFn: ({ repsCompleted, confidenceScore }: { repsCompleted: number; confidenceScore: number }) =>
      api.updateProgress(token, sublevelId!, repsCompleted, confidenceScore),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      navigate(`/complete/${sublevelId}`, {
        state: {
          nextSublevelId: data.next_sublevel_id ?? null,
          nextLevelId: data.next_level_id ?? null,
        },
        replace: true,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save progress", description: err.message, variant: "destructive" });
    },
  });

  const requiredReps = sublevel?.required_reps ?? 3;

  const {
    isLoading: detectorLoading,
    loadError,
    state: detectorState,
    countdownValue,
    trackingLost,
    lastResult,
    videoRef,
    startAttempt,
  } = useSignDetector({
    targetSign: sublevel?.sign_target ?? "",
    onResult: (result) => {
      if (result.feedback === "good") {
        const newReps = Math.min(reps + 1, requiredReps);
        setReps(newReps);
        setFeedbackState("success");
        if (newReps >= requiredReps) {
          progressMutation.mutate({ repsCompleted: newReps, confidenceScore: result.score / 100 });
        }
      } else if (result.feedback === "almost") {
        setFeedbackState("low-confidence");
      } else if (result.feedback === "wrong_sign") {
        setFeedbackState("wrong_sign");
      } else if (result.feedback === "not_prepared") {
        setFeedbackState("no-hands");
      }
    },
  });

  useEffect(() => {
    if (trackingLost) setFeedbackState("no-hands");
  }, [trackingLost]);

  useEffect(() => {
    if (loadError) setFeedbackState("camera-denied");
  }, [loadError]);

  useEffect(() => {
    if (detectorState === "RECORDING") {
      frameMotion.set(0);
      const controls = animate(frameMotion, 40, {
        duration: 40 / 30,
        ease: "linear",
      });
      return () => controls.stop();
    }
    frameMotion.set(0);
  }, [detectorState, frameMotion]);

  const handleStart = () => {
    setFeedbackState("detecting");
    startAttempt();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isLocked = message.toLowerCase().includes("locked");
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">
          {isLocked ? "This sublevel is locked. Complete the previous one first." : message}
        </p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const showOverlay = detectorLoading || detectorState === "INITIALIZING";

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div
          className="absolute top-40 right-20 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-32 left-1/4 w-72 h-72 rounded-full bg-primary/3 blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <Navbar />
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Dashboard
            </button>
            <p className="text-label text-primary mb-1">Learning Room</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Sign: "{sublevel?.sign_target}"
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Reps:</span>
            <div className="flex gap-1">
              {Array.from({ length: requiredReps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${i < reps ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-foreground ml-1">
              {reps}/{requiredReps}
            </span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Demo panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-label text-muted-foreground mb-3">Watch Pattern</p>
            <div className="video-card">
              <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                <div className="text-center">
                  <div className="text-6xl mb-4">🤟</div>
                  <p className="text-muted-foreground text-sm">
                    {sublevel?.demo_media_url.includes("placeholder")
                      ? "Demo video coming soon"
                      : sublevel?.sign_target}
                  </p>
                  <Button variant="ghost" size="sm" className="mt-3 gap-2">
                    <Volume2 className="w-4 h-4" /> Replay
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Camera panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-label text-muted-foreground">Your Camera</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" /> Local Processing Only
              </div>
            </div>

            <div
              className={`video-card transition-all duration-300 ${
                feedbackState === "success" ? "ring-2 ring-primary" : ""
              }`}
            >
              {/* Live webcam feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Loading / initialising overlay */}
              {showOverlay && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/80 gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading model…</p>
                </div>
              )}

              {/* Error overlay */}
              {detectorState === "ERROR" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/80 gap-3">
                  <Camera className="w-10 h-10 text-destructive/50" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    {loadError?.message ?? "Camera error"}
                  </p>
                </div>
              )}

              {/* IDLE: Start button */}
              {detectorState === "IDLE" && !showOverlay && (
                <div className="absolute inset-0 flex items-end justify-center pb-8">
                  <Button
                    variant="default"
                    size="lg"
                    className="gap-2 shadow-lg"
                    onClick={handleStart}
                    disabled={progressMutation.isPending}
                  >
                    <Play className="w-4 h-4" /> Start
                  </Button>
                </div>
              )}

              {/* COUNTDOWN overlay */}
              {detectorState === "COUNTDOWN" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    key={countdownValue}
                    initial={{ opacity: 0, scale: 1.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-display text-8xl font-bold text-primary drop-shadow-lg"
                  >
                    {countdownValue}
                  </motion.span>
                </div>
              )}

              {/* RECORDING overlay — bar fills continuously 0 → 100% over the
                  full 1.33s recording window for a smooth, flowing motion. */}
              {detectorState === "RECORDING" && (
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 gap-2">
                  <p className="text-label text-primary">
                    Recording… <motion.span>{frameDisplay}</motion.span>/40
                  </p>
                  <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      key="record-bar"
                      className="h-full bg-primary rounded-full origin-left"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 40 / 30, ease: "linear" }}
                    />
                  </div>
                </div>
              )}

              {/* Vertical confidence bar — fills to the model's confidence
                  for the *target* sign after scoring (0–100%). */}
              <div className="confidence-bar">
                <motion.div
                  className="w-full rounded-full bg-primary origin-bottom"
                  initial={{ height: "0%" }}
                  animate={{ height: `${lastResult ? lastResult.score : 0}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              {/* Prominent confidence readout — shown after scoring */}
              {lastResult && detectorState === "IDLE" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-4 left-4"
                >
                  <p className="font-display text-4xl font-bold text-primary leading-none">
                    {lastResult.score}%
                  </p>
                  <p className="text-label text-muted-foreground mt-1">
                    Confidence — "{sublevel?.sign_target}"
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Feedback toast */}
        <AnimatePresence>
          {feedbackState !== "idle" && feedbackState !== "detecting" && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
            >
              {feedbackState === "success" && (
                <div className="flex items-center gap-3 bg-card border border-primary/30 px-6 py-3 rounded-full shadow-2xl">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="font-display font-semibold text-foreground">
                    {reps >= requiredReps
                      ? "All reps done — saving progress…"
                      : `Rep ${reps}/${requiredReps} — Keep going!`}
                  </span>
                </div>
              )}
              {feedbackState === "low-confidence" && (
                <div className="flex items-center gap-3 bg-card border border-warning/30 px-6 py-3 rounded-full shadow-2xl">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <span className="font-display font-semibold text-foreground">
                    Almost! Complete the full motion clearly.
                  </span>
                </div>
              )}
              {feedbackState === "wrong_sign" && (
                <div className="flex items-center gap-3 bg-card border border-warning/30 px-6 py-3 rounded-full shadow-2xl">
                  <XCircle className="w-5 h-5 text-warning" />
                  <span className="font-display font-semibold text-foreground">
                    That looked like "{lastResult?.predictedLabel}". Try again.
                  </span>
                </div>
              )}
              {feedbackState === "no-hands" && (
                <div className="flex items-center gap-3 bg-card border border-warning/30 px-6 py-3 rounded-full shadow-2xl">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <span className="font-display font-semibold text-foreground">
                    Move to a well-lit area and show your hands.
                  </span>
                </div>
              )}
              {feedbackState === "camera-denied" && (
                <div className="flex items-center gap-3 bg-card border border-destructive/30 px-6 py-3 rounded-full shadow-2xl">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="font-display font-semibold text-foreground">
                    Camera access denied. Enable it in browser settings.
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LearningRoom;
