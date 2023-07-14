import type { ApiResult } from '@components/Publication/Actions/Tip/QuadraticQueries/grantsQueries';
import { fetchGraphQL } from '@components/Publication/Actions/Tip/QuadraticQueries/grantsQueries';
import { encodePublicationId } from '@components/Publication/Actions/Tip/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { PropsWithChildren } from 'react';
import { createContext } from 'react';
import { useAccount, useChainId } from 'wagmi';

type Status = 'indexing' | 'pending-calculation';

export const PendingVoteContext = createContext<{
  publicationsWithPendingVote: Record<string, { status: Status; userAddress: string }>;
  startMonitorVote: (args: {
    publicationId: string;
    blockNumber: number;
    roundId: string;
    chainId: number;
  }) => void;
}>({
  publicationsWithPendingVote: {},
  startMonitorVote: () => {}
});

const usePendingVotes = () => {
  const chainId = useChainId();
  const blockNumberStorageKey = 'publicationBlockNumbers';
  const { address: loggedInAddress } = useAccount();

  const queryClient = useQueryClient();

  const getBlockNumbers = () =>
    JSON.parse(localStorage.getItem(blockNumberStorageKey) || '{}') as Record<
      string,
      {
        blockNumber: number;
        publicationId: string;
        chainId: number;
        roundId: string;
        status: Status;
        userAddress: string;
      }
    >;

  const startMonitorVote = ({
    publicationId,
    blockNumber,
    chainId,
    roundId
  }: {
    publicationId: string;
    blockNumber: number;
    roundId: string;
    chainId: number;
  }) => {
    if (!loggedInAddress) {
      console.log('No address, not starting monitor vote');
      return;
    }
    // Add block number to local storage dictionary
    const blockNumbers = getBlockNumbers();
    blockNumbers[publicationId] = {
      blockNumber,
      publicationId,
      chainId,
      roundId,
      status: 'indexing',
      userAddress: loggedInAddress.toLowerCase()
    };
    localStorage.setItem(blockNumberStorageKey, JSON.stringify(blockNumbers));
  };

  useQuery(
    ['publication-block-numbers', chainId],
    async () => {
      if (!loggedInAddress) {
        return null;
      }

      const publicationBlockNumbers = getBlockNumbers();

      if (!Object.keys(publicationBlockNumbers).length) {
        return null;
      }

      const query = `
        query GetMostRecentBlockNumber {
           _meta {
             block {
               number,
               hash
             }
           }
        }
      `;

      const results = (await fetchGraphQL(chainId, query)) as {
        qfvotes: { projectId: string; id: string; createdAt: string };
        _meta: {
          block: {
            number: number;
            hash: string;
          };
        };
      };

      // Determine publications to check
      const publicationsToCheck = new Set<string>();

      for (const [projectId, { blockNumber }] of Object.entries(publicationBlockNumbers)) {
        if (blockNumber <= results._meta.block.number) {
          publicationsToCheck.add(projectId);
        }
      }

      if (!!publicationsToCheck.size) {
        console.log('publicationsToCheck', publicationsToCheck);
      }

      const apiData: {
        publicationId: string;
        from: string;
        roundId: string;
        mostRecentCreatedAt: number;
      }[] = [];

      for (const [publicationId] of publicationsToCheck.entries()) {
        const { roundId, userAddress } = publicationBlockNumbers[publicationId];
        const mostRecentVoteQuery = `
          query GetMostRecentVote($from: String!, $round: String!, $projectId: String!) {
            qfvotes(
              where: {from: $from, round: $round, projectId: $projectId}
              orderBy: createdAt
              orderDirection: desc
              first: 1
            ) {
              createdAt
            }
          }`;

        const variables = {
          from: userAddress.toLowerCase(),
          round: roundId,
          projectId: encodePublicationId(publicationId)
        };

        const mostRecentVoteResult = (await fetchGraphQL(chainId, mostRecentVoteQuery, variables)) as {
          qfvotes: { createdAt: string }[];
        };

        if (mostRecentVoteResult.qfvotes[0]) {
          apiData.push({
            mostRecentCreatedAt: parseInt(mostRecentVoteResult.qfvotes[0].createdAt),
            publicationId: publicationId,
            from: userAddress.toLowerCase(),
            roundId
          });
        }
      }

      const apiResult = await axios.post<ApiResult<Record<string, boolean>>>(
        `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/data/match/tip-included/${chainId}`,
        {
          publicationsToCheck: apiData
        }
      );

      const resolvedPublicationsIds = new Set<string>();

      for (const [publicationId, resolved] of Object.entries(apiResult.data.data)) {
        if (resolved) {
          resolvedPublicationsIds.add(publicationId);
        }
      }

      return {
        results,
        indexedPublicationsIds: Array.from(publicationsToCheck),
        resolvedPublicationsIds: Array.from(resolvedPublicationsIds)
      };
      // const currentBlockNumber = res.data._meta.block.number;
      // const result: Record<string, boolean> = {};
    },
    {
      onSuccess: (data) => {
        const blockNumbers = getBlockNumbers();
        if (!data?.results) {
          return;
        }
        const currentIndexedBlockNumber = data.results._meta.block.number;
        console.log('currentIndexedBlockNumber', currentIndexedBlockNumber);
        const { resolvedPublicationsIds } = data;

        for (const publicationId of data.indexedPublicationsIds) {
          blockNumbers[publicationId].status = 'pending-calculation';
        }

        // console.log('resolvedPublicationsIds', resolvedPublicationsIds);
        for (const publicationId of resolvedPublicationsIds) {
          const blockNumberInfo = blockNumbers[publicationId];

          if (blockNumberInfo) {
            queryClient.refetchQueries([
              'publication-match-data',
              blockNumberInfo.roundId,
              publicationId,
              chainId
            ]);
            queryClient.refetchQueries([
              'get-post-quadratic-tipping',
              publicationId,
              blockNumberInfo.roundId,
              chainId
            ]);
          }
          delete blockNumbers[publicationId];
        }

        // console.log('block numbers after', blockNumbers);

        localStorage.setItem(blockNumberStorageKey, JSON.stringify(blockNumbers));
      },
      refetchInterval: 5000,
      refetchOnMount: false,
      enabled: !!loggedInAddress
    }
  );

  return {
    pendingVotes: getBlockNumbers(),
    startMonitorVote
  };
};

export const PendingVoteContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { pendingVotes, startMonitorVote } = usePendingVotes();
  return (
    <PendingVoteContext.Provider
      value={{
        publicationsWithPendingVote: pendingVotes,
        startMonitorVote
      }}
    >
      {children}
    </PendingVoteContext.Provider>
  );
};
