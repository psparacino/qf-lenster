import TipsSolidIcon from '@components/Shared/TipIcons/TipsSolidIcon';
import { getTokenName } from '@components/utils/getTokenName';
import { QuestionMarkCircleIcon } from '@heroicons/react/outline';
import { BigNumber, ethers } from 'ethers';
import type { Publication } from 'lens';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Card } from 'ui/src/Card';

import {
  getPostQuadraticTipping,
  getRoundInfo,
  useGetPublicationMatchData
} from './Actions/Tip/QuadraticQueries/grantsQueries';

interface Props {
  publication: Publication;
  showCount: boolean;
  roundAddress?: string;
}

// export const NotificationBanner: FC<Props> = ({ icon, publication, showCount }) => {
export const NotificationBanner: FC<Props> = ({ publication, showCount, roundAddress }) => {
  const { data: matchUpdate } = useGetPublicationMatchData(roundAddress, publication.id);
  const [roundInfo, setRoundInfo] = useState<any>();
  const [votes, setVotes] = useState<any>([]);
  const [postTipTotal, setPostTipTotal] = useState(BigNumber.from(0));
  const [roundEnd, setRoundEnd] = useState(0);
  const [roundToken, setRoundToken] = useState<string>('');

  // Add check here if Post or Comment for getting roundInfo
  useEffect(() => {
    const getPostInfo = async () => {
      if (roundAddress) {
        const roundResults = await getPostQuadraticTipping(publication.id, roundAddress);
        const { roundEndTime, token } = await getRoundInfo(roundAddress);

        if (!roundResults) {
          return;
        }
        setRoundToken(token);
        setRoundEnd(roundEndTime);
        setRoundInfo(roundResults);
        const votes = roundResults?.votes || [];
        setVotes(votes);
        let voteTipTotal = BigNumber.from(0);
        for (const vote of votes) {
          if (!vote) {
            continue;
          }
          voteTipTotal = voteTipTotal.add(BigNumber.from(vote.amount));
        }
        setPostTipTotal(voteTipTotal);
      }
    };
    getPostInfo();
  }, [roundAddress, publication.id]);

  const iconClassName = showCount ? 'w-[17px] sm:w-[20px]' : 'w-[15px] sm:w-[18px]';

  const uniqueCollectors = new Set(votes.map((vote: any) => vote?.collector)).size;

  function getTimeLeft(timestamp: number): string {
    const now = new Date();
    const target = new Date(timestamp * 1000);

    const diff = target.getTime() - now.getTime();
    const diffInHours = diff / (1000 * 60 * 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInHoursRemainder = Math.round(diffInHours % 24);

    const daysString = diffInDays === 1 ? '1 day' : `${diffInDays} days`;
    const hoursString = diffInHoursRemainder === 1 ? '1 hour' : `${diffInHoursRemainder} hours`;

    return `${daysString} & ${hoursString}`;
  }

  const getDaysAgo = (end: number) => {
    const current = Date.now();
    const diffTime = Math.abs(current - end * 1000);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card>
      <div className="justify-items-left m-3 grid space-y-2 p-5">
        <div className="flex">
          <div className="mt-1 flex">
            <TipsSolidIcon color="black" />
          </div>
          <div className="ml-3">
            {`This post has received ${votes.length} ${votes.length === 1 ? 'tip' : 'tips'}! `}
          </div>
        </div>

        <div>
          This post has received {ethers.utils.formatEther(postTipTotal)} {getTokenName(roundToken)} in tips
          from {uniqueCollectors} users.{' '}
          {matchUpdate && <span>{`It received $${matchUpdate.matchAmountInUSD} in matching.`}</span>}
        </div>
        {roundInfo && (
          <div className="flex justify-between pt-3">
            <div className="my-auto flex items-center justify-between text-sm text-gray-500">
              <p className="mr-3">
                {roundEnd !== 0 && Date.now() < roundEnd * 1000
                  ? `This matching round will end in ${getTimeLeft(roundEnd)}`
                  : `This round ended ${getDaysAgo(roundEnd)} day(s) ago.`}
              </p>
              <QuestionMarkCircleIcon className={iconClassName} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
``;
