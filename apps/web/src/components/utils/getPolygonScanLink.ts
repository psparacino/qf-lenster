import type { Chain } from 'wagmi';

export const getPolygonScanLink = (
  address: string,
  type: string,
  chain:
    | (Chain & {
        unsupported?: boolean | undefined;
      })
    | undefined
) => {
  let url = '';
  if (chain) {
    switch (chain.id) {
      case 80001:
        if (type === 'address') {
          url = `https://mumbai.polygonscan.com/address/${address}`;
        } else {
          url = `https://mumbai.polygonscan.com/token/${address}`;
        }
        break;
      case 137:
        if (type === 'address') {
          url = `https://polygonscan.com/address/${address}`;
        } else {
          url = `https://polygonscan.com/token/${address}`;
        }
        break;
    }
  }
  return url;
};
