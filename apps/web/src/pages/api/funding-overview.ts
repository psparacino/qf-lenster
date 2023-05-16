/* eslint-disable unicorn/no-array-for-each */
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  fetchQFContributionsForRound,
  matchQFContributions
} from '../../linear-qf';
import type { RoundMetadata } from '../../linear-qf/types';
import { ChainId } from '../../linear-qf/types';
import { fetchRoundMetadata } from '../../linear-qf/utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // eslint-disable-next-line prefer-destructuring
  const roundId = req.query['round'];

  if (!roundId) {
    return res.status(401).json({ error: 'Supply a round ID' });
  }

  if (Array.isArray(roundId)) {
    return res.status(400).json({ error: 'Do not supply multiple round IDs' });
  }

  let roundMetaData: RoundMetadata | undefined;

  try {
    roundMetaData = await fetchRoundMetadata(ChainId.LOCAL_ROUND_LAB, roundId);
    // res.status(200).json({ roundMetaData, roundId });
  } catch (error: unknown) {
    console.error(error);
    res.status(500).json({ message: error?.toString?.() || 'Unknown error' });
  }

  if (!roundMetaData) {
    res.status(404).json({ roundId, message: 'Could not find round' });
    return;
  }

  const contributions = await fetchQFContributionsForRound(
    ChainId.LOCAL_ROUND_LAB,
    roundMetaData.votingStrategy.id
  );

  const distributionResults = await matchQFContributions(
    ChainId.LOCAL_ROUND_LAB,
    roundMetaData,
    contributions
  );
  //
  // let contributions: QFContribution[] | undefined;
  //
  // try {
  //   contributions = await fetchQFContributionsForProjects(ChainId.OPTIMISM_MAINNET, roundId, roundMetaData, roundMetaData.votingStrategy.id, );
  //   res.status(200).json({ roundMetaData, roundId });
  // } catch (error: unknown) {
  //   console.error(error);
  //   res.status(500).json({ message: error?.toString?.() || 'Unknown error' });
  // }
  //
  // if (!contributions) {
  //   res.status(404).json({ roundId, message: 'Could not find round contributions' });
  //   return;
  //
  //
  //   try {
  //   const result = matchQFContributions(ChainId.MAINNET, roundMetaData, []);
  //   return res.status(200).json({ result });
  // } catch (error: unknown) {
  //   console.error(error);
  //   res.status(500).json({ message: error?.toString?.() || 'Unknown error' });
  // }

  res
    .status(200)
    .json({ roundId, roundMetaData, contributions, distributionResults });
}
