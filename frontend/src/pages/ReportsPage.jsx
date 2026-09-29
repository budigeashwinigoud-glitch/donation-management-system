import { useMemo } from 'react';
import { Activity, CircleDollarSign, HandCoins, Wallet } from 'lucide-react';
import { DataTable, PageHeading, Panel, StateMessage, StatusBadge } from '../components/ui.jsx';
import { useResource } from '../hooks/useResource.js';
import { formatDate, formatMoney, titleCase } from '../utils/format.js';

export default function ReportsPage() {
  const dashboard = useResource('/reports/dashboard');
  const campaignReport = useResource('/reports/campaigns');
  const donations = useResource('/donations');
  const allocations = useResource('/allocations');
  const payments = (donations.data || []).map((donation) => donation.payment).filter(Boolean);
  const donationCounts = countStatuses(donations.data || [], 'status');
  const paymentCounts = countStatuses(payments, 'status');
  const activity = useMemo(() => [
    ...(donations.data || []).map((item) => ({ id: `d-${item.id}`, type: 'Donation', label: `Donation #${item.id}`, detail: `Donor #${item.donor_id} · Campaign #${item.campaign_id}`, date: item.donation_date, amount: item.amount, status: item.status })),
    ...(allocations.data || []).map((item) => ({ id: `a-${item.id}`, type: 'Allocation', label: item.purpose, detail: `Beneficiary #${item.beneficiary_id} · Campaign #${item.campaign_id}`, date: item.allocation_date, amount: item.amount, status: 'RECORDED' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8), [donations.data, allocations.data]);
  const statusLoading = donations.loading || allocations.loading;
  const statusError = donations.error || allocations.error;

  return (
    <>
      <PageHeading eyebrow="FINANCIAL AND GIVING ACTIVITY" title="Reports" />
      <div className="report-layout">
        <div className="report-summary">
          <Summary label="Collected" value={dashboard.data?.total_collected_amount} icon={CircleDollarSign} loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.reload} />
          <Summary label="Allocated" value={dashboard.data?.total_allocated_amount} icon={HandCoins} loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.reload} />
          <Summary label="Available" value={dashboard.data?.available_amount} icon={Wallet} loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.reload} />
        </div>
        <div className="report-two-columns">
          <Panel title="Campaign financial summary">
            {campaignReport.loading || campaignReport.error ? <StateMessage loading={campaignReport.loading} error={campaignReport.error} onRetry={campaignReport.reload} /> : <DataTable rows={campaignReport.data || []} empty="No campaign records are available." columns={[
              { key: 'campaign_name', label: 'Campaign', render: (row) => <span className="cell-primary">{row.campaign_name}</span> },
              { key: 'target_amount', label: 'Target', render: (row) => formatMoney(row.target_amount) },
              { key: 'collected_amount', label: 'Collected', render: (row) => formatMoney(row.collected_amount) },
              { key: 'allocated_amount', label: 'Allocated', render: (row) => formatMoney(row.allocated_amount) },
              { key: 'available_amount', label: 'Available', render: (row) => formatMoney(row.available_amount) },
            ]} />}
          </Panel>
          <Panel title="Donation status">
            {statusLoading || statusError ? <StateMessage loading={statusLoading} error={statusError} onRetry={() => { donations.reload(); allocations.reload(); }} /> : <Breakdown values={donationCounts} />}
          </Panel>
          <Panel title="Payment status">
            {statusLoading || statusError ? <StateMessage loading={statusLoading} error={statusError} onRetry={() => { donations.reload(); allocations.reload(); }} /> : <Breakdown values={paymentCounts} />}
          </Panel>
        </div>
        <Panel title="Recent activity" action={<Activity size={16} color="#72827b" /> }>
          {statusLoading || statusError ? <StateMessage loading={statusLoading} error={statusError} onRetry={() => { donations.reload(); allocations.reload(); }} /> : <DataTable rows={activity} empty="No activity is recorded yet." columns={[
            { key: 'type', label: 'Type', render: (row) => row.type },
            { key: 'label', label: 'Record', render: (row) => <><span className="cell-primary">{row.label}</span><span className="cell-secondary">{row.detail}</span></> },
            { key: 'date', label: 'Date', render: (row) => formatDate(row.date, true) },
            { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          ]} />}
        </Panel>
      </div>
    </>
  );
}

function countStatuses(items, key) {
  const counts = new Map();
  items.forEach((item) => counts.set(item[key] || 'UNKNOWN', (counts.get(item[key] || 'UNKNOWN') || 0) + 1));
  return [...counts].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
}

function Summary({ label, value, icon: Icon, loading, error, onRetry }) {
  return <section className="summary-card"><div><span>{label}</span><Icon size={17} /></div>{loading ? <strong>...</strong> : error ? <button className="metric-retry" onClick={onRetry}>Retry</button> : <strong>{formatMoney(value)}</strong>}</section>;
}

function Breakdown({ values }) {
  const total = values.reduce((sum, item) => sum + item.count, 0);
  return values.length ? <div className="breakdown-bars">{values.map(({ status, count }) => <div className="breakdown-row" key={status}><span>{titleCase(status)}</span><div className="breakdown-track"><div className="breakdown-fill" style={{ width: `${total ? count / total * 100 : 0}%` }} /></div><strong className="breakdown-count">{count}</strong></div>)}</div> : <div className="state-message">No records available.</div>;
}