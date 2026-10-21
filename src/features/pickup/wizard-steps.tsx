import { useState } from 'react';
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ServiceCard } from '@/components/service-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormTextField } from '@/components/ui/form-fields';
import { Icon } from '@/components/ui/icon';
import { Divider, Notice, Section } from '@/components/ui/layout';
import { ChipGroup, OptionCard } from '@/components/ui/option-card';
import { AppText } from '@/components/ui/text';
import { iconOr, PAYMENT_METHODS } from '@/constants/labels';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { estimateFromService, formatEstimate, isServiceAvailable } from '@/domain/pricing';
import { timingOptions } from '@/domain/schedule';
import { useSavedAddresses } from '@/features/account/hooks';
import { getCurrentLocation } from '@/features/location/get-location';
import { PhotoPicker } from '@/features/pickup/photo-picker';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/format';
import type { LocalPhoto } from '@/services/photos';
import type { Catalog } from '@/types/models';
import type { PickupValues } from '@/validation/schemas';

type StepProps = { control: Control<PickupValues>; setValue: UseFormSetValue<PickupValues>; catalog: Catalog };

function FieldError({ message }: { message?: string }) {
  return message ? (
    <AppText variant="caption" color="danger" accessibilityRole="alert">
      {message}
    </AppText>
  ) : null;
}

