import { useState } from 'react';
import { crawlerAPI } from '../api/client';

export default function AdminPage() {
    const [crawlUrl, setCrawlUrl] = useState('');
    const [batchUrl, setBatchUrl] = useState('');
    const [batchLimit, setBatchLimit] = useState(10);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [logs, setLogs] = useState([
        '> [SYSTEM] Initializing crawler engine...',
        '> [SYSTEM] Crawler engine ready.',
        '> [STATUS] Idle. Awaiting user input.'
    ]);

    const addLog = (text) => {
        setLogs(prev => [...prev, text]);
    };

    const handleCrawl = async (e) => {
        e.preventDefault();
        if (!crawlUrl.trim()) return;
        setLoading(true);
        setMessage(null);
        addLog(`> [ACTION] Starting single crawl: ${crawlUrl}`);
        try {
            const res = await crawlerAPI.crawl(crawlUrl);
            setMessage({ type: 'success', text: `Job created: ${res.data.job_id}` });
            addLog(`> [SUCCESS] Job created: ${res.data.job_id}`);
            setJobs(prev => [{ id: res.data.job_id, url: crawlUrl, type: 'single', status: 'pending', progress: 0 }, ...prev]);
            setCrawlUrl('');
        } catch (err) {
            const errText = err.response?.data?.detail || 'Failed to create job';
            setMessage({ type: 'error', text: errText });
            addLog(`> [ERROR] ${errText}`);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchCrawl = async (e) => {
        e.preventDefault();
        if (!batchUrl.trim()) return;
        setLoading(true);
        setMessage(null);
        addLog(`> [ACTION] Starting batch crawl: ${batchUrl} (limit: ${batchLimit})`);
        try {
            const res = await crawlerAPI.batchCrawl(batchUrl, batchLimit);
            setMessage({ type: 'success', text: `Batch job created: ${res.data.job_id}` });
            addLog(`> [SUCCESS] Batch job created: ${res.data.job_id}`);
            setJobs(prev => [{ id: res.data.job_id, url: batchUrl, type: 'batch', status: 'pending', progress: 0 }, ...prev]);
            setBatchUrl('');
        } catch (err) {
            const errText = err.response?.data?.detail || 'Failed to create batch job';
            setMessage({ type: 'error', text: errText });
            addLog(`> [ERROR] ${errText}`);
        } finally {
            setLoading(false);
        }
    };

    const refreshJob = async (jobId) => {
        try {
            const res = await crawlerAPI.getJobStatus(jobId);
            setJobs(prev => prev.map(j => j.id === jobId ? res.data : j));
            addLog(`> [STATUS] Job ${jobId.slice(0, 8)}... status: ${res.data.status}`);
        } catch {
            // ignore
        }
    };

    const statusConfig = {
        completed: { icon: 'check_circle', color: 'text-green-400' },
        failed: { icon: 'cancel', color: 'text-red-400' },
        processing: { icon: 'sync', color: 'text-yellow-400 animate-spin-slow' },
        pending: { icon: 'schedule', color: 'text-gray-400' },
    };

    return (
        <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
            {/* Title */}
            <div className="mb-8 flex items-center gap-3">
                <span className="material-icons text-2xl text-white">build</span>
                <h2 className="text-2xl font-bold">Admin — Crawler Management</h2>
            </div>

            {/* Alert */}
            {message && (
                <div className={`mb-6 p-3 rounded-lg text-sm border ${message.type === 'success'
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Single Crawl */}
                <div className="bg-black border border-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-icons text-lg text-white">download</span>
                        <h3 className="text-lg font-semibold">Single Crawl</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-6">Enter a novel URL to fetch data into the system</p>
                    <form onSubmit={handleCrawl} className="space-y-4">
                        <input
                            type="url"
                            value={crawlUrl}
                            onChange={(e) => setCrawlUrl(e.target.value)}
                            placeholder="https://truyenfull.vision/ten-truyen/"
                            required
                            className="w-full bg-black border border-white rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-white focus:border-white outline-none transition-shadow text-white placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white hover:bg-gray-200 text-black font-bold rounded-md px-4 py-3 text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : 'Start Crawl'}
                        </button>
                    </form>
                </div>

                {/* Batch Crawl */}
                <div className="bg-black border border-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-icons text-lg text-white">format_list_bulleted</span>
                        <h3 className="text-lg font-semibold">Batch Crawl</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-6">Enter a list URL to batch fetch multiple novels</p>
                    <form onSubmit={handleBatchCrawl} className="space-y-4">
                        <input
                            type="url"
                            value={batchUrl}
                            onChange={(e) => setBatchUrl(e.target.value)}
                            placeholder="https://truyenfull.vision/danh-sach/..."
                            required
                            className="w-full bg-black border border-white rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-white focus:border-white outline-none transition-shadow text-white placeholder-gray-500"
                        />
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">Novel Limit</label>
                            <input
                                type="number"
                                value={batchLimit}
                                onChange={(e) => setBatchLimit(parseInt(e.target.value) || 10)}
                                min={1}
                                max={100}
                                className="w-full bg-black border border-white rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-white focus:border-white outline-none transition-shadow text-white"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white hover:bg-gray-200 text-black font-bold rounded-md px-4 py-3 text-sm transition-colors shadow-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : 'Start Batch'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Jobs List */}
            {jobs.length > 0 && (
                <div className="mt-8 bg-black border border-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-icons text-lg text-white">work_history</span>
                        <h3 className="text-lg font-semibold text-white">Recent Jobs</h3>
                    </div>
                    <div className="space-y-2">
                        {jobs.map(job => {
                            const sc = statusConfig[job.status] || statusConfig.pending;
                            return (
                                <div key={job.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className={`material-icons text-lg ${sc.color}`}>{sc.icon}</span>
                                        <span className="text-gray-400 font-mono">{job.id?.slice(0, 8)}...</span>
                                        <span className="text-[10px] font-bold bg-white text-black px-1.5 py-0.5 rounded uppercase">{job.type}</span>
                                        <span className="text-gray-400 truncate max-w-[200px]" title={job.url}>{job.url}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {job.progress !== undefined && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                                                </div>
                                                <span className="text-xs text-gray-400">{job.progress}%</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => refreshJob(job.id)}
                                            className="text-gray-400 hover:text-white transition-colors"
                                        >
                                            <span className="material-icons text-sm">refresh</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* System Logs */}
            <div className="mt-8 bg-black border border-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-icons text-lg text-white">terminal</span>
                    <h3 className="text-lg font-semibold text-white">System Logs & Status</h3>
                </div>
                <div className="bg-black border border-white rounded-md p-4 h-40 overflow-y-auto font-mono text-sm text-white space-y-1">
                    {logs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>
            </div>

            {/* Status Badge */}
            <div className="fixed bottom-4 left-4 bg-black text-white text-xs px-3 py-1.5 rounded border border-white flex items-center gap-2 z-50 font-mono">
                <span className="text-gray-400">SYS_STATUS</span>
                <span className="font-bold text-white">ONLINE</span>
            </div>
        </div>
    );
}
