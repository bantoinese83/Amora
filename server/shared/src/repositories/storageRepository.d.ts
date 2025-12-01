/**
 * Data Access Layer - Storage Repository
 * Abstracts localStorage operations to separate data access from business logic
 */
export declare class StorageRepository {
    private static instance;
    private constructor();
    static getInstance(): StorageRepository;
    get<T>(key: string): T | null;
    set<T>(key: string, value: T): void;
    remove(key: string): void;
    getString(key: string): string | null;
    setString(key: string, value: string): void;
}
export declare const storageRepository: StorageRepository;
//# sourceMappingURL=storageRepository.d.ts.map