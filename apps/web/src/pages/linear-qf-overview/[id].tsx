import MetaTags from '@components/Common/MetaTags';
import { t } from '@lingui/macro';
import axios from 'axios';
import { APP_NAME } from 'data';
import { useUserProfilesQuery } from 'lens';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Card, GridItemEight, GridItemFour, GridLayout, Spinner } from 'ui';

import type { OverviewResult } from '../api/funding-overview';

const MetaData = () => {
  return (
    <MetaTags
      title={t`QF Funding Overview • ${APP_NAME}`}
      description={`Overview of the QF funding round`}
    />
  );
};

const LinearQfOverview = () => {
  const {
    query: { id }
  } = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [roundOverview, setRoundOverview] = useState<
    OverviewResult | undefined
  >();

  // Fetch data from the /api/funding-qf-overview endpoint
  useEffect(() => {
    setLoading(true);
    console.log('useEffect');
    async function fetchData() {
      console.log('fetching data');
      axios
        .get('/api/funding-overview', {
          params: {
            round: id
          }
        })
        .then((res) => {
          console.log(res.data);
          setRoundOverview(res.data);
        })
        .finally(() => {
          setLoading(false);
        });
    }
    fetchData();
  }, [id]);

  useUserProfilesQuery({
    variables: {
      ownedBy:
        roundOverview?.distributionResults.distribution.map(
          (d) => d.projectPayoutAddress
        ) || []
    },
    skip: !roundOverview,
    onCompleted: (data) => {
      // const profiles = data?.profiles?.items
      //   ?.slice()
      //   ?.sort((a, b) => Number(a.id) - Number(b.id))
      //   ?.sort((a, b) =>
      //     a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1
      //   );
      //
      // if (!profiles.length) {
      //   return resetAuthState();
      // }
      //
      // const selectedUser = profiles.find((profile) => profile.id === profileId);
      // setProfiles(profiles as Profile[]);
      // setCurrentProfile(selectedUser as Profile);
      // setProfileId(selectedUser?.id);
      // setUserSigNonce(data?.userSigNonces?.lensHubOnChainSigNonce);
      console.log('Completed fetching user profiles', data);
    },
    onError: (e) => {
      console.log('Failed fetching user profiles', e);
    }
  });

  if (loading) {
    return (
      <>
        <MetaData />
        <Spinner />
      </>
    );
  }

  if (!roundOverview) {
    return (
      <>
        <MetaData />
        <div>Something went wrong</div>;
      </>
    );
  }

  return (
    <>
      <MetaData />
      <GridLayout>
        <GridItemEight>
          <Card className="p-4">
            <h1 className="text-lg font-medium">Funding overview for {id}</h1>
            {roundOverview.distributionResults?.distribution.map((result) => (
              <Card key={result.projectId} className="mt-4 p-4">
                <div>{result.projectId}</div>
                <div>
                  # unique contributors {result.uniqueContributorsCount}
                </div>
                <div>
                  Total contributions in USD {result.totalContributionsInUSD}
                </div>
                <div>Match pool percentage {result.matchPoolPercentage}</div>
                <div>Match amount in usd {result.matchAmountInUSD}</div>
                <div>Match amount in token {result.matchAmountInToken}</div>
              </Card>
            ))}
          </Card>
        </GridItemEight>
        <GridItemFour>
          <Card className="p-4">
            {roundOverview ? (
              <>
                <h1 className="mb-4 text-lg font-medium">Round metadata</h1>
                <h2 className="font-medium">
                  {roundOverview.roundMetaData.name}
                </h2>
                <div className="p-y-4">
                  {roundOverview.roundMetaData.description}
                </div>
                <div className="mt-4">
                  Round start date{' '}
                  {new Date(
                    roundOverview.roundMetaData.roundStartTime * 1000
                  ).toLocaleDateString()}
                </div>
                <div>
                  Round end date{' '}
                  {new Date(
                    roundOverview.roundMetaData.roundEndTime * 1000
                  ).toLocaleDateString()}
                </div>
                <div className="mt-4">
                  Token address {roundOverview.roundMetaData.token}
                </div>
                <div>Total pot {roundOverview.roundMetaData.totalPot}</div>
              </>
            ) : (
              <Spinner />
            )}
          </Card>
        </GridItemFour>
      </GridLayout>
    </>
  );
};

export default LinearQfOverview;
