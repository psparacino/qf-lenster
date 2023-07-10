export const formatDecimals = (value: number, decimals = 5) => {
  return parseFloat(value.toFixed(decimals)).toString();
};
