import Loader from '@components/Shared/Loader';
import TipsOutlineIcon from '@components/Shared/TipIcons/TipsOutlineIcon';
import TipsSolidIcon from '@components/Shared/TipIcons/TipsSolidIcon';
import { formatDecimals } from '@components/utils/formatDecimals';
import { getTokenName } from '@components/utils/getTokenName';
import { t } from '@lingui/macro';
import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { motion } from 'framer-motion';
import type { Publication } from 'lens';
import humanize from 'lib/humanize';
import nFormatter from 'lib/nFormatter';
import dynamic from 'next/dynamic';
import type { FC } from 'react';
import React, { useState } from 'react';
import { Modal, Spinner, Tooltip } from 'ui';
import { useAccount } from 'wagmi';

import {
  useAccountHasVotePending,
  useGetPostQuadraticTipping,
  useGetPublicationMatchData,
  useGetRoundInfo
} from './QuadraticQueries/grantsQueries';

const Tipping = dynamic(() => import('./Tipping'), {
  loading: () => <Loader message={t`Loading tips`} />
});
interface TipProps {
  publication: Publication;
  roundAddress: string;
}

const Tip: FC<TipProps> = ({ publication, roundAddress }) => {
  const { data: matchingData } = useGetPublicationMatchData(roundAddress, publication.id);
  const { data: postQuadraticTipping } = useGetPostQuadraticTipping(roundAddress, publication.id);
  const { data: roundInfo } = useGetRoundInfo(roundAddress);

  const { address } = useAccount();
  const [showTipModal, setShowTipModal] = useState(false);

  const tipCount = postQuadraticTipping?.votes.length || 0;
  const roundOpen = roundInfo?.roundOpen || false;
  const currentUserTippedPublication = postQuadraticTipping?.votes.some(
    (vote) => vote.from === address?.toLowerCase()
  );

  const textColor = roundOpen && address !== undefined ? 'text-red-500' : 'text-red-200';
  const { pending, status } = useAccountHasVotePending(publication.id);

  return (
    <>
      <div className="flex items-center space-x-1 text-red-500">
        <motion.button
          disabled={!roundOpen || address === undefined}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setShowTipModal(true);
          }}
          aria-label="Collect"
        >
          <div className="flex items-center">
            <div
              className={
                roundOpen ? 'rounded-full p-1.5 hover:bg-red-300 hover:bg-opacity-20' : 'rounded-full p-1.5'
              }
            >
              <Tooltip
                placement="top"
                content={
                  roundOpen
                    ? tipCount > 0
                      ? `${humanize(tipCount)} Total Tips by YOU!`
                      : 'Quadratically Tip!'
                    : 'Quadratic Round Completed!'
                }
                withDelay
              >
                <div className="flex">
                  {currentUserTippedPublication ? (
                    <TipsSolidIcon color={roundOpen && address !== undefined ? '#EF4444' : '#FECACA'} />
                  ) : (
                    <TipsOutlineIcon color={roundOpen && address !== undefined ? '#EF4444' : '#FECACA'} />
                  )}
                </div>
              </Tooltip>
            </div>
          </div>
        </motion.button>
        {!!(tipCount > 0 && matchingData && roundInfo) && (
          <div className="flex items-center">
            <Tooltip placement="top" content="Number of unique contributors" withDelay>
              <div className={`${textColor} px-2 text-[11px] sm:text-xs`}>
                {nFormatter(matchingData.uniqueContributorsCount)}
              </div>
            </Tooltip>
            <div className={`${textColor} text-[11px]`}>|</div>
            <Tooltip placement="top" content="Total number of tips" withDelay>
              <div className={`${textColor} px-2 text-[11px] sm:text-xs`}>{nFormatter(tipCount)}</div>
            </Tooltip>

            <div className="flex items-center">
              {matchingData && (
                <span className={`${textColor} ml-2 text-[11px] sm:text-xs`}>
                  {roundOpen
                    ? `Match estimate ${formatDecimals(matchingData.matchAmountInToken)} ${getTokenName(
                        roundInfo.token
                      )}`
                    : `Matched with ${formatDecimals(matchingData.matchAmountInToken)} ${getTokenName(
                        roundInfo.token
                      )}`}
                </span>
              )}
              {pending && (
                <Tooltip content="Your tip is pending" placement="top" withDelay>
                  <span className={`${textColor} flex items-center px-2 text-[11px] sm:text-xs`}>
                    <Spinner size="xs" className={`ml-2 mr-2 ${textColor}`} variant="danger" />
                    {status === 'indexing' ? 'Indexing tip' : 'Calculating tip amount...'}
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        )}
      </div>
      <Modal
        title={t`Tipping`}
        icon={
          <div className="text-brand">
            <TipsOutlineIcon color="#8B5CF6" />
          </div>
        }
        show={showTipModal}
        onClose={() => setShowTipModal(false)}
      >
        <Tipping
          address={address!}
          publication={publication}
          roundAddress={roundAddress}
          setShowTipModal={setShowTipModal}
          tipCount={tipCount}
          tipTotal={BigNumber.from(
            parseUnits(matchingData?.totalContributionsInToken.toString() || '0', 'ether')
          )}
        />
      </Modal>
    </>
  );
};

export default Tip;
