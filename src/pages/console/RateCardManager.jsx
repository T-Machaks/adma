import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RateCard } from '@/api/entities';
import { BILLING_PERIOD_ORDER } from '@/lib/rateCard';
import { DollarSign, Save, Loader2, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RateCardManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['rate-card'], queryFn: () => RateCard.get(), staleTime: 30_000 });
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !draft) setDraft(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => RateCard.update(payload),
    onSuccess: (updated) => {
      qc.setQueryData(['rate-card'], updated);
      setDirty(false);
    },
  });

  const markDirty = () => setDirty(true);

  const setItemRate = (sectionId, itemKey, value) => {
    setDraft(d => ({
      ...d,
      sections: d.sections.map(s => s.id !== sectionId ? s : {
        ...s,
        items: s.items.map(i => i.key !== itemKey ? i : { ...i, monthlyRate: value === '' ? '' : Number(value) }),
      }),
    }));
    markDirty();
  };

  const setItemDesc = (sectionId, itemKey, value) => {
    setDraft(d => ({
      ...d,
      sections: d.sections.map(s => s.id !== sectionId ? s : {
        ...s,
        items: s.items.map(i => i.key !== itemKey ? i : { ...i, desc: value }),
      }),
    }));
    markDirty();
  };

  const setPeriodField = (periodKey, field, value) => {
    setDraft(d => ({
      ...d,
      billingPeriods: {
        ...d.billingPeriods,
        [periodKey]: { ...d.billingPeriods[periodKey], [field]: value === '' ? '' : Number(value) },
      },
    }));
    markDirty();
  };

  if (isLoading || !draft) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Rate Card</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Pricing shown to exhibitors on their portal's Rate Card page.</p>
        </div>
        <Button onClick={() => saveMutation.mutate(draft)} disabled={!dirty || saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save Rate Card
        </Button>
      </div>

      {/* Billing periods */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-1 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-amber" /> Billing Periods
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Price for a period = monthly rate × (months − free months). Quarterly has no discount by default; adjust freely.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BILLING_PERIOD_ORDER.map(key => {
            const period = draft.billingPeriods[key];
            if (!period) return null;
            return (
              <div key={key} className="border border-border rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold">{period.label}</p>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-1">Months</label>
                  <Input type="number" min="1" value={period.months} onChange={e => setPeriodField(key, 'months', e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-1">Free Months</label>
                  <Input type="number" min="0" value={period.freeMonths} onChange={e => setPeriodField(key, 'freeMonths', e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      {draft.sections.map(section => (
        <div key={section.id} className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide">{section.label}</h2>
          {section.note && <p className="text-xs text-muted-foreground mt-1 mb-3">{section.note}</p>}
          <div className="space-y-2 mt-3">
            {section.items.map(item => (
              <div key={item.key} className="px-3 py-2.5 rounded-lg border border-border bg-muted/30 space-y-2">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium flex-1">{item.label}</p>
                  <div className="relative w-28">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="number" min="0" step="1"
                      value={item.monthlyRate}
                      onChange={e => setItemRate(section.id, item.key, e.target.value)}
                      className="h-9 pl-7 text-sm"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16">/ month</span>
                </div>
                <Input
                  placeholder="Optional description shown to exhibitors (e.g. what this tier also includes)"
                  value={item.desc || ''}
                  onChange={e => setItemDesc(section.id, item.key, e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
