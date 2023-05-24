/* eslint-disable prefer-destructuring,unicorn/no-lonely-if */

import { getAddress } from 'ethers/lib/utils';

import type { MetaPtr, RoundMetadata } from './types';
import { ChainId } from './types';

const TESNET_TOKEN_TO_USD_RATE = 1000;

type TokenPriceMapping = {
  [address: string]: {
    usd: number;
  };
};

type AvgTokenPriceMapping = {
  [address: string]: number;
};

// type TokenStartEndPrice = {
//   startPrice: number;
//   endPrice: number;
// };

/**
 * This is temporary util function to support backward
 * compatibility with older subgraph version
 *
 * TODO: remove after re-indexing mainnet subgraph
 *
 * @param strategyName string
 * @returns string
 */
export const getStrategyName = (strategyName: string) => {
  // TODO: FIX
  // if (strategyName === 'quadraticFunding') {
  //   return VotingStrategy.LINEAR_QUADRATIC_FUNDING;
  // }
  return strategyName;
};

/**
 * Fetch data from IPFS
 *
 * @param cid - the unique content identifier that points to the data
 */
export const fetchFromIPFS = async (cid: string) => {
  const REACT_APP_PINATA_GATEWAY = 'gitcoin.mypinata.cloud';

  return fetch(`https://${REACT_APP_PINATA_GATEWAY}/ipfs/${cid}`).then(
    (resp) => {
      if (resp.ok) {
        return resp.json();
      }

      return Promise.reject(resp);
    }
  );
};

/**
 * Util function to get chainName for coingecko API calls
 *
 * @param chainId
 * @returns { string, boolean}
 */
export const getChainName = (chainId: ChainId) => {
  let error = true;
  let chainName;

  const coingeckoSupportedChainNames: Record<number, string> = {
    [ChainId.MAINNET]: 'ethereum',
    [ChainId.OPTIMISM_MAINNET]: 'optimistic-ethereum',
    [ChainId.FANTOM_MAINNET]: 'fantom'
  };

  if (coingeckoSupportedChainNames[chainId]) {
    chainName = coingeckoSupportedChainNames[chainId];
    error = false;
  }
  return { chainName, error };
};

/**
 * checks if current ChainId is testnet chain
 * @param chainId
 * @returns boolean
 */
export const isTestnet = (chainId: ChainId) => {
  const testnet = [
    ChainId.GOERLI,
    ChainId.FANTOM_TESTNET,
    ChainId.LOCAL_ROUND_LAB
  ];

  return testnet.includes(chainId);
};

/**
 * Fetch subgraph network for provided web3 network
 *
 * @param chainId - The chain ID of the blockchain
 * @returns the subgraph endpoint
 */
export const getGraphQLEndpoint = (chainId: ChainId) => {
  switch (chainId) {
    case ChainId.OPTIMISM_MAINNET:
      return `${process.env.SUBGRAPH_OPTIMISM_MAINNET_API}`;

    case ChainId.FANTOM_MAINNET:
      return `${process.env.SUBGRAPH_FANTOM_MAINNET_API}`;

    case ChainId.FANTOM_TESTNET:
      return `${process.env.SUBGRAPH_FANTOM_TESTNET_API}`;

    case ChainId.MAINNET:
      return `${process.env.SUBGRAPH_MAINNET_API}`;

    case ChainId.GOERLI:
      return `${process.env.SUBGRAPH_GOERLI_API}`;

    default:
      return `https://api.thegraph.com/subgraphs/name/bitbeckers/ql-dev`;
  }
};

/**
 * Fetch data from a GraphQL endpoint
 *
 * @param query - The query to be executed
 * @param chainId - The chain ID of the blockchain indexed by the subgraph
 * @param variables - The variables to be used in the query
 * @returns The result of the query
 */
export const fetchFromGraphQL = async (
  chainId: ChainId,
  query: string,
  variables: object = {}
) => {
  let endpoint = getGraphQLEndpoint(chainId);

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  }).then((resp) => {
    if (resp.ok) {
      return resp.json();
    }

    return Promise.reject(resp);
  });
};

/**
 * fetchTokenPrices is an async function that retrieves the current prices
 * of the tokens in tokenAddresses in USD.
 * If the native token of the chain with id chainId is included in
 * tokenAddresses, its price is also included in the returned data.
 *
 * @param {ChainId} chainId - The id of the chain to retrieve the native token's price from.
 * @param {string[]} tokenAddresses - The addresses of the tokens to retrieve prices for.
 * @return {Promise<TokenPriceMapping>} - An object containing the token addresses as keys and their prices in USD as values.
 */
