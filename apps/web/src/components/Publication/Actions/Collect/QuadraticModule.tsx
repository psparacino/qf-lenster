import AllowanceButton from '@components/Settings/Allowance/Button';
import CollectWarning from '@components/Shared/CollectWarning';
import Loader from '@components/Shared/Loader';
import Markup from '@components/Shared/Markup';
import Collectors from '@components/Shared/Modal/Collectors';
import ReferralAlert from '@components/Shared/ReferralAlert';
import Uniswap from '@components/Shared/Uniswap';
import { Button } from '@components/UI/Button';
import { Modal } from '@components/UI/Modal';
import { Spinner } from '@components/UI/Spinner';
import { WarningMessage } from '@components/UI/WarningMessage';
import { CashIcon, ClockIcon, CollectionIcon, PuzzleIcon, UsersIcon } from '@heroicons/react/outline';
import { CheckCircleIcon } from '@heroicons/react/solid';
import formatAddress from '@lib/formatAddress';
import formatHandle from '@lib/formatHandle';
import formatTime from '@lib/formatTime';
import getAssetAddress from '@lib/getAssetAddress';
import getCoingeckoPrice from '@lib/getCoingeckoPrice';
import getSignature from '@lib/getSignature';
import getTokenImage from '@lib/getTokenImage';
import humanize from '@lib/humanize';
import { Leafwatch } from '@lib/leafwatch';
import onError from '@lib/onError';
import splitSignature from '@lib/splitSignature';
import { t, Trans } from '@lingui/macro';
import { useQuery } from '@tanstack/react-query';
import { LensHubProxy, QuadraticVoteCollectModule } from 'abis';
import { LENSHUB_PROXY, POLYGONSCAN_URL, SIGN_WALLET } from 'data/constants';
import getEnvConfig from 'data/utils/getEnvConfig';
import dayjs from 'dayjs';
import { ethers } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import type { ApprovedAllowanceAmount, ElectedMirror, Publication } from 'lens';
import {
  CollectModules,
  useApprovedModuleAllowanceAmountQuery,
  useBroadcastMutation,
  useCollectModuleQuery,
  useCreateCollectTypedDataMutation,
  useProxyActionMutation,
  usePublicationRevenueQuery
} from 'lens';
import type { Dispatch, FC } from 'react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from 'src/store/app';
import { PUBLICATION } from 'src/tracking';
import { useAccount, useBalance, useContractRead, useContractWrite, useSignTypedData } from 'wagmi';

import { getRoundInfo } from './quadraticUtils/utils';

interface Props {
  count: number;
  setCount: Dispatch<number>;
  publication: Publication;
  electedMirror?: ElectedMirror;
}

export interface QuadraticCollectModuleData {
  __typename?: string;
  type: CollectModules;
  referralFee: number;
  contractAddress: any;
  followerOnly: boolean;
  endTimestamp: Date;
  votingStrategy: string;
  grantsRound: string;
  amount: {
    __typename?: string;
    value: string;
    asset: { __typename?: string; symbol: string; decimals: number; address: any };
  };
}

const quadraticModuleSettings: QuadraticCollectModuleData = {
  __typename: 'UnknownCollectModuleSettings',
  type: CollectModules.UnknownCollectModule,
  referralFee: 0,
  contractAddress: '',
  followerOnly: false,
  endTimestamp: new Date(0),
  votingStrategy: '',
  grantsRound: '',
  amount: {
    __typename: 'ModuleFeeAmount',
    value: '0',
    asset: { __typename: 'Erc20', symbol: 'WMATIC', decimals: 18, address: '' }
  }
};

