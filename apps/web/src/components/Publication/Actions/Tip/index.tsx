import Loader from '@components/Shared/Loader';
import TipsOutlineIcon from '@components/Shared/TipIcons/TipsOutlineIcon';
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
import { Modal, Tooltip } from 'ui';
import { useAccount, useChainId } from 'wagmi';

import {
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
                <div className="text-md">
                  <TipsOutlineIcon color={roundOpen && address !== undefined ? '#EF4444' : '#FECACA'} />
                </div>
              </Tooltip>
            </div>
          </div>
        </motion.button>
        {!!(tipCount > 0 && matchingData && roundInfo) && (
          <div>
            <span
              className={`${
                roundOpen && address !== undefined ? 'text-red-500' : 'text-red-200'
              } text-[11px] sm:text-xs`}
            >
              {nFormatter(tipCount)}
            </span>
            {matchingData && (
              <span
                className={`${
                  roundOpen && address !== undefined ? 'text-red-500' : 'text-red-200'
                } ml-3 text-[11px] sm:text-xs`}
              >
                {roundOpen
                  ? `Match estimate ${matchingData.matchAmountInToken} ${getTokenName(roundInfo.token)}`
                  : `Matched with ${matchingData.matchAmountInToken} ${getTokenName(roundInfo.token)}`}
              </span>
            )}
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
