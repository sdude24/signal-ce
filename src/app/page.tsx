'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Star, MapPin, Award, Clock, DollarSign, Filter } from 'lucide-react';
import Link from 'next/link';

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

const CATEGORIES = [
  'All',
  'Restorative & Esthetics',
  'Implants & Oral Surgery',
  'Endodontics',
  'Clear Aligners & Ortho',
];

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      setLoading(true);
      let query = supabase.from('courses').select('*').order('credits', { ascending: false });

      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (!error && data) {
        setCourses(data);
      }
      setLoading(false);
    }

    fetchCourses();
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-lg">
              S
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">SignalCE</span>
            <span className="text-xs bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-full">Dental</span>
          </div>
          <Link
          href="/submit"
          className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Add a Course
        </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <span className="inline-block text-xs uppercase tracking-wider font-semibold text-sky-700 bg-sky-100 px-3 py-1 rounded-full mb-4">
          Peer-Vetted Clinical Education
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
          Cut through the sales pitches.<br />Find CE worth taking.
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Independent reviews on clinical utility, commercial bias, and hands-on rigor from practicing dentists and residents.
        </p>
      </section>

      {/* Filter Tabs */}
      <section className="max-w-6xl mx-auto px-6 mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-sm font-medium px-4 py-1.5 rounded-full transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Course Grid */}
      <main className="max-w-6xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">No courses found under this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {course.category}
                    </span>
                    <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      <Star className="w-3.5 h-3.5 fill-current mr-1" />
                      4.9
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 leading-snug mb-1">
                    {course.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mb-4">
                    {course.provider} {course.instructor && `• ${course.instructor}`}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.credits} CE Credits ({course.format})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      <span>${course.cost_estimate.toLocaleString()} tuition</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.accreditation} Approved</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Reviews & Ratings</span>
                    <Link
                      href={`/course/${course.id}`}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                    >
                      View Details & Reviews →
                    </Link>
                  </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}