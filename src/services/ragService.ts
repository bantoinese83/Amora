import { GoogleGenAI } from '@google/genai';
import { cacheRepository } from '../repositories/cacheRepository';

export class RagService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API_KEY is required');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async indexDocument(file: File, onProgress: (status: string) => void): Promise<string> {
    try {
      // 1. Check Cache
      const cachedStoreName = cacheRepository.getCachedStore(file);
      if (cachedStoreName) {
        onProgress('Loading your notes...');
        // Verify store still exists (optional optimization: skip this check for max speed,
        // but checking ensures robustness if deleted externally)
        // For "instant" feel, we trust the cache and let the session fail if invalid.
        await new Promise(resolve => setTimeout(resolve, 600)); // Artificial delay for UX smoothness
        return cachedStoreName;
      }

      onProgress('Setting up...');

      // 2. Create Store first
      const store = await this.ai.fileSearchStores.create({
        config: { displayName: `Amora Context - ${file.name.slice(0, 20)}` },
      });

      if (!store.name) {
        throw new Error('Failed to create store');
      }

      onProgress('Uploading your document...');

      // 3. Upload file first (creates a File resource)
      const uploadResponse = await this.ai.files.upload({
        file: file,
        config: { displayName: file.name },
      });

      const fileResourceName = uploadResponse.name;

      if (!fileResourceName) {
        console.error('Upload Response:', uploadResponse);
        throw new Error('File upload failed: No file resource name returned.');
      }

      onProgress('Processing your document...');

      // 4. Import the uploaded file into the File Search Store
      let op = await this.ai.fileSearchStores.importFile({
        fileSearchStoreName: store.name,
        fileName: fileResourceName,
      });

      // 5. Optimized Polling (Adaptive)
      // Start fast (500ms) to catch small files quickly, then back off.
      let delay = 500;
      while (!op.done) {
        await new Promise(resolve => setTimeout(resolve, delay));
        op = await this.ai.operations.get({ operation: op });
        onProgress('Almost done...');

        // Increase delay up to 2 seconds
        if (delay < 2000) delay *= 1.5;
      }

      // 6. Cache the result
      cacheRepository.setCachedStore(file, store.name);

      onProgress('Ready');
      return store.name; // Return the store name (resource ID)
    } catch (error) {
      console.error('RAG Indexing Error:', error);
      throw error;
    }
  }

  async deleteStore(storeName: string) {
    try {
      await this.ai.fileSearchStores.delete({
        name: storeName,
        config: { force: true },
      });

      // Note: We can't easily clean specific cache entries by value without iteration,
      // but they will expire naturally.
    } catch (error) {
      console.warn('Failed to delete store:', error);
    }
  }
}
