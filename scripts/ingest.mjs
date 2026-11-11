import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// 1. Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ggsuhfqmuqsavlprxowb.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_O1Of50vyXXNODDaWulJLEg_j6OgSEYN';
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ Error: GEMINI_API_KEY is missing from .env.local');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

// 3. Multi-page targets across Healthcare verticals
const TARGETS = [
  // --- DENTISTRY ---
  {
    profession: 'Dentistry',
    provider: 'Kois Center',
    url: 'https://www.koiscenter.com/courses/',
    paginationType: 'scroll',
    maxScrolls: 4
  },
  {
    profession: 'Dentistry',
    provider: 'Bioclear Matrix Learning Center',
    url: 'https://www.bioclearmatrix.com/courses/',
    paginationType: 'scroll',
    maxScrolls: 3
  },
  {
    profession: 'Dentistry',
    provider: 'Pikos Institute',
    url: 'https://pikosinstitute.com/courses/',
    paginationType: 'scroll',
    maxScrolls: 3
  },
  {
    profession: 'Dentistry',
    provider: 'University of Michigan School of Dentistry',
    url: 'https://www.dent.umich.edu/continuing-education/courses',
    paginationType: 'scroll',
    maxScrolls: 3
  },

  // --- MEDICINE (MD / DO) ---
  {
    profession: 'Medicine',
    provider: 'American College of Physicians (ACP)',
    url: 'https://www.acponline.org/cme-moc/online-learning-center',
    paginationType: 'scroll',
    maxScrolls: 3
  },
  {
    profession: 'Medicine',
    provider: 'Mayo Clinic CPD',
    url: 'https://ce.mayo.edu/',
    paginationType: 'scroll',
    maxScrolls: 3
  },
  {
    profession: 'Medicine',
    provider: 'AMA Ed Hub',
    url: 'https://edhub.ama-assn.org/course-finder',
    paginationType: 'scroll',
    maxScrolls: 3
  },

  // --- PHARMACY (PharmD / RPh) ---
  {
    profession: 'Pharmacy',
    provider: 'PowerPak C.E.',
    url: 'https://www.powerpak.com/',
    paginationType: 'scroll',
    maxScrolls: 3
  },
  {
    profession: 'Pharmacy',
    provider: 'Pharmacy Times CE (PTCE)',
    url: 'https://www.pharmacytimes.org/',
    paginationType: 'scroll',
    maxScrolls: 3
  },
  {
    profession: 'Pharmacy',
    provider: 'FreeCE by PharmCon',
    url: 'https://www.freece.com/catalog/',
    paginationType: 'scroll',
    maxScrolls: 3
  },

  // --- NURSING (RN / NP) ---
  {
    profession: 'Nursing',
    provider: 'American Association of Critical-Care Nurses (AACN)',
    url: 'https://www.aacn.org/education/ce-activities',
    paginationType: 'scroll',
    maxScrolls: 3
  },
  {
    profession: 'Nursing',
    provider: 'Elite Learning Nursing CE',
    url: 'https://www.elitelearning.com/nursing/',
    paginationType: 'scroll',
    maxScrolls: 3
  }
  
];
// At the bottom of the for (const target of TARGETS) loop:
console.log('⏳ Pausing 3 seconds before next provider...');
await new Promise((r) => setTimeout(r, 3000));

// Helper: Headless browser crawler with scroll and pagination execution
async function crawlWithPlaywright(browser, target) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log(`🌐 [${target.profession}] Navigating to ${target.provider}: ${target.url}`);

  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Perform progressive scrolling to trigger lazy loading / infinite scroll
    if (target.paginationType === 'scroll') {
      for (let i = 1; i <= target.maxScrolls; i++) {
        console.log(`   ⬇️  Scroll pass ${i}/${target.maxScrolls}...`);
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
        await page.waitForTimeout(1500);

        // If a "Load More" or "View More" button appears, click it
        const loadMore = await page.$('button:has-text("Load More"), button:has-text("View More"), a:has-text("Load More")');
        if (loadMore) {
          try {
            await loadMore.click();
            console.log('   🖱️ Clicked "Load More" button');
            await page.waitForTimeout(2000);
          } catch {
            // Ignore click intercept errors
          }
        }
      }
    }

    // Extract cleaned readable text from the fully rendered DOM
    const rawText = await page.evaluate(() => {
      // Remove headers, footers, cookie notices, and scripts
      const killSelectors = ['nav', 'footer', 'header', 'script', 'style', 'noscript', '#onetrust-consent-sdk', '.cookie-banner'];
      killSelectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
      return document.body.innerText.replace(/\s+/g, ' ').trim();
    });

    await context.close();
    return rawText;
  } catch (err) {
    console.error(`   ⚠️ Playwright failed on ${target.url}:`, err.message);
    await context.close();
    return null;
  }
}

// Helper: Process chunks of text with Gemini 3.8 Flash
async function extractCoursesWithGemini(chunkText, target) {
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
- category: string (the clinical or professional subject area)
- format: string (e.g. "Hands-On Workshop", "Lecture", "Self-Paced Online", "Webinar", or "Live Patient")
- credits: number (CE/CME hours as integer or decimal like 1.5, default to 4 if unspecified)
- cost_estimate: number (tuition price in USD as a number like 795 or 0 if free/unknown)
- location: string (City, State or "Online")
- accreditation: string (e.g. "ADA CERP", "AGD PACE", "AMA PRA Category 1", "ACPE", "ANCC", or "Accredited Provider")

Return ONLY the raw JSON array. No conversational text or markdown code blocks. If no courses are found, return [].
`;

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

    return parsed.map(c => ({
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
      website_url: target.url
    }));
  } catch (err) {
    console.error(`   ⚠️ Gemini parsing error:`, err.message);
    return [];
  }
}

// Main Controller
async function run() {
  console.log('🚀 Launching Playwright Multi-Page CE Scraper...\n');

  const browser = await chromium.launch({ headless: true });

  for (const target of TARGETS) {
    const text = await crawlWithPlaywright(browser, target);

    if (!text || text.length < 200) {
      console.log(`⏩ Skipping ${target.provider}: Insufficient text rendered.\n`);
      continue;
    }

    console.log(`📄 Captured ${text.length} characters of rendered content from ${target.provider}.`);

    // Split text into 20k character windows to handle long catalogs within context limits
    const chunkSize = 20000;
    const totalChunks = Math.min(Math.ceil(text.length / chunkSize), 3); // Max 3 chunks per site to balance speed
    const allExtracted = [];

    for (let c = 0; c < totalChunks; c++) {
      const chunk = text.slice(c * chunkSize, (c + 1) * chunkSize);
      console.log(`   🤖 Parsing chunk ${c + 1}/${totalChunks} with Gemini 3.8 Flash...`);
      const courses = await extractCoursesWithGemini(chunk, target);
      allExtracted.push(...courses);
    }

    // Deduplicate against course title inside the batch
    const uniqueCourses = Array.from(
      new Map(allExtracted.map(item => [item.title.toLowerCase(), item])).values()
    );

    console.log(`   ✅ Extracted ${uniqueCourses.length} unique courses for ${target.provider}.`);

    for (const course of uniqueCourses) {
      const { error } = await supabase
        .from('courses')
        .upsert([course], { onConflict: 'title,provider' });

      if (error) {
        console.error(`      ❌ DB Insert Failed ("${course.title}"):`, error.message);
      } else {
        console.log(`      ✨ Saved: "${course.title}" (${course.credits} Credits, $${course.cost_estimate})`);
      }
    }
    console.log('');
  }

  await browser.close();
  console.log('🎉 Multi-page ingestion complete!');
}

run();