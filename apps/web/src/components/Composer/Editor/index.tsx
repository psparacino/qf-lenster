import MentionsPlugin from '@components/Shared/Lexical/Plugins/AtMentionsPlugin';
import LexicalAutoLinkPlugin from '@components/Shared/Lexical/Plugins/AutoLinkPlugin';
import EmojiPickerPlugin from '@components/Shared/Lexical/Plugins/EmojiPicker';
import EmojisPlugin from '@components/Shared/Lexical/Plugins/EmojisPlugin';
import ImagesPlugin from '@components/Shared/Lexical/Plugins/ImagesPlugin';
import ToolbarPlugin from '@components/Shared/Lexical/Plugins/ToolbarPlugin';
import useUploadAttachments from '@components/utils/hooks/useUploadAttachments';
import { $createHashtagNode } from '@lexical/hashtag';
import {
  $convertToMarkdownString,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS
} from '@lexical/markdown';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { t, Trans } from '@lingui/macro';
import Errors from 'data/errors';
import type { LexicalEditor, TextNode } from 'lexical';
import { $createParagraphNode, $getRoot } from 'lexical';
import type { Dispatch, FC, SetStateAction } from 'react';
import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { usePublicationStore } from 'src/store/publication';

import type { QuadraticRound } from '../NewPublication';
import { createHtml } from '../NewPublication';

const TRANSFORMERS = [...TEXT_FORMAT_TRANSFORMERS, ...TEXT_MATCH_TRANSFORMERS];

interface Props {
  selectedQuadraticRound: QuadraticRound;
  editor: LexicalEditor;
  notificationKeys: string[];
  setNotificationKeys: Dispatch<SetStateAction<string[]>>;
  roundNotificationData: string;
  setRoundNotificationData: Dispatch<SetStateAction<string>>;
}
const findNodes = (nodeArray: TextNode[], keyArray: string[]) => {
  return nodeArray.filter((node) => {
    return keyArray.find((key: string) => {
      return key == node.getKey();
    });
  });
};

