import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ggsuhfqmuqsavlprxowb.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_O1Of50vyXXNODDaWulJLEg_j6OgSEYN';
const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ Error: GEMINI_API_KEY is missing from .env.local');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

const TARGETS = [
  {
    profession: 'Dentistry',
    provider: 'Kois Center',
    url: 'https://www.koiscenter.com/courses/',
    paginationType: 'scroll',
    maxScrolls: 3
  },
  {
    profession: 'Dentistry',
    provider: 'Spear Education',
    url: 'https://www.speareducation.com/campus-courses',
    paginationType: 'scroll',
    maxScrolls: 3
  },
  {
    profession: 'Dentistry',
    provider: 'Bioclear Matrix Learning Center',
    url: 'https://www.bioclearmatrix.com/courses/',
    paginationType: 'scroll',
    maxScrolls: 2
  },
  {
    profession: 'Pharmacy',
    provider: 'PowerPak C.E.',
    url: 'https://www.powerpak.com/',
    paginationType: 'scroll',
    maxScrolls: 3
  },
  {
    profession: 'Medicine',
    provider: 'American College of Physicians (ACP)',
    url: 'https://www.acponline.org/cme-moc/online-learning-center',
    paginationType: 'scroll',
    maxScrolls: 2
  },
  {
    profession: 'Nursing',
    provider: 'American Association of Critical-Care Nurses (AACN)',
    url: 'https://www.aacn.org/education/ce-activities',
    paginationType: 'scroll',
    maxScrolls: 2
  }
];

async function crawlPage(browser, target) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log(`🌐 [${target.profession}] Crawling ${target.provider}...`);

  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1000);

    for (let i = 1; i <= target.maxScrolls; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
      await page.waitForTimeout(600);

      const loadMore = await page.$('button:has-text("Load More"), button:has-text("View More"), a:has-text("Load More")');
      if (loadMore) {
        try {
          await loadMore.click();
          await page.waitForTimeout(1000);
        } catch {}
      }
    }

    const rawText = await page.evaluate(() => {
      const killSelectors = ['nav', 'footer', 'header', 'script', 'style', 'noscript', '#onetrust-consent-sdk', '.cookie-banner'];
      killSelectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
      return document.body.innerText.replace(/\s+/g, ' ').trim();
    });

    await context.close();
    return { target, rawText };
  } catch (err) {
    console.error(`   ⚠️ Failed crawling ${target.provider}: ${err.message}`);
    await context.close();
    return { target, rawText: null };
  }
}

async function extractCoursesWithGemini(chunkText, target, maxRetries = 2) {
  const prompt = `
You are an expert continuing education data extraction specialist.
Analyze this webpage text extracted from "${target.provider}" offering ${target.profession} education:

"""
${chunkText}
"""

Identify ALL valid continuing education courses, modules, seminars, or clinical workshops found in the text.
Return a valid JSON array of objects with these exact keys:
- title: string (the official course title)
- instructor: string or null
- category: string (MUST be chosen from one of these standard specialties based on the profession:
    If Dentistry: "Restorative", "Implants & Surgery", "Endodontics", "Occlusion & TMJ", "Periodontics", "Orthodontics", "General"
    If Pharmacy: "Oncology", "Cardiology", "Infectious Disease", "Diabetes & Obesity", "Pain Management", "Pharmacy Law & Ethics", "General"
    If Medicine: "Internal Medicine", "Oncology", "Cardiology", "Primary Care", "Emergency Medicine", "General"
    If Nursing: "Critical Care", "Emergency", "Pharmacology", "Leadership & Ethics", "General")
- format: string (e.g. "Hands-On Workshop", "Lecture", "Self-Paced Online", "Webinar", or "Live Patient")
- credits: number (CE/CME hours as integer or decimal like 1.5, default to 4 if unspecified)
- cost_estimate: number (tuition price in USD as a number like 7.95 or 0 if free/unknown)
- location: string (City, State or "Online")
- accreditation: string (e.g. "ADA CERP", "AGD PACE", "AMA PRA Category 1", "ACPE", "ANCC", or "Accredited Provider")

Return ONLY the raw JSON array. No conversational text or markdown code blocks. If no courses are found, return [].
`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      let raw = response.text.trim();
      if (raw.startsWith('```json')) raw = raw.slice(7);
      if (raw.startsWith('```')) raw = raw.slice(3);
      if (raw.endsWith('```')) raw = raw.slice(0, -3);

      const parsed = JSON.parse(raw.trim());
      if (!Array.isArray(parsed)) return [];

      return parsed.map((c) => ({
        title: c.title?.trim() || 'Untitled Course',
        instructor: c.instructor?.trim() || null,
        category: c.category?.trim() || 'General',
        format: c.format?.trim() || 'Online / Hybrid',
        credits: parseFloat(c.credits) || 4.0,
        cost_estimate: parseFloat(c.cost_estimate) || 0.0,
        location: c.location?.trim() || 'Online',
        accreditation: c.accreditation?.trim() || 'Accredited Provider',
        provider: target.provider,
        profession: target.profession,
        website_url: target.url,
      }));
    } catch (err) {
      if (attempt < maxRetries && err.message.includes('503')) {
        await new Promise((res) => setTimeout(res, 2000 * attempt));
      } else {
        return [];
      }
    }
  }
  return [];
}

async function run() {
  const startTime = Date.now();
  console.log('⚡ Launching Turbo CE Ingestion Pipeline...\n');

  const browser = await chromium.launch({ headless: true });

  // 1. Parallel Crawl: Fetch pages 2 at a time to prevent resource exhaustion
  const results = [];
  const concurrency = 2;
  for (let i = 0; i < TARGETS.length; i += concurrency) {
    const chunk = TARGETS.slice(i, i + concurrency);
    const crawlBatch = await Promise.all(chunk.map((t) => crawlPage(browser, t)));
    results.push(...crawlBatch);
  }
  await browser.close();

  // 2. Process with Gemini & Bulk Upsert per Provider
  for (const { target, rawText } of results) {
    if (!rawText || rawText.length < 200) continue;

    const chunkSize = 25000;
    const totalChunks = Math.min(Math.ceil(rawText.length / chunkSize), 2);
    const extractedCourses = [];

    for (let c = 0; c < totalChunks; c++) {
      const slice = rawText.slice(c * chunkSize, (c + 1) * chunkSize);
      const courses = await extractCoursesWithGemini(slice, target);
      extractedCourses.push(...courses);
    }

    // Deduplicate within the batch
    const unique = Array.from(
      new Map(extractedCourses.map((c) => [c.title.toLowerCase(), c])).values()
    );

    if (unique.length > 0) {
      // 3. Bulk Insert: 1 network call for all courses
      const { error } = await supabase
        .from('courses')
        .upsert(unique, { onConflict: 'title,provider' });

      if (error) {
        console.error(`   ❌ Bulk insert error for ${target.provider}: ${error.message}`);
      } else {
        console.log(`   ✨ Saved ${unique.length} courses in 1 batch for ${target.provider}`);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Ingestion completed in ${duration}s!`);
}

run();