import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useRateJob } from '@/features/jobs/hooks';
import { errorMessage } from '@/lib/format';

export function Stars({ value, onChange, size = 32 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <View style={styles.stars} accessibilityRole={onChange ? undefined : 'text'} accessibilityLabel={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          onPress={() => onChange?.(n)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
          <Icon name={n <= value ? 'star' : 'star-outline'} size={size} color={n <= value ? 'warning' : 'textMuted'} />
        </Pressable>
      ))}
    </View>
  );
}

export function RateJob({ jobId }: { jobId: string }) {
  const rate = useRateJob();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    try {
      await rate.mutateAsync({ jobId, rating, comment: comment.trim() });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Card>
      <AppText variant="heading">How was your pickup?</AppText>
      <AppText variant="caption">Your rating helps us keep service quality high.</AppText>
      <Stars value={rating} onChange={setRating} />
      {rating > 0 ? (
        <>
          <TextField label="Comment (optional)" value={comment} onChangeText={setComment} multiline maxLength={500} />
          {error ? (
            <AppText variant="caption" color="danger">
              {error}
            </AppText>
          ) : null}
          <Button title="Submit rating" onPress={onSubmit} loading={rate.isPending} />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.one },
});
