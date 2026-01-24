'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PricingRule {
  id: string;
  organization_id: string;
  facility_id: string | null;
  court_id: string | null;
  name: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  price_cents: number;
  currency: string | null;
  priority: number | null;
  is_active: boolean | null;
  valid_from: string | null;
  valid_until: string | null;
  facility?: { name: string } | null;
  court?: { name: string } | null;
}

interface Facility {
  id: string;
  name: string;
  courts: { id: string; name: string }[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// Special value for "all" option in Select components (empty string not allowed by Radix)
const ALL_VALUE = '__all__';

export default function PricingPage() {
  const t = useTranslations('settings');
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<PricingRule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formFacilityId, setFormFacilityId] = useState('');
  const [formCourtId, setFormCourtId] = useState('');
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('17:00');
  const [formPrice, setFormPrice] = useState('');
  const [formPriority, setFormPriority] = useState('1');
  const [formValidFrom, setFormValidFrom] = useState('');
  const [formValidUntil, setFormValidUntil] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError(t('pricing.notAuthenticated'));
          setLoading(false);
          return;
        }

        // Get user's organization
        const { data: membership, error: membershipError } = await supabase
          .from('organization_member')
          .select('organization_id')
          .eq('user_id', user.id)
          .is('left_at', null)
          .single();

        if (membershipError || !membership) {
          setError(t('pricing.noOrganization'));
          setLoading(false);
          return;
        }

        setOrganizationId(membership.organization_id);

        // Fetch facilities for dropdown
        const { data: facilitiesData } = await supabase
          .from('facility')
          .select('id, name, court:court(id, name)')
          .eq('organization_id', membership.organization_id)
          .eq('is_active', true);

        if (facilitiesData) {
          setFacilities(
            facilitiesData.map(f => ({
              id: f.id,
              name: f.name,
              courts: (f.court as { id: string; name: string }[]) || [],
            }))
          );
        }

        // Fetch pricing rules
        const { data: rulesData, error: rulesError } = await supabase
          .from('pricing_rule')
          .select(
            `
            *,
            facility:facility_id (name),
            court:court_id (name)
          `
          )
          .eq('organization_id', membership.organization_id)
          .order('priority', { ascending: true });

        if (rulesError) {
          console.error('Error fetching rules:', rulesError);
          setError(t('pricing.fetchError'));
        } else {
          setRules((rulesData as PricingRule[]) || []);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError(t('pricing.fetchError'));
        setLoading(false);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormFacilityId('');
    setFormCourtId('');
    setFormDays([1, 2, 3, 4, 5]);
    setFormStartTime('09:00');
    setFormEndTime('17:00');
    setFormPrice('');
    setFormPriority('1');
    setFormValidFrom('');
    setFormValidUntil('');
  };

  const openEditDialog = (rule: PricingRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormFacilityId(rule.facility_id || '');
    setFormCourtId(rule.court_id || '');
    setFormDays(rule.days_of_week);
    setFormStartTime(rule.start_time);
    setFormEndTime(rule.end_time);
    setFormPrice(String(rule.price_cents / 100));
    setFormPriority(String(rule.priority || 1));
    setFormValidFrom(rule.valid_from || '');
    setFormValidUntil(rule.valid_until || '');
  };

