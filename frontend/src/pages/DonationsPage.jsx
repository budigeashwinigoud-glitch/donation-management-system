import { useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import { api, jsonBody } from '../services/api.js';
import { Button, DataTable, Field, Modal, PageHeading, SearchBox, StateMessage, StatusBadge, Toast } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useResource } from '../hooks/useResource.js';
import { useNotice } from '../hooks/useNotice.js';
import { formatDate, formatMoney, titleCase } from '../utils/format.js';

const blank = { donor_id: '', campaign_id: '', amount: '', payment_method: 'UPI', transaction_reference: '', notes: '' };
const paymentMethods = ['UPI', 'CARD', 'BANK_TRANSFER', 'CASH', 'OTHER'];
const donationStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

function campaignAcceptsDonations(campaign) {
  if (campaign.status !== 'ACTIVE') return false;
  const today = new Date().toISOString().slice(0, 10);
  return campaign.start_date <= today && campaign.end_date >= today;
}

export default function DonationsPage() {
  const donations = useResource('/donations');
  const donors = useResource('/donors?active=true');
  const campaigns = useResource('/campaigns');
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const { notice, notify, clearNotice } = useNotice();
  const donorById = useMemo(() => new Map((donors.data || []).map((donor) => [donor.id, donor])), [donors.data]);
  const campaignById = useMemo(() => new Map((campaigns.data || []).map((campaign) => [campaign.id, campaign])), [campaigns.data]);
  const rows = (donations.data || []).filter((donation) => (statusFilter === 'ALL' || donation.status === statusFilter) && `${donation.id} ${donorById.get(donation.donor_id)?.full_name || ''} ${campaignById.get(donation.campaign_id)?.name || ''} ${donation.transaction_reference || donation.payment?.transaction_reference || ''}`.toLowerCase().includes(search.toLowerCase()));
  const eligibleCampaigns = (campaigns.data || []).filter(campaignAcceptsDonations);

  function openCreate() {
    setForm(blank);
    setFormError('');
    setDialog({ type: 'form' });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      donor_id: Number(form.donor_id),
      campaign_id: Number(form.campaign_id),
      amount: form.amount,
      payment_method: form.payment_method,
      transaction_reference: form.transaction_reference.trim() || null,
      notes: form.notes.trim() || null,
    };
    try {
      await api('/donations', { method: 'POST', body: jsonBody(payload) });
      setDialog(null);
      notify('Donation and payment recorded.');
      donations.reload();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(donation, status) {
    setSaving(true);
    setFormError('');
    try {
      await api(`/donations/${donation.id}/status`, { method: 'PATCH', body: jsonBody({ status }) });
      setDialog(null);
      notify(`Donation and payment marked ${titleCase(status).toLowerCase()}.`);
      donations.reload();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading eyebrow="CONTRIBUTION RECORDS" title="Donations" action={<Button onClick={openCreate}><Plus size={16} /> Record donation</Button>} />
      <section className="panel">
        <div className="panel-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search donor, campaign or reference" /><select className="toolbar-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter donation status"><option value="ALL">All statuses</option>{donationStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select><span className="toolbar-count">{rows.length} donations</span></div>
        {donations.loading || donations.error ? <StateMessage loading={donations.loading} error={donations.error} onRetry={donations.reload} /> : <DataTable rows={rows} empty="No donations match this search." columns={[
          { key: 'id', label: 'Donation', render: (row) => <><span className="cell-primary">#{row.id}</span><span className="cell-secondary">{formatDate(row.donation_date, true)}</span></> },
          { key: 'donor_id', label: 'Donor', render: (row) => donorById.get(row.donor_id)?.full_name || `Donor #${row.donor_id}` },
          { key: 'campaign_id', label: 'Campaign', render: (row) => campaignById.get(row.campaign_id)?.name || `Campaign #${row.campaign_id}` },
          { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
          { key: 'status', label: 'Donation', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'payment_status', label: 'Payment', render: (row) => <span><StatusBadge value={row.payment?.status || 'UNKNOWN'} /><span className="cell-secondary">{titleCase(row.payment?.payment_method || 'not recorded')}</span></span> },
          { key: 'actions', label: '', render: (row) => <button className="table-action" title="View donation" onClick={() => { setFormError(''); setDialog({ type: 'view', donation: row }); }}><Eye size={14} /></button> },
        ]} />}
      </section>

      {dialog?.type === 'form' && <Modal title="Record donation" onClose={() => setDialog(null)}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Donor"><select required value={form.donor_id} onChange={(event) => setForm({ ...form, donor_id: event.target.value })}><option value="">Select an active donor</option>{(donors.data || []).filter((donor) => donor.is_active).map((donor) => <option key={donor.id} value={donor.id}>{donor.full_name}{donor.email ? ` - ${donor.email}` : ''}</option>)}</select>{donors.error && <small className="validation-hint">{donors.error}</small>}</Field>
            <Field label="Campaign"><select required value={form.campaign_id} onChange={(event) => setForm({ ...form, campaign_id: event.target.value })}><option value="">Select an open campaign</option>{eligibleCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select>{campaigns.error ? <small className="validation-hint">{campaigns.error}</small> : eligibleCampaigns.length === 0 && <small>No campaigns are currently accepting donations.</small>}</Field>
            <Field label="Amount (INR)"><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field>
            <Field label="Payment method"><select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}>{paymentMethods.map((method) => <option key={method} value={method}>{titleCase(method)}</option>)}</select></Field>
            <Field label="Transaction reference"><input maxLength={160} value={form.transaction_reference} onChange={(event) => setForm({ ...form, transaction_reference: event.target.value })} /></Field>
            <Field label="Donation date" hint="The server records the current date and time when saved."><input value={new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })} readOnly /></Field>
            <Field label="Notes"><textarea maxLength={5000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </div>
          <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" disabled={saving || donors.loading || campaigns.loading || eligibleCampaigns.length === 0}>{saving ? 'Recording...' : 'Record donation'}</Button></div>
        </form>
      </Modal>}
      {dialog?.type === 'view' && <Modal title={`Donation #${dialog.donation.id}`} onClose={() => setDialog(null)}>
        <div className="details-grid"><Detail label="Donor" value={donorById.get(dialog.donation.donor_id)?.full_name || `Donor #${dialog.donation.donor_id}`} /><Detail label="Campaign" value={campaignById.get(dialog.donation.campaign_id)?.name || `Campaign #${dialog.donation.campaign_id}`} /><Detail label="Amount" value={formatMoney(dialog.donation.amount)} /><Detail label="Date" value={formatDate(dialog.donation.donation_date, true)} /><Detail label="Donation status" value={<StatusBadge value={dialog.donation.status} />} /><Detail label="Payment status" value={<StatusBadge value={dialog.donation.payment?.status} />} /><Detail label="Payment method" value={titleCase(dialog.donation.payment?.payment_method || 'unknown')} /><Detail label="Transaction reference" value={dialog.donation.payment?.transaction_reference || 'Not provided'} /><Detail label="Notes" value={dialog.donation.notes || 'No notes'} /></div>
        {user?.role === 'ADMIN' && <div className="panel-body status-editor"><Field label="Update donation and payment status"><select value={dialog.donation.status} onChange={(event) => changeStatus(dialog.donation, event.target.value)} disabled={saving}>{donationStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></Field>{formError && <p className="form-error" role="alert">{formError}</p>}</div>}
        <div className="form-actions"><Button variant="secondary" onClick={() => setDialog(null)}>Close</Button></div>
      </Modal>}
      {notice && <Toast message={notice.message} variant={notice.variant} onClose={clearNotice} />}
    </>
  );
}

function Detail({ label, value }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>; }