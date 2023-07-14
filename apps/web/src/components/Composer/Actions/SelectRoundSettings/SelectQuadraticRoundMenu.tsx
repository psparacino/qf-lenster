import type { QuadraticRound } from '@components/Composer/NewPublication';
import { getTokenName } from '@components/utils/getTokenName';
import { Menu } from '@headlessui/react';
import { formatEther } from 'ethers/lib/utils.js';
import type { Dispatch, SetStateAction } from 'react';
import React from 'react';

interface SelectQuadraticRoundMenuProps {
  setSelectedQuadraticRound: Dispatch<SetStateAction<QuadraticRound>>;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  activeRounds: QuadraticRound[];
  setManuallySelectedRound: Dispatch<SetStateAction<string>>;
  selectedQuadraticRound?: QuadraticRound;
}

const SelectQuadraticRoundMenu = ({
  setSelectedQuadraticRound,
  setShowModal,
  activeRounds,
  setManuallySelectedRound,
  selectedQuadraticRound
}: SelectQuadraticRoundMenuProps) => {
  if (activeRounds.length === 0) {
    return <div className="text-center text-gray-500">No active funding rounds available.</div>;
  }

  return (
    <Menu as="div" className="flex flex-col items-center justify-center">
      {({ open }) => (
        <>
          {!open && (
            <div className="flex items-center justify-center">
              <Menu.Button className="border-brand-500 text-brand-500 hover:bg-brand-200 mx-auto rounded border-2 px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
                select a quadratic round!
              </Menu.Button>
            </div>
          )}
          <div className="relative flex w-full items-center justify-center">
            <Menu.Items className="mt-2 w-full origin-top divide-y-4 divide-gray-100 rounded-md bg-white ring-opacity-5">
              {activeRounds?.map((round: QuadraticRound) => {
                const active = selectedQuadraticRound?.id === round.id;
                return (
                  <Menu.Item key={round.id}>
                    <a
                      className={`group flex w-full items-center justify-center rounded-md text-sm text-white `}
                      href="#"
                      onClick={() => {
                        setSelectedQuadraticRound(round);
                        setManuallySelectedRound(round.id);
                        setShowModal(false);
                      }}
                    >
                      <div
                        className={`${
                          !!(selectedQuadraticRound?.id && !active) ? 'bg-brand-300' : 'bg-brand-500'
                        } hover:bg-brand-700 flex w-full flex-col items-center rounded-lg p-5 shadow-md transition-colors duration-200`}
                      >
                        <div className="mb-3 text-center text-lg font-bold ">{round.name}</div>
                        <div className="w-full rounded-lg bg-white p-3 text-left shadow-md">
                          <div className="mb-2 text-sm italic text-gray-600">{round.description}</div>
                          <div className="mt-2 text-sm">
                            <span className="font-semibold text-gray-800">Matching Amount: </span>
                            <span className="text-gray-600">
                              {formatEther(round.matchAmount)} {getTokenName(round.token)}
                            </span>
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="font-semibold text-gray-800">Rounds Ends: </span>
                            <span className="text-gray-600">{round.endTime.toLocaleString()}</span>
                          </div>
                          {round.requirements && round.requirements[0] !== '' && (
                            <div className="mt-2">
                              <div className="text-sm">
                                <span className="font-semibold text-gray-800">
                                  Required text in order to join round:{' '}
                                </span>
                                <span className="text-gray-600">{round.requirements.join(', ')}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  </Menu.Item>
                );
              })}
            </Menu.Items>
          </div>
        </>
      )}
    </Menu>
  );
};

export default SelectQuadraticRoundMenu;
