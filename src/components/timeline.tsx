import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { space, T, useTheme } from '../ds';
import type { ProjectStatus } from '../types';

export type StepState = 'done' | 'current' | 'todo' | 'blocked';
export interface Step { title: string; subtitle?: string; state: StepState; right?: React.ReactNode }

const Pulse: React.FC<{ color: string }> = ({ color }) => {
  const s = useSharedValue(0);
  useEffect(() => { s.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false); }, [s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: 1 + s.value * 0.9 }], opacity: 0.5 * (1 - s.value) }));
  return <Animated.View style={[{ position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: color }, a]} />;
};

/** Vertical progress (project journey, DISCOM approvals). */
export const Timeline: React.FC<{ steps: Step[]; onPressStep?: (i: number) => void }> = ({ steps, onPressStep }) => {
  const p = useTheme();
  return (
    <View>
      {steps.map((st, i) => {
        const color = st.state === 'done' ? p.green : st.state === 'current' ? p.accent : st.state === 'blocked' ? p.red : p.fillStrong;
        const last = i === steps.length - 1;
        return (
          <View key={st.title + i} style={{ flexDirection: 'row', gap: space.m, minHeight: 46 }}>
            <View style={{ width: 22, alignItems: 'center' }}>
              <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                {st.state === 'current' ? <Pulse color={p.accent} /> : null}
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: st.state === 'todo' ? 'transparent' : color, borderWidth: st.state === 'todo' ? 2 : 0, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
                  {st.state === 'done' ? <Check size={13} color="#fff" strokeWidth={3.2} /> : st.state === 'blocked' ? <X size={13} color="#fff" strokeWidth={3.2} /> : st.state === 'current' ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} /> : null}
                </View>
              </View>
              {!last ? <View style={{ flex: 1, width: 2, marginVertical: 2, backgroundColor: st.state === 'done' ? p.green : p.fillStrong, borderRadius: 1 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : space.m, flexDirection: 'row', gap: space.s }}>
              <View style={{ flex: 1 }}>
                <T variant="subhead" weight={st.state === 'current' ? '600' : '400'} color={st.state === 'todo' ? 'secondary' : 'label'} onPress={onPressStep ? () => onPressStep(i) : undefined}>{st.title}</T>
                {st.subtitle ? <T variant="footnote" color="secondary">{st.subtitle}</T> : null}
              </View>
              {st.right}
            </View>
          </View>
        );
      })}
    </View>
  );
};

export const PROJECT_STEPS: ProjectStatus[] = ['Booked', 'Planning', 'Material Ordered', 'Installation Scheduled', 'Installation In Progress', 'Installed', 'Inspection Pending', 'Completed'];
const FRIENDLY: Partial<Record<ProjectStatus, string>> = {
  Booked: 'Booking confirmed', Planning: 'Design & planning', 'Material Ordered': 'Material ordered', 'Installation Scheduled': 'Installation scheduled',
  'Installation In Progress': 'Installation in progress', Installed: 'Panels installed', 'Inspection Pending': 'Inspection & net-meter', Completed: 'System live',
};

/** Project status → journey steps (customer-friendly wording). */
export function projectSteps(status: ProjectStatus): Step[] {
  const at = PROJECT_STEPS.indexOf(status);
  const blocked = status === 'Cancelled' || status === 'On Hold';
  return PROJECT_STEPS.map((s, i) => ({
    title: FRIENDLY[s] || s,
    state: blocked ? (i === 0 ? 'blocked' : 'todo') : at < 0 ? 'todo' : i < at ? 'done' : i === at ? (s === 'Completed' ? 'done' : 'current') : 'todo',
    subtitle: blocked && i === 0 ? status : undefined,
  }));
}

export const DISCOM_STAGES = [
  'Feasibility Application Submitted', 'Feasibility Approved', 'Estimate Generated & Paid', 'Work Execution Submitted (WCR)', 'Safety Inspection / CEIG Inspection',
  'Bi-directional Net-Meter Testing', 'Net-Meter Installed on Site', 'Joint Inspection Report (JIR) Signed', 'Subsidy / DBT Portal Claim Dispatched', 'Subsidy Disbursed to Customer',
] as const;
