import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react'

interface EmojiStickerPickerProps {
  onSelect: (emoji: string) => void
}

export function EmojiStickerPicker({ onSelect }: EmojiStickerPickerProps) {
  return (
    <EmojiPicker
      autoFocusSearch={false}
      className="emoji-picker"
      emojiStyle={EmojiStyle.NATIVE}
      height={360}
      lazyLoadEmojis
      onEmojiClick={({ emoji }) => onSelect(emoji)}
      previewConfig={{ showPreview: false }}
      theme={Theme.LIGHT}
      width="100%"
    />
  )
}
