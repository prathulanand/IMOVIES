import React, { useState } from 'react';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { BarChart3, Download, FileSpreadsheet, Calendar, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [from, setFrom] = useState(thirtyDaysAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [downloadingType, setDownloadingType] = useState(null);

  const handleDownloadReport = async (type, filenamePrefix) => {
    if (!from || !to) {
      toast.error('Please specify both from and to dates');
      return;
    }

    if (new Date(from) > new Date(to)) {
      toast.error('From date cannot be after To date');
      return;
    }

    setDownloadingType(type);
    try {
      const response = await api.get(`/admin/reports/${type}`, {
        params: { from, to },
        responseType: 'blob',
      });

      // Trigger browser file download
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filenamePrefix}_${from}_to_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${filenamePrefix} CSV downloaded successfully!`);
    } catch (err) {
      toast.error(err.message || 'Failed to export report CSV');
    } finally {
      setDownloadingType(null);
    }
  };

  const reports = [
    {
      id: 'bookings',
      title: 'Bookings Master Ledger',
      description: 'Comprehensive itemized record of every booking, ticket code, movie, screen, seats, and customer reference.',
      prefix: 'imovies_bookings',
    },
    {
      id: 'revenue',
      title: 'Revenue & Financial Aggregates',
      description: 'Daily gross revenue, base ticket collections, convenience fees collected, and discount adjustments.',
      prefix: 'imovies_revenue',
    },
    {
      id: 'occupancy',
      title: 'Auditorium Seat Occupancy',
      description: 'Capacity utilization percentages per screen, showing high-demand auditoriums and idle times.',
      prefix: 'imovies_occupancy',
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold m-0">Business Intelligence & CSV Exports</h2>
        <p className="text-secondary small m-0">Export compliant financial and operational ledgers in standard CSV format.</p>
      </div>

      {/* Date Range Selector */}
      <div className="im-glass p-3 p-sm-4 rounded-4 mb-4">
        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
          <Calendar size={18} className="text-danger" />
          <span>Report Reporting Date Range</span>
        </h5>

        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4">
            <Input
              type="date"
              label="From Date (IST)"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </div>

          <div className="col-12 col-md-4">
            <Input
              type="date"
              label="To Date (IST)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>

          <div className="col-12 col-md-4">
            <div className="text-secondary small pb-2">
              Maximum export range is capped at <strong>732 days</strong> (2 years) for guaranteed performance.
            </div>
          </div>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="row g-3 g-sm-4">
        {reports.map((rep) => (
          <div key={rep.id} className="col-12 col-lg-4">
            <div className="im-glass p-3 p-sm-4 rounded-4 h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="p-3 rounded-3 bg-danger bg-opacity-25 text-danger d-inline-block mb-3">
                  <FileSpreadsheet size={24} />
                </div>
                <h5 className="fw-bold mb-2">{rep.title}</h5>
                <p className="text-secondary small mb-4">{rep.description}</p>
              </div>

              <Button
                variant="primary"
                onClick={() => handleDownloadReport(rep.id, rep.prefix)}
                loading={downloadingType === rep.id}
                className="w-100 d-flex align-items-center justify-content-center gap-2"
              >
                <Download size={16} />
                <span>Export CSV File</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
