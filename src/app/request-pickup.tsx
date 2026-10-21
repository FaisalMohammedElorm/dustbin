import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { StepProgress } from '@/components/ui/step-progress';
import { AppText } from '@/components/ui/text';
import { Motion, Spacing } from '@/constants/theme';
import { isServiceAvailable } from '@/domain/pricing';
import { resolveTiming } from '@/domain/schedule';
import { useCatalog, useCreatePickup } from '@/features/jobs/hooks';
import { DetailsStep, LocationStep, ReviewStep, ServiceStep, WasteStep } from '@/features/pickup/wizard-steps';
import { errorMessage } from '@/lib/format';
import { uuidV4 } from '@/lib/id';
import { localStore } from '@/lib/local-store';
import { uploadPickupPhoto, type LocalPhoto } from '@/services/photos';
import { PICKUP_STEP_FIELDS, pickupSchema, type PickupValues } from '@/validation/schemas';

const STEPS = ['Location', 'Waste details', 'Collection service', 'Photos & details', 'Review & estimate'];
const DRAFT_KEY = 'pickup-draft-v1';

type Draft = { values: PickupValues; photos: LocalPhoto[]; requestId: string };

const EMPTY: PickupValues = {
  localityCode: '',
  address: '',
  landmark: '',
  latitude: null,
  longitude: null,
  wasteCategory: '',
  serviceCategory: '',
  notes: '',
  timing: 'asap',
  paymentMethod: 'cash',
};

export default function RequestPickup() {
  const catalog = useCatalog();
  const createPickup = useCreatePickup();
  const params = useLocalSearchParams<{ service?: string }>();

  // Restore an unsent request so nothing typed is lost if the app closes.
  const [draft] = useState(() => localStore.get<Draft>(DRAFT_KEY));
  const [restored, setRestored] = useState(!!draft);
  // One idempotency key per request: a double tap or retry can never create a duplicate.
  const requestId = useRef(draft?.requestId ?? uuidV4());
  const [photos, setPhotos] = useState<LocalPhoto[]>(draft?.photos ?? []);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, setValue, trigger, getValues, setError, reset } = useForm<PickupValues>({
    resolver: zodResolver(pickupSchema),
    defaultValues: draft?.values ?? { ...EMPTY, serviceCategory: params.service ?? '' },
    mode: 'onTouched',
  });
  const values = useWatch({ control }) as PickupValues;

  // Preselect the only locality when there is just one.
  useEffect(() => {
    if (catalog.data?.localities.length === 1 && !getValues('localityCode')) {
      setValue('localityCode', catalog.data.localities[0].code);
    }
  }, [catalog.data, getValues, setValue]);

  // Persist the draft as the user types.
  useEffect(() => {
    if (submitting) return;
    const t = setTimeout(() => localStore.set(DRAFT_KEY, { values, photos, requestId: requestId.current } satisfies Draft), 400);
    return () => clearTimeout(t);
  }, [values, photos, submitting]);

  if (catalog.isPending) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (catalog.isError) return <ErrorState error={catalog.error} onRetry={catalog.refetch} />;
  const config = catalog.data;

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  async function next() {
    setSubmitError(null);
    const ok = await trigger(PICKUP_STEP_FIELDS[step]);
    if (!ok) return;
    if (step === 2) {
      const service = config.serviceCategories.find((s) => s.code === getValues('serviceCategory'));
      if (!service || !isServiceAvailable(service, getValues('localityCode'))) {
        setError('serviceCategory', { message: 'This service is not available in your area yet. Choose another.' });
        return;
      }
    }
    goTo(step + 1);
  }

  async function submit() {
    if (submitting) return;
    const ok = await trigger();
    if (!ok) {
      setSubmitError('Some details are missing. Please check each step.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const v = getValues();
    try {
      const job = await createPickup.mutateAsync({
        clientRequestId: requestId.current,
        wasteCategory: v.wasteCategory,
        serviceCategory: v.serviceCategory,
        localityCode: v.localityCode,
        address: v.address,
        landmark: v.landmark,
        latitude: v.latitude,
        longitude: v.longitude,
        notes: v.notes,
        scheduledFor: config.settings.scheduling_enabled ? (resolveTiming(v.timing)?.toISOString() ?? null) : null,
        paymentMethod: v.paymentMethod,
      });

      // The request now exists on the server; photos are uploaded afterwards.
      let failedPhotos = 0;
      for (const photo of photos) {
        try {
          await uploadPickupPhoto(job.id, 'customer', photo);
        } catch {
          failedPhotos++;
        }
      }

      localStore.remove(DRAFT_KEY);
      router.replace({ pathname: '/pickup-confirmed/[id]', params: { id: job.id, failedPhotos: String(failedPhotos) } });
    } catch (e) {
      setSubmitError(errorMessage(e));
      setSubmitting(false);
    }
  }

  function startOver() {
    localStore.remove(DRAFT_KEY);
    requestId.current = uuidV4();
    reset({ ...EMPTY, localityCode: config.localities.length === 1 ? config.localities[0].code : '' });
    setPhotos([]);
    setRestored(false);
    goTo(0);
  }

  const last = step === STEPS.length - 1;
  const Entering = direction === 1 ? FadeInRight : FadeInLeft;
  const stepProps = { control, setValue, catalog: config };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          {step > 0 ? <Button title="Back" variant="outline" onPress={() => goTo(step - 1)} disabled={submitting} style={styles.back} /> : null}
          {last ? (
            <Button title="Confirm request" icon="check-circle-outline" onPress={submit} loading={submitting} style={styles.flex} />
          ) : (
            <Button title="Continue" iconRight="arrow-right" onPress={next} style={styles.flex} />
          )}
        </View>
      }>
      <StepProgress steps={STEPS} current={step} />

      {restored && step === 0 ? (
        <Notice icon="content-save-outline">
          <AppText variant="caption" color="text">
            We restored your unsent request.
          </AppText>
          <AppText variant="label" color="primary" onPress={startOver} accessibilityRole="button">
            Start over
          </AppText>
        </Notice>
      ) : null}

      <Animated.View key={step} entering={Entering.duration(Motion.base)} style={styles.step}>
        {step === 0 ? <LocationStep {...stepProps} /> : null}
        {step === 1 ? <WasteStep {...stepProps} /> : null}
        {step === 2 ? <ServiceStep {...stepProps} /> : null}
        {step === 3 ? <DetailsStep {...stepProps} photos={photos} onPhotosChange={setPhotos} /> : null}
        {step === 4 ? <ReviewStep values={getValues()} catalog={config} photos={photos} onEdit={goTo} /> : null}
      </Animated.View>

      {submitError ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {`${submitError} We couldn’t confirm your request with our server. Try again — a retry will never create a duplicate booking.`}
        </Notice>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: Spacing.two + 4 },
  back: { minWidth: 100 },
  flex: { flex: 1 },
  step: { gap: Spacing.three },
});
