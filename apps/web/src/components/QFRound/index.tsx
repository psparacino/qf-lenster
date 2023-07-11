import MetaTags from '@components/Common/MetaTags';
import {
  useGetRoundMetaDatas,
  useQueryQFRoundStats
} from '@components/Publication/Actions/Tip/QuadraticQueries/grantsQueries';
import { RoundStats } from '@components/QFRound/RoundStats';
import Loading from '@components/Shared/Loading';
import { APP_NAME } from 'data';
import type { NextPage } from 'next';
import Link from 'next/link';
import Custom404 from 'src/pages/404';
import Custom500 from 'src/pages/500';
import { Card, GridItemEight, GridItemFour, GridLayout } from 'ui';

const ViewQFRound: NextPage = () => {
  const { data, isLoading, isError } = useQueryQFRoundStats({ refetchInterval: 60 * 1000 });

  const roundMetaPtrs = Object.values(data?.roundStatsByRound || {}).map((stats) => stats.roundMetaPtr);

  const {
    data: metaDatas,
    isLoading: isLoadingMetaDatas,
    isError: isErrorMetaDatas
  } = useGetRoundMetaDatas(roundMetaPtrs);

  if (isError || isErrorMetaDatas) {
    return <Custom500 />;
  }

  if (isLoading || isLoadingMetaDatas) {
    return <Loading />;
  }

  if (!data || !metaDatas) {
    return <Custom404 />;
  }

  if (data.numberOfRounds === 0) {
    return (
      <div className="p-4">
        <MetaTags title={`Quadratic Funding Rounds • ${APP_NAME}`} />
        <div className="text-center text-4xl font-bold">No rounds have been created yet. Come back soon!</div>
      </div>
    );
  }

  return (
    <GridLayout>
      <MetaTags title={`Quadratic Funding Rounds • ${APP_NAME}`} />
      <GridItemEight className="space-y-4">
        {Object.entries(data.roundStatsByRound).map(([roundId, stats]) => {
          const metaData = metaDatas[stats.roundMetaPtr];

          if (!metaData) {
            return null;
          }

          return (
            <Card key={roundId} className="p-4">
              <RoundStats roundId={roundId} stats={stats} metaData={metaData} />
            </Card>
          );
        })}
      </GridItemEight>
      <GridItemFour>
        <Card className="p-4">
          <div className="mb-4 text-lg font-bold">Welcome to QF Lenster!</div>
          <p className="mb-3">
            Quadratic Funding is the mathematically optimal way to fund public goods in a democratic
            community. Quadratic funding (QF), conceived by Vitalik Buterin, Glen Weyl, and Zoë Hitzig, is a
            mathematical funding, voting and payment formula. Quadratic funding has been used to fund $50m
            worth of public goods on Gitcoin through 18 matching campaigns.
          </p>
          <p className="mb-3">
            The launch of{' '}
            <a
              href="https://quadraticlenster.xyz/"
              target="_blank"
              rel="noreferrer"
              className="text-brand font-bold"
            >
              QuadraticLenster.xyz
            </a>{' '}
            introduces a unique new funding mechanism that will allow Lens users to tip each other’s posts in
            their newsfeeds. The tips will be matched with funds from a central matching pool. Because the tip
            matching functionality uses Quadratic Funding, a $1 tip can be amplified to have greater impact
            than the initial tip (oftentimes worth $100 or more), providing a lucrative new stream of funding
            for creators and organizations in the Lens ecosystem.
          </p>
          <p className="mb-3">
            On{' '}
            <a
              href="https://quadraticlenster.xyz/"
              target="_blank"
              rel="noreferrer"
              className="text-brand font-bold"
            >
              QuadraticLenster.xyz
            </a>
            , from July 17 2023 - July 21 2023, users can tip any post that mentions{' '}
            <span className="text-brand font-bold">#ethcc</span> + receive matching from the matching pool.
            This tipping functionality allows all Lenster users to reward creators and organizations they
            value with tips amplified by matching. This unique funding mechanism, will bring public goods
            funding popularized on Gitcoin and embed it into the Lens{' '}
            <a href="https://ecosystem.in/" className="text-brand font-bold">
              ecosystem.in
            </a>
            , enabling any app on Lens to incorporate this capability.
          </p>
          <p>
            Follow{' '}
            <Link href={'/u/owocki'}>
              <span className="text-brand font-bold">owocki.lens</span>
            </Link>{' '}
            for notifications when payouts happen.
          </p>
        </Card>
      </GridItemFour>
    </GridLayout>
  );
};

export default ViewQFRound;
