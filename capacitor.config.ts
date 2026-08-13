import type { CapacitorConfig } from "@capacitor/cli";

// Native shell config. The app loads your DEPLOYED Calazm instance so users
// always get the latest version without store re-review for content changes.
// Set server.url to your production HTTPS domain before `npx cap sync`.
const config: CapacitorConfig = {
  appId: "app.calazm",
  appName: "Calazm",
  webDir: "public", // placeholder; remote server.url is what actually loads
  server: {
    url: process.env.CALAZM_APP_URL ?? "https://YOUR-PRODUCTION-DOMAIN",
    cleartext: false,
  },
  ios: { contentInset: "automatic" },
  android: { allowMixedContent: false },
};

export default config;
