import { normalizeChatAppearance, type ChatAppearance } from "@/lib/chat-appearance";

export function ChatAppearanceStyle({ config, scope = ".classic-chat" }: { config: ChatAppearance; scope?: ".classic-chat" | ".chat-editor-preview" }) {
  const c = normalizeChatAppearance(config);
  return <style>{`${scope}{--chat-paper:${c.paper};--chat-ink:${c.ink};--chat-steel:${c.steel};--chat-edge:${c.edge};--chat-name:${c.name};--chat-font:${c.fontSize}px;--chat-avatar:${c.avatarSize}px;--chat-icon:${c.iconSize}px;--chat-radius:${c.radius}px;--chat-sidebar-width:${c.sidebarWidth}px}
${scope} .classic-chat-frame,${scope} .classic-chat-messages{border-radius:var(--chat-radius)}
${scope} .classic-chat-body{font-size:var(--chat-font)}
${scope} .classic-chat-avatar{width:var(--chat-avatar);height:var(--chat-avatar)}
${scope} .classic-chat-actions svg,${scope} .classic-chat-tabs svg{width:var(--chat-icon);height:var(--chat-icon)}
${scope} .classic-chat-actions button>span{font-size:var(--chat-icon)}
${scope} .classic-chat-smile svg{width:calc(var(--chat-icon) * 1.5);height:calc(var(--chat-icon) * 1.5)}
${scope} .classic-chat-smile>span{font-size:calc(var(--chat-icon) * 1.5)}
${scope} .classic-chat-messages{color:var(--chat-ink)}
${scope} .classic-chat-message-meta b{color:var(--chat-name)}
${!c.showRoses ? `${scope} .classic-chat-masthead img{visibility:hidden}` : ""}
${!c.showAvatars ? `${scope} .classic-chat-avatar{display:none}` : ""}
${!c.showSidebar ? `${scope} .classic-chat-sidebar{display:none}${scope} .classic-chat-workspace{grid-template-columns:minmax(0,1fr)!important}` : ""}
${scope} .classic-chat-workspace{height:auto;${c.showSidebar ? `grid-template-columns:minmax(0,1fr) clamp(20%,${c.sidebarWidth}px,25%);` : ""}}
${scope}.classic-chat-page,${scope}.classic-chat-bare,${scope}{width:100%!important;max-width:min(100%,${c.frameWidth}px)!important;margin-inline:auto!important}
${scope} .classic-chat-frame{height:min(${c.frameHeight}px,calc(100svh - 60px))!important;max-height:none!important;min-height:0!important;aspect-ratio:auto!important}
${scope} .classic-chat-workspace{flex:1 1 0;min-height:0}
@media(max-width:640px){${scope} .classic-chat-workspace{height:auto}${scope} .classic-chat-body{font-size:min(var(--chat-font),18px)}${scope} .classic-chat-avatar{width:min(var(--chat-avatar),40px);height:min(var(--chat-avatar),40px)}}`}</style>;
}