import { Card } from '@/components/ui/card';
import { Divider, InfoRow, Notice } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';

/** Plain-language summary of what the app collects. Not a substitute for the company's legal privacy policy. */
export default function Privacy() {
  return (
    <Screen edges={['bottom']}>
      <AppText variant="body" color="textSecondary">
        DustBin Africa collects only what is needed to arrange and verify waste collections.
      </AppText>
      <Card>
        <InfoRow icon="account-outline" label="Account" value="Name, email, phone number and account type." />
        <Divider />
        <InfoRow icon="map-marker-outline" label="Location" value="Pickup address, and your device location only when you choose to pin it. Collectors' location is recorded at arrival and completion when they allow it." />
        <Divider />
        <InfoRow icon="camera-outline" label="Photos" value="Photos you add to a request and collection-proof photos. Stored privately; visible only to you, your collector and DustBin dispatch." />
        <Divider />
        <InfoRow icon="cash" label="Payments" value="Amounts and payment status. DustBin never asks for or stores Mobile Money PINs or card numbers." />
      </Card>
      <Card>
        <InfoRow icon="eye-off-outline" label="Who sees what" value="Collectors see the area of open jobs, and your exact address and phone number only after accepting your pickup." />
      </Card>
      <Notice icon="file-document-outline">
        For the full privacy policy, data deletion or access requests, contact DustBin Africa via Help & support.
      </Notice>
    </Screen>
  );
}
