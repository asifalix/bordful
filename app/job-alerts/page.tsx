import { Metadata } from "next";
import { MetadataBreadcrumb } from "@/components/ui/metadata-breadcrumb";
import config from "@/config";
import { HeroSection } from "@/components/ui/hero-section";
import { JobAlertsForm } from "@/components/job-alerts/JobAlertsForm";
import { redirect } from "next/navigation";
import { getJobs } from "@/lib/db/airtable";
import { CompactJobCardList } from "@/components/jobs/CompactJobCardList";

// Add metadata for SEO
export const metadata: Metadata = {
  title: "Job Alerts | Get Notified of New Opportunities",
  description:
    "Subscribe to job alerts and get notified when new opportunities are posted.",
  keywords:
    "job alerts, job notifications, career alerts, employment updates, job subscription",
  openGraph: {
    title: "Job Alerts | Get Notified of New Opportunities",
    description:
      "Subscribe to job alerts and get notified when new opportunities are posted.",
    type: "website",
    url: `${config.url}/job-alerts`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Job Alerts | Get Notified of New Opportunities",
    description:
      "Subscribe to job alerts and get notified when new opportunities are posted.",
  },
  alternates: {
    canonical: `${config.url}/job-alerts`,
    languages: {
      en: `${config.url}/job-alerts`,
      "x-default": `${config.url}/job-alerts`,
    },
  },
};

// Revalidate every 5 minutes
export const revalidate = 300;

export default async function JobAlertsPage() {
  // Redirect to home page if job alerts feature is disabled
  if (!config.jobAlerts?.enabled) {
    redirect("/");
  }

  // Fetch the latest jobs
  const allJobs = await getJobs();
  const latestJobs = allJobs.slice(0, 7); // Show 10 jobs

  return (
    <main className="min-h-screen bg-background">
      <HeroSection
        badge="Job Alerts"
        title="Get Jobs Right to Your Inbox"
        description="Subscribe to job alerts and get notified when new opportunities are posted."
        heroImage={config.jobAlerts.heroImage}
      />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <MetadataBreadcrumb metadata={metadata} pathname="/job-alerts" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job alerts form */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">
              Subscribe for Updates
            </h2>
            <p className="text-zinc-600 mb-6">
              Get notified when new jobs are posted. We&apos;ll also subscribe
              you to Bordful newsletter.
            </p>
            <JobAlertsForm />
          </div>

          {/* Latest jobs */}
          <div className="lg:col-span-2">
            <CompactJobCardList jobs={latestJobs} className="bg-white" />
          </div>
        </div>
      </div>
    </main>
  );
}
