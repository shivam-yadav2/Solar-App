import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ProjectDetail } from '../../../src/features/projects/ProjectDetail';

export default function ProjectRoute() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  return id ? <ProjectDetail id={id} initialTab={tab} /> : null;
}
