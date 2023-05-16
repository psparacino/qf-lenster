import type { BigNumber } from 'ethers';

export enum ChainId {
  MAINNET = '1',
  GOERLI = '5',
  OPTIMISM_MAINNET = '10',
  FANTOM_MAINNET = '250',
  FANTOM_TESTNET = '4002',
  LOCAL_ROUND_LAB = '3'
}

export type QFContributionSummary = {
  contributionCount: number;
  uniqueContributors: number;
  totalContributionsInUSD?: number;
  averageUSDContribution?: number;
};

export type QFContribution = {
  amount: BigNumber;
  token: string;
  contributor: string;
  projectId: string;
  projectPayoutAddress: string;
  usdValue?: number;
};

export type MetaPtr = {
  protocol: number;
  pointer: string;
};

export type QFVotedEvent = {
  to: string;
  amount: string;
  token: string;
  from: string;
  id: string;
};

export type QFDistribution = {
  projectId: string;
  matchAmountInUSD: number;
  totalContributionsInUSD: number;
  matchPoolPercentage: number;
  matchAmountInToken: number;
  projectPayoutAddress: string;
  uniqueContributorsCount: number;
};

export type RoundMetadata = {
  votingStrategy: {
    id: string;
    strategyName: string;
  };
  projectsMetaPtr: MetaPtr;
  roundStartTime: number;
  roundEndTime: number;
  token: string;
  totalPot: number;
  matchingCapPercentage?: number;
};

export type QFDistributionResults = {
  distribution: QFDistribution[];
  isSaturated?: boolean;
};
