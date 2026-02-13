import { FormEvent, useState } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

type Props = {
  content: string;
  maxLength: number;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  error: string;
};

export const MessageComposer = ({ content, maxLength, disabled, onChange, onSubmit, error }: Props) => {
  const [showPicker, setShowPicker] = useState(false);

  const onEmoji = (emojiData: EmojiClickData) => {
    onChange((content + emojiData.emoji).slice(0, maxLength));
  };

  return (
    <form onSubmit={onSubmit} className="composer">
      <div className="composer-col">
        <div className="composer-row">
          <input
            value={content}
            onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
            placeholder="Écrire un message..."
          />
          <button type="button" className="ghost emoji-btn" onClick={() => setShowPicker((v) => !v)} data-tooltip="Ouvrir le picker d'émojis">
            😊
          </button>
        </div>
        {showPicker && (
          <div className="emoji-popover">
            <EmojiPicker theme="dark" onEmojiClick={onEmoji} />
          </div>
        )}
        <small>{content.length}/{maxLength}</small>
        {error && <small className="error">{error}</small>}
      </div>
      <button disabled={disabled || !content.trim()} data-tooltip="Envoyer le message">Envoyer</button>
    </form>
  );
};
