'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  PlusCircle,
  Star,
  ArrowLeft,
  Clock,
  Award,
  Sparkles,
  Building2,
  User,
  AlertCircle,
  X,
  FileCheck2
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  provider: string;
  instructor: string | null;
  profession: string;
  category: string;
  format: string;
  credits: number;
  cost_estimate: number;
  location: string;
  accreditation: string;
}

const SPECIALTIES_BY_PROFESSION: Record<string, string[]> = {
  Dentistry: ['Restorative', 'Implants & Surgery', 'Endodontics', 'Occlusion & TMJ', 'Periodontics', 'Orthodontics', 'General'],
  Pharmacy: ['Oncology', 'Cardiology', 'Infectious Disease', 'Diabetes & Obesity', 'Pain Management', 'Pharmacy Law & Ethics', 'General'],
  Medicine: ['Internal Medicine', 'Oncology', 'Cardiology', 'Primary Care', 'Emergency Medicine', 'General'],
  Nursing: ['Critical Care', 'Emergency', 'Pharmacology', 'Leadership & Ethics', 'General'],
};

function SubmitReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCourseId = searchParams.get('courseId');

  // Mode: 'existing' (Autocomplete) vs 'new' (Manual Course Entry)
  const [mode, setMode] = useState<'existing' | 'new'>('existing');

  // Catalog Data for Autocomplete
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // New Course Fields (when mode === 'new')
  const [newTitle, setNewTitle] = useState('');
  const [newProvider, setNewProvider] = useState('');
  const [newInstructor, setNewInstructor] = useState('');
  const [newProfession, setNewProfession] = useState('Dentistry');
  const [newCategory, setNewCategory] = useState('Restorative');
  const [newFormat, setNewFormat] = useState('Hands-On Workshop');
  const [newCredits, setNewCredits] = useState('4');
  const [newCost, setNewCost] = useState('0');
  const [newLocation, setNewLocation] = useState('Online');
  const [newAccreditation, setNewAccreditation] = useState('ADA CERP');

  // Peer Evaluation Fields
  const [overallRating, setOverallRating] = useState<number>(5);
  const [clinicalActionability, setClinicalActionability] = useState<number>(5);
  const [commercialBias, setCommercialBias] = useState('Minimal / Unbiased');
  const [reviewerRole, setReviewerRole] = useState('');
  const [reviewText, setReviewText] = useState('');

  // Attendance Proof Upload State
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load scraped catalog on mount
  useEffect(() => {
    async function loadCourses() {
      setLoadingCatalog(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('title', { ascending: true });

      if (!error && data) {
        setCatalog(data);
        if (preselectedCourseId) {
          const match = data.find((c) => c.id === preselectedCourseId);
          if (match) {
            setSelectedCourse(match);
            setMode('existing');
          }
        }
      }
      setLoadingCatalog(false);
    }

    loadCourses();
  }, [preselectedCourseId]);

  // Keep category aligned when switching profession in 'new' mode
  useEffect(() => {
    const options = SPECIALTIES_BY_PROFESSION[newProfession] || ['General'];
    if (!options.includes(newCategory)) {
      setNewCategory(options[0]);
    }
  }, [newProfession, newCategory]);

  // Filter autocomplete results
  const matchingCourses = useMemo(() => {
    if (!searchTerm.trim()) return catalog.slice(0, 12);
    const q = searchTerm.toLowerCase();
    return catalog
      .filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.provider?.toLowerCase().includes(q) ||
          c.instructor?.toLowerCase().includes(q) ||
          c.profession?.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [catalog, searchTerm]);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setSearchTerm('');
    setDropdownOpen(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!reviewText.trim()) {
      setErrorMsg('Please share a brief clinical takeaway or evaluation before submitting.');
      return;
    }

    setSubmitting(true);
    setStatusMessage('Saving your evaluation...');

    try {
      let targetCourseId = selectedCourse?.id;
      let targetCourseTitle = selectedCourse?.title || newTitle.trim();
      let targetCourseProvider = selectedCourse?.provider || newProvider.trim();

      // If creating a new course, insert or upsert it first
      if (mode === 'new') {
        if (!newTitle.trim() || !newProvider.trim()) {
          setErrorMsg('Course title and provider are required when adding a new course.');
          setSubmitting(false);
          setStatusMessage(null);
          return;
        }

        const { data: insertedCourse, error: courseErr } = await supabase
          .from('courses')
          .upsert(
            [
              {
                title: newTitle.trim(),
                provider: newProvider.trim(),
                instructor: newInstructor.trim() || null,
                profession: newProfession,
                category: newCategory,
                format: newFormat,
                credits: parseFloat(newCredits) || 1,
                cost_estimate: parseFloat(newCost) || 0,
                location: newLocation.trim() || 'Online',
                accreditation: newAccreditation.trim() || 'Accredited Provider',
              },
            ],
            { onConflict: 'title,provider' }
          )
          .select()
          .single();

        if (courseErr || !insertedCourse) {
          throw new Error(courseErr?.message || 'Failed to save new course.');
        }

        targetCourseId = insertedCourse.id;
      }

      if (!targetCourseId) {
        setErrorMsg('Please select an existing course from the directory or switch to "Add New Course".');
        setSubmitting(false);
        setStatusMessage(null);
        return;
      }

      // Insert peer review and return the newly created review row
      const { data: createdReview, error: reviewErr } = await supabase
        .from('reviews')
        .insert([
          {
            course_id: targetCourseId,
            overall_rating: overallRating,
            clinical_actionability: clinicalActionability,
            commercial_bias: commercialBias,
            reviewer_role: reviewerRole.trim() || 'Verified Clinician',
            review_text: reviewText.trim(),
            verification_status: proofFile ? 'pending_manual' : 'unverified',
          },
        ])
        .select()
        .single();

      if (reviewErr || !createdReview) {
        throw new Error(reviewErr?.message || 'Failed to save review.');
      }

      // If user attached a CE certificate or receipt, upload & run automated verification
      if (proofFile) {
        setStatusMessage('Uploading & verifying CE attendance proof...');
        const fileExt = proofFile.name.split('.').pop();
        const filePath = `${targetCourseId}/${createdReview.id}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from('ce-proofs')
          .upload(filePath, proofFile);

        if (!uploadErr) {
          await supabase
            .from('reviews')
            .update({ proof_url: filePath })
            .eq('id', createdReview.id);

          // Trigger automated AI certificate check
          await fetch('/api/verify-proof', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reviewId: createdReview.id,
              proofPath: filePath,
              expectedTitle: targetCourseTitle,
              expectedProvider: targetCourseProvider,
            }),
          });
        }
      }

      // Redirect straight to the course detail page
      router.push(`/course/${targetCourseId}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong submitting your review.');
      setSubmitting(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Persistent Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Directory
          </Link>

          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-sm">
              S
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              Signal<span className="text-sky-600">CE</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1.5">
            Submit a Peer Evaluation
          </h1>
          <p className="text-sm text-slate-600">
            Select an existing course from our catalog or add a new program to share unfiltered clinical feedback.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-200/70 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('existing');
              setErrorMsg(null);
            }}
            className={`h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'existing'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4 text-sky-600" />
            <span>Select Existing Course</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('new');
              setSelectedCourse(null);
              setErrorMsg(null);
            }}
            className={`h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'new'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-sky-600" />
            <span>Add New Course</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Course Selection or Creation */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                  Step 1
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  {mode === 'existing' ? 'Find Course in Catalog' : 'Course Details'}
                </h2>
              </div>
              {mode === 'existing' && (
                <span className="text-xs font-medium text-slate-400">
                  {catalog.length} indexed courses
                </span>
              )}
            </div>

            {mode === 'existing' ? (
              <div>
                {selectedCourse ? (
                  /* Selected Course Locked Card */
                  <div className="p-5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-sky-600 text-white">
                            {selectedCourse.profession}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200">
                            {selectedCourse.category}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug pt-1">
                          {selectedCourse.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCourse(null)}
                        className="h-9 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                        Change
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {selectedCourse.provider}
                      </span>
                      {selectedCourse.instructor && (
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {selectedCourse.instructor}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {selectedCourse.credits} Credits
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-sky-500" />
                        {selectedCourse.accreditation}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Autocomplete Search Input & Dropdown */
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Search by Course Title, Provider, or Instructor
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={
                          loadingCatalog
                            ? 'Loading course catalog...'
                            : 'Type to search (e.g. Kois, PowerPak, Implant, GLP-1)...'
                        }
                        value={searchTerm}
                        onFocus={() => setDropdownOpen(true)}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setDropdownOpen(true);
                        }}
                        className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    {dropdownOpen && !loadingCatalog && (
                      <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-lg max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {matchingCourses.length === 0 ? (
                          <div className="p-6 text-center space-y-2">
                            <p className="text-sm font-medium text-slate-700">
                              No matching courses found for &ldquo;{searchTerm}&rdquo;
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setNewTitle(searchTerm);
                                setMode('new');
                                setDropdownOpen(false);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Create &ldquo;{searchTerm}&rdquo; as a new course instead
                            </button>
                          </div>
                        ) : (
                          matchingCourses.map((course) => (
                            <button
                              key={course.id}
                              type="button"
                              onClick={() => handleSelectCourse(course)}
                              className="w-full p-4 text-left hover:bg-sky-50/70 transition-colors flex items-start justify-between gap-4"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                    {course.profession}
                                  </span>
                                  <span className="text-[11px] font-medium text-sky-700">
                                    {course.category}
                                  </span>
                                </div>
                                <p className="font-semibold text-sm text-slate-900 line-clamp-1">
                                  {course.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {course.provider}
                                  {course.instructor && ` • ${course.instructor}`}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md shrink-0">
                                {course.credits} CE
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Manual New Course Entry Fields */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Official Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Anterior Direct Composite Restorations"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Provider / Organization *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    placeholder="e.g. Spear Education"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Lead Instructor (Optional)
                  </label>
                  <input
                    type="text"
                    value={newInstructor}
                    onChange={(e) => setNewInstructor(e.target.value)}
                    placeholder="e.g. Dr. Frank Spear"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Discipline
                  </label>
                  <select
                    value={newProfession}
                    onChange={(e) => setNewProfession(e.target.value)}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {Object.keys(SPECIALTIES_BY_PROFESSION).map((prof) => (
                      <option key={prof} value={prof}>
                        {prof}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Specialty
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {(SPECIALTIES_BY_PROFESSION[newProfession] || ['General']).map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Format
                  </label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Hands-On Workshop">Hands-On Workshop</option>
                    <option value="Lecture">Lecture</option>
                    <option value="Self-Paced Online">Self-Paced Online</option>
                    <option value="Webinar">Webinar</option>
                    <option value="Live Patient">Live Patient</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      CE Credits
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newCredits}
                      onChange={(e) => setNewCredits(e.target.value)}
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Tuition ($ USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Scottsdale, AZ or Online"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Accreditation
                  </label>
                  <input
                    type="text"
                    value={newAccreditation}
                    onChange={(e) => setNewAccreditation(e.target.value)}
                    placeholder="e.g. ADA CERP, AGD PACE, ACPE"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}
          </section>

          {/* STEP 2: Structured Clinical Evaluation & Proof Upload */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                Step 2
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Your Clinical Evaluation
              </h2>
            </div>

            {/* Overall Rating & Clinical Actionability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Overall Quality Rating
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const active = overallRating === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setOverallRating(num)}
                        className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-1 border transition-all ${
                          active
                            ? 'bg-amber-500 border-amber-500 text-white shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{num}</span>
                        <Star className={`w-3.5 h-3.5 ${active ? 'fill-white text-white' : 'text-amber-500'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Clinical Actionability (Next-Day Use)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const active = clinicalActionability === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setClinicalActionability(num)}
                        className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-1 border transition-all ${
                          active
                            ? 'bg-sky-600 border-sky-600 text-white shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{num}</span>
                        <Sparkles className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-sky-500'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Commercial Bias & Reviewer Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Commercial / Vendor Bias
                </label>
                <select
                  value={commercialBias}
                  onChange={(e) => setCommercialBias(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Minimal / Unbiased">Minimal / Evidence-Based</option>
                  <option value="Moderate Product Mention">Moderate Product Mention</option>
                  <option value="Heavy Vendor Sales Pitch">Heavy Vendor Sales Pitch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Your Clinical Role / Credentials
                </label>
                <input
                  type="text"
                  value={reviewerRole}
                  onChange={(e) => setReviewerRole(e.target.value)}
                  placeholder="e.g. General Dentist (DDS), PharmD, RN"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Detailed Review Text */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Unfiltered Review & Key Takeaways *
              </label>
              <textarea
                rows={4}
                required
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Was the hands-on portion worth the tuition? Did you learn techniques you actually use in practice, or was it mostly vendor marketing?"
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Optional Attendance Proof Upload */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  Proof of Attendance (Optional)
                </label>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Earns Verified Attendee Badge
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload a photo or PDF of your CE certificate, AGD/ADA transcript, or registration receipt. Files are stored privately and never displayed publicly.
              </p>
              <div className="pt-1 flex items-center justify-between gap-3">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:text-xs file:font-semibold file:bg-white file:text-slate-700 file:border file:border-slate-200 hover:file:bg-slate-100 cursor-pointer"
                />
                {proofFile && (
                  <button
                    type="button"
                    onClick={() => setProofFile(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? statusMessage || 'Publishing Evaluation...' : 'Publish Evaluation'}</span>
            </button>
          </section>
        </form>
      </main>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SubmitReviewContent />
    </Suspense>
  );
}