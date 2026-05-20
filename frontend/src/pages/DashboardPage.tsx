import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  colorClass: string;
  iconBgClass: string;
}

const StatCard = ({ icon, value, label, colorClass, iconBgClass }: StatCardProps) => (
  <div
    className={`flex items-center gap-4 rounded-2xl p-5 flex-1 min-w-0 bg-card border ${colorClass}`}
    style={{ boxShadow: "var(--shadow-card)" }}
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="font-display text-2xl font-bold text-foreground truncate">{value}</p>
      <p className="text-xs text-muted-foreground leading-tight mt-0.5">{label}</p>
    </div>
  </div>
);

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
  const totalReps = completedSublevels.reduce((sum, s) => sum + s.required_reps, 0);
  const bestSign = completedSublevels[completedSublevels.length - 1]?.sign_target ?? "N/A";

  const upcoming: Array<{ sublevel_id: string; sign_target: string; levelTitle: string }> = [];
  for (const level of data?.levels ?? []) {
    for (const sub of level.sublevels) {
      if (sub.status !== "completed" && upcoming.length < 3) {
        upcoming.push({ sublevel_id: sub.sublevel_id, sign_target: sub.sign_target, levelTitle: level.title });
      }
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
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
            className="space-y-8"
          >
            {/* Overview */}
            <div>
              <p className="text-label text-primary mb-2">Your Progress</p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-6">Overview</h1>

              <div className="flex gap-4">
                <StatCard
                  icon={<CheckCircle2 className="w-5 h-5 text-primary" />}
                  value={completedCount}
                  label="Signs Completed This Week"
                  colorClass="border-primary/20"
                  iconBgClass="bg-primary/10"
                />
                <StatCard
                  icon={<XCircle className="w-5 h-5 text-destructive" />}
                  value={0}
                  label="Signs Missed This Week"
                  colorClass="border-destructive/20"
                  iconBgClass="bg-destructive/10"
                />
                <StatCard
                  icon={<RotateCcw className="w-5 h-5 text-accent" />}
                  value={totalReps}
                  label="Total Reps Done"
                  colorClass="border-accent/20"
                  iconBgClass="bg-accent/10"
                />
                <StatCard
                  icon={<Trophy className="w-5 h-5 text-warning" />}
                  value={bestSign}
                  label="Best Sign / Most Accurate"
                  colorClass="border-warning/20"
                  iconBgClass="bg-warning/10"
                />
              </div>
            </div>

            {/* Continue Learning */}
            <div>
              <p className="text-label text-primary mb-2">Up Next</p>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground mb-6">Continue Learning</h2>

              {upcoming.length === 0 ? (
                <p className="text-muted-foreground text-sm">You've completed all signs — amazing work!</p>
              ) : (
                <div className="flex gap-4">
                  {upcoming.map((item, i) => (
                    <motion.div
                      key={item.sublevel_id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 30 }}
                      className="flex-1 rounded-2xl bg-card border border-border p-5"
                      style={{ boxShadow: "var(--shadow-card)" }}
                    >
                      <p className="font-display font-semibold text-primary text-base mb-1">{item.sign_target}</p>
                      <p className="text-xs text-muted-foreground">{item.levelTitle}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