// ---------------------------------------------------------------------------
// Step 1 — Location
// ---------------------------------------------------------------------------
export function LocationStep({ control, setValue, catalog }: StepProps) {
  const theme = useTheme();
  const saved = useSavedAddresses();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [lat, lng, address] = useWatch({ control, name: ['latitude', 'longitude', 'address'] });

  async function pinLocation() {
    setLocating(true);
    setLocError(null);
    try {
      const loc = await getCurrentLocation();
      setValue('latitude', loc.latitude, { shouldDirty: true });
      setValue('longitude', loc.longitude, { shouldDirty: true });
      if (loc.address && !address.trim()) setValue('address', loc.address, { shouldValidate: true, shouldDirty: true });
    } catch (e) {
      setLocError(errorMessage(e));
    } finally {
      setLocating(false);
    }
  }

  return (
    <>
      {saved.data && saved.data.length > 0 ? (
        <Section title="Saved addresses">
          <View style={styles.savedRow}>
            {saved.data.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => {
                  setValue('localityCode', a.locality_code, { shouldValidate: true });
                  setValue('address', a.address, { shouldValidate: true });
                  setValue('landmark', a.landmark ?? '');
                  setValue('latitude', a.latitude);
                  setValue('longitude', a.longitude);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Use saved address ${a.label}`}
                style={({ pressed }) => [styles.savedChip, { borderColor: theme.border, backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 }]}>
                <Icon name="map-marker-star-outline" size={18} color="primary" />
                <AppText variant="label">{a.label}</AppText>
              </Pressable>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Area">
        <Controller
          control={control}
          name="localityCode"
          render={({ field, fieldState }) => (
            <>
              {catalog.localities.length === 0 ? (
                <Notice tone="warning">No service areas are configured yet. Please check back soon.</Notice>
              ) : (
                <ChipGroup
                  value={field.value || null}
                  onChange={field.onChange}
                  options={catalog.localities.map((l) => ({ value: l.code, label: `${l.name}, ${l.region}`, icon: 'map-marker-outline' as const }))}
                />
              )}
              <FieldError message={fieldState.error?.message} />
            </>
          )}
        />
        <AppText variant="caption">Not in the list? We don&apos;t serve your area yet — we&apos;re expanding across Ghana.</AppText>
      </Section>

      <Section title="Pickup point">
        <Card style={styles.gps}>
          <View style={styles.gpsRow}>
            <View style={[styles.gpsIcon, { backgroundColor: lat != null ? theme.primary : theme.surfaceAlt }]}>
              <Icon name={lat != null ? 'crosshairs-gps' : 'crosshairs'} size={20} color={lat != null ? 'onPrimary' : 'textSecondary'} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{lat != null ? 'Location pinned' : 'Pin your exact location'}</AppText>
              <AppText variant="caption">
                {lat != null && lng != null
                  ? `${lat.toFixed(5)}, ${lng.toFixed(5)} — helps your collector navigate to you.`
                  : 'Optional, but it helps your collector find you quickly.'}
              </AppText>
            </View>
          </View>
          <Button
            title={lat != null ? 'Update my location' : 'Use my current location'}
            variant="outline"
            size="md"
            icon="map-marker-radius-outline"
            loading={locating}
            onPress={pinLocation}
          />
          {lat != null ? (
            <Button
              title="Remove pinned location"
              variant="ghost"
              size="sm"
              onPress={() => {
                setValue('latitude', null);
                setValue('longitude', null);
              }}
            />
          ) : null}
          {locError ? (
            <AppText variant="caption" color="danger">
              {locError}
            </AppText>
          ) : null}
        </Card>
        <FormTextField control={control} name="address" label="Address" placeholder="House number, street, community" autoComplete="street-address" />
        <FormTextField control={control} name="landmark" label="Nearest landmark (optional)" placeholder="e.g. Opposite the Goil station" />
        <AppText variant="caption">Map pin selection becomes available once a maps provider is configured.</AppText>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Waste details
// ---------------------------------------------------------------------------
export function WasteStep({ control, catalog }: StepProps) {
  return (
    <Controller
      control={control}
      name="wasteCategory"
      render={({ field, fieldState }) => (
        <View style={styles.list} accessibilityRole="radiogroup">
          {catalog.wasteCategories.map((w, i) => (
            <Animated.View key={w.code} entering={FadeInDown.delay(i * Motion.stagger).duration(Motion.base)}>
              <OptionCard
                compact
                icon={iconOr(w.icon, 'delete-outline')}
                title={w.name}
                description={w.description}
                selected={field.value === w.code}
                onPress={() => field.onChange(w.code)}
              />
            </Animated.View>
          ))}
          {catalog.wasteCategories.length === 0 ? <Notice tone="warning">Waste categories are not configured yet.</Notice> : null}
          <FieldError message={fieldState.error?.message} />
        </View>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Collection service
// ---------------------------------------------------------------------------
export function ServiceStep({ control, catalog }: StepProps) {
  const locality = useWatch({ control, name: 'localityCode' });
  return (
    <Controller
      control={control}
      name="serviceCategory"
      render={({ field, fieldState }) => (
        <View style={styles.list} accessibilityRole="radiogroup">
          {catalog.serviceCategories.map((s, i) => (
            <Animated.View key={s.code} entering={FadeInDown.delay(i * Motion.stagger).duration(Motion.base)}>
              <ServiceCard
                service={s}
                available={isServiceAvailable(s, locality)}
                selected={field.value === s.code}
                onPress={() => field.onChange(s.code)}
              />
            </Animated.View>
          ))}
          <FieldError message={fieldState.error?.message} />
          <AppText variant="caption">
            Not sure? Basic suits household bags; choose a truck for bulky, commercial or construction loads.
          </AppText>
        </View>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Photos and collection details
// ---------------------------------------------------------------------------
export function DetailsStep({
  control,
  catalog,
  photos,
  onPhotosChange,
}: StepProps & { photos: LocalPhoto[]; onPhotosChange: (p: LocalPhoto[]) => void }) {
  const timings = timingOptions();
  return (
    <>
      <Section title="Photos of the waste (optional)">
        <PhotoPicker photos={photos} onChange={onPhotosChange} />
      </Section>

      {catalog.settings.scheduling_enabled ? (
        <Section title="When should we come?">
          <Controller
            control={control}
            name="timing"
            render={({ field }) => (
              <ChipGroup value={field.value} onChange={field.onChange} options={timings.map((t) => ({ value: t.value, label: t.label }))} />
            )}
          />
        </Section>
      ) : (
        <Notice icon="calendar-remove-outline">Scheduled pickups are not available yet — we’ll collect as soon as possible.</Notice>
      )}

      <Section title="Payment">
        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <View style={styles.list} accessibilityRole="radiogroup">
              {(['cash', 'mobile_money'] as const).map((m) => (
                <OptionCard
                  key={m}
                  compact
                  icon={PAYMENT_METHODS[m].icon}
                  title={PAYMENT_METHODS[m].label}
                  selected={field.value === m}
                  onPress={() => field.onChange(m)}
                />
              ))}
            </View>
          )}
        />
        <AppText variant="caption">
          You pay your collector after the pickup. Never share your Mobile Money PIN with anyone, including DustBin staff.
        </AppText>
      </Section>

      <FormTextField
        control={control}
        name="notes"
        label="Notes for the collector (optional)"
        multiline
        maxLength={500}
        placeholder="Gate colour, where the bags are, best time to call"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Estimate & review
// ---------------------------------------------------------------------------
export function ReviewStep({
  values,
  catalog,
  photos,
  onEdit,
}: {
  values: PickupValues;
  catalog: Catalog;
  photos: LocalPhoto[];
  onEdit: (step: number) => void;
}) {
  const theme = useTheme();
  const service = catalog.serviceCategories.find((s) => s.code === values.serviceCategory);
  const waste = catalog.wasteCategories.find((w) => w.code === values.wasteCategory);
  const locality = catalog.localities.find((l) => l.code === values.localityCode);
  const timing = timingOptions().find((t) => t.value === values.timing);
  const estimate = service ? formatEstimate(estimateFromService(service)) : null;

  return (
    <>
      <Animated.View entering={FadeInDown.duration(Motion.base)}>
        <View style={[styles.estimate, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
          <AppText variant="overline" color="primary">
            {service?.quote_only ? 'Quote required' : 'Estimated price'}
          </AppText>
          <AppText variant="display">{service?.quote_only ? 'Custom quote' : (estimate ?? 'Unavailable')}</AppText>
          <AppText variant="caption" color="text">
            {service?.quote_only
              ? 'Our team will contact you with a quote before any work is scheduled.'
              : estimate
                ? 'This is an estimate, not a final quote. The final amount is confirmed after collection based on the actual load.'
                : 'Pricing is not configured for this service yet. You can still submit, and our team will confirm the price.'}
          </AppText>
        </View>
      </Animated.View>

      <Card>
        <ReviewRow label="Pickup" value={`${values.address}${values.landmark ? ` (near ${values.landmark})` : ''}`} detail={locality ? `${locality.name}, ${locality.region}${values.latitude != null ? ' · location pinned' : ''}` : undefined} onEdit={() => onEdit(0)} />
        <Divider />
        <ReviewRow label="Waste" value={waste?.name ?? '—'} onEdit={() => onEdit(1)} />
        <Divider />
        <ReviewRow label="Service" value={service?.name ?? '—'} detail={service?.vehicle_label} onEdit={() => onEdit(2)} />
        <Divider />
        <ReviewRow
          label="Details"
          value={`${timing?.label ?? 'As soon as possible'} · ${PAYMENT_METHODS[values.paymentMethod].short}`}
          detail={`${photos.length} photo${photos.length === 1 ? '' : 's'}${values.notes ? ` · “${values.notes}”` : ''}`}
          onEdit={() => onEdit(3)}
        />
      </Card>
    </>
  );
}

function ReviewRow({ label, value, detail, onEdit }: { label: string; value: string; detail?: string; onEdit: () => void }) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.flex}>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="bodyStrong">{value}</AppText>
        {detail ? <AppText variant="caption">{detail}</AppText> : null}
      </View>
      <Button title="Edit" variant="ghost" size="sm" onPress={onEdit} accessibilityHint={`Edit ${label.toLowerCase()}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  list: { gap: Spacing.two + 2 },
  savedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  savedChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, borderRadius: Radius.pill, borderWidth: 1 },
  gps: { gap: Spacing.three },
  gpsRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  gpsIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  estimate: { borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.three + 4, gap: Spacing.one + 2 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
});
