import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ApiError, getAuthHeaders, NativeUploadFile } from './api';
import { getApiBase } from './appConfig';
import { invalidateFor } from './query';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export interface UploadedFile { fileId: string; fileName: string; fileSize: number; mimeType: string }
export interface TransferOptions { signal?: AbortSignal; onProgress?: (ratio: number) => void; retries?: number }

function validate(file: NativeUploadFile) {
  if (file.size && file.size > MAX_UPLOAD_BYTES) throw new ApiError('This file is larger than 25 MB. Choose a smaller file.', 413);
}

function parse(body: string, status: number): UploadedFile {
  let data: any = {};
  try { data = JSON.parse(body); } catch { /* server returned plain text */ }
  if (status < 200 || status >= 300) throw new ApiError(data.error || `Upload failed (${status}).`, status);
  invalidateFor('/documents');
  return data as UploadedFile;
}

async function nativeUpload(file: NativeUploadFile, options: TransferOptions): Promise<UploadedFile> {
  const task = FileSystem.createUploadTask(`${getApiBase()}/files/upload`, file.uri, {
    httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file', mimeType: file.mimeType || 'application/octet-stream', headers: getAuthHeaders(false),
  }, ({ totalBytesSent, totalBytesExpectedToSend }) => options.onProgress?.(totalBytesExpectedToSend > 0 ? totalBytesSent / totalBytesExpectedToSend : 0));
  const cancel = () => { void task.cancelAsync(); };
  options.signal?.addEventListener('abort', cancel, { once: true });
  try {
    const result = await task.uploadAsync();
    if (!result) throw new ApiError('Upload was cancelled.', 0);
    options.onProgress?.(1);
    return parse(result.body, result.status);
  } finally { options.signal?.removeEventListener('abort', cancel); }
}

async function webUpload(file: NativeUploadFile, options: TransferOptions): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open('POST', `${getApiBase()}/files/upload`);
    Object.entries(getAuthHeaders(false)).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => options.onProgress?.(event.lengthComputable ? event.loaded / event.total : 0);
    xhr.onerror = () => reject(new ApiError('Upload failed because the connection was interrupted.', 0));
    xhr.onload = () => { try { resolve(parse(xhr.responseText, xhr.status)); } catch (error) { reject(error); } };
    const cancel = () => { xhr.abort(); reject(new ApiError('Upload was cancelled.', 0)); };
    options.signal?.addEventListener('abort', cancel, { once: true });
    fetch(file.uri).then((response) => response.blob()).then((blob) => {
      const body = new FormData(); body.append('file', blob, file.name); xhr.send(body);
    }).catch(reject);
  });
}

export async function uploadWithProgress(file: NativeUploadFile, options: TransferOptions = {}): Promise<UploadedFile> {
  validate(file);
  const attempts = (options.retries ?? 1) + 1;
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await (Platform.OS === 'web' ? webUpload(file, options) : nativeUpload(file, options)); }
    catch (error) {
      last = error;
      if (options.signal?.aborted || (error instanceof ApiError && error.status > 0 && error.status < 500)) throw error;
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw last instanceof Error ? last : new ApiError('Upload failed. Try again.', 0);
}
