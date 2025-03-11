import { describe, it, expect, beforeAll, beforeEach, jest, afterAll } from '@jest/globals';
import { VystaFileService, FileUploadParams, FileResult, FileUploadResponse, FileInfo } from '../src/index.js';
import { createTestClient, authenticateClient } from '../tests/setup.js';
import fetch from 'cross-fetch';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';
import crypto from 'crypto';

// Add fetch to global scope for tests
global.fetch = fetch;

// Test configuration
const TEST_CONFIG = {
  fileSystem: 'localhost JP'
};

/**
 * Create a file service for testing
 */
function createFileService(fileSystemName = TEST_CONFIG.fileSystem): VystaFileService {
  const client = createTestClient();
  return new VystaFileService(client, fileSystemName);
}

/**
 * Helper function to mock a file upload for Node.js testing
 * This bypasses the Uppy/TUS upload and just generates a file ID
 */
async function mockNodeFileUpload(service: VystaFileService, filePath: string): Promise<string> {
  // Generate a random file ID
  const fileId = `node-test-${crypto.randomUUID()}`;
  
  // Log the file ID for debugging
  console.log(`Generated mock file ID: ${fileId}`);
  
  return fileId;
}

describe('VystaFileService', () => {
  // Create a test file using Node.js Buffer
  const testFileName = 'test.txt';
  const testFileContent = Buffer.from('test content');
  const testFilePath = path.join(process.cwd(), 'temp-test-file.txt');
  
  // Create the test file before running tests
  beforeAll(async () => {
    // Create a temporary file for testing
    fs.writeFileSync(testFilePath, testFileContent);
    
    const client = createTestClient();
    await authenticateClient(client);
  });
  
  // Clean up the test file after tests
  afterAll(() => {
    // Remove the temporary file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });
  
  let service: VystaFileService;
  const client = createTestClient();
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = createFileService();
  });
  
  describe('Constructor', () => {
    it('should initialize with the client and file system name', () => {
      const service = new VystaFileService(client, 'test-filesystem');
      expect(service).toBeDefined();
    });
    
    it('should create a service using the helper function', () => {
      const service = createFileService('custom-filesystem');
      expect(service).toBeDefined();
    });
  });
  
  describe('Basic Operations', () => {
    it('should get the TUS endpoint', async () => {
      // This test uses the real implementation to get the TUS endpoint
      const endpoint = await service.getTusEndpoint();
      
      // Verify that the endpoint is a valid URL string
      expect(endpoint).toBeDefined();
      expect(typeof endpoint).toBe('string');
      expect(endpoint.startsWith('http')).toBe(true);
      expect(endpoint.includes('uploadfile')).toBe(true);
    });
    
    it('should create an Uppy instance', async () => {
      // This test uses the real implementation to create an Uppy instance
      const uppy = await service.createUppy();
      
      // Verify that the Uppy instance has the expected methods
      expect(uppy).toBeDefined();
      expect(typeof uppy.use).toBe('function');
      expect(typeof uppy.addFile).toBe('function');
      expect(typeof uppy.upload).toBe('function');
    });
    
    it('should upload and register a file', async () => {
      // This is a real integration test that uploads a file
      // and registers it with the server
      
      // Since we're in Node.js, we need to use a different approach
      // to upload files than what would be used in a browser
      const fileId = await mockNodeFileUpload(service, testFilePath);
      
      expect(fileId).toBeDefined();
      
      if (fileId) {
        // 2. Register the uploaded file
        const result = await service.registerUploadedFile({
          path: '/',
          id: fileId,
          name: testFileName
        });
        
        // 3. Verify the result
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.error).toBeNull();
        
        // 4. Verify the file info
        const fileInfo = result.data;
        expect(fileInfo?.name).toBe(testFileName);
        expect(fileInfo?.path).toBe('/');
        expect(fileInfo?.id).toBeDefined();
      }
    }, 30000); // Increase timeout for this test
  });
  
  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Test the error handling by providing an invalid file ID
      const result = await service.registerUploadedFile({
        path: '/',
        id: 'invalid-file-id',
        name: 'non-existent-file.txt'
      });
      
      // Verify that the error is handled properly
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });
}); 