export type TimingKey = 'asap' | 'today_pm' | 'tomorrow_am' | 'tomorrow_pm' | 'day_after_am';

export type TimingOption = { value: TimingKey; label: string; date: Date | null };

/** Pickup windows offered to customers. Same-day afternoon is offered only before 1 pm. */
export function timingOptions(now: Date = new Date()): TimingOption[] {
  const at = (dayOffset: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const options: TimingOption[] = [{ value: 'asap', label: 'As soon as possible', date: null }];
  if (now.getHours() < 13) options.push({ value: 'today_pm', label: 'This afternoon', date: at(0, 14) });
  options.push(
    { value: 'tomorrow_am', label: 'Tomorrow morning', date: at(1, 8) },
    { value: 'tomorrow_pm', label: 'Tomorrow afternoon', date: at(1, 14) },
    { value: 'day_after_am', label: 'In 2 days (morning)', date: at(2, 8) },
  );
  return options;
}

export function resolveTiming(key: TimingKey, now: Date = new Date()): Date | null {
  return timingOptions(now).find((o) => o.value === key)?.date ?? null;
}
