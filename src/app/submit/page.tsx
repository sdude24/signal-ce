'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CourseOption {
  id: string;
  title: string;
  provider?: string | null;
  speaker?: string | null;
  ce_credits?: number | null;
  credits?: number | null;
  specialty?: string | null;
}

export default function SubmitReviewPage() {
  const router = useRouter();

  // Course search & selection state
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Review rating fields (1-5 integers)
  const [overallRating, setOverallRating] = useState<number>(5);
  const [clinicalActionability, setClinicalActionability] = useState<number>(5);
  const [commercialBias, setCommercialBias] = useState<number>(5);

  // Written review & reviewer role
  const [takeaways, setTakeaways] = useState('');
  const [reviewerRole, setReviewerRole] = useState('General Dentist (DDS/DMD)');

  // Optional proof of attendance upload
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('title', { ascending: true });

      if (error) {
        setLoadError(error.message);
      } else if (data) {
        setCourses(data);

        // Pre-select course if ?courseId=... is in the URL
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const preselectedId = params.get('courseId');
          if (preselectedId) {
            const match = data.find((c) => c.id === preselectedId);
            if (match) {
              setSelectedCourse(match);
              setSearchQuery(match.title);
            }
          }
        }
      }
      setLoadingCourses(false);
    }

    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return courses.slice(0, 8);
    return courses
      .filter(
        (c) =>
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.provider && c.provider.toLowerCase().includes(q)) ||
          (c.speaker && c.speaker.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [courses, searchQuery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!selectedCourse) {
      setErrorMessage('Please search and select a course from the dropdown first.');
      return;
    }

    if (!takeaways.trim()) {
      setErrorMessage('Please share at least a brief clinical takeaway.');
      return;
    }

    setSubmitting(true);

    try {
      let isVerified = false;
      let verificationSummary: string | null = null;

      // Optional AI certificate verification
      if (proofFile) {
        setStatusMessage('Auditing attendance certificate with AI...');
        const formData = new FormData();
        formData.append('file', proofFile);
        formData.append('courseTitle', selectedCourse.title);
        formData.append('provider', selectedCourse.provider || '');

        const verifyRes = await fetch('/api/verify-proof', {
          method: 'POST',
          body: formData,
        });

        if (verifyRes.ok) {
          const verifyJson = await verifyRes.json();
          isVerified = Boolean(verifyJson.verified);
          verificationSummary = verifyJson.reason || null;
        }
      }

      setStatusMessage('Publishing peer review...');

      const { error: insertError } = await supabase.from('reviews').insert({
        course_id: selectedCourse.id,
        overall_rating: Number(overallRating),
        clinical_actionability: Number(clinicalActionability),
        commercial_bias: Number(commercialBias),
        takeaways: takeaways.trim(),
        reviewer_role: reviewerRole,
        verified_attendee: isVerified,
        verification_notes: verificationSummary,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      router.push(`/course/${selectedCourse.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong while publishing your review.';
      setErrorMessage(message);
      setStatusMessage(null);
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course Catalog
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Submit a Peer CE Evaluation</h1>
            <p className="text-sm text-slate-600 mt-1">
              Help fellow clinicians separate high-yield clinical education from vendor sales pitches.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {statusMessage && (
            <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Autocomplete Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Select Continuing Education Course *
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedCourse(null);
                    setShowDropdown(true);
                  }}
                  placeholder={
                    loadingCourses
                      ? 'Loading course catalog...'
                      : 'Search by course title, provider, or speaker...'
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              {selectedCourse && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50/70 px-3.5 py-2 text-xs text-teal-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>
                      <strong>{selectedCourse.title}</strong>
                      {selectedCourse.provider ? ` (${selectedCourse.provider})` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourse(null);
                      setSearchQuery('');
                      setShowDropdown(true);
                    }}
                    className="text-teal-700 underline hover:text-teal-950 ml-3 shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              {showDropdown && !selectedCourse && (
                <div className="absolute z-20 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg divide-y divide-slate-100">
                  {loadingCourses ? (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      Loading courses...
                    </div>
                  ) : loadError ? (
                    <div className="px-4 py-3 text-sm text-red-600">
                      Error loading courses: {loadError}
                    </div>
                  ) : filteredCourses.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      No matching courses found. Try another keyword.
                    </div>
                  ) : (
                    filteredCourses.map((course) => {
                      const creditCount = course.ce_credits ?? course.credits;
                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => {
                            setSelectedCourse(course);
                            setSearchQuery(course.title);
                            setShowDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="text-sm font-medium text-slate-900 line-clamp-1">
                            {course.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {course.provider || 'CE Provider'}
                            {course.speaker ? ` • ${course.speaker}` : ''}
                            {creditCount ? ` • ${creditCount} CE` : ''}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 1-5 Integer Rating Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Overall Quality (1–5)
                </label>
                <select
                  value={overallRating}
                  onChange={(e) => setOverallRating(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  <option value={5}>5 — Must-Take</option>
                  <option value={4}>4 — Very Solid</option>
                  <option value={3}>3 — Average</option>
                  <option value={2}>2 — Below Average</option>
                  <option value={1}>1 — Skip</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Clinical Actionability (1–5)
                </label>
                <select
                  value={clinicalActionability}
                  onChange={(e) => setClinicalActionability(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  <option value={5}>5 — Immediately Usable</option>
                  <option value={4}>4 — Helpful Pearls</option>
                  <option value={3}>3 — Mostly Theoretical</option>
                  <option value={2}>2 — Low Chairside Value</option>
                  <option value={1}>1 — Not Applicable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Vendor Bias (1–5)
                </label>
                <select
                  value={commercialBias}
                  onChange={(e) => setCommercialBias(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  <option value={5}>5 — Completely Unbiased</option>
                  <option value={4}>4 — Minimal Vendor Pitch</option>
                  <option value={3}>3 — Moderate Pitch</option>
                  <option value={2}>2 — Heavy Sponsor Pitch</option>
                  <option value={1}>1 — Pure Infomercial</option>
                </select>
              </div>
            </div>

            {/* Clinical Takeaways */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Clinical Takeaways &amp; Honest Critique *
              </label>
              <textarea
                rows={4}
                value={takeaways}
                onChange={(e) => setTakeaways(e.target.value)}
                placeholder="What protocols, materials, or clinical pearls made this worth your time (or not)?"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>

            {/* Clinician Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Your Clinical Role
              </label>
              <select
                value={reviewerRole}
                onChange={(e) => setReviewerRole(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              >
                <option value="General Dentist (DDS/DMD)">General Dentist (DDS/DMD)</option>
                <option value="Dental Specialist">Dental Specialist</option>
                <option value="Dental Resident / Student">Dental Resident / Student</option>
                <option value="Dental Hygienist (RDH)">Dental Hygienist (RDH)</option>
              </select>
            </div>

            {/* Optional Proof of Attendance Upload */}
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    Optional: Earn a Verified Attendee Badge
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Upload a screenshot or PDF of your CE completion certificate. Our AI confirms
                    course attendance and immediately discards your file—your license number is never
                    stored or displayed.
                  </p>

                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    {proofFile ? (
                      <>
                        <FileCheck2 className="w-4 h-4 text-teal-600" />
                        <span className="truncate max-w-[220px]">{proofFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Attach Certificate (PNG, JPG, PDF)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Publishing Evaluation...' : 'Publish Evaluation'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}