import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Share, Plus, CheckCircle2, ArrowRight } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-primary rounded-2xl flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Install Space Style</h1>
          <p className="text-muted-foreground">
            Pasang aplikasi di perangkat Anda untuk pengalaman terbaik
          </p>
        </div>

        {/* Status Card */}
        {isInstalled ? (
          <Card className="border-green-500/50 bg-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="font-semibold text-foreground">Aplikasi Sudah Terinstall!</h3>
                  <p className="text-sm text-muted-foreground">
                    Anda sudah bisa menggunakan aplikasi dari home screen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Install Button for Android/Chrome */}
            {deferredPrompt && (
              <Card className="border-primary/50">
                <CardContent className="pt-6">
                  <Button
                    onClick={handleInstallClick}
                    size="lg"
                    className="w-full gap-2 text-lg h-14"
                  >
                    <Download className="w-5 h-5" />
                    Install Sekarang
                  </Button>
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Gratis dan tidak memerlukan app store
                  </p>
                </CardContent>
              </Card>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">iOS / iPhone</Badge>
                  </div>
                  <CardTitle className="text-xl">Cara Install di iPhone</CardTitle>
                  <CardDescription>
                    Ikuti langkah-langkah berikut untuk menambahkan aplikasi ke home screen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Tap tombol Share</p>
                      <p className="text-sm text-muted-foreground">
                        Tap ikon <Share className="w-4 h-4 inline" /> di bagian bawah Safari
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Pilih "Add to Home Screen"</p>
                      <p className="text-sm text-muted-foreground">
                        Scroll ke bawah dan tap <Plus className="w-4 h-4 inline" /> Add to Home Screen
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Tap "Add"</p>
                      <p className="text-sm text-muted-foreground">
                        Konfirmasi dengan tap Add di pojok kanan atas
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android Instructions */}
            {!isIOS && !deferredPrompt && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Android</Badge>
                  </div>
                  <CardTitle className="text-xl">Cara Install di Android</CardTitle>
                  <CardDescription>
                    Ikuti langkah-langkah berikut untuk menambahkan aplikasi ke home screen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Buka menu browser</p>
                      <p className="text-sm text-muted-foreground">
                        Tap ikon titik tiga (⋮) di pojok kanan atas Chrome
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Pilih "Install app" atau "Add to Home screen"</p>
                      <p className="text-sm text-muted-foreground">
                        Cari opsi install di menu dropdown
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Konfirmasi Install</p>
                      <p className="text-sm text-muted-foreground">
                        Tap Install untuk menambahkan ke home screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Keuntungan Install Aplikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="text-sm">Akses cepat dari home screen</span>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="text-sm">Notifikasi push yang lebih reliable</span>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="text-sm">Tampilan fullscreen tanpa address bar</span>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="text-sm">Bekerja offline untuk fitur dasar</span>
            </div>
          </CardContent>
        </Card>

        {/* Back to App */}
        <div className="text-center">
          <Button variant="outline" asChild>
            <a href="/dashboard">Kembali ke Aplikasi</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Install;
