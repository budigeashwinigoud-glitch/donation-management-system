import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, jsonBody } from '../services/api.js';
import { Button, DataTable, Field, Modal, PageHeading, SearchBox, StateMessage, Toast } from '../components/ui.jsx';
import { useResource } from '../hooks/useResource.js';
import { useNotice } from '../hooks/useNotice.js';
import { formatDate, formatMoney } from '../utils/format.js';

const blank = { campaign_id: '', beneficiary_id: '', amount: '', purpose: '', notes: '' };

export default function AllocationsPage() {
  const allocations = useResource('/allocations');
  const campaigns = useResource('/campaigns');
  const beneficiaries = useResource('/beneficiaries');
  const finances = useResource('/reports/campaigns');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const { notice, notify, clearNotice } = useNotice();
  const campaignById = useMemo(() => new Map((campaigns.data || []).map((item) => [item.id, item])), [campaigns.data]);
  const beneficiaryById = useMemo(() => new Map((beneficiaries.data || []).map((item) => [item.id, item])), [beneficiaries.data]);
  const financialById = useMemo(() => new Map((finances.data || []).map((item) => [item.campaign_id, item])), [finances.data]);
  const rows = (allocations.data || []).filter((item) => `${item.purpose} ${campaignById.get(item.campaign_id)?.name || ''} ${beneficiaryById.get(item.beneficiary_id)?.full_name || ''}`.toLowerCase().includes(search.toLowerCase()));
  const selectedFunds = financialById.get(Number(form.campaign_id));
  const eligibleBeneficiaries = (beneficiaries.data || []).filter((item) => item.status === 'ACTIVE');
  const available = Number(selectedFunds?.available_amount || 0);
  const amountInvalid = form.amount !== '' && (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0 || Number(form.amount) > available);

  function openForm() {
    setForm(blank);
    setFormError('');
    setDialog(true);
  }

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    if (Number(form.amount) > available) {
      setFormError('The allocation exceeds available campaign funds.');
      return;
    }
    setSaving(true);
    try {
      await api('/allocations', { method: 'POST', body: jsonBody({
        campaign_id: Number(form.campaign_id),
        beneficiary_id: Number(form.beneficiary_id),
        amount: form.amount,
        purpose: form.purpose.trim(),
        notes: form.notes.trim() || null,
      }) });
      setDialog(false);
      notify('Allocation recorded.');
      allocations.reload();
      finances.reload();
    } catch (requestError) {
      setFormError(requestError.message);
      finances.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading eyebrow="DISTRIBUTION OF COMPLETED FUNDS" title="Allocations" action={<Button onClick={openForm}><Plus size={16} /> New allocation</Button>} />
      <section className="panel">
        <div className="panel-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search beneficiary, campaign or purpose" /><span className="toolbar-count">{rows.length} allocations</span></div>
        {allocations.loading || allocations.error ? <StateMessage loading={allocations.loading} error={allocations.error} onRetry={allocations.reload} /> : <DataTable rows={rows} empty="No allocations match this search." columns={[
          { key: 'allocation_date', label: 'Date', render: (row) => formatDate(row.allocation_date, true) },
          { key: 'campaign_id', label: 'Campaign', render: (row) => campaignById.get(row.campaign_id)?.name || `Campaign #${row.campaign_id}` },
          { key: 'beneficiary_id', label: 'Beneficiary', render: (row) => beneficiaryById.get(row.beneficiary_id)?.full_name || `Beneficiary #${row.beneficiary_id}` },
          { key: 'purpose', label: 'Purpose' },
          { key: 'amount', label: 'Amount', render: (row) => <strong className="cell-primary">{formatMoney(row.amount)}</strong> },
          { key: 'notes', label: 'Notes', render: (row) => row.notes || '—' },
        ]} />}
      </section>
      {dialog && <Modal title="Create allocation" onClose={() => setDialog(false)}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Campaign"><select required value={form.campaign_id} onChange={(event) => setForm({ ...form, campaign_id: event.target.value })}><option value="">Choose campaign</option>{(campaigns.data || []).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.status})</option>)}</select>{campaigns.error && <small className="validation-hint">{campaigns.error}</small>}</Field>
            <Field label="Beneficiary"><select required value={form.beneficiary_id} onChange={(event) => setForm({ ...form, beneficiary_id: event.target.value })}><option value="">Choose active beneficiary</option>{eligibleBeneficiaries.map((item) => <option key={item.id} value={item.id}>{item.full_name} - {item.category}</option>)}</select>{beneficiaries.error ? <small className="validation-hint">{beneficiaries.error}</small> : eligibleBeneficiaries.length === 0 && <small>There are no active beneficiaries.</small>}</Field>
            <div className="field field-full"><span>Available campaign funds</span><div className="available-balance">{form.campaign_id ? formatMoney(selectedFunds?.available_amount) : 'Select a campaign'}</div>{finances.error ? <small className="validation-hint">{finances.error}</small> : form.campaign_id && <small>Based on completed donations less existing allocations.</small>}</div>
            <Field label="Amount (INR)"><input required type="number" min="0.01" max={selectedFunds?.available_amount || undefined} step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} aria-invalid={amountInvalid} />{amountInvalid && <small className="validation-hint">Amount must not exceed the available balance.</small>}</Field>
            <Field label="Purpose"><input required maxLength={160} value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} /></Field>
            <Field label="Allocation date" hint="The server records the current date and time when saved."><input value={new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })} readOnly /></Field>
            <Field label="Notes"><textarea maxLength={5000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </div>
          <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setDialog(false)}>Cancel</Button><Button type="submit" disabled={saving || amountInvalid || !form.campaign_id || !form.beneficiary_id || campaigns.loading || finances.loading || finances.error || beneficiaries.loading}>{saving ? 'Saving...' : 'Create allocation'}</Button></div>
        </form>
      </Modal>}
      {notice && <Toast message={notice.message} variant={notice.variant} onClose={clearNotice} />}
    </>
  );
}