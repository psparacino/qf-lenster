import type {
  RoundMetaData,
  RoundStats as RoundStatsType
} from '@components/Publication/Actions/Tip/QuadraticQueries/grantsQueries';
import {
  useGetQFContributionSummary,
  useGetRoundMatchingUpdate
} from '@components/Publication/Actions/Tip/QuadraticQueries/grantsQueries';
import PublicationRow from '@components/QFRound/PublicationRow';
import Loading from '@components/Shared/Loading';
import { formatDecimals } from '@components/utils/formatDecimals';
import { getPolygonScanLink } from '@components/utils/getPolygonScanLink';
import { getTokenName } from '@components/utils/getTokenName';
import { t, Trans } from '@lingui/macro';
import formatAddress from 'lib/formatAddress';
import { Card } from 'ui';
import type { Chain } from 'wagmi';
import { useChainId } from 'wagmi';

const Item = ({ title, value }: { title: string; value: React.ReactNode }) => (
  <div className="mb-2 flex basis-1/2 flex-col">
    <div className="lt-text-gray-500 text-sm">{title}</div>
    <div className="font-extrabold">{value}</div>
  </div>
);

const numberOfPopularPosts = 5;

export const RoundStats = ({
  stats,
  metaData,
  roundId
}: {
  roundId: string;
  stats: RoundStatsType;
  metaData: RoundMetaData;
}) => {
  const { data: qfContributionSummary } = useGetQFContributionSummary(roundId);
  const { data: matchingUpdate, isLoading } = useGetRoundMatchingUpdate(roundId);
  const chainId = useChainId();

  if (isLoading) {
    return <Loading />;
  }

  const postsWithMatching = stats.posts
    .map((post) => ({
      ...post,
      matching: matchingUpdate?.posts[post.publicationId]
    }))
    .filter((post) => post.matching);

  const sortedPostsWithMatching = postsWithMatching.sort(
    (a, b) => b.matching!.matchPoolPercentage - a.matching!.matchPoolPercentage
  );

  const mostPopularPosts = sortedPostsWithMatching.slice(0, numberOfPopularPosts);
  const otherPosts = sortedPostsWithMatching.slice(numberOfPopularPosts);

  const endTime = new Date(stats.roundEndTime * 1000).toLocaleString();

  const postsReceivingTips = Object.keys(matchingUpdate?.posts || {}).length;
  const tokenName = getTokenName(stats.token);

  return (
    <div className="">
      {metaData.name && <div className="mb-4 text-2xl font-extrabold uppercase">{metaData.name}</div>}
      {metaData?.description && <div className="mb-4">{metaData.description}</div>}
      {!!metaData?.requirements.filter((x) => x !== '').length && (
        <Item title={t`Required publication content`} value={metaData.requirements.join(', ')} />
      )}
      {qfContributionSummary && (
        <div className="flex w-full flex-wrap">
          <Item
            title={t`Total of all tips`}
            value={`${formatDecimals(qfContributionSummary.totalTippedInToken)} ${tokenName}`}
          />
          <Item
            title={t`Total matching funds`}
            value={`${formatDecimals(stats.totalMatched)} ${tokenName}`}
          />
          <Item title={t`Posts receiving tips`} value={postsReceivingTips} />
          <Item title={t`Unique tippers`} value={qfContributionSummary.uniqueContributors || '0'} />
          <Item
            title={t`Average tip`}
            value={`${formatDecimals(qfContributionSummary.averageTipInToken)} ${tokenName}`}
          />
          <Item
            title={t`Average tips per post`}
            value={formatDecimals(
              postsReceivingTips && qfContributionSummary.contributionCount / postsReceivingTips,
              2
            )}
          />
          <Item title={t`Round end`} value={endTime} />
          <Item
            title={t`Contract`}
            value={
              <a
                target="_blank"
                rel="noreferrer"
                className="text-brand flex items-center"
                href={getPolygonScanLink(roundId, 'address', { id: chainId } as Chain)}
              >
                {formatAddress(roundId)}{' '}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="ml-2 h-3 w-3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            }
          />
        </div>
      )}
      {!!stats.posts.length && (
        <div className="mt-4 space-y-4">
          {!!mostPopularPosts.length && (
            <div className="mt-4">
              <div className="lt-text-gray-500 mb-2 text-sm">
                <Trans>Most popular posts in round</Trans>
              </div>
              <Card className="divide-y-[1px] dark:divide-gray-700">
                {mostPopularPosts.map(({ publicationId, matching }) => (
                  <PublicationRow
                    key={publicationId}
                    publicationId={publicationId}
                    matchingUpdateEntry={matching!}
                    roundAddress={roundId}
                  />
                ))}
              </Card>
            </div>
          )}
          {!!otherPosts.length && (
            <div>
              <div className="lt-text-gray-500 mb-2 text-sm">
                <Trans>All other posts in this round ({otherPosts.length})</Trans>
              </div>
              <Card className="divide-y-[1px] dark:divide-gray-700">
                {otherPosts.map(({ publicationId }) => (
                  <PublicationRow key={publicationId} publicationId={publicationId} roundAddress={roundId} />
                ))}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
