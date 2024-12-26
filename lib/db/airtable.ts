import Airtable from "airtable";
import { WorkplaceType, RemoteRegion } from "@/lib/constants/workplace";

// Initialize Airtable with Personal Access Token
const base = new Airtable({
  apiKey: process.env.AIRTABLE_ACCESS_TOKEN,
  endpointUrl: "https://api.airtable.com",
}).base(process.env.AIRTABLE_BASE_ID || "");

export type CareerLevel =
  | "Internship"
  | "EntryLevel"
  | "Associate"
  | "Junior"
  | "MidLevel"
  | "Senior"
  | "Staff"
  | "Principal"
  | "Lead"
  | "Manager"
  | "SeniorManager"
  | "Director"
  | "SeniorDirector"
  | "VP"
  | "SVP"
  | "EVP"
  | "CLevel"
  | "Founder"
  | "NotSpecified";

export type SalaryUnit = "hour" | "day" | "week" | "month" | "year" | "project";
export type SalaryCurrency = "USD" | "EUR" | "GBP";

export interface Salary {
  min: number | null;
  max: number | null;
  currency: SalaryCurrency;
  unit: SalaryUnit;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  type: "Full-time" | "Part-time" | "Contract";
  salary: Salary | null;
  description: string;
  apply_url: string;
  posted_date: string;
  status: "active" | "inactive";
  career_level: CareerLevel[];
  visa_sponsorship: "Yes" | "No" | "Not specified";
  featured: boolean;
  workplace_type: WorkplaceType;
  remote_region: RemoteRegion;
  timezone_requirements: string | null;
  workplace_city: string | null;
  workplace_country: string | null;
}

// Format salary for display
export function formatSalary(salary: Salary | null): string {
  if (!salary || (!salary.min && !salary.max)) return "Not specified";

  const currencySymbols: Record<SalaryCurrency, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const formatNumber = (num: number | null): string => {
    if (!num) return "";
    // Only use k format for numbers >= 10000
    if (num >= 10000) {
      return `${(num / 1000).toFixed(0)}k`;
    }
    // For smaller numbers, show the full value with thousands separator
    return num.toLocaleString();
  };

  const symbol = currencySymbols[salary.currency];

  // Handle single value cases (only min or only max)
  let range;
  if (salary.min && salary.max) {
    range =
      salary.min === salary.max
        ? formatNumber(salary.min)
        : `${formatNumber(salary.min)}-${formatNumber(salary.max)}`;
  } else {
    range = formatNumber(salary.min || salary.max);
  }

  // Use full words with slash
  const unitDisplay = {
    hour: "/hour",
    day: "/day",
    week: "/week",
    month: "/month",
    year: "/year",
    project: "/project",
  }[salary.unit];

  return `${symbol}${range}${unitDisplay}`;
}

// Normalize salary for comparison (convert to annual USD)
export function normalizeAnnualSalary(salary: Salary | null): number {
  if (!salary || (!salary.min && !salary.max)) return -1;

  // Currency conversion rates (simplified - in production, use real-time rates)
  const currencyRates: Record<SalaryCurrency, number> = {
    USD: 1,
    EUR: 1.1,
    GBP: 1.27,
  };

  // Annualization multipliers
  const annualMultiplier: Record<SalaryUnit, number> = {
    hour: 2080, // 40 hours/week * 52 weeks
    day: 260, // 52 weeks * 5 days
    week: 52,
    month: 12,
    year: 1,
    project: 1, // Projects treated as one-time annual equivalent
  };

  // Use the maximum value for comparison, or minimum if no maximum
  const value = salary.max || salary.min || 0;

  // Convert to USD and annualize
  return value * currencyRates[salary.currency] * annualMultiplier[salary.unit];
}

// Ensure career level is always returned as an array
function normalizeCareerLevel(value: unknown): CareerLevel[] {
  console.log("Raw career level value:", value);

  if (!value) {
    console.log("No value provided, returning NotSpecified");
    return ["NotSpecified"];
  }

  if (Array.isArray(value)) {
    console.log("Value is array:", value);
    // Convert Airtable's display values to our enum values
    return value.map((level) => {
      // Handle Airtable's display format (e.g., "Entry Level" -> "EntryLevel")
      const normalized = level.replace(/\s+/g, "");
      console.log(`Normalized "${level}" to "${normalized}"`);
      return normalized as CareerLevel;
    });
  }

  // Handle single value
  console.log("Single value:", value);
  const normalized = (value as string).replace(/\s+/g, "");
  console.log(`Normalized single value "${value}" to "${normalized}"`);
  return [normalized as CareerLevel];
}

