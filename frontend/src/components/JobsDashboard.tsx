"use client";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import {
  getAvailableJobs,
  getJobStatistics,
  matchCandidatesToJob,
  searchJobs,
  clearMatchResults,
  clearSearchResults,
} from "../../features/jobsSlice.js";

export default function JobsDashboard() {
  const dispatch = useAppDispatch();
  const jobs = useAppSelector((state: any) => state.jobs);

  // Local state
  const [activeTab, setActiveTab] = useState("jobs");
  const [searchTitle, setSearchTitle] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("");
  const [matchJobTitle, setMatchJobTitle] = useState("");
  const [topCandidates, setTopCandidates] = useState(5);

  useEffect(() => {
    // Load initial data
    dispatch(getAvailableJobs() as any);
    dispatch(getJobStatistics() as any);
  }, [dispatch]);

  const handleSearchJobs = () => {
    const searchParams: any = {};
    if (searchTitle) searchParams.title = searchTitle;
    if (selectedJobType) searchParams.job_type = selectedJobType;
    if (selectedEmploymentType)
      searchParams.employment_type = selectedEmploymentType;

    dispatch(searchJobs(searchParams) as any);
  };

  const handleMatchCandidates = () => {
    if (matchJobTitle.trim()) {
      const matchParams = {
        job_title: matchJobTitle,
        top_candidates: topCandidates,
      };
      dispatch(matchCandidatesToJob(matchParams) as any);
    }
  };

  const clearSearch = () => {
    setSearchTitle("");
    setSelectedJobType("");
    setSelectedEmploymentType("");
    dispatch(clearSearchResults());
  };

  const JobCard = ({ job }: { job: any }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {job.title}
        </h3>
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            job.status === "Open"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : job.status === "Closed"
              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
          }`}
        >
          {job.status}
        </span>
      </div>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-3">
        {job.description}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded">
          {job.jobType}
        </span>
        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 text-xs rounded">
          {job.employmentType}
        </span>
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span>ID: {job.jobId}</span>
        <button
          onClick={() => setMatchJobTitle(job.title)}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Match Candidates
        </button>
      </div>
    </div>
  );

  const CandidateMatchCard = ({ match }: { match: any }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {match.candidate_name}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {match.candidate_email}
          </p>
        </div>
        <div className="text-right">
          <div
            className={`text-2xl font-bold ${
              match.match_score >= 70
                ? "text-green-600 dark:text-green-400"
                : match.match_score >= 50
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {match.match_score}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Match Score
          </div>
        </div>
      </div>

      {match.matching_skills.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Matching Skills:
          </h4>
          <div className="flex flex-wrap gap-1">
            {match.matching_skills.map((skill: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {match.relevant_experience.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Relevant Experience:
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-300">
            {match.relevant_experience.map((exp: string, index: number) => (
              <li key={index} className="truncate">
                • {exp}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        <strong>Education:</strong> {match.education_match}
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
        <strong>AI Summary:</strong>
        <p className="mt-1 text-gray-700 dark:text-gray-300">{match.summary}</p>
      </div>
    </div>
  );

  const StatisticsCard = ({
    title,
    value,
    icon,
  }: {
    title: string;
    value: any;
    icon: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="text-3xl mr-4">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {value}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Jobs Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage jobs, match candidates, and view analytics
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-4">
            {[
              { id: "jobs", label: "Jobs", icon: "💼" },
              { id: "search", label: "Search Jobs", icon: "🔍" },
              { id: "match", label: "Match Candidates", icon: "🎯" },
              { id: "stats", label: "Statistics", icon: "📊" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "jobs" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Available Jobs
              </h2>
              <button
                onClick={() => dispatch(getAvailableJobs() as any)}
                disabled={jobs.isLoadingJobs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {jobs.isLoadingJobs ? "Loading..." : "Refresh"}
              </button>
            </div>

            {jobs.isLoadingJobs ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : jobs.jobsError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Error: {jobs.jobsError}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.jobs.map((job: any) => (
                  <JobCard key={job.jobId} job={job} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "search" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Search Jobs
            </h2>

            {/* Search Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Job title..."
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <select
                  value={selectedJobType}
                  onChange={(e) => setSelectedJobType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Job Types</option>
                  <option value="OnSite">On-Site</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
                <select
                  value={selectedEmploymentType}
                  onChange={(e) => setSelectedEmploymentType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Employment Types</option>
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSearchJobs}
                  disabled={jobs.isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {jobs.isSearching ? "Searching..." : "Search"}
                </button>
                <button
                  onClick={clearSearch}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Search Results */}
            {jobs.searchError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Error: {jobs.searchError}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.searchResults.map((job: any) => (
                  <JobCard key={job.jobId} job={job} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "match" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Match Candidates to Job
            </h2>

            {/* Match Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Job title to match..."
                  value={matchJobTitle}
                  onChange={(e) => setMatchJobTitle(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  placeholder="Top candidates"
                  value={topCandidates}
                  onChange={(e) =>
                    setTopCandidates(parseInt(e.target.value) || 5)
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleMatchCandidates}
                  disabled={jobs.isMatching || !matchJobTitle.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {jobs.isMatching ? "Matching..." : "Match Candidates"}
                </button>
              </div>
              {jobs.currentJobTitle && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Showing matches for: <strong>{jobs.currentJobTitle}</strong>
                </p>
              )}
            </div>

            {/* Match Results */}
            {jobs.matchError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Error: {jobs.matchError}
              </div>
            ) : jobs.matchResults.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {jobs.matchResults.map((match: any, index: number) => (
                  <CandidateMatchCard key={index} match={match} />
                ))}
              </div>
            ) : jobs.currentJobTitle ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No matching candidates found for "{jobs.currentJobTitle}"
              </div>
            ) : null}
          </div>
        )}

        {activeTab === "stats" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Statistics
            </h2>

            {jobs.isLoadingStats ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : jobs.statsError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Error: {jobs.statsError}
              </div>
            ) : jobs.statistics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatisticsCard
                  title="Total Jobs"
                  value={jobs.statistics.total_jobs}
                  icon="💼"
                />
                <StatisticsCard
                  title="Total Candidates"
                  value={jobs.statistics.total_candidates}
                  icon="👥"
                />
                <StatisticsCard
                  title="Employment Types"
                  value={jobs.statistics.employment_types?.length || 0}
                  icon="📋"
                />
                <StatisticsCard
                  title="Job Types"
                  value={jobs.statistics.job_types?.length || 0}
                  icon="🏢"
                />

                {/* Jobs by Status */}
                {jobs.statistics.jobs_by_status && (
                  <div className="md:col-span-2 lg:col-span-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Jobs by Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(jobs.statistics.jobs_by_status).map(
                        ([status, count]) => (
                          <div key={status} className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {count as number}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {status}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
