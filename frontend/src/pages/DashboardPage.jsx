import { Activity, CircleDollarSign, HandCoins, HeartHandshake, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataTable, PageHeading, Panel, StateMessage, StatusBadge } from '../components/ui.jsx';
import { useResource } from '../hooks/useResource.js';
import { formatDate, formatMoney } from '../utils/format.js';

const metricCards = [
  { key: 'total_donors', label: 'Total donors', icon: Users },
  { key: 'active_campaigns', label: 'Active campaigns', icon: HeartHandshake },
  { key: 'total_completed_donations', label: 'Completed donations', icon: CircleDollarSign },
];

export default function DashboardPage() {
  const summary = useResource('/reports/dashboard');
  const donations = useResource('/donations');
  const allocations = useResource('/allocations');
  const campaigns = useResource('/reports/campaigns');
  const donors = useResource('/donors');
  const beneficiaries = useResource('/beneficiaries');
  const donationRows = donations.data || [];
  const allocationRows = allocations.data || [];
  const campaignRows = campaigns.data || [];
  const donorById = new Map((donors.data || []).map((donor) => [donor.id, donor]));
  const beneficiaryById = new Map((beneficiaries.data || []).map((beneficiary) => [beneficiary.id, beneficiary]));
  const campaignById = new Map(campaignRows.map((campaign) => [campaign.campaign_id, campaign]));
  const recentDonations = [...donationRows].sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date)).slice(0, 5);
  const recentAllocations = [...allocationRows].sort((a, b) => new Date(b.allocation_date) - new Date(a.allocation_date)).slice(0, 4);

  return (
    <>
      <PageHeading eyebrow="DONATION OPERATIONS" title="Overview" action={<Link className="button button-secondary" to="/reports"><Activity size={15} /> View reports</Link>} />
      <div className="metric-grid">
        {metricCards.map(({ key, label, icon: Icon }) => <Metric key={key} label={label} icon={Icon} value={summary.data?.[key]} loading={summary.loading} error={summary.error} onRetry={summary.reload} />)}
        <Metric label="Total collected" icon={CircleDollarSign} value={summary.data?.total_collected_amount} money loading={summary.loading} error={summary.error} onRetry={summary.reload} />
        <Metric label="Total allocated" icon={HandCoins} value={summary.data?.total_allocated_amount} money loading={summary.loading} error={summary.error} onRetry={summary.reload} />
        <Metric label="Available funds" icon={Wallet} value={summary.data?.available_amount} money loading={summary.loading} error={summary.error} onRetry={summary.reload} highlight />
      </div>

      <div className="dashboard-columns">
        <div className="dashboard-stack">
          <Panel title="Recent donations" action={<Link className="table-action" to="/donations">All donations</Link>}>
            <DataTable loading={donations.loading} error={donations.error} onRetry={donations.reload} rows={recentDonations} empty="No donations have been recorded." columns={[
              { key: 'donor_id', label: 'Donor', render: (row) => <span className="cell-primary">{donorById.get(row.donor_id)?.full_name || `Donor #${row.donor_id}`}</span> },
              { key: 'campaign_id', label: 'Campaign', render: (row) => campaignById.get(row.campaign_id)?.campaign_name || `Campaign #${row.campaign_id}` },
              { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
              { key: 'date', label: 'Date', render: (row) => formatDate(row.donation_date) },
            ]} />
          </Panel>
          <Panel title="Recent allocations" action={<Link className="table-action" to="/allocations">All allocations</Link>}>
            <DataTable loading={allocations.loading} error={allocations.error} onRetry={allocations.reload} rows={recentAllocations} empty="No allocations have been recorded." columns={[
              { key: 'campaign_id', label: 'Campaign', render: (row) => campaignById.get(row.campaign_id)?.campaign_name || `Campaign #${row.campaign_id}` },
              { key: 'beneficiary_id', label: 'Beneficiary', render: (row) => beneficiaryById.get(row.beneficiary_id)?.full_name || `Beneficiary #${row.beneficiary_id}` },
              { key: 'purpose', label: 'Purpose' },
              { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
            ]} />
          </Panel>
        </div>
        <div className="dashboard-stack">
          <Panel title="Campaign summary" action={<Link className="table-action" to="/campaigns">Manage</Link>}>
            {campaigns.loading || campaigns.error || campaignRows.length === 0 ? <StateMessage loading={campaigns.loading} error={campaigns.error} empty="No campaigns are available." onRetry={campaigns.reload} /> : <div className="campaign-mini">{campaignRows.slice(0, 5).map((campaign) => {
              const target = Number(campaign.target_amount) || 0;
              const collected = Number(campaign.collected_amount) || 0;
              const progress = target ? Math.min(100, collected / target * 100) : 0;
              return <div key={campaign.campaign_id}><div className="campaign-mini-row"><strong>{campaign.campaign_name}</strong><span>{formatMoney(campaign.collected_amount)} / {formatMoney(campaign.target_amount)}</span></div><div className="campaign-progress"><span style={{ width: `${progress}%` }} /></div><div className="campaign-mini-row"><span>Available</span><span>{formatMoney(campaign.available_amount)}</span></div></div>;
            })}</div>}
          </Panel>
          <Panel title="Fund position">
            {summary.loading || summary.error ? <StateMessage loading={summary.loading} error={summary.error} onRetry={summary.reload} /> : <div className="summary-grid">
              <Summary label="Collected" value={summary.data?.total_collected_amount} />
              <Summary label="Allocated" value={summary.data?.total_allocated_amount} />
              <Summary label="Available" value={summary.data?.available_amount} />
            </div>}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Metric({ label, icon: Icon, value, money = false, loading, error, onRetry, highlight = false }) {
  let display = '—';
  if (!loading && !error && value !== undefined && value !== null) display = money ? formatMoney(value) : Number(value).toLocaleString('en-IN');
  return <section className={`metric-card ${highlight ? 'metric-highlight' : ''}`}><div className="metric-label"><span>{label}</span><span className="metric-icon"><Icon size={15} /></span></div>{loading ? <span className="metric-value metric-loading">...</span> : error ? <button className="metric-retry" onClick={onRetry}>Retry</button> : <><strong className="metric-value">{display}</strong><span className="metric-foot">Live database total</span></>}</section>;
}

function Summary({ label, value }) {
  return <div className="summary-tile"><span>{label}</span><strong>{formatMoney(value)}</strong></div>;
}