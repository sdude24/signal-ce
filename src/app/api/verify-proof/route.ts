import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ggsuhfqmuqsavlprxowb.supabase.co';
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_O1Of50vyXXNODDaWulJLEg_j6OgSEYN';

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { isVerified: false, status: 'pending_manual', reason: 'Missing GEMINI_API_KEY on server' },
        { status: 200 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { reviewId, proofPath, expectedTitle, expectedProvider } = await req.json();

    if (!reviewId || !proofPath) {
      return NextResponse.json({ error: 'Missing reviewId or proofPath' }, { status: 400 });
    }

    // 1. Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('ce-proofs')
      .download(proofPath);

    if (downloadError || !fileData) {
      throw new Error('Could not retrieve uploaded proof from storage.');
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = fileData.type || 'image/jpeg';

    // 2. Ask Gemini to verify the certificate/receipt
    const prompt = `
You are a continuing education verification auditor.
Inspect this uploaded certificate of completion, registration receipt, or attendance badge.

Expected Course Title: "${expectedTitle}"
Expected Provider: "${expectedProvider}"

Determine whether this document is genuine proof that the user registered for or completed this specific course (or a course from this provider).
Return ONLY raw JSON with these exact keys:
{
  "verified": boolean,
  "confidence": "high" | "medium" | "low",
  "reason": "One concise sentence explaining what matched or why manual review is needed"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
        prompt,
      ],
    });

    let raw = response.text?.trim() || '{}';
    if (raw.startsWith('```json')) raw = raw.slice(7);
    if (raw.startsWith('```')) raw = raw.slice(3);
    if (raw.endsWith('```')) raw = raw.slice(0, -3);

    const verdict = JSON.parse(raw.trim());

    const isVerified = verdict.verified === true && verdict.confidence === 'high';
    const status = isVerified ? 'verified' : 'pending_manual';

    // 3. Update the review record in Supabase
    await supabase
      .from('reviews')
      .update({
        is_verified: isVerified,
        verification_status: status,
        verification_notes: verdict.reason || 'Processed by AI auditor',
      })
      .eq('id', reviewId);

    return NextResponse.json({
      isVerified,
      status,
      reason: verdict.reason,
    });
  } catch (err: any) {
    console.error('Verification error:', err);
    return NextResponse.json(
      { isVerified: false, status: 'pending_manual', reason: err.message },
      { status: 200 }
    );
  }
}