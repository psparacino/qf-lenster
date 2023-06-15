// import type { Publication } from 'lens';
// import type { Dispatch, FC, ReactNode, SetStateAction } from 'react';
import {
  getCurrentActiveRounds,
  getRoundUserData,
  getUserQuadraticTippingData
} from '@components/Publication/Actions/Tip/QuadraticQueries/grantsQueries';
import TipsOutlineIcon from '@components/Shared/TipIcons/TipsOutlineIcon';
import { ethers } from 'ethers';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

type Round = {
  roundId: string;
  receivedInTotal: number;
  numberOfTippers: number;
  postsInCurrentRound: number;
  totalNumberOfTips: number;
  roundStartTime: number;
  roundEndTime: number;
  readyForPayout: boolean;
  fundsDistributed: boolean;
};

interface PayoutStatusProps {
  round: Round;
}

const PayoutStatus: FC<PayoutStatusProps> = ({ round }) => {
  return (
    <div className="mt-3 flex flex-col items-center text-gray-500">
      <div className="mb-2 text-sm">Payout available when round ends.</div>
      {round.fundsDistributed ? (
        <button className="mx-auto w-60 rounded-md bg-purple-200 px-4 py-2 text-purple-500">
          Payouts Released!
        </button>
      ) : (
        <button className="mx-auto w-60 rounded-md bg-purple-100 px-4 py-2 text-purple-300">
          Payout not yot available
        </button>
      )}
    </div>
  );
};

interface RoundStatsProps {
  showDetails: boolean;
  round: Round;
}
const RoundStats: FC<RoundStatsProps> = ({ showDetails, round }) => {
  function formatDate(timestamp: number) {
    const date = new Date(timestamp * 1000);
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  const topic = 'justify-between flex';
  const category = 'text-gray-500';

  return (
    <div
      className={`pt-3 ${
        showDetails ? 'block h-auto transition-all duration-500 ease-in-out' : 'hidden overflow-hidden'
      }`}
    >
      {round && (
        <div>
          <div className="md:max-lg:px-50 text-sm">
            <div className={topic}>
              <p className={category}>Amount of Tippers</p>
              <p>{round.numberOfTippers}</p>
            </div>
            <div className={topic}>
              <p className={category}>Total Tip Amount</p>
              <p>{ethers.utils.formatEther(round.receivedInTotal)}</p>
            </div>
            <div className={`pt-3 ${topic}`}>
              <p className={category}>End of matching round</p>
              <p>{formatDate(round.roundEndTime)}</p>
            </div>
          </div>
          {/* <Card>
            <div className="text-md m-4">
              <div className="my-2">
                <p>Coming to Eth Denver for the first time!</p>
                <p className="text-sm text-red-500">67 tips by 10 voters</p>
              </div>
              <div className="divider w-full" />
              <div className="my-2">
                <p>Some other post</p>
                <p className="text-sm text-red-500">4 tips by 1 voters</p>
              </div>
            </div>
          </Card> */}
          {round.receivedInTotal > 0 && <PayoutStatus round={round} />}
        </div>
      )}
    </div>
  );
};

export const ProfileTipsStats: FC = () => {
  const { address } = useAccount();

  const [showDetails, setShowDetails] = useState<null | string>(null);
  const [activeRounds, setActiveRounds] = useState<Round[]>([]);

  useEffect(() => {
    async function getActiveRounds() {
      const now = Math.floor(Date.now() / 1000);
      const rounds = await getCurrentActiveRounds(now);

      let newRounds: Round[] = [];

      for (const round of rounds) {
        const userRound = await getRoundUserData(round.id, address!);

        const quadraticTipping = await getUserQuadraticTippingData(round.id, address!);
        const votes = quadraticTipping[0]?.votes;
        const distributions = quadraticTipping[0]?.distributions;

        const uniquePosts = new Set();
        const uniqueTippers = new Set();
        let totalAmountTipped = 0;
        let fundsDistributed = false;

        for (const vote of votes) {
          uniquePosts.add(vote.projectId);
          uniqueTippers.add(vote.from);
          totalAmountTipped += Number(vote.amount);
        }

        for (const distribution of distributions) {
          if (distribution.to.toLowerCase() === address!.toLowerCase()) {
            fundsDistributed = true;
          }
        }
        const newRound = {
          roundId: round.id,
          receivedInTotal: totalAmountTipped,
          numberOfTippers: uniqueTippers.size,
          postsInCurrentRound: uniquePosts.size,
          totalNumberOfTips: votes.length,
          roundStartTime: userRound[0].roundStartTime,
          roundEndTime: userRound[0].roundEndTime,
          readyForPayout: quadraticTipping[0].readyForPayout,
          fundsDistributed
        };

        newRounds.push(newRound);
      }

      newRounds.sort((a, b) => a.roundEndTime - b.roundEndTime);
      setActiveRounds((prevRounds) => [
        ...prevRounds.filter((round) => !newRounds.some((newRound) => newRound.roundId === round.roundId)),
        ...newRounds
      ]);
    }
    getActiveRounds();
  }, [address]);

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

  return (
    <div>
      <div className="mb-2 flex flex-row items-center space-x-2 px-10">
        <TipsOutlineIcon color="gray" />
        <h3>Tips</h3>
      </div>
      {activeRounds.map((round, index) => (
        <div key={index} className="flex flex-col justify-center px-10 py-3">
          <div className="mb-2 text-xs text-gray-500">Round: {round.roundId}</div>
          <div className="flex flex-col justify-between">
            <div className="flex flex-col justify-between text-sm text-gray-500">
              <p className="mb-1">Received in total:</p>
              <p>{ethers.utils.formatEther(round.receivedInTotal)} WMATIC</p>
            </div>
            <div className="item-center my-auto flex justify-between pt-3 text-xs text-gray-500">
              <div>
                <p>Round ends in {getTimeLeft(round.roundEndTime)}</p>
              </div>
              <div className="mr-4">
                <button onClick={() => setShowDetails(showDetails === round.roundId ? null : round.roundId)}>
                  <p className="underline">{showDetails === round.roundId ? 'hide' : 'show'} details</p>
                </button>
              </div>
            </div>
            <RoundStats showDetails={showDetails === round.roundId} round={round} />
          </div>
          <hr className="mt-4 border-gray-200" />
        </div>
      ))}
    </div>
  );
};
