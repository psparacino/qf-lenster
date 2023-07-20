import { IS_MAINNET } from 'data/constants';
import { polygon, polygonMumbai } from 'wagmi/chains';

// Web3
export const POLYGON_MAINNET = {
  ...polygon,
  name: 'Polygon Mainnet',
  rpcUrls: { default: 'https://polygon-rpc.com' }
};
export const POLYGON_MUMBAI = {
  ...polygonMumbai,
  name: 'Polygon Mumbai',
  rpcUrls: { default: 'https://rpc-mumbai.maticvigil.com' }
};
export const CHAIN_ID = IS_MAINNET ? POLYGON_MAINNET.id : POLYGON_MUMBAI.id;
export const SIMPLEANALYTICS_API_ENDPOINT = 'https://simpleanalytics.com/lenster.xyz.json';

export const extendedRounds: Record<string, string> = {
  '0x0524d9f611b3785f4675c90aa3161ab0e54c4a39': '0xa2ae8421776035c398c22e143290697da09d19d7'
};
