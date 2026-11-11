import { FeedScreen } from '@/community/screens/FeedScreen';
import { RailInset } from '@/ui';

/** Tab routes wrap themselves: the root Stack leaves the tabs alone so iOS can move them into the Duo rail. */
export default function CommunityTab() {
  return (
    <RailInset>
      <FeedScreen />
    </RailInset>
  );
}
