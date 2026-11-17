'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  Calendar,
  ExternalLink,
  Loader2,
  MapPin,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Course {
  id: string;
  title: string;
  provider?: string | null;
  speaker?: string | null;
  ce_credits?: number | null;
  credits?: number | null;
  specialty?: string | null;
  format?: string | null;
  location?: string | null;
  date?: string | null;
  start_date?: string | null;
  price?: number | string | null;
  url?: string | null;
  description?: string | null;
}

interface Review {
  id: string;
  course_id: string;
  overall_rating?: number | null;
  clinical_actionability?: number | null;
  commercial_bias?: number | null;
  utility_rating?: number | null;
  takeaways?: string | null;
  body?: string | null;
  headline?: string | null;
  reviewer_role?: string | null;
  verified_attendee?: boolean | null;
  created_at?: string | null;
}

function CourseDetailContent() {
  const params = useParams();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;

    async function fetchCourseAndReviews() {
      setLoading(true);
      setErrorMessage(null);

      const [courseRes, reviewsRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).single(),
        supabase
          .from('reviews')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false }),
      ]);

      if (courseRes.error) {
        setErrorMessage(courseRes.error.message);
      } else {
        setCourse(courseRes.data);
      }

      if (!reviewsRes.error && reviewsRes.data) {
        setReviews(reviewsRes.data);
      }

      setLoading(false);
    }

    fetchCourseAndReviews();
  }, [courseId]);

  const metrics = useMemo(() => {
    const validOverall = reviews
      .map((r) => r.overall_rating ?? r.utility_rating)
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));

    const validActionability = reviews
      .map((r) => r.clinical_actionability)
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));

    const validBias = reviews
      .map((r) => r.commercial_bias)
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));

    const avg = (arr: number[]) =>
      arr.length ? (arr.reduce((sum, n) => sum + n, 0) / arr.length).toFixed(1) : null;

    return {
      overall: avg(validOverall),
      actionability: avg(validActionability),
      bias: avg(validBias),
      verifiedCount: reviews.filter((r) => Boolean(r.verified_attendee)).length,
    };
  }, [reviews]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
          <span>Loading course details...</span>
        </div>
      </main>
    );
  }

  if (errorMessage || !course) {
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
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {errorMessage || 'Course not found.'}
          </div>
        </div>
      </main>
    );
  }

  const creditCount = course.ce_credits ?? course.credits;
  const courseDate = course.start_date || course.date;

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course Catalog
        </Link>

        {/* Course Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {course.provider && (
              <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 border border-teal-200">
                {course.provider}
              </span>
            )}
            {course.specialty && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {course.specialty}
              </span>
            )}
            {creditCount && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 border border-amber-200">
                <Award className="w-3.5 h-3.5" />
                {creditCount} CE Credits
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{course.title}</h1>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            {course.speaker && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                <span>{course.speaker}</span>
              </div>
            )}
            {courseDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{courseDate}</span>
              </div>
            )}
            {(course.location || course.format) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{course.location || course.format}</span>
              </div>
            )}
          </div>

          {course.description && (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">{course.description}</p>
          )}

          {/* Aggregated Peer Metrics */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4">
              <div className="text-xs font-medium text-slate-500">Overall Quality</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {metrics.overall ? `${metrics.overall} / 5` : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4">
              <div className="text-xs font-medium text-slate-500">Clinical Actionability</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {metrics.actionability ? `${metrics.actionability} / 5` : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Chairside applicability</div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4">
              <div className="text-xs font-medium text-slate-500">Vendor Bias Score</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {metrics.bias ? `${metrics.bias} / 5` : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">5 = completely unbiased</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/submit?courseId=${course.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Write a Peer Review
            </Link>

            {course.url && (
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Course Website</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Peer Reviews & Evaluations Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Peer Reviews &amp; Evaluations</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {metrics.verifiedCount > 0
                  ? `${metrics.verifiedCount} verified attendee ${
                      metrics.verifiedCount === 1 ? 'review' : 'reviews'
                    }`
                  : 'Independent clinical feedback from fellow practitioners'}
              </p>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
              <Sparkles className="w-6 h-6 text-teal-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-900">No peer evaluations yet</div>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                Taken this course? Share whether the clinical pearls matched the marketing and earn a
                Verified Attendee badge.
              </p>
              <Link
                href={`/submit?courseId=${course.id}`}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
              >
                Submit the First Review
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const overall = review.overall_rating ?? review.utility_rating;
                const reviewText = review.takeaways || review.body;
                const formattedDate = review.created_at
                  ? new Date(review.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;

                return (
                  <div
                    key={review.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-3"
                  >
                    {/* Reviewer Role + Verified Attendee Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {review.reviewer_role || 'General Dentist (DDS/DMD)'}
                        </span>

                        {review.verified_attendee && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Verified Attendee
                          </span>
                        )}
                      </div>

                      {formattedDate && (
                        <span className="text-xs text-slate-400">{formattedDate}</span>
                      )}
                    </div>

                    {/* Standardized 1-5 Metrics Pills */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {typeof overall === 'number' && (
                        <span className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-medium text-slate-700">
                          Overall Quality: <strong className="text-slate-900">{overall}/5</strong>
                        </span>
                      )}
                      {typeof review.clinical_actionability === 'number' && (
                        <span className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-medium text-slate-700">
                          Clinical Actionability:{' '}
                          <strong className="text-slate-900">
                            {review.clinical_actionability}/5
                          </strong>
                        </span>
                      )}
                      {typeof review.commercial_bias === 'number' && (
                        <span className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-medium text-slate-700">
                          Vendor Bias:{' '}
                          <strong className="text-slate-900">{review.commercial_bias}/5</strong>
                        </span>
                      )}
                    </div>

                    {/* Review Takeaways */}
                    {reviewText && (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {reviewText}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
            <span>Loading course details...</span>
          </div>
        </main>
      }
    >
      <CourseDetailContent />
    </Suspense>
  );
}