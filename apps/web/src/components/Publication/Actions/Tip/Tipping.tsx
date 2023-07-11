import Markup from '@components/Shared/Markup';
import Uniswap from '@components/Shared/UniswapTip';
import { formatDecimals } from '@components/utils/formatDecimals';
import { getTokenName } from '@components/utils/getTokenName';
import { ClockIcon, MinusIcon, PuzzleIcon, UsersIcon, ViewGridAddIcon } from '@heroicons/react/outline';
import { CheckCircleIcon } from '@heroicons/react/solid';
import { formatTime } from '@lib/formatTime';
import getCoingeckoPrice from '@lib/getCoingeckoPrice';
import onError from '@lib/onError';
import { t, Trans } from '@lingui/macro';
import { useQuery } from '@tanstack/react-query';
import { RoundImplementation } from 'abis';
import dayjs from 'dayjs';
import type { BigNumber } from 'ethers';
import { ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import type { Publication } from 'lens';
import getAssetAddress from 'lib/getAssetAddress';
import getTokenImage from 'lib/getTokenImage';
import humanize from 'lib/humanize';
import type { Dispatch, FC } from 'react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from 'src/store/app';
import { Button, Card, Spinner, WarningMessage } from 'ui';
import {
  useBalance,
  useContractRead,
  useContractWrite,
  useNetwork,
  useSendTransaction,
  useWaitForTransaction
} from 'wagmi';

import TipsOutlineIcon from '../../../Shared/TipIcons/TipsOutlineIcon';
import {
  getRoundInfo,
  getRoundMetadata,
  useGetRoundMatchAmountPreviewByProjectId
} from './QuadraticQueries/grantsQueries';
import { encodePublicationId } from './utils';

interface Props {
  address: string;
  publication: Publication;
  setShowTipModal?: Dispatch<boolean>;
  roundAddress: string;
  tipCount: number;
  tipTotal: BigNumber;
}

interface RoundInfo {
  id: string;
  payoutStrategy: string;
  roundEndTime: string;
  roundStartTime: string;
  token: string;
  votingStrategy: {
    id: string;
  };
  metadata: {
    description: string;
    name: string;
    requirements: string[];
    supportEmail: string;
  };
}

const Tipping: FC<Props> = ({ address, publication, roundAddress, setShowTipModal, tipTotal, tipCount }) => {
  const currentProfile = useAppStore((state) => state.currentProfile);

  const [roundContractAllowancePending, setRoundContractAllowancePending] = useState(false);
  const [roundContractAllowed, setRoundContractAllowed] = useState(false);

  const [tipAmount, setTipAmount] = useState('0');
  const [inputValue, setInputValue] = useState('');
  const [roundInfoLoaded, setRoundInfoLoaded] = useState(false);
  const [roundInfo, setRoundInfo] = useState<RoundInfo>({
    id: '',
    payoutStrategy: '',
    roundEndTime: '',
    roundStartTime: '',
    token: '',
    votingStrategy: {
      id: ''
    },
    metadata: {
      description: '',
      name: '',
      requirements: [],
      supportEmail: ''
    }
  });

  // REGULAR VERSON

  // Get and store round info

  const { chain } = useNetwork();

  useEffect(() => {
    async function fetchRoundInfo(roundAddress: string) {
      if (chain) {
        try {
          const round = await getRoundInfo(chain.id, roundAddress);
          if (round) {
            const metadata = await getRoundMetadata(chain.id, round.roundMetaPtr.pointer);
            const updatedRoundInfo = { ...round, metadata };
            setRoundInfo(updatedRoundInfo);
            setRoundInfoLoaded(true);
          }
        } catch (error) {
          console.error('Error fetching round info:', error);
          return null;
        }
      }
    }

    fetchRoundInfo(roundAddress);
  }, [roundAddress, chain, address, publication?.id]);

  // TEMPORARY VERSION- HARDCODED WMATIC
  // useEffect(() => {
  //   async function fetchRoundInfo(roundAddress: string) {
  //     try {
  //       const round = await getRoundInfo(roundAddress);
  //       if (round) {
  //         // Override the token address
  //         const modifiedRound = {
  //           ...round,
  //           token: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889'
  //         };
  //         setRoundInfo(modifiedRound);
  //         setRoundInfoLoaded(true);
  //       }
  //     } catch (error) {
  //       console.error('Error fetching round info:', error);
  //       return null;
  //     }
  //   }
  //   fetchRoundInfo(roundAddress);
  // }, [roundAddress, address, publication?.id]);

  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address: address as `0x${string}`,
    token: roundInfo.token as `0x${string}`,
    formatUnits: 18,
    watch: true
  });

  let hasAmount = false;
  if (balanceData && parseFloat(balanceData?.formatted) < parseFloat(tipAmount)) {
    hasAmount = false;
  } else {
    hasAmount = true;
  }

  // **********
  // CHECK VOTING STRATEGY ALLOWANCE
  // **********
  const { isFetched: votingApprovalFetched } = useContractRead({
    address: roundInfo.token as `0x${string}`,
    abi: ['function allowance(address owner, address spender) view returns (uint256)'],
    functionName: 'allowance',
    args: [address, roundInfo.votingStrategy.id],
    onSettled(data: any) {
      const hexTipAmount = ethers.BigNumber.from(tipAmount).toHexString();
      const dataValue = data ? ethers.BigNumber.from(data._hex) : ethers.BigNumber.from(0);
      const comparisonResult = dataValue.gt(hexTipAmount) && !dataValue.isZero();
      setRoundContractAllowed(comparisonResult);
    }
  });

  // **********
  // ALLOWANCES
  // **********
  const {
    data: txData,
    isLoading: transactionLoading,
    sendTransaction
  } = useSendTransaction({
    request: {},
    mode: 'recklesslyUnprepared',
    onError: (error) => {
      toast.error(t`Error updating allowance: ${error.message}`);
      setRoundContractAllowancePending(false);
    }
  });

  const { isLoading: waitLoading } = useWaitForTransaction({
    hash: txData?.hash,
    onSuccess: () => {
      toast.success(
        roundContractAllowed ? t`Voting disabled successfully!` : t`Voting enabled successfully!`
      );
      setRoundContractAllowancePending(false);
      setRoundContractAllowed(!roundContractAllowed);
    },
    onError
  });

  let encodedData;

  if (roundInfo.token.length > 0 && publication?.id) {
    const bytesIds = encodePublicationId(publication.id);
    const hexTipAmount = ethers.utils.parseUnits(tipAmount, 18).toHexString();
    encodedData = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address', 'uint256', 'address', 'bytes32'],
      [address, roundInfo.token, hexTipAmount, publication.profile.ownedBy, bytesIds]
    );
  }

  const handleAllowance = (revokeAllowance?: string) => {
    const abi = ['function approve(address spender, uint256 value)'];
    let iface = new ethers.utils.Interface(abi);

    const maxAllowance = ethers.constants.MaxUint256.toHexString();
    const approveVotingStrategy = iface.encodeFunctionData('approve', [
      roundInfo.votingStrategy.id,
      revokeAllowance ? revokeAllowance : maxAllowance
    ]);
    setRoundContractAllowancePending(true);
    sendTransaction?.({
      recklesslySetUnpreparedRequest: {
        from: address,
        to: roundInfo.token as `0x${string}`,
        data: approveVotingStrategy
      }
    });
  };

  const {
    isLoading: writeLoading,
    data,
    write
  } = useContractWrite({
    address: roundAddress as `0x${string}`,
    abi: RoundImplementation,
    functionName: 'vote',
    args: [[encodedData]],
    mode: 'recklesslyUnprepared',
    onSuccess: () => {
      toast.success(t`Tip submitted successfully!`);
      setShowTipModal!(false);
    }
  });

  const { data: usdPrice } = useQuery(
    ['coingeckoData'],
    () => getCoingeckoPrice(getAssetAddress(roundInfo.token)).then((res) => res),
    { enabled: tipTotal && tipTotal.gt(0) }
  );

  const isLoading = writeLoading || balanceLoading;

  const resetAmount = () => {
    setTipAmount('0');
    setInputValue('');
  };

  function handleChange(e: any) {
    let { value } = e.target;

    setInputValue(value);

    if (value === '' || value === '.') {
      setTipAmount('0');
      return;
    }
    if (/^0\d+(\.0*)?$/.test(value)) {
      value = value.slice(1);
      setInputValue(value);
    }

    const number = parseFloat(value) || 0;

    if (number < 0) {
      console.error('Input cannot be negative');
      value = '0';
    } else if (number > 1000000) {
      console.error('Input cannot be greater than 1,000,000');
      value = '1000000';
    }

    setTipAmount(value);
  }

  const {
    data: matchPreview,
    isFetching: isFetchingMatchPreview,
    isError: isErrorMatchPreview
  } = useGetRoundMatchAmountPreviewByProjectId({
    roundId: roundAddress,
    projectId: publication?.id,
    tipAmountWei: parseUnits(tipAmount).toString(),
    token: roundInfo.token,
    debounceMS: 1000
  });

  return roundInfoLoaded ? (
    <div className="p-5">
      <div className="mb-2 flex items-center space-x-2">
        {currentProfile && hasAmount ? (
          <div className="flex w-full flex-col">
            <div className="flex items-stretch">
              <input
                className="mr-2 flex-grow rounded"
                type="number"
                step="0.0001"
                min="0"
                max="1000000"
                placeholder="How much do you want to tip?"
                value={inputValue}
                onChange={handleChange}
              />
              <Button
                onClick={roundContractAllowed ? () => write() : () => handleAllowance()}
                disabled={isLoading || tipAmount === '0'}
                icon={
                  isLoading || transactionLoading || writeLoading || roundContractAllowancePending ? (
                    <Spinner size="xs" />
                  ) : (
                    <TipsOutlineIcon color="white" />
                  )
                }
                className="flex w-2/6 justify-center"
              >
                <div className="flex items-center">{roundContractAllowed ? 'Tip!' : 'Approve Tip'}</div>
              </Button>
            </div>

            <Card
              as="aside"
              className="!bg-brand-300 border-brand-400 text-brand-600 mt-4 space-y-2.5 !bg-opacity-20 px-5 py-3"
            >
              {isFetchingMatchPreview ? (
                <div className="flex w-full items-center">
                  Estimating
                  <Spinner size="sm" className="ml-2" variant="primary" />
                </div>
              ) : (
                <span>
                  {!isErrorMatchPreview ? (
                    <>
                      Estimated matching for tip:{' '}
                      <b>
                        {formatDecimals(matchPreview?.differenceMatchAmountInToken || 0)}{' '}
                        {getTokenName(roundInfo.token)}
                      </b>
                    </>
                  ) : (
                    'Error estimating matching'
                  )}
                </span>
              )}
            </Card>

            {roundContractAllowed && (
              <div className="mt-2 flex w-full justify-end text-xs">
                <Button
                  variant="warning"
                  icon={
                    (transactionLoading || waitLoading) && roundContractAllowed ? (
                      <Spinner variant="warning" size="xs" />
                    ) : (
                      <MinusIcon className="h-4 w-4" />
                    )
                  }
                  onClick={() => handleAllowance(ethers.utils.parseUnits('0', 18).toHexString())}
                >
                  <Trans>Revoke Allowance</Trans>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center">
            <div>
              <WarningMessage message={<Uniswap roundInfo={roundInfo} tipAmount={tipAmount} />} />
            </div>

            <div className="mx-auto flex items-center">
              <div className="flex w-full justify-center">
                <Button className="text-center" onClick={resetAmount}>
                  Reset Amount
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-1.5 pb-2">
        {publication?.metadata?.name && (
          <div className="text-xl font-bold">{publication?.metadata?.name}</div>
        )}
        {publication?.metadata?.content && (
          <Markup className="lt-text-gray-500 line-clamp-2">{publication?.metadata?.content}</Markup>
        )}
      </div>
      {tipTotal && (
        <div className="flex items-center space-x-1.5 py-2">
          <img
            className="h-7 w-7"
            height={28}
            width={28}
            src={getTokenImage('wmatic')} // ALERT. can change here.
            alt={tipTotal.toString()}
            title={tipTotal.toString()}
          />
          <span className="space-x-1">
            <span className="text-xs">{ethers.utils.formatEther(tipTotal)}</span>
            {usdPrice ? (
              <>
                <span className="lt-text-gray-500 px-0.5">·</span>
                <span className="lt-text-gray-500 text-xs font-bold">
                  ${(parseInt(ethers.utils.formatEther(tipTotal)) * usdPrice).toFixed(5)}
                </span>
              </>
            ) : null}
          </span>
        </div>
      )}
      <div className="space-y-1.5">
        <div className="item-center block space-y-1 sm:flex sm:space-x-5">
          <div className="flex items-center space-x-2">
            <UsersIcon className="lt-text-gray-500 h-4 w-4" />

            <div>{humanize(tipCount)} tips</div>
          </div>
        </div>
        <div className="item-center block space-y-1 sm:flex sm:space-x-5">
          <div className="flex items-center space-x-2">
            <PuzzleIcon className="lt-text-gray-500 h-4 w-4" />

            <div>Round Name: {roundInfo.metadata.name} </div>
          </div>
        </div>
        <div className="item-center block space-y-1 sm:flex sm:space-x-5">
          <div className="flex  space-x-2">
            <ViewGridAddIcon className="lt-text-gray-500 mt-1 h-4 w-4" />

            <div>
              Round Address: <div className="text-xs">{roundInfo.id} </div>
            </div>
          </div>
        </div>
        {roundInfo.roundEndTime && (
          <div className="flex items-center space-x-2">
            <ClockIcon className="lt-text-gray-500 h-4 w-4" />
            <div className="space-x-1.5">
              <span>
                <Trans>Round Ends:</Trans>
              </span>

              <span
                className="font-bold text-gray-600"
                title={formatTime(new Date(parseInt(roundInfo.roundEndTime) * 1000))}
              >
                {dayjs(parseInt(roundInfo.roundEndTime) * 1000).format('MMMM DD, YYYY')} at{' '}
                {dayjs(parseInt(roundInfo.roundEndTime) * 1000).format('hh:mm a')}
              </span>
            </div>
          </div>
        )}
      </div>
      {publication?.hasCollectedByMe && (
        <div className="mt-3 flex items-center space-x-1.5 font-bold text-green-500">
          <CheckCircleIcon className="h-5 w-5" />
          <div>
            <Trans>You have tipped this post!</Trans>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center space-y-4 p-10">
      <Spinner variant="primary" size="lg" />
      <p className="text-color-200 text-sm">Loading tipping data...</p>
    </div>
  );
};

export default Tipping;
