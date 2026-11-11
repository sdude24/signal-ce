'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Star, 
  MapPin, 
  Award, 
  Clock, 
  DollarSign, 
  Search, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Sparkles,
  BookOpen,
  Stethoscope,
  Pill,
  HeartPulse,
  RotateCcw
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
  website_url: string | null;
  reviews?: { overall_rating: number }[];
}

const PROFESSIONS = [
  { id: 'All', label: 'All Fields', icon: BookOpen },
  { id: 'Dentistry', label: 'Dentistry', icon: Sparkles },
  { id: 'Medicine', label: 'Medicine', icon: Stethoscope },
  { id: 'Pharmacy', label: 'Pharmacy', icon: Pill },
  { id: 'Nursing', label: 'Nursing', icon: HeartPulse },
];

function DirectoryContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize from URL search params
  const [selectedProfession, setSelectedProfession] = useState(() => searchParams.get('profession') || 'All');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'All');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'credits' | 'cost_asc' | 'newest'>(
    () => (searchParams.get('sort') as any) || 'rating'
  );

  // Helper to push or replace history without routing out of the application
  const updateUrl = (newParams: Record<string, string | null>, method: 'push' | 'replace' = 'push') => {
    const params = new URLSearchParams(window.location.search);

    Object.entries(newParams).forEach(([key, value]) => {
      if (!value || value === 'All' || (key === 'sort' && value === 'rating')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    if (method === 'push') {
      window.history.pushState(null, '', newUrl);
    } else {
      window.history.replaceState(null, '', newUrl);
    }
  };

  // Sync state when browser Back or Forward button is clicked
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedProfession(params.get('profession') || 'All');
      setSelectedCategory(params.get('category') || 'All');
      setSearchQuery(params.get('q') || '');
      setSortBy((params.get('sort') as any) || 'rating');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch catalog once on mount
  useEffect(() => {
    async function fetchCatalog() {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*, reviews(overall_rating)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCourses(data);
      }
      setLoading(false);
    }

    fetchCatalog();
  }, []);

  // Compute available specialty categories based on selected profession
  const availableCategories = useMemo(() => {
    const relevant = selectedProfession === 'All'
      ? courses
      : courses.filter(c => (c.profession || 'Dentistry').toLowerCase() === selectedProfession.toLowerCase());
    
    const unique = Array.from(new Set(relevant.map(c => c.category).filter(Boolean)));
    return ['All', ...unique.sort()];
  }, [courses, selectedProfession]);

  // Tab switch
  const handleProfessionChange = (prof: string) => {
    setSelectedProfession(prof);
    setSelectedCategory('All');
    updateUrl({ profession: prof, category: null }, 'push');
  };

  // Specialty chip click
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    updateUrl({ category: cat }, 'push');
  };

  // Sort change
  const handleSortChange = (sort: any) => {
    setSortBy(sort);
    updateUrl({ sort }, 'push');
  };

  // Search input typing (uses replaceState so Back button doesn't cycle individual letters)
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    updateUrl({ q: q || null }, 'replace');
  };

  // Reset all filters
  const clearFilters = () => {
    setSelectedProfession('All');
    setSelectedCategory('All');
    setSearchQuery('');
    setSortBy('rating');
    window.history.pushState(null, '', pathname);
  };

  // Filter and Rank Pipeline
  const filteredAndSortedCourses = useMemo(() => {
    let result = [...courses];

    // 1. Profession Filter
    if (selectedProfession !== 'All') {
      result = result.filter(
        c => (c.profession || 'Dentistry').toLowerCase() === selectedProfession.toLowerCase()
      );
    }

    // 2. Specialty Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(c => c.category === selectedCategory);
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.title?.toLowerCase().includes(q) ||
          c.provider?.toLowerCase().includes(q) ||
          c.instructor?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          c.accreditation?.toLowerCase().includes(q)
      );
    }

    // 4. Sorting & Ranking
    result.sort((a, b) => {
      const aReviews = a.reviews || [];
      const bReviews = b.reviews || [];

      const aAvg = aReviews.length
        ? aReviews.reduce((sum, r) => sum + Number(r.overall_rating), 0) / aReviews.length
        : 0;
      const bAvg = bReviews.length
        ? bReviews.reduce((sum, r) => sum + Number(r.overall_rating), 0) / bReviews.length
        : 0;

      if (sortBy === 'rating') {
        if (bAvg !== aAvg) return bAvg - aAvg;
        return bReviews.length - aReviews.length;
      }
      if (sortBy === 'reviews') {
        return bReviews.length - aReviews.length;
      }
      if (sortBy === 'credits') {
        return Number(b.credits) - Number(a.credits);
      }
      if (sortBy === 'cost_asc') {
        return Number(a.cost_estimate) - Number(b.cost_estimate);
      }
      return 0;
    });

    return result;
  }, [courses, selectedProfession, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-lg">
                S
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Signal<span className="text-sky-600">CE</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Unfiltered Clinician Reviews
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/submit"
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs"
            >
              + List Course
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            Verified Continuing Education
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-3xl">
            Real peer evaluations on clinical applicability, hands-on value, and commercial bias across healthcare professions.
          </p>
        </div>

        {/* Search & Sort Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="relative md:col-span-8">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by topic, instructor, provider (e.g. Kois, anterior composite, GLP-1)..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative md:col-span-4 flex items-center gap-2">
              <div className="relative w-full">
                <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
                >
                  <option value="rating">Highest Rated</option>
                  <option value="reviews">Most Reviewed</option>
                  <option value="credits">Credit Hours (High to Low)</option>
                  <option value="cost_asc">Tuition (Lowest / Free First)</option>
                  <option value="newest">Recently Added</option>
                </select>
              </div>
            </div>
          </div>

          {/* Profession Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-100">
            {PROFESSIONS.map((p) => {
              const Icon = p.icon;
              const count = p.id === 'All'
                ? courses.length
                : courses.filter(c => (c.profession || 'Dentistry').toLowerCase() === p.id.toLowerCase()).length;
              const active = selectedProfession === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => handleProfessionChange(p.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${active ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Specialty Sub-Filter Chips */}
          {availableCategories.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> Specialty:
              </span>
              {availableCategories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Results Counter & Active Filter Badge */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-4 px-1">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredAndSortedCourses.length}</span> verified courses
            {selectedProfession !== 'All' && <span> in <span className="font-semibold text-slate-800">{selectedProfession}</span></span>}
            {selectedCategory !== 'All' && <span> • <span className="font-semibold text-slate-800">{selectedCategory}</span></span>}
            {searchQuery && <span> matching &ldquo;<span className="font-semibold text-slate-800">{searchQuery}</span>&rdquo;</span>}
          </div>

          {(selectedProfession !== 'All' || selectedCategory !== 'All' || searchQuery || sortBy !== 'rating') && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-semibold"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>

        {/* Directory Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-400">Loading accredited course database...</p>
          </div>
        ) : filteredAndSortedCourses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">No courses match your criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Try broadening your specialty selection or clear your search terms.
            </p>
            <button
              onClick={clearFilters}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAndSortedCourses.map((course) => {
              const reviews = course.reviews || [];
              const avgRating = reviews.length
                ? (reviews.reduce((sum, r) => sum + Number(r.overall_rating), 0) / reviews.length).toFixed(1)
                : null;

              return (
                <Link
                  key={course.id}
                  href={`/course/${course.id}`}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-sky-500 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header Chips */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {course.profession || 'Dentistry'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 truncate max-w-[140px]">
                          {course.category}
                        </span>
                      </div>

                      {avgRating ? (
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md font-bold text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{avgRating}</span>
                          <span className="text-slate-400 font-normal text-[10px]">({reviews.length})</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          Unreviewed
                        </span>
                      )}
                    </div>

                    {/* Course Title & Provider */}
                    <h2 className="font-bold text-slate-900 text-base leading-snug group-hover:text-sky-600 transition-colors line-clamp-2 mb-1.5">
                      {course.title}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mb-4 line-clamp-1">
                      {course.provider} {course.instructor && `• ${course.instructor}`}
                    </p>
                  </div>

                  {/* Course Details Bottom Bar */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{course.credits} CE</span>
                      <span className="text-[10px] text-slate-400 truncate">({course.format?.split(' ')[0]})</span>
                    </div>

                    <div className="flex items-center gap-1.5 justify-end">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {Number(course.cost_estimate) > 0 ? `$${Number(course.cost_estimate).toLocaleString()}` : 'Free'}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1 truncate max-w-[170px]">
                        <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                        {course.location}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-slate-500 shrink-0">
                        <Award className="w-3 h-3 text-sky-500" />
                        {course.accreditation?.split(' ')[0] || 'Accredited'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DirectoryContent />
    </Suspense>
  );
}