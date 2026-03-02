import { useState, useEffect } from 'react';
import { crawlerAPI } from '../api/client';
import { FiDownload, FiList, FiClock, FiCheckCircle, FiXCircle, FiLoader, FiRefreshCw } from 'react-icons/fi';

export default function AdminPage() {
    const [crawlUrl, setCrawlUrl] = useState('');
    const [batchUrl, setBatchUrl] = useState('');
    const [batchLimit, setBatchLimit] = useState(10);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleCrawl = async (e) => {
        e.preventDefault();
        if (!crawlUrl.trim()) return;
        setLoading(true);
        setMessage(null);
        try {
            const res = await crawlerAPI.crawl(crawlUrl);
            setMessage({ type: 'success', text: `Job đã tạo: ${res.data.job_id}` });
            setJobs(prev => [{ id: res.data.job_id, url: crawlUrl, type: 'single', status: 'pending', progress: 0 }, ...prev]);
            setCrawlUrl('');
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Lỗi tạo job' });
        } finally {
            setLoading(false);
        }
    };

    const handleBatchCrawl = async (e) => {
        e.preventDefault();
        if (!batchUrl.trim()) return;
        setLoading(true);
        setMessage(null);
        try {
            const res = await crawlerAPI.batchCrawl(batchUrl, batchLimit);
            setMessage({ type: 'success', text: `Batch job đã tạo: ${res.data.job_id}` });
            setJobs(prev => [{ id: res.data.job_id, url: batchUrl, type: 'batch', status: 'pending', progress: 0 }, ...prev]);
            setBatchUrl('');
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Lỗi tạo batch job' });
        } finally {
            setLoading(false);
        }
    };

    const refreshJob = async (jobId) => {
        try {
            const res = await crawlerAPI.getJobStatus(jobId);
            setJobs(prev => prev.map(j => j.id === jobId ? res.data : j));
        } catch {
            // ignore
        }
    };

    const statusIcon = (status) => {
        switch (status) {
            case 'completed': return <FiCheckCircle className="text-success" />;
            case 'failed': return <FiXCircle className="text-error" />;
            case 'processing': return <FiLoader className="spin" />;
            default: return <FiClock />;
        }
    };

    return (
        <div className="admin-page">
            <h2>🛠️ Admin — Quản lý Crawler</h2>

            {message && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            <div className="admin-grid">
                {/* Single Crawl */}
                <div className="admin-card">
                    <h3><FiDownload /> Crawl truyện</h3>
                    <p>Nhập URL một truyện để tải về hệ thống</p>
                    <form onSubmit={handleCrawl}>
                        <div className="form-group">
                            <input
                                type="url"
                                value={crawlUrl}
                                onChange={(e) => setCrawlUrl(e.target.value)}
                                placeholder="https://truyenfull.vision/ten-truyen/"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Đang xử lý...' : 'Bắt đầu crawl'}
                        </button>
                    </form>
                </div>

                {/* Batch Crawl */}
                <div className="admin-card">
                    <h3><FiList /> Crawl hàng loạt</h3>
                    <p>Nhập URL danh sách truyện để tải batch</p>
                    <form onSubmit={handleBatchCrawl}>
                        <div className="form-group">
                            <input
                                type="url"
                                value={batchUrl}
                                onChange={(e) => setBatchUrl(e.target.value)}
                                placeholder="https://truyenfull.vision/danh-sach/..."
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Giới hạn số truyện</label>
                            <input
                                type="number"
                                value={batchLimit}
                                onChange={(e) => setBatchLimit(parseInt(e.target.value) || 10)}
                                min={1}
                                max={100}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Đang xử lý...' : 'Bắt đầu batch'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Job List */}
            {jobs.length > 0 && (
                <div className="admin-jobs">
                    <h3><FiClock /> Jobs gần đây</h3>
                    <div className="jobs-list">
                        {jobs.map(job => (
                            <div key={job.id} className={`job-item job-${job.status}`}>
                                <div className="job-info">
                                    <div className="job-status">
                                        {statusIcon(job.status)}
                                        <span>{job.status}</span>
                                    </div>
                                    <div className="job-id">{job.id?.slice(0, 8)}...</div>
                                    <div className="job-type">{job.type}</div>
                                    <div className="job-url" title={job.url}>{job.url}</div>
                                </div>
                                <div className="job-actions">
                                    {job.progress !== undefined && (
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${job.progress}%` }} />
                                            <span>{job.progress}%</span>
                                        </div>
                                    )}
                                    <button onClick={() => refreshJob(job.id)} className="btn btn-sm btn-ghost">
                                        <FiRefreshCw />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
