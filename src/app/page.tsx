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
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Plus,
  Filter,
  ArrowUpRight,
  X
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
  { id: 'All', label: 'All Disciplines', icon: BookOpen },
  { id: 'Dentistry', label: 'Dentistry', icon: Sparkles },
  { id: 'Medicine', label: 'Medicine', icon: Stethoscope },
  { id: 'Pharmacy', label: 'Pharmacy', icon: Pill },
  { id: 'Nursing', label: 'Nursing', icon: HeartPulse },
];

// Shimmer Skeleton matching the spacious 2-column card geometry
function CourseSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 flex flex-col justify-between min-h-[270px] animate-pulse"
        >
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-slate-200 rounded-md" />
                <div className="h-6 w-28 bg-slate-100 rounded-md" />
              </div>
              <div className="h-6 w-14 bg-slate-200 rounded-md" />
            </div>
            <div className="h-6 w-full bg-slate-200 rounded mb-2.5" />
            <div className="h-6 w-3/4 bg-slate-200 rounded mb-4" />
            <div className="h-4 w-1/2 bg-slate-100 rounded" />
          </div>
          <div className="pt-5 mt-6 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-28 bg-slate-100 rounded" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DirectoryContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProfession, setSelectedProfession] = useState(() => searchParams.get('profession') || 'All');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'All');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'credits' | 'cost_asc' | 'newest'>(
    () => (searchParams.get('sort') as any) || 'rating'
  );

  const [specialtyExpanded, setSpecialtyExpanded] = useState(() => Boolean(searchParams.get('category')));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category') || 'All';
      setSelectedProfession(params.get('profession') || 'All');
      setSelectedCategory(cat);
      setSearchQuery(params.get('q') || '');
      setSortBy((params.get('sort') as any) || 'rating');
      if (cat !== 'All') setSpecialtyExpanded(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const availableCategories = useMemo(() => {
    const relevant = selectedProfession === 'All'
      ? courses
      : courses.filter(c => (c.profession || 'Dentistry').toLowerCase() === selectedProfession.toLowerCase());

    const unique = Array.from(new Set(relevant.map(c => c.category).filter(Boolean)));
    return ['All', ...unique.sort()];
  }, [courses, selectedProfession]);

  const handleProfessionChange = (prof: string) => {
    setSelectedProfession(prof);
    setSelectedCategory('All');
    updateUrl({ profession: prof, category: null }, 'push');
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    updateUrl({ category: cat }, 'push');
  };

  const handleSortChange = (sort: any) => {
    setSortBy(sort);
    updateUrl({ sort }, 'push');
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    updateUrl({ q: q || null }, 'replace');
  };

  const clearFilters = () => {
    setSelectedProfession('All');
    setSelectedCategory('All');
    setSearchQuery('');
    setSortBy('rating');
    window.history.pushState(null, '', pathname);
  };

  const activeFilterCount =
    (selectedProfession !== 'All' ? 1 : 0) +
    (selectedCategory !== 'All' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0) +
    (sortBy !== 'rating' ? 1 : 0);

  const filteredAndSortedCourses = useMemo(() => {
    let result = [...courses];

    if (selectedProfession !== 'All') {
      result = result.filter(
        c => (c.profession || 'Dentistry').toLowerCase() === selectedProfession.toLowerCase()
      );
    }

    if (selectedCategory !== 'All') {
      result = result.filter(c => c.category === selectedCategory);
    }

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

  const SidebarPanels = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Discipline
          </span>
          <span className="text-xs font-medium text-slate-400">
            {courses.length} total
          </span>
        </div>
        <div className="p-2 space-y-1">
          {PROFESSIONS.map((p) => {
            const Icon = p.icon;
            const count = p.id === 'All'
              ? courses.length
              : courses.filter(c => (c.profession || 'Dentistry').toLowerCase() === p.id.toLowerCase()).length;
            const active = selectedProfession === p.id;

            return (
              <button
                key={p.id}
                onClick={() => {
                  handleProfessionChange(p.id);
                  setMobileFiltersOpen(false);
                }}
                className={`w-full h-10 px-3 rounded-lg flex items-center justify-between text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sky-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{p.label}</span>
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                    active ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {availableCategories.length > 2 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setSpecialtyExpanded(!specialtyExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              Specialty
              {selectedCategory !== 'All' && (
                <span className="w-2 h-2 rounded-full bg-sky-600" />
              )}
            </span>
            {specialtyExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {specialtyExpanded && (
            <div className="p-2 border-t border-slate-100 space-y-1 max-h-72 overflow-y-auto">
              {availableCategories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      handleCategoryChange(cat);
                      setMobileFiltersOpen(false);
                    }}
                    className={`w-full h-9 px-3 rounded-lg flex items-center justify-between text-xs font-medium transition-colors ${
                      active
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {active && <span className="text-[10px] uppercase tracking-wider text-sky-300">Active</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          Reset All Filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Persistent Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" onClick={clearFilters} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-base shadow-2xs">
                S
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Signal<span className="text-sky-600">CE</span>
              </span>
            </Link>
            <span className="hidden md:inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
              Clinician-Verified Directory
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-sky-600 text-white text-[10px]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <Link
              href="/submit"
              className="h-10 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Course</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-slate-50 h-full p-4 overflow-y-auto z-10 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <span className="font-bold text-sm text-slate-900">Filter Directory</span>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarPanels />
          </div>
        </div>
      )}

      {/* Main Workspace Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-22">
            <SidebarPanels />
          </aside>

          {/* Right Main Content Canvas */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* Search & Sort Control Panel */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search courses, providers, instructors, or clinical topics..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full h-10 pl-10 pr-16 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative sm:w-56">
                  <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="w-full h-10 pl-10 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
                  >
                    <option value="rating">Sort: Highest Rated</option>
                    <option value="reviews">Sort: Most Reviewed</option>
                    <option value="credits">Sort: Credit Hours</option>
                    <option value="cost_asc">Sort: Lowest Tuition</option>
                    <option value="newest">Sort: Recently Added</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>
                    Showing <strong className="text-slate-900 font-semibold">{filteredAndSortedCourses.length}</strong> courses
                  </span>
                  {selectedProfession !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-medium border border-sky-200/60">
                      {selectedProfession}
                    </span>
                  )}
                  {selectedCategory !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium border border-slate-200">
                      {selectedCategory}
                    </span>
                  )}
                </div>

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Spacious 2-Column Course Grid */}
            {loading ? (
              <CourseSkeletonGrid />
            ) : filteredAndSortedCourses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center shadow-2xs">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 text-base mb-1">
                  No matching courses found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                  No courses match your active combination of discipline, specialty, and search keywords.
                </p>
                <button
                  onClick={clearFilters}
                  className="h-10 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAndSortedCourses.map((course) => {
                  const reviews = course.reviews || [];
                  const avgRating = reviews.length
                    ? (reviews.reduce((sum, r) => sum + Number(r.overall_rating), 0) / reviews.length).toFixed(1)
                    : null;

                  return (
                    <Link
                      key={course.id}
                      href={`/course/${course.id}`}
                      className="group bg-white rounded-2xl border border-slate-200 hover:border-sky-500 p-6 sm:p-7 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between min-h-[265px]"
                    >
                      <div>
                        {/* Top Row: Badges & Rating */}
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 shrink-0">
                              {course.profession || 'Dentistry'}
                            </span>
                            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 truncate">
                              {course.category}
                            </span>
                          </div>

                          {avgRating ? (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/70 text-amber-900 px-2.5 py-1 rounded-md font-bold text-xs shrink-0">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              <span>{avgRating}</span>
                              <span className="text-slate-500 font-normal">({reviews.length})</span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md shrink-0">
                              Unreviewed
                            </span>
                          )}
                        </div>

                        {/* Middle Block: Generous Title & Provider Typography */}
                        <h2 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-sky-600 transition-colors line-clamp-2 mb-2.5">
                          {course.title}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium line-clamp-1">
                          {course.provider}
                          {course.instructor && ` • ${course.instructor}`}
                        </p>
                      </div>

                      {/* Bottom Metadata Grid: Clean 2x2 Layout with Breathing Room */}
                      <div className="pt-5 mt-6 border-t border-slate-100 grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{course.credits} Credits</span>
                        </div>

                        <div className="flex items-center gap-1.5 justify-end text-slate-900 font-bold">
                          <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>
                            {Number(course.cost_estimate) > 0
                              ? Number(course.cost_estimate).toLocaleString()
                              : 'Free'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{course.location}</span>
                        </div>

                        <div className="flex items-center gap-1.5 justify-end text-xs text-slate-600 font-medium group-hover:text-sky-600 transition-colors">
                          <Award className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span className="truncate">{course.accreditation?.split(' ')[0] || 'Accredited'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-8 max-w-7xl mx-auto">
          <CourseSkeletonGrid />
        </div>
      }
    >
      <DirectoryContent />
    </Suspense>
  );
}