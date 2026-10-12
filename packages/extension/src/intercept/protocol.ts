/** Cross-world message channel. Isolated content script <-> MAIN-world page hook. */
export const PS_CHANNEL = '__VEILO__';

export type SendVia = 'enter' | 'click' | 'submit';

export interface PageHookConfigure {
  channel: typeof PS_CHANNEL;
  dir: 'iso-to-main';
  type: 'configure';
  composerSelectors: string[];
  sendButtonSelectors: string[];
}

export interface PageHookEnable {
  channel: typeof PS_CHANNEL;
  dir: 'iso-to-main';
  type: 'enable' | 'disable';
}

export interface PageHookAllowSend {
  channel: typeof PS_CHANNEL;
  dir: 'iso-to-main';
  type: 'allow-send';
  via: SendVia;
}

export interface PageHookReady {
  channel: typeof PS_CHANNEL;
  dir: 'main-to-iso';
  type: 'page-hook-ready';
}

export interface PageHookSendAttempt {
  channel: typeof PS_CHANNEL;
  dir: 'main-to-iso';
  type: 'send-attempt';
  via: SendVia;
}

export interface PageHookAllowSendAck {
  channel: typeof PS_CHANNEL;
  dir: 'main-to-iso';
  type: 'allow-send-ack';
}

export interface PageHookFileAttachmentBlocked {
  channel: typeof PS_CHANNEL;
  dir: 'main-to-iso';
  type: 'file-attachment-blocked';
}

export type IsoToMain = PageHookConfigure | PageHookEnable | PageHookAllowSend;
export type MainToIso = PageHookReady | PageHookSendAttempt | PageHookAllowSendAck | PageHookFileAttachmentBlocked;

export function isVeiloMessage(data: unknown): data is IsoToMain | MainToIso {
  return Boolean(
    data &&
      typeof data === 'object' &&
      (data as { channel?: string }).channel === PS_CHANNEL,
  );
}
