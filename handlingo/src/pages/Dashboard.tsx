import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Lock, Play, Star } from "lucide-react";
import Navbar from "@/components/Navbar";

type NodeStatus = "complete" | "active" | "locked";

interface LevelNode {
  id: string;
  title: string;
  sign: string;
  status: NodeStatus;
  level: number;
  sublevel: number;
}

const roadmapData: LevelNode[] = [
  { id: "1-1", title: "Hello", sign: "👋", status: "complete", level: 1, sublevel: 1 },
  { id: "1-2", title: "Thank You", sign: "🙏", status: "complete", level: 1, sublevel: 2 },
  { id: "1-3", title: "Please", sign: "🤲", status: "complete", level: 1, sublevel: 3 },
  { id: "2-1", title: "Yes", sign: "👍", status: "active", level: 2, sublevel: 1 },
  { id: "2-2", title: "No", sign: "🙅", status: "locked", level: 2, sublevel: 2 },
  { id: "2-3", title: "Help", sign: "🆘", status: "locked", level: 2, sublevel: 3 },
  { id: "3-1", title: "Sorry", sign: "😔", status: "locked", level: 3, sublevel: 1 },
  { id: "3-2", title: "Goodbye", sign: "✋", status: "locked", level: 3, sublevel: 2 },
  { id: "3-3", title: "Friend", sign: "🤝", status: "locked", level: 3, sublevel: 3 },
];

const statusStyles: Record<NodeStatus, string> = {
  complete: "node-complete",
  active: "node-active animate-pulse-glow cursor-pointer",
  locked: "node-locked cursor-not-allowed opacity-60",
};

const StatusIcon = ({ status }: { status: NodeStatus }) => {
  if (status === "complete") return <Check className="w-6 h-6 text-primary" />;
  if (status === "active") return <Play className="w-6 h-6 text-accent-foreground" />;
  return <Lock className="w-5 h-5 text-muted-foreground" />;
};

const Dashboard = () => {
  const completedCount = roadmapData.filter((n) => n.status === "complete").length;
  const progress = Math.round((completedCount / roadmapData.length) * 100);

  const levels = Array.from(new Set(roadmapData.map((n) => n.level)));

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-primary/3 blur-3xl" />
      </div>
      
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-20 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <p className="text-label text-primary mb-2">Your Journey</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-4">
            Learning Path
          </h1>
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

        {/* Roadmap */}
        <div className="space-y-16">
          {levels.map((level) => {
            const nodes = roadmapData.filter((n) => n.level === level);
            return (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <p className="text-label text-muted-foreground mb-6">Level {level}</p>
                <div className="flex flex-wrap gap-8 justify-center">
                  {nodes.map((node, i) => (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 30 }}
                      className="flex flex-col items-center gap-3"
                    >
                      {node.status === "active" ? (
                        <Link to="/learn">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className={statusStyles[node.status]}
                          >
                            <span className="text-2xl">{node.sign}</span>
                          </motion.div>
                        </Link>
                      ) : (
                        <div className={statusStyles[node.status]}>
                          {node.status === "locked" ? (
                            <StatusIcon status={node.status} />
                          ) : (
                            <StatusIcon status={node.status} />
                          )}
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-sm font-display font-semibold text-foreground">{node.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {node.status === "complete" ? "Mastered" : node.status === "active" ? "In Progress" : "Locked"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
