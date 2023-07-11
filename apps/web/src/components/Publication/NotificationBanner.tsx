import TipsSolidIcon from '@components/Shared/TipIcons/TipsSolidIcon';
import { formatDecimals } from '@components/utils/formatDecimals';
import { getTokenName } from '@components/utils/getTokenName';
import { QuestionMarkCircleIcon } from '@heroicons/react/outline';
import { ethers } from 'ethers';
import type { Publication } from 'lens';
import type { FC } from 'react';
import { Card } from 'ui/src/Card';

import {
  useGetPostQuadraticTipping,
  useGetPublicationMatchData,
  useGetRoundInfo
} from './Actions/Tip/QuadraticQueries/grantsQueries';

interface Props {
  publication: Publication;
  showCount: boolean;
  roundAddress?: string;
}

// export const NotificationBanner: FC<Props> = ({ icon, publication, showCount }) => {
export const NotificationBanner: FC<Props> = ({ publication, showCount, roundAddress }) => {
  const { data: matchUpdate } = useGetPublicationMatchData(roundAddress, publication.id);
  const { data: roundInfo } = useGetRoundInfo(roundAddress);
  const { data: postQuadraticTipping } = useGetPostQuadraticTipping(roundAddress, publication.id);

  const iconClassName = showCount ? 'w-[17px] sm:w-[20px]' : 'w-[15px] sm:w-[18px]';

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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (!postQuadraticTipping || !matchUpdate || !roundInfo) {
    return null;
  }

  const tokenName = getTokenName(roundInfo?.token);
  const formattedTipTotal = formatDecimals(ethers.utils.formatEther(postQuadraticTipping.voteTipTotal));
  const formattedMatchAmount = formatDecimals(matchUpdate.matchAmountInToken);

  return (
    <Card>
      <div className="justify-items-left m-3 grid space-y-2 p-5">
        <div className="flex items-center">
          <TipsSolidIcon color="black" />
          <span className="ml-2">
            {`This post has received ${postQuadraticTipping.votes.length} ${
              postQuadraticTipping.votes.length === 1 ? 'tip' : 'tips'
            }! `}
          </span>
        </div>

        <div>
          This post has received {formattedTipTotal} {tokenName} in tips from{' '}
          {matchUpdate.uniqueContributorsCount} users. It received {formattedMatchAmount} {tokenName} in
          matching.
        </div>
        <div className="flex justify-between pt-3">
          <div className="my-auto flex items-center justify-between text-sm text-gray-500">
            <p className="mr-3">
              {roundInfo.roundEndTime !== 0 && Date.now() < roundInfo.roundEndTime * 1000
                ? `This matching round will end in ${getTimeLeft(roundInfo.roundEndTime)}`
                : `This round ended ${getDaysAgo(roundInfo.roundEndTime)} day(s) ago.`}
            </p>
            <QuestionMarkCircleIcon className={iconClassName} />
          </div>
        </div>
      </div>
    </Card>
  );
};
``;
