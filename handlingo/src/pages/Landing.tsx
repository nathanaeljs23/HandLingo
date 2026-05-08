import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Hand, Shield, Zap, Eye, ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    icon: Eye,
    title: "Real-Time Validation",
    description:
      "GRU neural network analyzes your continuous hand motions and validates gestures with 85%+ confidence.",
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    description:
      "Sub-second inference loop gives you immediate visual confirmation — no waiting, just flowing.",
  },
  {
    icon: Shield,
    title: "Local Processing Only",
    description:
      "Your camera feed never leaves your device. Zero video storage, zero cloud transmission.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Animated Background Decorations */}
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
        <div
          className="absolute bottom-20 right-1/3 w-64 h-64 rounded-full bg-accent/3 blur-3xl animate-pulse"
          style={{ animationDelay: "3s" }}
        />
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Hand className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl text-foreground">
                HandLingo
              </span>
            </div>

            <h1 className="text-display text-foreground text-balance mb-6">
              Speak with your hands.{" "}
              <span className="text-primary">Validated in real-time.</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
              Learn International Sign Language through your webcam. Our GRU
              neural network watches your gestures and confirms your form —
              instantly.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/auth">
                <Button variant="hero" size="xl">
                  Start Learning
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-label text-primary mb-4">How It Works</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              The interface is a mirror that understands you.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: i * 0.1,
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
                className="p-8 rounded-2xl bg-card border border-border"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl bg-card border border-border relative overflow-hidden"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-4">
                Ready to start your journey?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Join learners, travelers, and professionals bridging
                communication gaps with sign language.
              </p>
              <Link to="/auth">
                <Button variant="hero" size="xl">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
