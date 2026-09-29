import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus } from 'lucide-react';
import { api, dataOf, jsonBody } from '../services/api.js';
import { Button, DataTable, Field, Modal, PageHeading, SearchBox, StateMessage, StatusBadge, Toast } from '../components/ui.jsx';
import { useNotice } from '../hooks/useNotice.js';
import { useResource } from '../hooks/useResource.js';
import { formatDate, formatMoney, formatMoneyOrDash, titleCase } from '../utils/format.js';

const blank = { name: '', description: '', target_amount: '', start_date: '', end_date: '', status: 'DRAFT' };
const statuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export default function CampaignsPage() {
  const campaigns = useResource('/campaigns');
  const finances = useResource('/reports/campaigns');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const { notice, notify, clearNotice } = useNotice();
  const financialById = useMemo(() => new Map((finances.data || []).map((item) => [item.campaign_id, item])), [finances.data]);
  const rows = (campaigns.data || []).filter((item) => (filter === 'ALL' || item.status === filter) && `${item.name} ${item.description || ''}`.toLowerCase().includes(search.toLowerCase()));

  function openForm(campaign) {
    setForm(campaign ? { name: campaign.name, description: campaign.description || '', target_amount: campaign.target_amount, start_date: campaign.start_date, end_date: campaign.end_date, status: campaign.status } : blank);
    setFormError('');
    setDialog({ type: 'form', campaign });
  }

  async function viewCampaign(campaign) {
    setDialog({ type: 'loading' });
    try {
      const details = dataOf(await api(`/campaigns/${campaign.id}`));
      setDialog({ type: 'view', campaign: details });
    } catch (requestError) {
      setDialog(null);
      notify(requestError.message, 'error');
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (form.end_date < form.start_date) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = { ...form, name: form.name.trim(), description: form.description.trim() || null, target_amount: form.target_amount };
    try {
      if (dialog.campaign) {
        await api(`/campaigns/${dialog.campaign.id}`, { method: 'PATCH', body: jsonBody(payload) });
        notify('Campaign changes saved.');
      } else {
        await api('/campaigns', { method: 'POST', body: jsonBody(payload) });
        notify('Campaign created.');
      }
      setDialog(null);
      campaigns.reload();
      finances.reload();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading eyebrow="PROGRAMS AND FUNDRAISING" title="Campaigns" action={<Button onClick={() => openForm(null)}><Plus size={16} /> New campaign</Button>} />
      <section className="panel">
        <div className="panel-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search campaigns" /><select className="toolbar-select" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter campaign status"><option value="ALL">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select><span className="toolbar-count">{rows.length} campaigns</span></div>
        {campaigns.loading || campaigns.error ? <StateMessage loading={campaigns.loading} error={campaigns.error} onRetry={campaigns.reload} /> : <DataTable rows={rows} empty="No campaigns found." columns={[
          { key: 'name', label: 'Campaign', render: (row) => <><span className="cell-primary">{row.name}</span><span className="cell-secondary">{formatDate(row.start_date)} – {formatDate(row.end_date)}</span></> },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'target_amount', label: 'Target', render: (row) => formatMoney(row.target_amount) },
          { key: 'collected_amount', label: 'Collected', render: (row) => formatMoneyOrDash(financialById.get(row.id)?.collected_amount) },
          { key: 'allocated_amount', label: 'Allocated', render: (row) => formatMoneyOrDash(financialById.get(row.id)?.allocated_amount) },
          { key: 'available_amount', label: 'Available', render: (row) => <strong className="cell-primary">{formatMoneyOrDash(financialById.get(row.id)?.available_amount)}</strong> },
          { key: 'actions', label: '', render: (row) => <div className="cell-actions"><button className="table-action" title="View campaign" onClick={() => viewCampaign(row)}><Eye size={14} /></button><button className="table-action" title="Edit campaign" onClick={() => openForm(row)}><Pencil size={14} /></button></div> },
        ]} />}
      </section>
      {dialog?.type === 'form' && <Modal title={dialog.campaign ? 'Edit campaign' : 'Create campaign'} onClose={() => setDialog(null)}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Campaign name"><input autoFocus required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Target amount"><input required type="number" min="0.01" step="0.01" value={form.target_amount} onChange={(event) => setForm({ ...form, target_amount: event.target.value })} /></Field>
            <Field label="Start date"><input required type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value, end_date: form.end_date && form.end_date < event.target.value ? event.target.value : form.end_date })} /></Field>
            <Field label="End date"><input required type="date" min={form.start_date || undefined} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></Field>
            <Field label="Status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></Field>
            <Field label="Description"><textarea maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </div>
          <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save campaign'}</Button></div>
        </form>
      </Modal>}
      {dialog?.type === 'view' && <Modal title={dialog.campaign.name} onClose={() => setDialog(null)}><div className="details-grid"><Detail label="Status" value={<StatusBadge value={dialog.campaign.status} />} /><Detail label="Target amount" value={formatMoney(dialog.campaign.target_amount)} /><Detail label="Collected" value={formatMoneyOrDash(financialById.get(dialog.campaign.id)?.collected_amount)} /><Detail label="Allocated" value={formatMoneyOrDash(financialById.get(dialog.campaign.id)?.allocated_amount)} /><Detail label="Available" value={formatMoneyOrDash(financialById.get(dialog.campaign.id)?.available_amount)} /><Detail label="Dates" value={`${formatDate(dialog.campaign.start_date)} – ${formatDate(dialog.campaign.end_date)}`} /><Detail label="Description" value={dialog.campaign.description || 'No description'} /></div><div className="form-actions"><Button variant="secondary" onClick={() => setDialog(null)}>Close</Button></div></Modal>}
      {dialog?.type === 'loading' && <Modal title="Campaign details" onClose={() => setDialog(null)}><StateMessage loading /></Modal>}
      {notice && <Toast message={notice.message} variant={notice.variant} onClose={clearNotice} />}
    </>
  );
}

function Detail({ label, value }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>; }