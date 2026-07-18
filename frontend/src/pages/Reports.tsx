import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, getToken } from '../lib/api';
import { Icon } from '../components/Icon';
import { Gauge } from '../components/Charts';

export function Reports() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<any[]>([]);

  useEffect(() => { api.get('/reports/summary').then((r) => setSummary(r.data.items)).catch(() => {}); }, []);

  function exportExcel() {
    // Token is sent via query since it's a direct download; simplest is fetch+blob.
    fetch('/api/reports/tickets.xlsx', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'hidesk-tickets.xlsx'; a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <>
      <div className="page-header"><div className="page-title-row"><h1 className="page-title">{t('nav.reports')}</h1>
        <button className="btn btn-primary btn-sm" onClick={exportExcel}><Icon name="download" size={16} /> {t('common.export')}</button></div></div>
      <div className="content-scroll">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead><tr><th>{t('common.project')}</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Closed</th><th style={{ textAlign: 'right' }}>SLA breached</th><th style={{ textAlign: 'right' }}>Reopened</th><th style={{ textAlign: 'right' }}>{t('dashboard.slaCompliance')}</th></tr></thead>
            <tbody>
              {summary.map((s, i) => {
                const compliance = s.total ? Math.round(((s.total - s.sla_breached) / s.total) * 100) : 100;
                return (
                  <tr key={i}>
                    <td><b>{s.project}</b></td>
                    <td style={{ textAlign: 'right' }}>{s.total}</td>
                    <td style={{ textAlign: 'right' }}>{s.closed}</td>
                    <td style={{ textAlign: 'right', color: s.sla_breached ? 'var(--error)' : 'inherit' }}>{s.sla_breached}</td>
                    <td style={{ textAlign: 'right' }}>{s.reopened}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: compliance >= 90 ? 'var(--success)' : compliance >= 70 ? 'var(--warning)' : 'var(--error)' }}>{compliance}%</td>
                  </tr>
                );
              })}
              {summary.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>{t('common.noData')}</td></tr>}
            </tbody>
          </table>
        </div>

        {summary.length > 0 && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginTop: 16 }}>
            {summary.map((s, i) => {
              const compliance = s.total ? Math.round(((s.total - s.sla_breached) / s.total) * 100) : 100;
              return (
                <div key={i} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{s.project}</div>
                  <Gauge value={compliance} size={130} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
