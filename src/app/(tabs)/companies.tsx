import { CompaniesScreen } from '@/community/screens/CompaniesScreen';
import { RailInset } from '@/ui';

/** Tab routes wrap themselves: the root Stack leaves the tabs alone so iOS can move them into the Duo rail. */
export default function CompaniesTab() {
  return (
    <RailInset>
      <CompaniesScreen />
    </RailInset>
  );
}
