'use client';

import { useEffect, useState, use, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Star, MapPin, Award, Clock, DollarSign, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  provider: string;
  instructor: string | null;
  category: string;
  format: string;
  credits: number;
  cost_estimate: number;
  location: string;
  accreditation: string;
  website_url: string | null;
}

interface Review {
  id: string;
  reviewer_role: string;
  years_in_practice: string;
  overall_rating: number;
  clinical_utility: number;
  commercial_bias: number;
  hands_on_quality: number;
  value_for_money: number;
  headline: string;
  body: string;
  would_recommend: boolean;
  created_at: string;
}

function CourseContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // New review form state
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState('General Dentist');
  const [years, setYears] = useState('< 2 Years');
  const [overallRating, setOverallRating] = useState(5);
  const [utility, setUtility] = useState(5);
  const [commercialBias, setCommercialBias] = useState(1);
  const [handsOn, setHandsOn] = useState(5);
  const [value, setValue] = useState(5);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [recommend, setRecommend] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchCourseAndReviews() {
      setLoading(true);
      const [courseRes, reviewsRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', id).single(),
        supabase.from('reviews').select('*').eq('course_id', id).order('created_at', { ascending: false }),
      ]);

      if (courseRes.data) setCourse(courseRes.data);
      if (reviewsRes.data) setReviews(reviewsRes.data);
      setLoading(false);
    }

    fetchCourseAndReviews();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data, error } = await supabase
      .from('reviews')
      .insert([
        {
          course_id: id,
          reviewer_role: role,
          years_in_practice: years,
          overall_rating: overallRating,
          clinical_utility: utility,
          commercial_bias: commercialBias,
          hands_on_quality: handsOn,
          value_for_money: value,
          headline,
          body,
          would_recommend: recommend,
        },
      ])
      .select();

    if (!error && data) {
      setReviews([data[0], ...reviews]);
      setShowForm(false);
      setHeadline('');
      setBody('');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 p-12 text-center">
        <p className="text-slate-600">Course not found.</p>
        <Link href="/" className="text-sky-600 font-semibold underline mt-4 inline-block">
          ← Return to Directory
        </Link>
      </div>
    );
  }

  const avgRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + Number(r.overall_rating), 0) / reviews.length).toFixed(1)
    : 'New';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Top Bar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {showForm ? 'Close Form' : '+ Write a Review'}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-10">
        {/* Course Overview Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-100 px-3 py-1 rounded-full">
              {course.category}
            </span>
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1 rounded-lg font-bold text-sm">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{avgRating}</span>
              <span className="text-slate-400 font-normal">({reviews.length} reviews)</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{course.title}</h1>
          <p className="text-base text-slate-600 font-medium mb-6">
            Presented by <span className="text-slate-900">{course.provider}</span> {course.instructor && `• Instructor: ${course.instructor}`}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100 text-sm">
            <div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5" /> Credit Hours
              </div>
              <p className="font-semibold text-slate-800">{course.credits} CE Credits</p>
              <p className="text-xs text-slate-500">{course.format}</p>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Tuition
              </div>
              <p className="font-semibold text-slate-800">${course.cost_estimate.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Estimated</p>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5" /> Location
              </div>
              <p className="font-semibold text-slate-800">{course.location}</p>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
                <Award className="w-3.5 h-3.5" /> Provider Status
              </div>
              <p className="font-semibold text-slate-800">{course.accreditation}</p>
            </div>
          </div>

          {course.website_url && (
            <div className="mt-6 flex justify-end">
              <a
                href={course.website_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 underline"
              >
                Visit Official Course Registration Page →
              </a>
            </div>
          )}
        </div>

        {/* Review Submission Drawer */}
        {showForm && (
          <form onSubmit={handleSubmitReview} className="bg-white border-2 border-sky-500 rounded-2xl p-8 mb-10 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Add Your Clinical Evaluation</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                >
                  <option>General Dentist</option>
                  <option>Specialist</option>
                  <option>Dental Resident</option>
                  <option>Dental Student (D3/D4)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Level</label>
                <select
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                >
                  <option>&lt; 2 Years</option>
                  <option>2–5 Years</option>
                  <option>5–10 Years</option>
                  <option>10+ Years</option>
                </select>
              </div>
            </div>

            {/* Granular Ratings */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Overall (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={overallRating}
                  onChange={(e) => setOverallRating(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monday Clinical Utility</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={utility}
                  onChange={(e) => setUtility(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Commercial Pitch (1=Low)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={commercialBias}
                  onChange={(e) => setCommercialBias(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hands-On Quality</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={handsOn}
                  onChange={(e) => setHandsOn(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Headline Summary</label>
              <input
                type="text"
                placeholder="e.g. Great anterior composite tips, high sales pressure on armamentarium"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Clinical Feedback</label>
              <textarea
                rows={4}
                placeholder="Break down what you learned, instructor pacing, and whether the protocols translate directly to your practice."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rec"
                checked={recommend}
                onChange={(e) => setRecommend(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
              />
              <label htmlFor="rec" className="text-xs font-medium text-slate-700">
                I would recommend this CE course to a colleague.
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting Review...' : 'Publish Anonymous Peer Review'}
            </button>
          </form>
        )}

        {/* Reviews List */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Peer Reviews & Evaluations ({reviews.length})</h2>

          {reviews.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              No clinician reviews published yet. Be the first to share your evaluation!
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        <Star className="w-3.5 h-3.5 fill-current mr-1" />
                        {rev.overall_rating}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{rev.reviewer_role}</span>
                      <span className="text-xs text-slate-400">({rev.years_in_practice} experience)</span>
                    </div>
                    {rev.would_recommend ? (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Recommends
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Does Not Recommend
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mb-1">{rev.headline}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{rev.body}</p>

                  <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div>Utility: <span className="font-semibold text-slate-800">{rev.clinical_utility}/5</span></div>
                    <div>Commercial Bias: <span className="font-semibold text-slate-800">{rev.commercial_bias}/5</span></div>
                    <div>Hands-On: <span className="font-semibold text-slate-800">{rev.hands_on_quality}/5</span></div>
                    <div>Value: <span className="font-semibold text-slate-800">{rev.value_for_money}/5</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CourseContent params={params} />
    </Suspense>
  );
}