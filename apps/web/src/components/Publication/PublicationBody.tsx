import Attachments from '@components/Shared/Attachments';
import IFramely from '@components/Shared/IFramely';
import Markup from '@components/Shared/Markup';
import Snapshot from '@components/Shared/Snapshot';
import { EyeIcon } from '@heroicons/react/outline';
import { Trans } from '@lingui/macro';
import clsx from 'clsx';
import type { Publication } from 'lens';
import getSnapshotProposalId from 'lib/getSnapshotProposalId';
import getURLs from 'lib/getURLs';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { Dispatch, FC, SetStateAction } from 'react';
import { useEffect } from 'react';

import DecryptedPublicationBody from './DecryptedPublicationBody';

interface PublicationBodyProps {
  publication: Publication;
  roundAddress?: string;
  setRoundAddress?: Dispatch<SetStateAction<string>>;
}

const PublicationBody: FC<PublicationBodyProps> = ({ publication, roundAddress, setRoundAddress }) => {
  const { pathname } = useRouter();
  const showMore = publication?.metadata?.content?.length > 450 && pathname !== '/posts/[id]';
  const hasURLs = getURLs(publication?.metadata?.content)?.length > 0;
  const snapshotProposalId = hasURLs && getSnapshotProposalId(getURLs(publication?.metadata?.content)[0]);
  let content = publication?.metadata?.content;

  useEffect(() => {
    function retrieveRoundAddress(input: string): string | null {
      const cleanInput = input.replace(/<[^>]*>?/gm, '');
      const pattern = /Your post will be included in (.*?)(0x[\dA-Fa-f]{40})(.*round\.|\.)/;

      const secondPattern =
        /This post is included in the (.*?) round \((0x[\dA-Fa-f]{40})\) on Quadratic Lenster/;

      const thirdPattern =
        /This post is included in the (.*?) round \((0x[\dA-Fa-f]{40})\) at quadraticlenster.xyz/;

      let match = cleanInput.match(pattern);

      if (!match) {
        match = cleanInput.match(secondPattern);
      }

      if (!match) {
        match = cleanInput.match(thirdPattern);
      }

      if (!match) {
        console.log('No Ethereum address found');
      }

      return match ? match[2] : null;
    }
    if (
      content &&
      setRoundAddress &&
      publication.__typename === 'Post' &&
      (!roundAddress || roundAddress === '')
    ) {
      const roundAddress = retrieveRoundAddress(content);
      if (roundAddress && setRoundAddress) {
        setRoundAddress(roundAddress);
      } else {
        setRoundAddress('');
      }
    }
  }, [content, setRoundAddress, roundAddress, publication.__typename]);

  if (snapshotProposalId) {
    content = content?.replace(getURLs(publication?.metadata?.content)[0], '');
  }

  if (publication?.metadata?.encryptionParams) {
    return <DecryptedPublicationBody encryptedPublication={publication} />;
  }

  return (
    <div className="break-words">
      <Markup className={clsx({ 'line-clamp-5': showMore }, 'markup linkify text-md break-words')}>
        {content}
      </Markup>

      {showMore && (
        <div className="lt-text-gray-500 mt-4 flex items-center space-x-1 text-sm font-bold">
          <EyeIcon className="h-4 w-4" />
          <Link href={`/posts/${publication?.id}`}>
            <Trans>Show more</Trans>
          </Link>
        </div>
      )}
      {/* Snapshot, Attachments and Opengraph */}
      {snapshotProposalId ? (
        <Snapshot propsalId={snapshotProposalId} />
      ) : publication?.metadata?.media?.length > 0 ? (
        <Attachments attachments={publication?.metadata?.media} publication={publication} />
      ) : (
        publication?.metadata?.content &&
        hasURLs && <IFramely url={getURLs(publication?.metadata?.content)[0]} />
      )}
    </div>
  );
};

export default PublicationBody;
