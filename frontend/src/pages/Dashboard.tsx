import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Lock, Play, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { api, type SublevelInRoadmap } from "@/lib/api";

type NodeStatus = "completed" | "active" | "locked";

const statusStyles: Record<NodeStatus, string> = {
  completed: "node-complete",
  active: "node-active animate-pulse-glow cursor-pointer",
  locked: "node-locked cursor-not-allowed opacity-60",
};

const StatusIcon = ({ status }: { status: NodeStatus }) => {
  if (status === "completed") return <Check className="w-6 h-6 text-primary" />;
  if (status === "active") return <Play className="w-6 h-6 text-accent-foreground" />;
  return <Lock className="w-5 h-5 text-muted-foreground" />;
};

const Dashboard = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["roadmap", token],
    queryFn: () => api.getRoadmap(token),
    enabled: !!token,
  });

  const allSublevels = data?.levels.flatMap((l) => l.sublevels) ?? [];
  const completedCount = allSublevels.filter((s) => s.status === "completed").length;
  const total = allSublevels.length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const handleNodeClick = (sub: SublevelInRoadmap) => {
    if (sub.status === "active" || sub.status === "completed") {
      navigate(`/learn/${sub.sublevel_id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load roadmap. Make sure the backend is running.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-20 relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <p className="text-label text-primary mb-2">Your Journey</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-4">Learning Path</h1>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{progress}%</span>
            <div className="flex items-center gap-1 text-warning">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-bold">{completedCount}</span>
            </div>
          </div>
        </motion.div>

        <div className="space-y-16">
          {(data?.levels ?? []).map((level) => (
            <motion.div
              key={level.level_id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <p className="text-label text-muted-foreground mb-6">
                Level {level.order_index} — {level.title}
              </p>
              <div className="flex flex-wrap gap-8 justify-center">
                {level.sublevels.map((sub, i) => {
                  const status = sub.status as NodeStatus;
                  const clickable = status === "active" || status === "completed";
                  return (
                    <motion.div
                      key={sub.sublevel_id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 30 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <motion.div
                        whileHover={clickable ? { scale: 1.1 } : {}}
                        whileTap={clickable ? { scale: 0.95 } : {}}
                        className={statusStyles[status]}
                        onClick={() => handleNodeClick(sub)}
                      >
                        <StatusIcon status={status} />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-sm font-display font-semibold text-foreground">{sub.sign_target}</p>
                        <p className="text-xs text-muted-foreground">
                          {status === "completed" ? "Mastered" : status === "active" ? "In Progress" : "Locked"}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
