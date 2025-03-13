import Uppy from '@uppy/core';
import Tus from '@uppy/tus';
import {VystaClient} from "./VystaClient";

// Define the FileInfo interface if it's not exported from filesystem
export interface FileInfo {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  modifiedOn?: string;
  size?: number;
}

export interface FileUploadResponse extends FileInfo {
  error?: {
    message: string;
    type?: string;
    trace?: string[];
  };
}

export interface FileUploadParams {
  path: string;
  id: string;
  name: string;
}

export interface FileResult<T> {
  data: T | null;
  error: Error | null;
  success: boolean;
}

export interface TusUploadOptions {
  endpoint?: string;
  retryDelays?: number[];
  chunkSize?: number;
  limit?: number;
  headers?: Record<string, string>;
  allowedFileTypes?: string[] | null;
}

export interface TusXhrOptions {
  endpoint: string;
  headers: {
    Authorization: string;
  };
}

/**
 * Service for handling file operations with the Vysta API
 */
export class VystaFileService {
  private client: VystaClient;
  private fileSystemName: string;
  private debug: boolean;

  /**
   * Creates a new VystaFileService
   * @param client - The VystaClient instance to use for API calls
   * @param fileSystemName - The name of the file system to use
   * @param debug - Whether to log debug messages
   */
  constructor(client: VystaClient, fileSystemName: string, debug: boolean = false) {
    this.client = client;
    this.fileSystemName = fileSystemName;
    this.debug = debug;
  }

  /**
   * Logs a message if debug is enabled
   * @param message - The message to log
   * @param data - Optional data to log
   * @private
   */
  private log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[VystaFileService] ${message}`);
      if (data) {
        console.log(data);
      }
    }
  }

  /**
   * Gets the TUS endpoint URL
   * @returns The TUS endpoint URL
   */
  private async getTusEndpoint(): Promise<string> {
    const endpoint = this.client.getBackendUrl('rest/filesystem/uploadfile');
    this.log(`Using TUS endpoint: ${endpoint}`);
    return endpoint;
  }

  /**
   * Creates and configures an Uppy instance for file uploads
   * @param options - Options for configuring the TUS upload
   * @returns A configured Uppy instance
   */
  async createUppy(options?: TusUploadOptions): Promise<any> {
    // Get the TUS endpoint if not provided
    const endpoint = options?.endpoint || await this.getTusEndpoint();

    // Create an Uppy instance
    const uppy = new Uppy({
      id: 'file-upload',
      autoProceed: true,
      allowMultipleUploadBatches: false,
      debug: this.debug,
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: options?.allowedFileTypes || null
      }
    });
    
    // Add the TUS plugin with the provided options
    uppy.use(Tus, {
      endpoint,
      retryDelays: options?.retryDelays || [0, 1000, 3000, 5000],
      chunkSize: options?.chunkSize,
      limit: options?.limit || 1,
      headers: options?.headers
    });
    
    // Set up event handlers for logging
    uppy.on('upload-error', (file: any, error: any) => {
      this.log(`Upload error for file ${file?.name || 'unknown'}:`, error);
    });
    
    uppy.on('upload-success', (file: any, response: any) => {
      this.log(`Upload success for file ${file?.name || 'unknown'}:`, response);
      if (file) {
        this.log(`File ID: ${file.id}`);
      }
      this.log(`Upload URL: ${response.uploadURL}`);
    });
    
    return uppy;
  }

  /**
   * Registers an uploaded file with the server
   * @param params - The file upload parameters
   * @returns A promise that resolves to a FileResult containing the registered file info
   */
  async registerUploadedFile(params: FileUploadParams): Promise<FileResult<FileUploadResponse>> {
    try {
      const { path, id, name } = params;
      
      const apiPath = `rest/filesystem/${encodeURIComponent(this.fileSystemName)}/upload`;
      this.log(`Registering file with API path: ${apiPath}`);
      
      this.log(`Sending POST request to register file...`);
      
      const data = await this.client.adminRequest<FileUploadResponse>('POST', apiPath, {
        path,
        id,
        name
      });
      
      this.log(`Received register file response:`, data);
      
      return {
        data,
        error: null,
        success: true
      };
    } catch (error) {
      this.log('Error registering uploaded file', error);
      return this.handleError(error);
    }
  }

  /**
   * Handles errors from API calls
   * @param error - The error to handle
   * @returns A FileResult with the error
   * @private
   */
  private handleError(error: any): FileResult<any> {
    this.log('Error in VystaFileService', error);
    
    return {
      data: null,
      error: error instanceof Error ? error : new Error(error?.message || 'Unknown error'),
      success: false
    };
  }

  /**
   * Uploads a file using the TUS protocol
   * @param file - The file to upload
   * @param options - Options for configuring the TUS upload
   * @returns A promise that resolves to the file ID
   */
  async uploadFileTus(file: File, options?: TusUploadOptions): Promise<string | null> {
    try {
      this.log(`Uploading file ${file.name} using Tus protocol`);
      
      // Create an Uppy instance
      const uppy = await this.createUppy(options);
      
      // Add the file to Uppy
      uppy.addFile({
        name: file.name,
        type: file.type,
        data: file,
        meta: {
          fileSystemName: this.fileSystemName
        }
      });
      
      // Upload the file
      this.log('Starting file upload...');
      
      return new Promise<string>((resolve, reject) => {
        uppy.on('upload-success', (file: any, response: any) => {
          this.log('Upload successful', { file, response });
          if (file) {
            resolve(file.id);
          } else {
            reject(new Error('No file in upload success event'));
          }
        });
        
        uppy.on('upload-error', (file: any, error: any) => {
          this.log('Upload failed', { file, error });
          reject(error);
        });
        
        uppy.upload();
      });
    } catch (error) {
      this.log(`Error uploading file with Tus: ${error}`);
      return null;
    }
  }

  /**
   * Gets the TUS XHR options with authentication headers
   * @returns A promise that resolves to TUS XHR options
   */
  async getTusXhrOptions(): Promise<TusXhrOptions> {
    const endpoint = await this.getTusEndpoint();
    const headers = await this.client['auth'].getAuthHeaders();
    
    return {
      endpoint,
      headers: {
        Authorization: (headers as Record<string, string>)['authorization']
      }
    };
  }
}
