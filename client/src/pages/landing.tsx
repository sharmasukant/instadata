import { Link } from "react-router";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Zap, LayoutDashboard } from "lucide-react";
import { PLATFORMS } from "@/lib/platforms";
import { cn } from "@/lib/utils";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-x-hidden selection:bg-primary/20">
      {/* Navigation */}
      <header className="h-[72px] border-b border-border/40 bg-background/60 backdrop-blur-xl fixed top-0 w-full z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">
            InstaData
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button className="rounded-full shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-[72px]">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 lg:pt-36 lg:pb-40 px-6 overflow-hidden">
          {/* Background Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/30 rounded-full blur-[100px] -z-10 pointer-events-none" />
          
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Now supporting 8 platforms
              </span>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8">
                Social Analytics <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-foreground">
                  Simplified.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                Connect your social media accounts across Instagram, YouTube, TikTok, and more. 
                Get real-time insights, engagement metrics, and estimated revenue in one beautiful dashboard.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/dashboard">
                  <Button size="lg" className="rounded-full h-14 px-8 text-base shadow-xl shadow-primary/25 transition-all hover:-translate-y-1 w-full sm:w-auto">
                    Start Tracking Free
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-base bg-background/50 backdrop-blur-sm w-full sm:w-auto border-border hover:bg-muted">
                  View Demo
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-2 shadow-2xl relative overflow-hidden"
            >
              {/* Mock Dashboard UI */}
              <div className="rounded-xl border border-border/50 bg-background overflow-hidden flex h-[500px]">
                <div className="w-64 border-r border-border/50 hidden md:block bg-card/30 p-4 space-y-2">
                  <div className="h-8 bg-muted rounded-md mb-8 w-3/4" />
                  <div className="h-10 bg-primary/10 rounded-lg" />
                  <div className="h-10 bg-muted/50 rounded-lg" />
                  <div className="h-10 bg-muted/50 rounded-lg" />
                </div>
                <div className="flex-1 p-6 md:p-8 flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <div className="h-8 bg-muted rounded-md w-48" />
                    <div className="h-10 w-32 bg-primary rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-28 rounded-xl border border-border/50 bg-card/50" />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="rounded-xl border border-border/50 bg-card/50" />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        {/* Platforms Section */}
        <section className="py-24 px-6 bg-muted/30">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Supported Platforms</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-16">
              Track analytics for all your major social media profiles automatically. No manual data entry required.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Object.values(PLATFORMS).map((platform, index) => (
                <motion.div
                  key={platform.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-primary/30 transition-colors"
                >
                  <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-white", platform.bgClass)}>
                    <platform.icon className="w-7 h-7" />
                  </div>
                  <span className="font-semibold">{platform.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Everything you need to grow</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful tools wrapped in a beautiful, easy-to-use interface.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Real-time Analytics",
                  description: "Get up-to-date follower counts, engagement rates, and content metrics directly from the source.",
                  icon: BarChart3
                },
                {
                  title: "Unified Dashboard",
                  description: "See all your social media profiles side-by-side. Compare performance across different platforms instantly.",
                  icon: LayoutDashboard
                },
                {
                  title: "Revenue Estimation",
                  description: "Calculate your potential earnings based on your current engagement rates and follower base.",
                  icon: Zap
                }
              ].map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="p-8 rounded-3xl glass-card hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 border-t border-border/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Ready to simplify your analytics?</h2>
            <p className="text-xl text-muted-foreground mb-10">
              Join thousands of creators tracking their growth with InstaData.
            </p>
            <Link to="/dashboard">
              <Button size="lg" className="rounded-full h-14 px-10 text-base shadow-xl shadow-primary/25 transition-transform hover:-translate-y-1">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">InstaData</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} InstaData. Built for creators.
          </p>
        </div>
      </footer>
    </div>
  );
}
