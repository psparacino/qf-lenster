import type { Publication } from 'lens';
import { useRouter } from 'next/router';
import type { Dispatch, FC, SetStateAction } from 'react';

import PublicationActions from './Actions';
import HiddenPublication from './HiddenPublication';
import PublicationBody from './PublicationBody';
import PublicationHeader from './PublicationHeader';

interface ThreadBodyProps {
  publication: Publication;
  roundAddress?: string;
  setRoundAddress?: Dispatch<SetStateAction<string>>;
}

const ThreadBody: FC<ThreadBodyProps> = ({ publication, roundAddress, setRoundAddress }) => {
  const { push } = useRouter();
  return (
    <article
      onClick={() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) {
          push(`/posts/${publication?.id}`);
        }
      }}
      aria-hidden="true"
    >
      <PublicationHeader publication={publication} />
      <div className="flex">
        <div className="-my-6 ml-5 mr-8 border-[0.8px] border-gray-300 bg-gray-300 dark:border-gray-700 dark:bg-gray-700" />
        <div className="w-full max-w-[calc(100%_-_53px)] pb-5">
          {publication?.hidden ? (
            <HiddenPublication type={publication.__typename} />
          ) : (
            <>
              <PublicationBody
                publication={publication}
                roundAddress={roundAddress}
                setRoundAddress={setRoundAddress}
              />

              <PublicationActions publication={publication} roundAddress={roundAddress} />
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export default ThreadBody;