export const fetchCurrentTokenPrices = async (
  chainId: ChainId,
  tokenAddresses: string[]
): Promise<TokenPriceMapping> => {
  let tokenPrices: TokenPriceMapping = {};
  try {
    // Avoid coingecko calling for testnet
    if (isTestnet(chainId)) {
      let testnetTokenPrices: any = {
        '0x0000000000000000000000000000000000000000': {
          usd: TESNET_TOKEN_TO_USD_RATE
        }
      };

      tokenAddresses.map((tokenAddress) => {
        testnetTokenPrices[tokenAddress] = {
          usd: TESNET_TOKEN_TO_USD_RATE
        };
      });
      return testnetTokenPrices;
    }

    const { chainName } = getChainName(chainId);

    const tokenPriceEndpoint = `https://api.coingecko.com/api/v3/simple/token_price/${chainName}?contract_addresses=${tokenAddresses.join(
      ','
    )}&vs_currencies=usd`;

    const resTokenPriceEndpoint = await fetch(tokenPriceEndpoint, {
      headers: {
        Accept: 'application/json'
      }
    });

    const tokenPricesResponse = await resTokenPriceEndpoint.json();
    tokenPrices = { ...tokenPrices, ...tokenPricesResponse };

    if (
      tokenAddresses.includes('0x0000000000000000000000000000000000000000') &&
      chainName
    ) {
      const nativePriceEndpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${chainName}&vs_currencies=usd`;
      const resNativePriceEndpoint = await fetch(nativePriceEndpoint, {
        headers: {
          Accept: 'application/json'
        }
      });

      const nativeTokenPrice = (await resNativePriceEndpoint.json())[chainName];
      tokenPrices = {
        ...tokenPrices,
        '0x0000000000000000000000000000000000000000': nativeTokenPrice
      };
    }
  } catch (error) {
    console.error('fetchCurrentTokenPrices', error);
  }

  return tokenPrices;
};

/**
 * Generates mapping from payout address to projectId
 *
 * @param {ChainId} chainId - The id of the chain to fetch the votes from.
 * @param {string} votingStrategyId - The id of the voting strategy to retrieve votes for.
 * @return {Promise<Map<string, string>>} - An map of project payout address to project id
 */
export const fetchPayoutAddressToProjectIdMapping = async (
  projectsMetaPtr: MetaPtr
): Promise<Map<string, string>> => {
  type ProjectMetaPtr = {
    id: string;
    status: string;
    payoutAddress: string;
  };

  const pointer = projectsMetaPtr.pointer;

  const payoutToProjectMap: Map<string, string> = new Map();

  let projects: ProjectMetaPtr[] = await fetchFromIPFS(pointer);
  console.log('projects', projects);

  projects = projects.filter((project) => project.status === 'APPROVED');

  for (const project of projects) {
    // project.id format ->  applicationId-roundId
    const projectId = project.id.split('-')[0];
    const payoutAddress = getAddress(project.payoutAddress);
    payoutToProjectMap.set(payoutAddress, projectId);
  }

  return payoutToProjectMap;
};

/**
 * Util function to specify valid coingecko address in scenarios where
 * coingecko doesn't return token price on given chain.
 * Ideally usefully for stable coins
 *
 * @param chainId
 * @param address
 *
 * @returns validAddress
 */
export const getValidCoinGeckoTokenAddress = (
  chainId: ChainId,
  address: string
) => {
  let validAddress = address;
  if (chainId == ChainId.FANTOM_MAINNET) {
    if (address == '0xc931f61b1534eb21d8c11b24f3f5ab2471d4ab50') {
      // BUSD
      validAddress = '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e'; // DAI
    }
  }
  return validAddress;
};

export const fetchAverageTokenPrices = async (
  chainId: ChainId,
  tokenAddresses: string[],
  startTime: number,
  endTime: number
) => {
  try {
    // Avoid coingecko calling for testnet
    if (isTestnet(chainId)) {
      let testnetAverageTokenPrices: any = {
        '0x0000000000000000000000000000000000000000': TESNET_TOKEN_TO_USD_RATE
      };

      tokenAddresses.map((tokenAddress) => {
        testnetAverageTokenPrices[tokenAddress] = TESNET_TOKEN_TO_USD_RATE;
      });

      return testnetAverageTokenPrices;
    }

    const { chainName, error } = getChainName(chainId);

    if (error) {
      throw error;
    }

    const averageTokenPrices: AvgTokenPriceMapping = {};

    for (let address of tokenAddresses) {
      averageTokenPrices[address] = 0;
      if (address !== '0x0000000000000000000000000000000000000000') {
        try {
          // get valid address for tokens that are not on coingecko
          const validAddress = getValidCoinGeckoTokenAddress(chainId, address);
          const tokenPriceEndpoint = `https://api.coingecko.com/api/v3/coins/${chainName}/contract/${validAddress}/market_chart/range?vs_currency=usd&from=${startTime}&to=${endTime}`;
          const resTokenPriceEndpoint = await fetch(tokenPriceEndpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const tokenPriceData = await resTokenPriceEndpoint.json();

          const { prices, error } = tokenPriceData;

          if (error) {
            averageTokenPrices[address] = -1;
            throw new Error(`${address} is not found on coingecko`);
          }

          const startPrice = prices[0][1];
          const endPrice = prices[prices.length - 1][1];

          const averagePrice = (startPrice + endPrice) / 2;
          averageTokenPrices[address] = averagePrice;
        } catch (error) {
          console.error('fetchAverageTokenPrices', error);
        }
      } else {
        const nativePriceEndpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${chainName}&vs_currencies=usd`;
        const resNativePriceEndpoint = await fetch(nativePriceEndpoint, {
          headers: {
            method: 'GET',
            Accept: 'application/json'
          }
        });

        const nativePriceData = await resNativePriceEndpoint.json();
        const { usd } = nativePriceData[chainName!];
        averageTokenPrices[address] = usd;
      }
    }
    return averageTokenPrices;
  } catch (error) {
    console.error('fetchAverageTokenPrices', error);
    return { error };
  }
};

/**
 * Fetch metadata using roundId
 *
 * @param chainId - The chain ID of the blockchain indexed by the subgraph
 * @param roundId - The address of the round contract
 *
 * @returns Promise<RoundMetadata>
 */
export const fetchRoundMetadata = async (
  chainId: ChainId,
  roundId: string
  // force?: boolean
): Promise<RoundMetadata> => {
  // try to get the data from cache
  // const key = `cache_metadata_${chainId}_${roundId}`;
  // const cachedMetadata: any = cache.get(key);
  // if (cachedMetadata && !force) {
  //   return cachedMetadata;
  // }

  const variables = { roundId };

  const query = `
    query GetMetadata($roundId: String) {
      rounds(where: {
        id: $roundId
      }) {
        votingStrategy {
          id
          strategyName
        }
        roundStartTime
        roundEndTime
        token
        roundMetaPtr {
          protocol
          pointer
        }
        projectsMetaPtr {
          protocol
          pointer
        }
      }
    }
  `;

  // fetch from graphql
  const response = await fetchFromGraphQL(chainId, query, variables);
  const data = response.data?.rounds[0];

  console.log('Round graphql data', data);

  // fetch round metadata
  const roundMetadata = await fetchFromIPFS(data?.roundMetaPtr.pointer);

  console.log('IPFS metadata', roundMetadata);
  const totalPot = roundMetadata.matchingFunds.matchingFundsAvailable;
  const matchingCapPercentage = roundMetadata.matchingFunds.matchingCapAmount;
  const strategyName = getStrategyName(data?.votingStrategy.strategyName);

  const projectsMetaPtr: MetaPtr = data?.projectsMetaPtr;

  const metadata: RoundMetadata = {
    votingStrategy: {
      id: data?.votingStrategy.id,
      strategyName: strategyName
    },
    projectsMetaPtr: projectsMetaPtr,
    roundStartTime: data?.roundStartTime,
    roundEndTime: data?.roundEndTime,
    token: data?.token,
    totalPot: totalPot,
    matchingCapPercentage: matchingCapPercentage,
    name: roundMetadata.name,
    description: roundMetadata.eligibility.description
  };

  // cache the round metadata
  // cache.set(key, metadata);

  return metadata;
};

/**
 * Generates mapping from projectId to payout address
 *
 * @param {ChainId} chainId - The id of the chain to fetch the votes from.
 * @param {string} votingStrategyId - The id of the voting strategy to retrieve votes for.
 * @return {Promise<Map<string, string>>} - An map of project id to project payout address
 */
export const fetchProjectIdToPayoutAddressMapping = async (
  projectsMetaPtr: MetaPtr
): Promise<Map<string, string>> => {
  type ProjectMetaPtr = {
    id: string;
    status: string;
    payoutAddress: string;
  };

  const pointer = projectsMetaPtr?.pointer;

  const projectToPayoutMap: Map<string, string> = new Map();
  if (!pointer) {
    console.log('No projects meta pointer found');
    return projectToPayoutMap;
  }

  let projects: ProjectMetaPtr[] = await fetchFromIPFS(pointer);

  projects = projects.filter((project) => project.status === 'APPROVED');

  for (const project of projects) {
    // project.id format ->  applicationId-roundId
    const projectId = project.id.split('-')[0];
    const payoutAddress = getAddress(project.payoutAddress).toLowerCase();
    projectToPayoutMap.set(projectId, payoutAddress);
  }

  return projectToPayoutMap;
};
