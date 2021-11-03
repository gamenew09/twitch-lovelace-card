/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LitElement,
  html,
  TemplateResult,
  css,
  PropertyValues,
  CSSResultGroup,
} from 'lit';
import { customElement, property, state } from "lit/decorators";
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
  computeStateDisplay,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers


import './editor';

import type { TwitchCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';

/* eslint no-console: 0 */
console.info(
  `%c  TWITCH-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'twitch-card',
  name: 'Twitch Card',
  description: 'A template custom card for you to create something awesome',
});

interface TwitchSensorAttributes {
  channel_views: number;
  followers: number;
  following: boolean;
  following_since: null | string; // DateTime
  subscribed: boolean;
  subscription_is_gifted: boolean;

  title?: string;
  game?: string;
  viewers?: number;
}

@customElement('twitch-card')
export class TwitchCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('twitch-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: TwitchCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: TwitchCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      ...config,
    };
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    if (this.config.entity === undefined) {
      return this._showError(localize('common.no_entity_selected'));
    }

    const matchEnts = Object.keys(this.hass.states).filter((entName) => entName === this.config.entity);

    if(matchEnts[0] === undefined) {
      return this._showError(localize('common.no_entity_selected'));
    }

    const entName = matchEnts[0];
    const state = this.hass.states[entName];
    const attributes = state.attributes as (HomeAssistant["states"][typeof entName]["attributes"] & TwitchSensorAttributes);

    console.log(attributes);

    if(state === undefined) {
      return this._showError(localize('common.no_entity_selected'));
    }

    const isStreaming = state.state === "streaming";

    return html`
      <ha-card
        tabindex="0"
      >
        <div class="card-content">
          <div class="twitch-upper">
            <state-badge
              class="pointer"
              .hass=${this.hass}
              .stateObj=${state}
              @action=${this._handleAction}
              .actionHandler=${actionHandler({
                hasHold: hasAction(this.config.hold_action),
                hasDoubleClick: hasAction(this.config.double_tap_action),
              })}
              tabindex="0"></state-badge>
            <span id="twitch-display-name">${this.config.name ?? state.attributes.friendly_name ?? this.config.entity}</span>
            <span id="twitch-live-indicator" class="${isStreaming ? "live" : ""}"></span>
            <mwc-button 
              @action=${this._handleAction}
              .actionHandler=${actionHandler({
                hasHold: hasAction(this.config.hold_action),
                hasDoubleClick: hasAction(this.config.double_tap_action),
              })}
            >${localize('common.' + (isStreaming ? "live_open_stream" : "offline_open_stream"))}</mwc-button>
          </div>
          ${isStreaming ? html`
          <hr>
          <div class="twitch-lower">
              <!-- Change thumbnail image, temp for now. -->
              <img class="twitch-stream-thumbnail" src="https://static-cdn.jtvnw.net/previews-ttv/live_user_${state.attributes.friendly_name?.toLowerCase() ?? ""}-440x248.jpg"></img>
              <div class="twitch-info">
                <div id="twitch-title">${attributes.title}</div>
                <div id="twitch-game" class="secondary">${attributes.game ?? ""}</div>
                <div id="twitch-viewers" class="secondary">${attributes.viewers ?? "0"} viewers</div>
              </div>
          </div>
          `: ""}
        </div>
      </ha-card>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      if(ev.detail.action === "tap" && this.config.tap_action === undefined) {
        const matchEnts = Object.keys(this.hass.states).filter((entName) => entName === this.config.entity);

      if(matchEnts[0] !== undefined) {
        const entName = matchEnts[0];
        const state = this.hass.states[entName];
        if(state.attributes.friendly_name) {
          window.open(`https://twitch.tv/${state.attributes.friendly_name}`);
        } else {
          console.warn(`Could not find Twitch Username for ${state.entity_id}`);
        }
      }

      } else {
        handleAction(this, this.hass, this.config, ev.detail.action);
      }
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html`
      <hui-warning>${warning}</hui-warning>
    `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html`
      ${errorCard}
    `;
  }

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return css`
    .twitch-upper {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
    }
    .twitch-upper > mwc-button {
      margin-left: auto;
    }
    state-badge {
      flex: 0 0 40px;
    }
    #twitch-live-indicator {
      height: 10px;
      width: 10px;
      background-color: #393939;
      border-radius: 50%;
      display: inline-block;
      margin: 0em 0px 0px 0.4em;
      flex: 0 0 10px;
    }
    .live {
      background-color: #FF0000 !important;
    }
    #twitch-display-name {
      color: var(--ha-card-header-color, --primary-text-color);
      font-family: var(--ha-card-header-font-family,);
      font-size: 20px;
      margin: 0em 0px 0px 0.4em;
      flex: 0 0 20px;
      display: inline-block;
    }

    .twitch-lower {
      display: flex;
    }

    .twitch-stream-thumbnail {
      flex: 0 0 155PX;
      height: 87px;
    }
    .twitch-info {
      margin: 0px 0px 0px 1em;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    #twitch-title {
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2; /* number of lines to show */
              line-clamp: 2; 
      -webkit-box-orient: vertical;

      font-size: 14px;
    }

    .secondary {
      color: #9F9F9F;
    }

    hr {
      border-top: 1px solid #9F9F9F;
    }

    `;
  }
}
