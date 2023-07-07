import type { QuadraticRound } from '@components/Composer/NewPublication';
import { getTokenName } from '@components/utils/getTokenName';
import { CheckIcon, LightBulbIcon, XIcon } from '@heroicons/react/outline';
import { t } from '@lingui/macro';
import { formatEther } from 'ethers/lib/utils.js';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { FC } from 'react';
import { useState } from 'react';
import { Modal, Tooltip } from 'ui';
import { useNetwork } from 'wagmi';

interface Props {
  selectedQuadraticRound: QuadraticRound;
  requirementsStatus: Record<string, boolean>;
  requirementsMet: boolean;
}

const RoundInfoModal: FC<Props> = ({ selectedQuadraticRound, requirementsStatus, requirementsMet }) => {
  const [showModal, setShowModal] = useState(false);
  const { chain } = useNetwork();

  const { name, description, id, endTime, token, matchAmount, requirements } = selectedQuadraticRound;

  const polygonScanLink = (address: string, type: string) => {
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

  return (
    <>
      <Tooltip placement="top" content={'Information about the selected quadratic round.'}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={() => setShowModal(!showModal)}
          aria-label="Get Round Info"
        >
          <div className="text-brand">
            <LightBulbIcon className="h-5 w-5" color={requirementsMet ? '#8B5CF6' : 'red'} />
          </div>
        </motion.button>
      </Tooltip>
      <Modal
        title={t`${name}`}
        icon={<LightBulbIcon className="h-6 w-6 text-purple-600" />}
        show={showModal}
        onClose={() => setShowModal(false)}
      >
        <div className="m-4">
          <div className="mb-4 border-b border-purple-200 pb-4">
            <h2 className="text-lg font-semibold text-purple-500">About Round</h2>
            <p className="text-sm">{description}</p>
          </div>
          <div className="mb-4 border-b border-purple-200 pb-4">
            <h2 className="text-md font-semibold text-purple-500">Match Amount</h2>
            <Link href={polygonScanLink(token, 'token')} target="blank">
              <p className="text-sm hover:text-blue-500">
                {formatEther(matchAmount)} {getTokenName(token)}
              </p>
            </Link>
          </div>
          {requirements.length !== 0 && requirements[0] !== '' && (
            <div className="mb-4 border-b border-purple-200 pb-4">
              <h2 className="text-md font-semibold text-purple-500">Round Required Text</h2>
              <ul>
                {Object.entries(requirementsStatus).map(([requirement, isMet]) => (
                  <li key={requirement}>
                    <div className="flex items-center">
                      {isMet ? (
                        <CheckIcon className="mr-2 h-5 w-5 text-green-500" />
                      ) : (
                        <XIcon className="mr-2 h-5 w-5 text-red-500" />
                      )}
                      {requirement}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mb-4 border-b border-purple-200 pb-4">
            <h2 className="text-md font-semibold text-purple-500">Round Address</h2>
            <Link href={polygonScanLink(id, 'address')} target="blank">
              <p className="text-sm hover:text-blue-500">{id}</p>
            </Link>
          </div>

          <div className="mb-4 border-b border-purple-200 pb-4">
            <h2 className="text-md font-semibold text-purple-500">Round End</h2>
            <p className="text-sm">{endTime.toLocaleString()}</p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RoundInfoModal;
