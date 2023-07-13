export const getTokenName = (address: string) => {
  switch (address?.toLowerCase()) {
    // Polygon Mumbai
    case '0x9c3c9283d3e44854697cd22d3faa240cfb032889':
      return 'WMATIC';
    case '0xe25c884582474C4Ac87E1B5BeE4288d4F3B19C96'.toLowerCase():
      return 'DragonHoard';
    // Polygon Mainnet
    case '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'.toLowerCase():
      return 'WMATIC';
    default:
      return 'View on block explorer';
  }
};
