import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, AlertTriangle, CheckCircle2, XCircle, Shield, Volume2, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type FeedbackState = "idle" | "detecting" | "success" | "low-confidence" | "no-hands" | "camera-denied";

const LearningRoom = () => {
  const { sublevelId } = useParams<{ sublevelId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = session?.access_token ?? "";

  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [confidence, setConfidence] = useState(0);
  const [reps, setReps] = useState(0);

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
      toast({ title: "Level up!", description: data.message });
      if (data.next_sublevel_id) {
        setTimeout(() => navigate(`/learn/${data.next_sublevel_id}`), 1500);
      } else {
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Could not save progress", description: err.message, variant: "destructive" });
    },
  });

  const requiredReps = sublevel?.required_reps ?? 3;

  const simulateDetection = (targetConfidence: number) => {
    setFeedbackState("detecting");
    setConfidence(0);
    let c = 0;
    const interval = setInterval(() => {
      c += Math.random() * 15;
      if (c >= targetConfidence) {
        c = targetConfidence;
        clearInterval(interval);
        setConfidence(c);
        if (c >= 85) {
          setFeedbackState("success");
          const newReps = Math.min(reps + 1, requiredReps);
          setReps(newReps);
          if (newReps >= requiredReps) {
            progressMutation.mutate({ repsCompleted: newReps, confidenceScore: c / 100 });
          }
        } else {
          setFeedbackState("low-confidence");
        }
      }
      setConfidence(Math.min(c, 100));
    }, 100);
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
        <p className="text-muted-foreground">{isLocked ? "This sublevel is locked. Complete the previous one first." : message}</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-32 left-1/4 w-72 h-72 rounded-full bg-primary/3 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <Navbar />
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors">
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
                <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < reps ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
            <span className="text-sm font-bold text-foreground ml-1">{reps}/{requiredReps}</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Demo panel */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
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
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-label text-muted-foreground">Your Camera</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" /> Local Processing Only
              </div>
            </div>
            <div className={`video-card transition-all duration-300 ${feedbackState === "success" ? "ring-2 ring-primary" : ""}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted to-secondary flex items-center justify-center">
                <Camera className="w-16 h-16 text-muted-foreground/30" />
              </div>
              {(feedbackState === "detecting" || feedbackState === "success") && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} className="text-primary text-8xl">
                    ✋
                  </motion.div>
                </div>
              )}
              <div className="confidence-bar">
                <motion.div
                  className="w-full rounded-full bg-primary origin-bottom"
                  initial={{ height: "0%" }}
                  animate={{ height: `${confidence}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {confidence > 0 && (
                <div className="absolute top-4 left-4">
                  <p className="text-label text-primary">{Math.round(confidence)}% Confidence</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Simulation controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-3 justify-center mt-10"
        >
          <Button variant="success" onClick={() => simulateDetection(92)} disabled={progressMutation.isPending}>
            <CheckCircle2 className="w-4 h-4" /> Simulate Success (92%)
          </Button>
          <Button variant="outline" onClick={() => simulateDetection(62)}>
            <XCircle className="w-4 h-4" /> Simulate Low Confidence (62%)
          </Button>
          <Button variant="outline" onClick={() => setFeedbackState("no-hands")}>
            <AlertTriangle className="w-4 h-4" /> Simulate No Hands
          </Button>
          <Button variant="outline" onClick={() => setFeedbackState("camera-denied")}>
            <Camera className="w-4 h-4" /> Simulate Camera Denied
          </Button>
          <Button variant="ghost" onClick={() => { setFeedbackState("idle"); setConfidence(0); setReps(0); }}>
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
        </motion.div>

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
                    {reps >= requiredReps ? "All reps done — saving progress…" : `Rep ${reps}/${requiredReps} — Keep going!`}
                  </span>
                </div>
              )}
              {feedbackState === "low-confidence" && (
                <div className="flex items-center gap-3 bg-card border border-warning/30 px-6 py-3 rounded-full shadow-2xl">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <span className="font-display font-semibold text-foreground">Almost! Complete the full motion clearly.</span>
                </div>
              )}
              {feedbackState === "no-hands" && (
                <div className="flex items-center gap-3 bg-card border border-warning/30 px-6 py-3 rounded-full shadow-2xl">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <span className="font-display font-semibold text-foreground">Move to a well-lit area and show your hands.</span>
                </div>
              )}
              {feedbackState === "camera-denied" && (
                <div className="flex items-center gap-3 bg-card border border-destructive/30 px-6 py-3 rounded-full shadow-2xl">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="font-display font-semibold text-foreground">Camera access denied. Enable it in browser settings.</span>
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