// Clean up Markdown formatting
function cleanMarkdownFormatting(text: string): string {
  if (!text) return "";

  return (
    text
      // First, normalize line endings
      .replace(/\r\n/g, "\n")
      // Fix bold text with extra spaces before closing asterisks and ensure space after
      .replace(/\*\*(.*?)\s*:\s*\*\*(\S)/g, "**$1:** $2")
      // Ensure proper spacing around headers
      .replace(/([^\n])\s*###/g, "$1\n\n###")
      .replace(/###\s*(.*?)\n/g, "### $1\n\n")
      // Fix headers with bold text
      .replace(/###\s*\*\*(.*?)\*\*/g, "### **$1**")
      // Fix bold headers that appear after list items or text
      .replace(/([^\n]+?)\s*\*\*([\w\s,]+?):\*\*/g, "$1\n\n**$2:**")
      // Fix any remaining bold headers
      .replace(/\*\*([\w\s,]+?):\*\*/g, "**$1:**")
      // Fix nested list indentation
      .replace(/\n- ([^\n]+)\n {1,2}-/g, "\n- $1\n    -")
      // Fix list items with bold text (but not headers)
      .replace(/(\n- .*?[^:])\n\s*\*\*([^:]+?)\*\*/g, "$1 **$2**")
      // Ensure consecutive bold sections are separated
      .replace(/\*\*([^*]+?)\*\*\*\*([^*]+?)\*\*/g, "**$1**\n\n**$2**")
      // Remove extra blank lines
      .replace(/\n{3,}/g, "\n\n")
      // Clean up extra spaces
      .replace(/[ \t]+/g, " ")
      // Process line by line
      .split("\n")
      .map((line) => {
        const trimmedLine = line.trim();
        // If line starts with a list marker and is not a bold text, preserve it
        if (trimmedLine.startsWith("- ") || trimmedLine.match(/^\d+\./)) {
          return line;
        }
        // For all other lines (including bold text), remove indentation
        return trimmedLine;
      })
      .join("\n")
      // Final pass to ensure bold headers are on their own lines
      .replace(/([^\n]+)\s*(\*\*[\w\s,]+?:\*\*)/g, "$1\n\n$2")
      // Final pass to ensure space after bold headers
      .replace(/\*\*([\w\s,]+?):\*\*(\S)/g, "**$1:** $2")
      // Ensure proper spacing around multi-line bold text
      .replace(/\*\*([^*]+?)\*\*\n([^\n-])/g, "**$1**\n\n$2")
      // Ensure proper spacing around final paragraphs
      .replace(/\n\s*(\*\*[^*]+?\*\*)\s*\n/g, "\n\n$1\n\n")
      .replace(/\n\s*([^-\n][^*\n]+?)\s*$/g, "\n\n$1")
      .trim()
  );
}

function normalizeWorkplaceType(value: unknown): WorkplaceType {
  console.log("Normalizing workplace type:", value);
  if (
    typeof value === "string" &&
    ["On-site", "Hybrid", "Remote"].includes(value)
  ) {
    console.log("Normalized to:", value);
    return value as WorkplaceType;
  }
  // If the value is undefined or invalid, check if there's a remote_region
  // If there is, it's probably a remote job
  if (value === undefined || value === null) {
    console.log("Value is undefined/null, checking remote_region");
    return "Not specified";
  }
  console.log("Defaulting to Not specified");
  return "Not specified";
}

function normalizeRemoteRegion(value: unknown): RemoteRegion {
  if (typeof value === "string") {
    const validRegions = [
      "Worldwide",
      "Americas Only",
      "Europe Only",
      "Asia-Pacific Only",
      "US Only",
      "EU Only",
      "UK/EU Only",
      "US/Canada Only",
    ];
    if (validRegions.includes(value)) {
      return value as RemoteRegion;
    }
  }
  return null;
}

export async function getJobs(): Promise<Job[]> {
  try {
    if (!process.env.AIRTABLE_ACCESS_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      console.error("Missing env vars:", {
        hasToken: !!process.env.AIRTABLE_ACCESS_TOKEN,
        hasBaseId: !!process.env.AIRTABLE_BASE_ID,
      });
      throw new Error("Airtable credentials are not configured");
    }

    const records = await base("Jobs")
      .select({
        filterByFormula: "{status} = 'active'",
        sort: [{ field: "posted_date", direction: "desc" }],
      })
      .all();

    console.log("Airtable records fetched:", {
      count: records.length,
      firstRecordFields: records[0]?.fields
        ? Object.keys(records[0].fields)
        : [],
      hasDescription: records.some((r) => r.fields.description),
      descriptionTypes: records
        .map((r) => typeof r.fields.description)
        .filter((v, i, a) => a.indexOf(v) === i),
    });

    return records.map((record): Job => {
      const fields = record.fields;
      return {
        id: record.id,
        title: fields.title as string,
        company: fields.company as string,
        type: fields.type as Job["type"],
        salary: {
          min: (fields.salary_min as number) || null,
          max: (fields.salary_max as number) || null,
          currency: (fields.salary_currency as SalaryCurrency) || "USD",
          unit: (fields.salary_unit as SalaryUnit) || "year",
        },
        description: cleanMarkdownFormatting(fields.description as string),
        apply_url: fields.apply_url as string,
        posted_date: fields.posted_date as string,
        status: fields.status as Job["status"],
        career_level: normalizeCareerLevel(fields.career_level),
        visa_sponsorship:
          (fields.visa_sponsorship as Job["visa_sponsorship"]) ||
          "Not specified",
        featured: fields.featured === true,
        workplace_type: normalizeWorkplaceType(fields.workplace_type),
        remote_region: normalizeRemoteRegion(fields.remote_region),
        timezone_requirements: (fields.timezone_requirements as string) || null,
        workplace_city: (fields.workplace_city as string) || null,
        workplace_country: (fields.workplace_country as string) || null,
      };
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return [];
  }
}

export async function getJob(id: string): Promise<Job | null> {
  try {
    if (!process.env.AIRTABLE_ACCESS_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      throw new Error("Airtable credentials are not configured");
    }

    const record = await base("Jobs").find(id);

    if (!record || !record.fields) {
      return null;
    }

    // Validate required fields
    const requiredFields = [
      "title",
      "company",
      "type",
      "description",
      "apply_url",
      "posted_date",
      "status",
    ];

    const missingFields = requiredFields.filter(
      (field) => !record.fields[field]
    );

    if (missingFields.length > 0) {
      console.error(`Missing required fields: ${missingFields.join(", ")}`);
      return null;
    }

    console.log(`Fetching single job ${id}:`, record.fields.title);
    console.log("Career level from Airtable:", record.fields.career_level);

    const job = {
      id: record.id,
      title: record.fields.title as string,
      company: record.fields.company as string,
      type: record.fields.type as Job["type"],
      salary: {
        min: (record.fields.salary_min as number) || null,
        max: (record.fields.salary_max as number) || null,
        currency: (record.fields.salary_currency as SalaryCurrency) || "USD",
        unit: (record.fields.salary_unit as SalaryUnit) || "year",
      },
      description: record.fields.description as string,
      apply_url: record.fields.apply_url as string,
      posted_date: record.fields.posted_date as string,
      status: record.fields.status as Job["status"],
      career_level: normalizeCareerLevel(record.fields.career_level),
      visa_sponsorship:
        (record.fields.visa_sponsorship as Job["visa_sponsorship"]) ||
        "Not specified",
      featured: record.fields.featured === true,
      workplace_type: normalizeWorkplaceType(record.fields.workplace_type),
      remote_region: normalizeRemoteRegion(record.fields.remote_region),
      timezone_requirements:
        (record.fields.timezone_requirements as string) || null,
      workplace_city: (record.fields.workplace_city as string) || null,
      workplace_country: (record.fields.workplace_country as string) || null,
    };

    return job;
  } catch (error) {
    console.error("Error fetching job:", {
      message: (error as Error).message,
      name: (error as Error).name,
      stack: (error as Error).stack,
    });
    return null;
  }
}

export async function testConnection() {
  try {
    // Try to list records from the Jobs table
    const records = await base("Jobs")
      .select({
        maxRecords: 1, // Just get one record to test
      })
      .all();

    console.log(
      "Connected to Airtable successfully.",
      `Found ${records.length} records in Jobs table.`
    );
    return true;
  } catch (error) {
    console.error("Airtable connection test failed:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      error,
    });
    return false;
  }
}
