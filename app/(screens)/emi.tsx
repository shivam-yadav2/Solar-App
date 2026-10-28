import React, { useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Calculator, IndianRupee, Landmark } from 'lucide-react-native';
import { formatINR } from '../../src/lib/formatters';
import { monthlyEmi, pmSuryaGharSubsidy } from '../../src/lib/emi';
import { Button, ChoiceField, FormSection, IconTile, InfoRow, Screen, Section, T, TextField, num, useOverlay, useTheme } from '../../src/ds';

const YEARS = ['3', '5', '7', '10'] as const;

export default function EmiCalculatorScreen() {
  const p = useTheme();
  const params = useLocalSearchParams<{ amount?: string; capacityKw?: string; label?: string }>();
  const { toast } = useOverlay();
  const [loan, setLoan] = useState(params.amount || '');
  const [capacity, setCapacity] = useState(params.capacityKw || '');
  const [subsidy, setSubsidy] = useState(params.capacityKw ? String(pmSuryaGharSubsidy(num(params.capacityKw))) : '');
  const [rate, setRate] = useState('7');
  const [years, setYears] = useState<(typeof YEARS)[number]>('10');
  const result = useMemo(() => {
    const principal = num(loan);
    const benefit = Math.min(num(subsidy), principal || num(subsidy));
    const balance = Math.max(0, principal - benefit);
    const months = num(years) * 12;
    const emi = monthlyEmi(balance, num(rate), months);
    const total = emi * months;
    return { principal, benefit, balance, months, emi, total, interest: Math.max(0, total - balance) };
  }, [loan, subsidy, rate, years]);
  const ready = result.balance > 0 && result.months > 0;
  const summary = [
    `Solar loan estimate${params.label ? ` - ${params.label}` : ''}`,
    `Loan amount: ${formatINR(result.principal)}`,
    `Subsidy: ${formatINR(result.benefit)}`,
    `Balance financed: ${formatINR(result.balance)}`,
    `ROI: ${num(rate)}% p.a.`,
    `Tenure: ${years} years`,
    `Monthly EMI: ${formatINR(Math.round(result.emi))}`,
    `Total interest: ${formatINR(Math.round(result.interest))}`,
    'Estimate only - final EMI is decided by the bank sanction.',
  ].join('\n');
  const applySubsidy = () => {
    if (num(capacity) <= 0) { toast('Enter the system capacity first', 'error'); return; }
    setSubsidy(String(pmSuryaGharSubsidy(num(capacity))));
  };
  return (
    <Screen title="Loan EMI" subtitle="Solar finance after subsidy" back>
      <Section>
        <InfoRow label="How it works" value="Loan amount - subsidy = financed balance. EMI is calculated on a monthly reducing balance." multiline />
      </Section>
      <FormSection header="Finance">
        <TextField label="Loan amount" kind="money" value={loan} onChange={setLoan} required />
        <TextField label="System capacity (kW)" kind="decimal" value={capacity} onChange={setCapacity} hint="Used only to estimate PM Surya Ghar subsidy." />
        <TextField label="Subsidy amount" kind="money" value={subsidy} onChange={setSubsidy} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}><Button title="Use government subsidy estimate" kind="gray" onPress={applySubsidy} full /></View>
        <TextField label="Interest rate (% per year)" kind="decimal" value={rate} onChange={setRate} />
        <ChoiceField label="Tenure" value={years} onChange={setYears} options={YEARS.map((value) => ({ value, label: `${value} yr` }))} />
      </FormSection>
      <Section header="Estimate">
        <InfoRow label="Financed balance" value={formatINR(result.balance)} />
        <InfoRow label="Monthly EMI" value={<T variant="title2" num style={{ color: p.accentText }}>{ready ? formatINR(Math.round(result.emi)) : '-'}</T>} />
        <InfoRow label="Total interest" value={ready ? formatINR(Math.round(result.interest)) : '-'} />
        <InfoRow label="Total repayment" value={ready ? formatINR(Math.round(result.total)) : '-'} />
      </Section>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <IconTile icon={<Calculator size={18} color={p.orange} />} tone="orange" />
        <View style={{ flex: 1 }}><T variant="subhead" weight="600">Indicative calculation</T><T variant="footnote" color="secondary">Processing fees, insurance and bank-specific rounding are not included.</T></View>
      </View>
      <Button title="Share estimate" icon={<Landmark size={18} color={p.onAccent} />} disabled={!ready} onPress={() => void Share.share({ title: 'Solar loan EMI estimate', message: summary })} full />
      <T variant="caption" color="secondary" align="center">The same reducing-balance formula and subsidy rules are used on web and mobile.</T>
    </Screen>
  );
}
