export const formatDecimals = (value: number | string, decimals = 5) => {
  const parsedValue = parseFloat(value.toString());
  return parseFloat(parsedValue.toFixed(decimals)).toString();
};
