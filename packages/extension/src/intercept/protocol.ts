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
  expectedText?: string;
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
  ok?: boolean;
}

export interface PageHookFileAttachmentBlocked {
  channel: typeof PS_CHANNEL;
  dir: 'main-to-iso';
  type: 'file-attachment-blocked';
}

export interface PageHookReplaceDraft {
  channel: typeof PS_CHANNEL;
  dir: 'iso-to-main';
  type: 'replace-draft';
  requestId: string;
  text: string;
  expectedText: string;
}

export interface PageHookDraftReplaced {
  channel: typeof PS_CHANNEL;
  dir: 'main-to-iso';
  type: 'draft-replaced';
  requestId: string;
  ok: boolean;
}

export interface PageHookFileUploadSelected {
  channel: typeof PS_CHANNEL;
  dir: 'main-to-iso';
  type: 'file-upload-selected';
  requestId: string;
  files: File[];
}

export interface PageHookFileUploadStatus {
  channel: typeof PS_CHANNEL;
  dir: 'main-to-iso';
  type: 'file-upload-expired' | 'file-upload-replay-failed';
  requestId: string;
}

export interface PageHookFileUploadDecision {
  channel: typeof PS_CHANNEL;
  dir: 'iso-to-main';
  type: 'file-upload-decision';
  requestId: string;
  allow: boolean;
}

export type IsoToMain = PageHookConfigure | PageHookEnable | PageHookAllowSend | PageHookReplaceDraft | PageHookFileUploadDecision;
export type MainToIso = PageHookReady | PageHookSendAttempt | PageHookAllowSendAck | PageHookFileAttachmentBlocked |
  PageHookDraftReplaced | PageHookFileUploadSelected | PageHookFileUploadStatus;

export function isVeiloMessage(data: unknown): data is IsoToMain | MainToIso {
  return Boolean(
    data &&
      typeof data === 'object' &&
      (data as { channel?: string }).channel === PS_CHANNEL,
  );
}
