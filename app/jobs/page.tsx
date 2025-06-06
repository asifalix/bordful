import { getJobs } from "@/lib/db/airtable";
import {
  Briefcase,
  Globe2,
  GraduationCap,
  Languages,
  ArrowUpRight,
} from "lucide-react";
import type { Metadata } from "next";
import config from "@/config";
import type { CareerLevel } from "@/lib/db/airtable";
import { Button } from "@/components/ui/button";
import { PostJobBanner } from "@/components/ui/post-job-banner";
import { HeroSection } from "@/components/ui/hero-section";
import Link from "next/link";
import { CAREER_LEVEL_DISPLAY_NAMES } from "@/lib/constants/career-levels";
import type { Country } from "@/lib/constants/countries";
import {
  LanguageCode,
  getDisplayNameFromCode,
} from "@/lib/constants/languages";
import {
  formatLocationTitle,
  createLocationSlug,
} from "@/lib/constants/locations";
import { generateMetadata } from "@/lib/utils/metadata";
import { MetadataBreadcrumb } from "@/components/ui/metadata-breadcrumb";
import Script from "next/script";
import type { ItemList, WithContext, ListItem } from "schema-dts";
import { resolveColor } from "@/lib/utils/colors";

// Generate metadata for SEO
export const metadata: Metadata = generateMetadata({
  title: "Browse All Job Categories | " + config.title,
  description:
    "Explore job categories including types, career levels, locations, and languages. Find your perfect position with our comprehensive job filters.",
  path: "/jobs",
  openGraph: {
    type: "website",
  },
});

// Revalidate page every 5 minutes
export const revalidate = 300;

interface JobCounts {
  types: Record<string, number>;
  careerLevels: Record<CareerLevel, number>;
  locations: {
    countries: Partial<Record<Country, number>>;
    cities: Record<string, number>;
    remote: number;
  };
  languages: Record<LanguageCode, number>;
}

interface CategoryCardProps {
  href: string;
  title: string;
  count: number;
}

