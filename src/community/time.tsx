import React from 'react';

import { community as s } from '@/i18n/community';

import { Num } from './ui/kit';

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function agoParts(iso: string, now = Date.now()): { n: number | null; unit: string } {
  const d = new Date(iso);
  const diff = Math.max(0, now - d.getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return { n: null, unit: s.time.now };
  if (m < 60) return { n: m, unit: s.time.m };
  const h = Math.floor(m / 60);
  if (h < 24) return { n: h, unit: s.time.h };
  const days = Math.floor(h / 24);
  if (days < 7) return { n: days, unit: s.time.d };
  return { n: d.getDate(), unit: MONTHS[d.getMonth()] };
}

/** "3 س" with the number in Jost. Nest inside a <T>. */
export function Ago({ iso }: { iso: string }) {
  const { n, unit } = agoParts(iso);
  return (
    <>
      {n !== null ? <Num>{n}</Num> : null}
      {n !== null ? ' ' : ''}
      {unit}
    </>
  );
}

export function fullDate(iso: string): { day: number; month: string; year: number } {
  const d = new Date(iso);
  return { day: d.getDate(), month: MONTHS[d.getMonth()], year: d.getFullYear() };
}