const QuadraticModule: FC<Props> = ({ count, setCount, publication, electedMirror }) => {
  const userSigNonce = useAppStore((state) => state.userSigNonce);
  const setUserSigNonce = useAppStore((state) => state.setUserSigNonce);
  const currentProfile = useAppStore((state) => state.currentProfile);
  const [revenue, setRevenue] = useState(0);
  const [hasCollectedByMe, setHasCollectedByMe] = useState(publication?.hasCollectedByMe);
  const [showCollectorsModal, setShowCollectorsModal] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const { address } = useAccount();
  const { isLoading: signLoading, signTypedDataAsync } = useSignTypedData({ onError });
  const [collectModule, setCollectModule] = useState<QuadraticCollectModuleData>(quadraticModuleSettings);
  const [customTipAmount, setCustomTipAmount] = useState(0);

  const [moduleAllowed, setModuleAllowed] = useState(false);
  const [votingStrategyAllowed, setVotingStrategyAllowed] = useState(false);
  const [allAllowancesLoading, setAllAllowancesLoading] = useState(true);

  const { data, loading } = useCollectModuleQuery({
    variables: { request: { publicationId: publication?.id } }
  });

  const onCompleted = () => {
    setRevenue(revenue + parseFloat(collectModule?.amount?.value));
    setCount(count + 1);
    setHasCollectedByMe(true);
    toast.success(t`Collected successfully!`);
    Leafwatch.track(PUBLICATION.COLLECT_MODULE.COLLECT);
  };

  const { isFetching, refetch } = useContractRead({
    address: getEnvConfig().QuadraticVoteCollectModuleAddress,
    abi: QuadraticVoteCollectModule,
    functionName: 'getPublicationData',
    args: [parseInt(publication.profile?.id), parseInt(publication?.id.split('-')[1])],
    enabled: false
  });

  const { isLoading: writeLoading, write } = useContractWrite({
    address: LENSHUB_PROXY,
    abi: LensHubProxy,
    functionName: 'collectWithSig',
    mode: 'recklesslyUnprepared',
    onSuccess: onCompleted,
    onError
  });

  useEffect(() => {
    async function fetchRoundInfo(grantsRound: string) {
      const roundInfo = await getRoundInfo(grantsRound);
      return roundInfo;
    }

    if (!isFetching && collectModule === quadraticModuleSettings) {
      refetch().then((res: { data: any }) => {
        if (res) {
          const { currency, referral, grantsRoundAddress } = res.data;
          fetchRoundInfo(grantsRoundAddress).then((round) => {
            const roundEnd = new Date(round.roundEndTime * 1000);
            const roundVotingStrategyAddress = round.votingStrategy.id;
            setCollectModule({
              __typename: 'UnknownCollectModuleSettings',
              type: CollectModules.UnknownCollectModule,
              referralFee: referral,
              contractAddress: getEnvConfig().QuadraticVoteCollectModuleAddress,
              followerOnly: false,
              endTimestamp: roundEnd,
              votingStrategy: roundVotingStrategyAddress,
              grantsRound: grantsRoundAddress,
              // alert, will need custom function here for this info as this data doesn't exist on UnkownCollectModuleSettings
              amount: {
                __typename: 'ModuleFeeAmount',
                value: '.0001',
                asset: { __typename: 'Erc20', symbol: 'WMATIC', decimals: 18, address: currency }
              }
            });
          });
        }
      });
    }
  }, [isFetching, collectModule, refetch]);

  // const percentageCollected = (count / parseInt(collectModule?.collectLimit)) * 100;
  const { data: allowanceData, loading: allowanceLoading } = useApprovedModuleAllowanceAmountQuery({
    variables: {
      request: {
        currencies: collectModule?.amount?.asset?.address,
        followModules: [],
        unknownCollectModules: [getEnvConfig().QuadraticVoteCollectModuleAddress],
        referenceModules: []
      }
    },
    skip: !collectModule?.amount?.asset?.address || !currentProfile,
    onCompleted: (data) => {
      setModuleAllowed(data?.approvedModuleAllowanceAmount[0]?.allowance !== '0x00');
    }
  });

  const { isFetched: votingApprovalFetched } = useContractRead({
    address: collectModule?.amount?.asset?.address,
    abi: ['function allowance(address owner, address spender) view returns (uint256)'],
    functionName: 'allowance',
    args: [address, collectModule?.votingStrategy],
    onSettled(data: any) {
      setVotingStrategyAllowed(data?._hex !== '0x00');
    }
  });

  useEffect(() => {
    if (moduleAllowed && votingStrategyAllowed) {
      setAllowed(true);
    } else {
      setAllowed(false);
    }

    if (allowanceLoading || !votingApprovalFetched) {
      setAllAllowancesLoading(true);
    } else {
      setAllAllowancesLoading(false);
    }
  }, [moduleAllowed, votingStrategyAllowed, allowanceLoading, votingApprovalFetched]);

  const { data: revenueData, loading: revenueLoading } = usePublicationRevenueQuery({
    variables: {
      request: {
        publicationId: publication.__typename === 'Mirror' ? publication?.mirrorOf?.id : publication?.id
      }
    },
    pollInterval: 5000,
    skip: !publication?.id
  });

  const { data: usdPrice } = useQuery(
    ['coingeckoData'],
    () => getCoingeckoPrice(getAssetAddress(collectModule?.amount?.asset?.symbol)).then((res) => res),
    { enabled: Boolean(collectModule?.amount) }
  );

  useEffect(() => {
    setRevenue(parseFloat((revenueData?.publicationRevenue?.revenue?.total?.value as any) ?? 0));
  }, [revenueData]);

  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address,
    token: collectModule?.amount?.asset?.address,
    formatUnits: collectModule?.amount?.asset?.decimals,
    watch: true
  });

  let hasAmount = false;

  if (balanceData && parseFloat(balanceData?.formatted) < parseFloat(collectModule?.amount.value)) {
    hasAmount = false;
  } else {
    hasAmount = true;
  }

  const [broadcast, { loading: broadcastLoading }] = useBroadcastMutation({
    onCompleted
  });
  const [createCollectTypedData, { loading: typedDataLoading }] = useCreateCollectTypedDataMutation({
    onCompleted: async ({ createCollectTypedData }) => {
      const { id, typedData } = createCollectTypedData;
      const { profileId, pubId, data: collectData, deadline } = typedData.value;
      const signature = await signTypedDataAsync(getSignature(typedData));
      const { v, r, s } = splitSignature(signature);
      const sig = { v, r, s, deadline };
      const inputStruct = {
        collector: address,
        profileId,
        pubId,
        data: collectData,
        sig
      };
      setUserSigNonce(userSigNonce + 1);
      const { data } = await broadcast({ variables: { request: { id, signature } } });
      if (data?.broadcast.__typename === 'RelayError') {
        return write?.({ recklesslySetUnpreparedArgs: [inputStruct] });
      }
    },
    onError
  });

  const [createCollectProxyAction, { loading: proxyActionLoading }] = useProxyActionMutation({
    onCompleted,
    onError
  });
  const createViaProxyAction = async (variables: any) => {
    const { data } = await createCollectProxyAction({ variables });
    if (!data?.proxyAction) {
      await createCollectTypedData({
        variables: {
          request: { publicationId: publication?.id },
          options: { overrideSigNonce: userSigNonce }
        }
      });
    }
  };

  const createCollect = async () => {
    if (!currentProfile) {
      return toast.error(SIGN_WALLET);
    }

    try {
      if (collectModule?.type === CollectModules.FreeCollectModule) {
        await createViaProxyAction({
          request: { collect: { freeCollect: { publicationId: publication?.id } } }
        });
      } else if (collectModule?.__typename === 'UnknownCollectModuleSettings') {
        refetch().then(async ({ data }) => {
          if (data) {
            const decodedData: any = data;
            // below needs to be input || set amount with auto add button by user

            const uint256Value = ethers.utils.parseEther(collectModule.amount.value);
            const encodedData = defaultAbiCoder.encode(
              ['address', 'uint256'],
              [decodedData?.[0] as string, uint256Value]
            );
            const result = await createCollectTypedData({
              variables: {
                options: { overrideSigNonce: userSigNonce },
                request: { publicationId: publication?.id, unknownModuleData: encodedData }
              }
            });
            console.log('createCollectTypedData: ', result);
          }
        });
      } else {
        await createCollectTypedData({
          variables: {
            options: { overrideSigNonce: userSigNonce },
            request: { publicationId: electedMirror ? electedMirror.mirrorId : publication?.id }
          }
        });
      }
    } catch {}
  };

  if (loading || revenueLoading) {
    return <Loader message={t`Loading tips`} />;
  }

  const isLoading =
    typedDataLoading ||
    proxyActionLoading ||
    signLoading ||
    isFetching ||
    writeLoading ||
    broadcastLoading ||
    allAllowancesLoading;

  return (
    <div className="p-5">
      {collectModule?.followerOnly && (
        <div className="pb-5">
          <CollectWarning
            handle={formatHandle(publication?.profile?.handle)}
            isSuperFollow={publication?.profile?.followModule?.__typename === 'FeeFollowModuleSettings'}
          />
        </div>
      )}
      <div className="mb-2 flex items-center space-x-2">
        {currentProfile &&
          (allowanceLoading || balanceLoading ? (
            <div className="shimmer h-[34px] w-28 rounded-lg" />
          ) : allowed ? (
            hasAmount ? (
              <div className="flex w-full justify-between">
                <input
                  className="mr-2 w-4/6 rounded"
                  type="number"
                  placeholder="How much do you want to tip?"
                  value={customTipAmount}
                  onChange={(e) => setCustomTipAmount(parseFloat(e.target.value))}
                />

                <Button
                  onClick={createCollect}
                  disabled={isLoading}
                  icon={isLoading ? <Spinner size="xs" /> : <CollectionIcon className="h-4 w-4" />}
                  className="flex w-2/6 justify-center"
                >
                  <div className="flex items-center">
                    <Trans>Tip</Trans>
                  </div>
                </Button>
              </div>
            ) : (
              <WarningMessage message={<Uniswap module={collectModule} />} />
            )
          ) : null)}
      </div>
      {allAllowancesLoading ? (
        <Spinner />
      ) : (
        <AllowanceButton
          title="Allow collect module"
          module={allowanceData?.approvedModuleAllowanceAmount[0] as ApprovedAllowanceAmount}
          allowed={allowed}
          setAllowed={setAllowed}
          {...(collectModule ? { collectModule: collectModule } : {})}
        />
      )}

      <div className="space-y-1.5 pb-2">
        {publication?.metadata?.name && (
          <div className="text-xl font-bold">{publication?.metadata?.name}</div>
        )}
        {publication?.metadata?.content && (
          <Markup className="lt-text-gray-500 line-clamp-2">{publication?.metadata?.content}</Markup>
        )}
        <ReferralAlert
          electedMirror={electedMirror}
          mirror={publication}
          referralFee={collectModule?.referralFee}
        />
      </div>
      {collectModule?.amount && (
        <div className="flex items-center space-x-1.5 py-2">
          <img
            className="h-7 w-7"
            height={28}
            width={28}
            src={getTokenImage(collectModule?.amount?.asset?.symbol)}
            alt={collectModule?.amount?.asset?.symbol}
            title={collectModule?.amount?.asset?.symbol}
          />
          <span className="space-x-1">
            <span className="text-2xl font-bold">{collectModule.amount.value}</span>
            <span className="text-xs">{collectModule?.amount?.asset?.symbol}</span>
            {usdPrice ? (
              <>
                <span className="lt-text-gray-500 px-0.5">·</span>
                <span className="lt-text-gray-500 text-xs font-bold">
                  ${(parseFloat(collectModule.amount.value) * usdPrice).toFixed(2)}
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
            <button
              className="font-bold"
              type="button"
              onClick={() => {
                setShowCollectorsModal(!showCollectorsModal);
                Leafwatch.track(PUBLICATION.COLLECT_MODULE.OPEN_COLLECTORS);
              }}
            >
              <Trans>{humanize(count)} collectors</Trans>
            </button>
            <Modal
              title={t`Collected by`}
              icon={<CollectionIcon className="text-brand h-5 w-5" />}
              show={showCollectorsModal}
              onClose={() => setShowCollectorsModal(false)}
            >
              <Collectors
                publicationId={
                  publication.__typename === 'Mirror' ? publication?.mirrorOf?.id : publication?.id
                }
              />
            </Modal>
          </div>
          {collectModule?.referralFee ? (
            <div className="flex items-center space-x-2">
              <CashIcon className="lt-text-gray-500 h-4 w-4" />
              <div className="font-bold">
                <Trans>{collectModule.referralFee}% referral fee</Trans>
              </div>
            </div>
          ) : null}
        </div>
        {revenueData?.publicationRevenue && (
          <div className="flex items-center space-x-2">
            <CashIcon className="lt-text-gray-500 h-4 w-4" />
            <div className="flex items-center space-x-1.5">
              <span>
                <Trans>Revenue:</Trans>
              </span>
              <span className="flex items-center space-x-1">
                <img
                  src={getTokenImage(collectModule?.amount?.asset?.symbol)}
                  className="h-5 w-5"
                  height={20}
                  width={20}
                  alt={collectModule?.amount?.asset?.symbol}
                  title={collectModule?.amount?.asset?.symbol}
                />
                <div className="flex items-baseline space-x-1.5">
                  <div className="font-bold">{revenue}</div>
                  <div className="text-[10px]">{collectModule?.amount?.asset?.symbol}</div>
                  {usdPrice ? (
                    <>
                      <span className="lt-text-gray-500">·</span>
                      <span className="lt-text-gray-500 text-xs font-bold">
                        ${(revenue * usdPrice).toFixed(2)}
                      </span>
                    </>
                  ) : null}
                </div>
              </span>
            </div>
          </div>
        )}
        {collectModule?.endTimestamp && (
          <div className="flex items-center space-x-2">
            <ClockIcon className="lt-text-gray-500 h-4 w-4" />
            <div className="space-x-1.5">
              <span>
                <Trans>Round Ends:</Trans>
              </span>
              <span className="font-bold text-gray-600" title={formatTime(collectModule?.endTimestamp)}>
                {dayjs(collectModule?.endTimestamp).format('MMMM DD, YYYY')} at{' '}
                {dayjs(collectModule?.endTimestamp).format('hh:mm a')}
              </span>
            </div>
          </div>
        )}
        {data?.publication?.collectNftAddress && (
          <div className="flex items-center space-x-2">
            <PuzzleIcon className="lt-text-gray-500 h-4 w-4" />
            <div className="space-x-1.5">
              <span>
                <Trans>Token:</Trans>
              </span>
              <a
                href={`${POLYGONSCAN_URL}/token/${data?.publication?.collectNftAddress}`}
                target="_blank"
                className="font-bold text-gray-600"
                rel="noreferrer noopener"
              >
                {formatAddress(data?.publication?.collectNftAddress)}
              </a>
            </div>
          </div>
        )}
      </div>
      {publication?.hasCollectedByMe && (
        <div className="mt-3 flex items-center space-x-1.5 font-bold text-green-500">
          <CheckCircleIcon className="h-5 w-5" />
          <div>
            <Trans>You already collected this</Trans>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuadraticModule;
