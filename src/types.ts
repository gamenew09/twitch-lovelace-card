import { ActionConfig, BaseActionConfig, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'twitch-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}

interface OpenTwitchChannelAction extends BaseActionConfig {
  action: "twitch-channel-page";
}

// TODO Add your configuration elements here for type-checking
export interface TwitchCardConfig extends LovelaceCardConfig {
  type: string;
  name?: string;
  entity?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}
