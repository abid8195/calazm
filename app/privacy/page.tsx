import Link from "next/link";

export const metadata = { title: "Privacy — Calazm" };

export default function PrivacyPage() {
  return (
    <main className="max-w-xl mx-auto px-6 py-10 leading-relaxed">
      <Link href="/" className="text-xl font-bold tracking-tight" style={{ color: "var(--brand)" }}>
        calazm
      </Link>
      <h1 className="text-2xl font-bold mt-6">Privacy Policy</h1>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
        Last updated: August 13, 2026
      </p>

      <div className="mt-6 grid gap-5 text-sm">
        <section>
          <h2 className="font-semibold text-base">What we collect</h2>
          <p className="mt-1">
            Account details (email, name), the profile you provide for calorie estimates (age, height, weight, goal, activity), and the
            food, water, and weight data you log — including meal photos you choose to upload. That&apos;s it. We collect the minimum
            needed to make Calazm work.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-base">How AI processing works</h2>
          <p className="mt-1">
            When you scan a meal photo, the image is sent to our AI provider solely to identify the foods in it. Nutrition values come
            from our food database, not the model. Photos are not used to train models. We cache analysis results by image fingerprint to
            avoid reprocessing.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-base">What we never do</h2>
          <p className="mt-1">
            We never sell your personal or health data. We never use your nutrition or body data for advertising targeting. Ads shown to
            free-tier users are contextual to the app, not to your health data.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-base">Your controls</h2>
          <p className="mt-1">
            From Profile you can export all your data as JSON at any time, or permanently delete your account — deletion removes your
            profile, meals, photos, weights, memory, and subscription records immediately and irreversibly.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-base">Security</h2>
          <p className="mt-1">
            Passwords are hashed with bcrypt. Sessions are signed HTTP-only cookies. Data is encrypted in transit (HTTPS).
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-base">Not medical advice</h2>
          <p className="mt-1">
            Calazm provides estimates for general wellness, not medical diagnosis or treatment. Consult a health professional for medical
            decisions. If tracking ever feels compulsive, we encourage stepping back and seeking support.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-base">Contact</h2>
          <p className="mt-1">Questions or requests: abidussobhan@gmail.com</p>
        </section>
      </div>
    </main>
  );
}