const Editor: FC<Props> = ({
  selectedQuadraticRound,
  editor,
  notificationKeys,
  setNotificationKeys,
  roundNotificationData,
  setRoundNotificationData
}) => {
  const publicationContent = usePublicationStore((state) => state.publicationContent);
  const setPublicationContent = usePublicationStore((state) => state.setPublicationContent);
  const showNewPostModal = usePublicationStore((state) => state.showNewPostModal);
  const attachments = usePublicationStore((state) => state.attachments);
  const { handleUploadAttachments } = useUploadAttachments();
  const prevQuadraticRoundRef = useRef('');
  const prevQuadraticRequirementsRef = useRef<string[]>([]);

  const handlePaste = async (pastedFiles: FileList) => {
    if (attachments.length === 4 || attachments.length + pastedFiles.length > 4) {
      return toast.error(t`Please choose either 1 video or up to 4 photos.`);
    }

    if (pastedFiles) {
      await handleUploadAttachments(pastedFiles);
    }
  };

  useEffect(() => {
    if (showNewPostModal == false) {
      editor.update(() => {
        const root = $getRoot();
        const notifications = findNodes(root.getAllTextNodes(), notificationKeys);
        for (const notification of notifications) {
          notification.remove();
        }
        setNotificationKeys([]);
        setRoundNotificationData('');
        const updatedPublicationContent = publicationContent.replace(createHtml(roundNotificationData), '');
        setPublicationContent(updatedPublicationContent);
      });
    }
  }, [showNewPostModal, setRoundNotificationData, editor]);

  useEffect(() => {
    const prevQuadraticRound = prevQuadraticRoundRef;
    let localNotificationKeys = notificationKeys;
    if (selectedQuadraticRound.id !== prevQuadraticRound.current) {
      let roundNotificationText: string;
      if (selectedQuadraticRound.id !== '' && !editor.getEditorState().isEmpty()) {
        roundNotificationText = `This post is included in the ${selectedQuadraticRound.name} round (${selectedQuadraticRound.id}) on Quadratic Lenster`;

        setRoundNotificationData(roundNotificationText);

        editor.update(() => {
          const root = $getRoot();
          const contentNodes = root.getAllTextNodes();

          //see if nodes contain required text
          let userEnteredNodes = contentNodes.filter((node) => {
            for (const requirement of selectedQuadraticRound.requirements) {
              if (
                node.getTextContent().includes(requirement) &&
                localNotificationKeys.indexOf(node.getKey()) < 0
              ) {
                console.log('user node');
                return true;
              }
              return false;
            }
          });

          //if node contains required text add node key to notification array.
          if (userEnteredNodes) {
            const userNodeKeys = userEnteredNodes.map((node) => node.getKey());
            localNotificationKeys.push(...userNodeKeys);
            setNotificationKeys(localNotificationKeys);
          }
          const currentNotificationNodes = findNodes(contentNodes, localNotificationKeys);
          console.log('current nodes', currentNotificationNodes);
          if (currentNotificationNodes.length > 0 && userEnteredNodes.length > 0) {
            console.log('current and user');
            for (const node of currentNotificationNodes) {
              if (!userEnteredNodes.map((userNode) => userNode.getKey()).includes(node.getKey())) {
                node.remove(false);
              }
            }
          } else if (currentNotificationNodes.length > 0 && userEnteredNodes.length == 0) {
            console.log('current no user');
            const newRequirements = selectedQuadraticRound.requirements.map((req) =>
              $createHashtagNode(req).setMode('token')
            );
            for (let i = 0; i < currentNotificationNodes.length; i++) {
              if (i < selectedQuadraticRound.requirements.length && currentNotificationNodes.length > i) {
                console.log('replace');
                localNotificationKeys.push(newRequirements[i].getKey());
                currentNotificationNodes[i].replace(newRequirements[i]);
              } else {
                console.log('remove');
                currentNotificationNodes[i].remove(false);
              }
            }
            setNotificationKeys(localNotificationKeys);
          } else {
            const newNotifications = selectedQuadraticRound.requirements.map((req) =>
              $createHashtagNode(req).setMode('token')
            );
            localNotificationKeys.push(...newNotifications.map((note) => note.getKey()));
            root.append($createParagraphNode().append(...newNotifications));
            setNotificationKeys(localNotificationKeys);
          }

          // for (let i = 0; i < 1; i++) {
          //   const emptyParagraph = $createParagraphNode();
          //   root.append(emptyParagraph);
          // }

          toast.success(`Post added to ${selectedQuadraticRound.name}!`);
        });
      } else {
        editor.update(() => {
          console.log('else');
          const textNodes = $getRoot().getAllTextNodes();
          for (const node of textNodes) {
            if (
              notificationKeys.find((key: string) => {
                if (key) {
                  return key == node.getKey();
                }
              }) ||
              prevQuadraticRequirementsRef.current.includes(node.getTextContent())
            ) {
              node.remove();
            }
          }
          setNotificationKeys([]);
        });
      }
      prevQuadraticRoundRef.current = selectedQuadraticRound.id;
      prevQuadraticRequirementsRef.current = selectedQuadraticRound.requirements;
    }
  }, [
    selectedQuadraticRound,
    editor,
    publicationContent,
    setPublicationContent,
    notificationKeys,
    setNotificationKeys,
    setRoundNotificationData
  ]);

  return (
    <div className="relative">
      <EmojiPickerPlugin />
      <ToolbarPlugin />
      <RichTextPlugin
        contentEditable={<ContentEditable className="my-4 block min-h-[65px] overflow-auto px-5" />}
        placeholder={
          <div className="pointer-events-none absolute top-[65px] whitespace-nowrap px-5 text-gray-400">
            <Trans>What's happening?</Trans>
          </div>
        }
        ErrorBoundary={() => <div>{Errors.SomethingWentWrong}</div>}
      />

      <OnChangePlugin
        onChange={(editorState) => {
          editorState.read(() => {
            const markdown = $convertToMarkdownString(TRANSFORMERS);
            setPublicationContent(markdown);
          });
        }}
      />
      <EmojisPlugin />
      <LexicalAutoLinkPlugin />
      <HistoryPlugin />
      <HashtagPlugin />
      <MentionsPlugin />
      <ImagesPlugin onPaste={handlePaste} />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
    </div>
  );
};

export default Editor;
