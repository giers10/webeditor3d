const PROJECT_ASSET_DATABASE_NAME = "webeditor3d-project-assets";
const PROJECT_ASSET_DATABASE_VERSION = 1;
const PROJECT_ASSET_OBJECT_STORE_NAME = "assets";
function cloneArrayBuffer(bytes) {
    return bytes.slice(0);
}
function cloneFileRecord(file) {
    return {
        bytes: cloneArrayBuffer(file.bytes),
        mimeType: file.mimeType
    };
}
export function cloneProjectAssetStorageRecord(record) {
    const files = {};
    for (const [path, file] of Object.entries(record.files)) {
        files[path] = cloneFileRecord(file);
    }
    return {
        files
    };
}
function isObject(value) {
    return value !== null && typeof value === "object";
}
function isLegacyProjectAssetStorageRecord(value) {
    return (isObject(value) &&
        value.bytes instanceof ArrayBuffer &&
        typeof value.mimeType === "string");
}
function isProjectAssetStoragePackageRecord(value) {
    if (!isObject(value) || !isObject(value.files)) {
        return false;
    }
    return Object.values(value.files).every((entry) => {
        return (isObject(entry) &&
            entry.bytes instanceof ArrayBuffer &&
            typeof entry.mimeType === "string");
    });
}
function normalizeStoredAssetRecord(storageKey, value) {
    if (isProjectAssetStoragePackageRecord(value)) {
        return cloneProjectAssetStorageRecord(value);
    }
    if (isLegacyProjectAssetStorageRecord(value)) {
        return {
            files: {
                [storageKey]: cloneFileRecord(value)
            }
        };
    }
    return null;
}
function getErrorDetail(error) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message.trim();
    }
    return "Unknown error.";
}
function formatDiagnostic(prefix, error) {
    return `${prefix} ${getErrorDetail(error)}`;
}
function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.addEventListener("success", () => {
            resolve(request.result);
        });
        request.addEventListener("error", () => {
            reject(request.error ?? new Error("IndexedDB request failed."));
        });
    });
}
function openIndexedDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(PROJECT_ASSET_DATABASE_NAME, PROJECT_ASSET_DATABASE_VERSION);
        request.addEventListener("upgradeneeded", () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(PROJECT_ASSET_OBJECT_STORE_NAME)) {
                database.createObjectStore(PROJECT_ASSET_OBJECT_STORE_NAME);
            }
        });
        request.addEventListener("success", () => {
            resolve(request.result);
        });
        request.addEventListener("error", () => {
            reject(request.error ?? new Error("IndexedDB open failed."));
        });
    });
}
class IndexedDbProjectAssetStorage {
    databasePromise;
    constructor(databasePromise) {
        this.databasePromise = databasePromise;
    }
    async withStore(mode, callback) {
        const database = await this.databasePromise;
        const transaction = database.transaction(PROJECT_ASSET_OBJECT_STORE_NAME, mode);
        const store = transaction.objectStore(PROJECT_ASSET_OBJECT_STORE_NAME);
        const result = await promisifyRequest(callback(store));
        await new Promise((resolve, reject) => {
            transaction.addEventListener("complete", () => resolve());
            transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")));
            transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB transaction aborted.")));
        });
        return result;
    }
    async getAsset(storageKey) {
        const database = await this.databasePromise;
        const transaction = database.transaction(PROJECT_ASSET_OBJECT_STORE_NAME, "readonly");
        const store = transaction.objectStore(PROJECT_ASSET_OBJECT_STORE_NAME);
        const result = await promisifyRequest(store.get(storageKey));
        return normalizeStoredAssetRecord(storageKey, result);
    }
    async putAsset(storageKey, asset) {
        await this.withStore("readwrite", (store) => store.put(cloneProjectAssetStorageRecord(asset), storageKey));
    }
    async deleteAsset(storageKey) {
        await this.withStore("readwrite", (store) => store.delete(storageKey));
    }
}
class InMemoryProjectAssetStorage {
    values = new Map();
    constructor(initialValues = {}) {
        for (const [storageKey, asset] of Object.entries(initialValues)) {
            this.values.set(storageKey, cloneStoredAsset(asset));
        }
    }
    async getAsset(storageKey) {
        const asset = this.values.get(storageKey);
        if (asset === undefined) {
            return null;
        }
        return normalizeStoredAssetRecord(storageKey, asset);
    }
    async putAsset(storageKey, asset) {
        this.values.set(storageKey, cloneProjectAssetStorageRecord(asset));
    }
    async deleteAsset(storageKey) {
        this.values.delete(storageKey);
    }
}
function cloneStoredAsset(asset) {
    if (isLegacyProjectAssetStorageRecord(asset)) {
        return cloneFileRecord(asset);
    }
    return cloneProjectAssetStorageRecord(asset);
}
export function createInMemoryProjectAssetStorage(initialValues = {}) {
    return new InMemoryProjectAssetStorage(initialValues);
}
export async function getBrowserProjectAssetStorageAccess() {
    if (typeof window === "undefined") {
        return {
            storage: null,
            diagnostic: null
        };
    }
    if (typeof indexedDB === "undefined") {
        return {
            storage: null,
            diagnostic: "IndexedDB is unavailable in this browser environment."
        };
    }
    try {
        const databasePromise = openIndexedDb();
        await databasePromise;
        return {
            storage: new IndexedDbProjectAssetStorage(databasePromise),
            diagnostic: null
        };
    }
    catch (error) {
        return {
            storage: null,
            diagnostic: formatDiagnostic("Project asset storage could not be opened.", error)
        };
    }
}
