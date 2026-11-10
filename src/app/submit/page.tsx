'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const CATEGORIES = [
  'Restorative & Esthetics',
  'Implants & Oral Surgery',
  'Endodontics',
  'Clear Aligners & Ortho',
  'Periodontics & Soft Tissue',
  'Practice Management',
];

const FORMATS = [
  'Hands-On Workshop',
  'Live Patient',
  'Lecture & Hands-On',
  'Lecture Only',
  'Self-Paced Online',
  'Live Webinar',
];

const ACCREDITATIONS = ['ADA CERP', 'AGD PACE', 'Both', 'None / Other'];

export default function SubmitCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [instructor, setInstructor] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [credits, setCredits] = useState<number>(8);
  const [cost, setCost] = useState<number>(1500);
  const [location, setLocation] = useState('');
  const [accreditation, setAccreditation] = useState(ACCREDITATIONS[0]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data, error } = await supabase
      .from('courses')
      .insert([
        {
          title,
          provider,
          instructor: instructor || null,
          category,
          format,
          credits: Number(credits),
          cost_estimate: Number(cost),
          location: location || 'Online',
          accreditation,
          website_url: websiteUrl || null,
        },
      ])
      .select();

    setSubmitting(false);

    if (!error && data) {
      setSubmitted(true);
      setTimeout(() => {
        router.push(`/course/${data[0].id}`);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Add Listing</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Submit a Dental CE Course</h1>
          <p className="text-sm text-slate-500 mb-8">
            Add a course that isn't currently listed so you or your colleagues can review it.
          </p>

          {submitted ? (
            <div className="p-8 text-center space-y-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
              <h2 className="text-lg font-bold">Course Added Successfully</h2>
              <p className="text-xs text-emerald-700">Redirecting to the course review page...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Comprehensive Soft Tissue Grafting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Provider / Institution *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spear, Kois, University, Private Institute"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lead Instructor(s)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. John Doe"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Clinical Discipline</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
                  >
                    {FORMATS.map((fmt) => (
                      <option key={fmt} value={fmt}>{fmt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CE Credits *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tuition (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Accreditation</label>
                  <select
                    value={accreditation}
                    onChange={(e) => setAccreditation(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
                  >
                    {ACCREDITATIONS.map((acc) => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Scottsdale, AZ or Online"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Official Course Link</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 mt-4"
              >
                {submitting ? 'Publishing Course...' : 'Submit Course to Directory'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}