function CategoryCard({ href, title, count }: CategoryCardProps) {
  return (
    <div className="group relative">
      <Link
        href={href}
        className="block p-4 sm:p-5 border rounded-lg transition-all hover:border-gray-400"
        aria-label={`Browse ${count.toLocaleString()} ${title} ${
          count === 1 ? "position" : "positions"
        }`}
      >
        <div className="space-y-1.5 sm:space-y-2">
          <h2 className="text-sm sm:text-base font-medium">{title}</h2>
          <div className="text-xs sm:text-sm text-gray-500">
            {count.toLocaleString()} {count === 1 ? "position" : "positions"}{" "}
            available
          </div>
        </div>
      </Link>
      <div className="absolute right-3 sm:right-4 bottom-3 sm:bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          asChild
          size="xs"
          variant="primary"
          className="gap-1.5 text-xs hidden sm:inline-flex"
          style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
        >
          <Link href={href} aria-label={`View all ${title} positions`}>
            View Jobs
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default async function JobsDirectoryPage() {
  const jobs = await getJobs();

  // Aggregate job counts by different dimensions
  const jobCounts = jobs.reduce<JobCounts>(
    (acc, job) => {
      // Count by type (skip undefined)
      if (job.type) {
        acc.types[job.type] = (acc.types[job.type] || 0) + 1;
      }

      // Count by career level (skip NotSpecified)
      job.career_level.forEach((level) => {
        if (level !== "NotSpecified") {
          acc.careerLevels[level] = (acc.careerLevels[level] || 0) + 1;
        }
      });

      // Count by location
      if (job.workplace_country) {
        const country = job.workplace_country as Country;
        acc.locations.countries[country] =
          (acc.locations.countries[country] || 0) + 1;
      }
      if (job.workplace_city) {
        acc.locations.cities[job.workplace_city] =
          (acc.locations.cities[job.workplace_city] || 0) + 1;
      }
      if (job.workplace_type === "Remote") {
        acc.locations.remote += 1;
      }

      // Count by language
      if (job.languages) {
        job.languages.forEach((lang) => {
          acc.languages[lang] = (acc.languages[lang] || 0) + 1;
        });
      }

      return acc;
    },
    {
      types: {},
      careerLevels: {} as Record<CareerLevel, number>,
      locations: {
        countries: {},
        cities: {},
        remote: 0,
      },
      languages: {} as Record<LanguageCode, number>,
    }
  );

  // Sort and filter job types to ensure consistent order
  const sortedJobTypes = Object.entries(jobCounts.types)
    .filter(
      ([type]) => type !== "undefined" && type.toLowerCase() !== "not specified"
    )
    .sort((a, b) => b[1] - a[1]); // Sort by count

  // Sort and filter career levels to ensure consistent order
  const sortedCareerLevels = Object.entries(jobCounts.careerLevels)
    .filter(([level]) => level !== "NotSpecified")
    .sort((a, b) => b[1] - a[1]); // Sort by count

  // Sort languages by count
  const topLanguages = Object.entries(jobCounts.languages)
    .filter(([, count]) => count > 0)
    .sort((a, b) => {
      // Sort alphabetically by language name
      const nameA = getDisplayNameFromCode(a[0] as LanguageCode);
      const nameB = getDisplayNameFromCode(b[0] as LanguageCode);
      return nameA.localeCompare(nameB);
    })
    .slice(0, 12);

  // Generate ItemList schema for job categories
  const generateItemListSchema = () => {
    // Create type-safe schema using schema-dts
    const itemListSchema: WithContext<ItemList> = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Job Types",
          url: `${config.url}/jobs/types`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Career Levels",
          url: `${config.url}/jobs/levels`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Job Locations",
          url: `${config.url}/jobs/locations`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "Job Languages",
          url: `${config.url}/jobs/languages`,
        },
      ] as ListItem[],
    };

    return JSON.stringify(itemListSchema);
  };

  return (
    <>
      {/* Add schema markup */}
      <Script
        id="item-list-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: generateItemListSchema() }}
      />

      <HeroSection
        badge="Job Categories"
        title="Browse All Job Categories"
        description={`Explore ${jobs.length.toLocaleString()} open positions across different categories. Find the perfect role that matches your skills and preferences.`}
        heroImage={config.jobsPages?.directory?.heroImage}
      />

      <main className="container py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
          <div className="flex-[3]">
            <div className="max-w-5xl">
              {/* Breadcrumb navigation */}
              <div className="mb-6">
                <MetadataBreadcrumb
                  metadata={metadata}
                  pathname="/jobs"
                  items={[
                    { name: "Home", url: "/" },
                    { name: "Jobs", url: "/jobs" },
                  ]}
                />
              </div>

              <div className="space-y-8 sm:space-y-12">
                {/* Job Types Section */}
                <section
                  className="space-y-4 sm:space-y-6"
                  aria-labelledby="job-types-heading"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase
                      className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <h2
                      id="job-types-heading"
                      className="text-lg sm:text-xl font-semibold"
                    >
                      Job Types
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {sortedJobTypes.slice(0, 6).map(([type, count]) => (
                      <CategoryCard
                        key={type}
                        href={`/jobs/type/${type.toLowerCase()}`}
                        title={type}
                        count={count}
                      />
                    ))}
                  </div>
                  <div>
                    <Button
                      asChild
                      variant="outline"
                      size="xs"
                      className="gap-1.5 mt-2 text-xs"
                    >
                      <Link href="/jobs/types">
                        View All Job Types
                        <ArrowUpRight
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </Button>
                  </div>
                </section>

                {/* Locations Section */}
                <section
                  className="space-y-4 sm:space-y-6"
                  aria-labelledby="locations-heading"
                >
                  <div className="flex items-center gap-2">
                    <Globe2
                      className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <h2
                      id="locations-heading"
                      className="text-lg sm:text-xl font-semibold"
                    >
                      Locations
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {/* Remote Category */}
                    {jobCounts.locations.remote > 0 && (
                      <CategoryCard
                        href="/jobs/location/remote"
                        title="Remote"
                        count={jobCounts.locations.remote}
                      />
                    )}

                    {/* Top Countries */}
                    {Object.entries(jobCounts.locations.countries)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([country, count]) => (
                        <CategoryCard
                          key={country}
                          href={`/jobs/location/${createLocationSlug(country)}`}
                          title={formatLocationTitle(country)}
                          count={count}
                        />
                      ))}
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="xs"
                      className="gap-1.5 mt-2 text-xs"
                      asChild
                    >
                      <Link
                        href="/jobs/locations"
                        aria-label="View all available locations"
                      >
                        View All Locations
                        <ArrowUpRight
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </Button>
                  </div>
                </section>

                {/* Career Levels Section */}
                <section
                  className="space-y-4 sm:space-y-6"
                  aria-labelledby="career-levels-heading"
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap
                      className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <h2
                      id="career-levels-heading"
                      className="text-lg sm:text-xl font-semibold"
                    >
                      Career Levels
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {sortedCareerLevels.slice(0, 6).map(([level, count]) => (
                      <CategoryCard
                        key={level}
                        href={`/jobs/level/${level.toLowerCase()}`}
                        title={CAREER_LEVEL_DISPLAY_NAMES[level as CareerLevel]}
                        count={count}
                      />
                    ))}
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="xs"
                      className="gap-1.5 mt-2 text-xs"
                      asChild
                    >
                      <Link
                        href="/jobs/levels"
                        aria-label="View all career levels"
                      >
                        View All Career Levels
                        <ArrowUpRight
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </Button>
                  </div>
                </section>

                {/* Languages Section */}
                <section
                  className="space-y-4 sm:space-y-6"
                  aria-labelledby="languages-heading"
                >
                  <div className="flex items-center gap-2">
                    <Languages
                      className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <h2
                      id="languages-heading"
                      className="text-lg sm:text-xl font-semibold"
                    >
                      Languages
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {topLanguages.map(([lang, count]) => (
                      <CategoryCard
                        key={lang}
                        href={`/jobs/language/${lang.toLowerCase()}`}
                        title={getDisplayNameFromCode(lang as LanguageCode)}
                        count={count}
                      />
                    ))}
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="xs"
                      className="gap-1.5 mt-2 text-xs"
                      asChild
                    >
                      <Link
                        href="/jobs/languages"
                        aria-label="View all languages"
                      >
                        View All Languages
                        <ArrowUpRight
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </Button>
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-[240px] xl:w-[260px] order-first lg:order-last">
            <div className="space-y-6">
              <PostJobBanner />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
