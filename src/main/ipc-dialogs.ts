import {
  BrowserWindow,
  dialog,
  type IpcMainInvokeEvent,
  type OpenDialogOptions,
  type SaveDialogOptions
} from 'electron';

export function safeFileStem(value: string): string {
  const stem = value
    .normalize('NFKD')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 90);

  return stem || 'hedef-gorunurlugu-deneyi';
}

function parentWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

export async function showSaveDialog(
  event: IpcMainInvokeEvent,
  options: SaveDialogOptions
) {
  const owner = parentWindow(event);
  return owner
    ? dialog.showSaveDialog(owner, options)
    : dialog.showSaveDialog(options);
}

export async function showOpenDialog(
  event: IpcMainInvokeEvent,
  options: OpenDialogOptions
) {
  const owner = parentWindow(event);
  return owner
    ? dialog.showOpenDialog(owner, options)
    : dialog.showOpenDialog(options);
}
