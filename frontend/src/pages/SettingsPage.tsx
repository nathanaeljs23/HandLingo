import { motion } from "framer-motion";
import { User, Camera, Bell, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const sections = [
    {
      title: "Profile",
      icon: User,
      items: [
        { label: "Email", value: user?.email ?? "—", type: "text" as const },
        { label: "Account ID", value: user?.id ? user.id.slice(0, 8) + "…" : "—", type: "text" as const },
      ],
    },
    {
      title: "Camera & Input",
      icon: Camera,
      items: [
        { label: "Camera Device", value: "default", type: "select" as const },
        { label: "Mirror Mode", value: "On", type: "toggle" as const },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        { label: "Achievement Alerts", value: "On", type: "toggle" as const },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-32 left-1/4 w-72 h-72 rounded-full bg-primary/3 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <Navbar />
      <div className="max-w-2xl mx-auto px-6 pt-28 pb-20 relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-label text-primary mb-2">Preferences</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-10">Settings</h1>
        </motion.div>

        <div className="space-y-8">
          {sections.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.08, type: "spring", stiffness: 300, damping: 30 }}
              className="rounded-2xl bg-card border border-border overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <section.icon className="w-5 h-5 text-accent" />
                <h2 className="font-display font-semibold text-foreground">{section.title}</h2>
              </div>
              <div className="divide-y divide-border">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-6 py-4">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-2">
                      {item.type === "text" && (
                        <span className="text-sm font-medium text-foreground">{item.value}</span>
                      )}
                      {item.type === "toggle" && (
                        <div className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${item.value === "On" ? "bg-primary" : "bg-muted"}`}>
                          <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${item.value === "On" ? "translate-x-4" : "translate-x-0"}`} />
                        </div>
                      )}
                      {item.type === "select" && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-foreground">Default Camera</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-10 flex justify-center">
          <Button
            variant="outline"
            className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
