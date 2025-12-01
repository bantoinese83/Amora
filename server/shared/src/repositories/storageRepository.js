/**
 * Data Access Layer - Storage Repository
 * Abstracts localStorage operations to separate data access from business logic
 */
export class StorageRepository {
    static instance;
    constructor() { }
    static getInstance() {
        if (!StorageRepository.instance) {
            StorageRepository.instance = new StorageRepository();
        }
        return StorageRepository.instance;
    }
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            console.error(`Failed to get item from storage: ${key}`, error);
            return null;
        }
    }
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch (error) {
            console.error(`Failed to set item in storage: ${key}`, error);
        }
    }
    remove(key) {
        try {
            localStorage.removeItem(key);
        }
        catch (error) {
            console.error(`Failed to remove item from storage: ${key}`, error);
        }
    }
    getString(key) {
        try {
            return localStorage.getItem(key);
        }
        catch (error) {
            console.error(`Failed to get string from storage: ${key}`, error);
            return null;
        }
    }
    setString(key, value) {
        try {
            localStorage.setItem(key, value);
        }
        catch (error) {
            console.error(`Failed to set string in storage: ${key}`, error);
        }
    }
}
export const storageRepository = StorageRepository.getInstance();
//# sourceMappingURL=storageRepository.js.map