  const handleSaveRule = async () => {
    if (!organizationId || !formName || !formPrice) return;

    setIsProcessing(true);
    try {
      const ruleData = {
        organization_id: organizationId,
        name: formName,
        facility_id: formFacilityId || null,
        court_id: formCourtId || null,
        days_of_week: formDays,
        start_time: formStartTime,
        end_time: formEndTime,
        price_cents: Math.round(parseFloat(formPrice) * 100),
        priority: parseInt(formPriority),
        valid_from: formValidFrom || null,
        valid_until: formValidUntil || null,
        is_active: true,
      };

      if (editingRule) {
        const { error } = await supabase
          .from('pricing_rule')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;

        // Refresh rules
        const { data: rulesData } = await supabase
          .from('pricing_rule')
          .select(`*, facility:facility_id (name), court:court_id (name)`)
          .eq('organization_id', organizationId)
          .order('priority', { ascending: true });

        setRules((rulesData as PricingRule[]) || []);
        setEditingRule(null);
      } else {
        const { data: newRule, error } = await supabase
          .from('pricing_rule')
          .insert(ruleData)
          .select(`*, facility:facility_id (name), court:court_id (name)`)
          .single();

        if (error) throw error;

        setRules(prev => [...prev, newRule as PricingRule]);
        setShowAddDialog(false);
      }

      resetForm();
    } catch (err) {
      console.error('Error saving rule:', err);
      setError(t('pricing.saveError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.from('pricing_rule').delete().eq('id', deletingRule.id);

      if (error) throw error;

      setRules(prev => prev.filter(r => r.id !== deletingRule.id));
      setDeletingRule(null);
    } catch (err) {
      console.error('Error deleting rule:', err);
      setError(t('pricing.deleteError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (rule: PricingRule) => {
    try {
      const { error } = await supabase
        .from('pricing_rule')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);

      if (error) throw error;

      setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)));
    } catch (err) {
      console.error('Error toggling rule:', err);
    }
  };

  const formatDays = (days: number[]) => {
    if (days.length === 7) return t('pricing.allDays');
    if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return t('pricing.weekdays');
    if (days.length === 2 && days.includes(0) && days.includes(6)) return t('pricing.weekends');
    return days.map(d => DAYS_OF_WEEK[d].label.slice(0, 3)).join(', ');
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const selectedFacility = facilities.find(f => f.id === formFacilityId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-0">{t('pricing.title')}</h1>
          <p className="text-muted-foreground">{t('pricing.description')}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
        >
          <Plus className="mr-2 size-4" />
          {t('pricing.addRule')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('pricing.rules.title')}</CardTitle>
          <CardDescription>{t('pricing.rules.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
                <div className="relative p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                  <DollarSign className="size-8 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground text-center mb-4 max-w-sm">
                {t('pricing.noRules')}
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddDialog(true);
                }}
                variant="outline"
              >
                <Plus className="mr-2 size-4" />
                {t('pricing.addFirstRule')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pricing.rules.name')}</TableHead>
                  <TableHead>{t('pricing.rules.scope')}</TableHead>
                  <TableHead>{t('pricing.rules.schedule')}</TableHead>
                  <TableHead>{t('pricing.rules.price')}</TableHead>
                  <TableHead>{t('pricing.rules.status')}</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      {rule.court?.name ? (
                        <span>{rule.court.name}</span>
                      ) : rule.facility?.name ? (
                        <span>{rule.facility.name}</span>
                      ) : (
                        <span className="text-muted-foreground">{t('pricing.allFacilities')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDays(rule.days_of_week)}</div>
                        <div className="text-muted-foreground">
                          {rule.start_time} - {rule.end_time}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatPrice(rule.price_cents)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active ?? true}
                        onCheckedChange={() => handleToggleActive(rule)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(rule)}>
                            <Pencil className="mr-2 size-4" />
                            {t('pricing.actions.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeletingRule(rule)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            {t('pricing.actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editingRule}
        onOpenChange={open => {
          if (!open) {
            setShowAddDialog(false);
            setEditingRule(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? t('pricing.editRule') : t('pricing.addRule')}</DialogTitle>
            <DialogDescription>{t('pricing.ruleFormDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('pricing.form.name')}</Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder={t('pricing.form.namePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('pricing.form.facility')}</Label>
                <Select
                  value={formFacilityId || ALL_VALUE}
                  onValueChange={v => setFormFacilityId(v === ALL_VALUE ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('pricing.form.allFacilities')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>{t('pricing.form.allFacilities')}</SelectItem>
                    {facilities.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('pricing.form.court')}</Label>
                <Select
                  value={formCourtId || ALL_VALUE}
                  onValueChange={v => setFormCourtId(v === ALL_VALUE ? '' : v)}
                  disabled={!formFacilityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('pricing.form.allCourts')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>{t('pricing.form.allCourts')}</SelectItem>
                    {selectedFacility?.courts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('pricing.form.days')}</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <Badge
                    key={day.value}
                    variant={formDays.includes(day.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setFormDays(prev =>
                        prev.includes(day.value)
                          ? prev.filter(d => d !== day.value)
                          : [...prev, day.value].sort()
                      );
                    }}
                  >
                    {day.label.slice(0, 3)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('pricing.form.startTime')}</Label>
                <Input
                  type="time"
                  value={formStartTime}
                  onChange={e => setFormStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('pricing.form.endTime')}</Label>
                <Input
                  type="time"
                  value={formEndTime}
                  onChange={e => setFormEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('pricing.form.price')}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('pricing.form.priority')}</Label>
                <Input
                  type="number"
                  min="1"
                  value={formPriority}
                  onChange={e => setFormPriority(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t('pricing.form.priorityHint')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('pricing.form.validFrom')}</Label>
                <Input
                  type="date"
                  value={formValidFrom}
                  onChange={e => setFormValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('pricing.form.validUntil')}</Label>
                <Input
                  type="date"
                  value={formValidUntil}
                  onChange={e => setFormValidUntil(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingRule(null);
                resetForm();
              }}
            >
              {t('pricing.form.cancel')}
            </Button>
            <Button onClick={handleSaveRule} disabled={isProcessing || !formName || !formPrice}>
              {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingRule ? t('pricing.form.save') : t('pricing.form.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingRule} onOpenChange={() => setDeletingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pricing.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('pricing.delete.description', { name: deletingRule?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRule(null)}>
              {t('pricing.delete.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('pricing.delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
