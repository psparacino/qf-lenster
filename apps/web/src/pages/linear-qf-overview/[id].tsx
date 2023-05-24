import axios from 'axios';
import { useUserProfilesQuery } from 'lens';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Card, GridItemEight, GridLayout, Spinner } from 'ui';

import type { OverviewResult } from '../api/funding-overview';

const LinearQfOverview = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [roundOverview, setRoundOverview] = useState<
    OverviewResult | undefined
  >();
  const {
    query: { id }
  } = useRouter();
  console.log(id);

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
    return <Spinner />;
  }

  if (!roundOverview) {
    return <div>Something went wrong</div>;
  }

  return (
    <GridLayout>
      <GridItemEight>
        <Card className="p-4">
          <h1 className="text-lg font-medium">Funding overview for {id}</h1>
          {roundOverview.distributionResults?.distribution.map((result) => (
            <Card key={result.projectId} className="mt-4 p-4">
              <div>{result.projectId}</div>
              <div># unique contributors {result.uniqueContributorsCount}</div>
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
    </GridLayout>
  );
};

export default LinearQfOverview;
