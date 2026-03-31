export interface ProjectAssetStorageFileRecord {
  bytes: ArrayBuffer;
  mimeType: string;
}

export interface ProjectAssetStoragePackageRecord {
  files: Record<string, ProjectAssetStorageFileRecord>;
}

export type ProjectAssetStorageRecord = ProjectAssetStoragePackageRecord;
type LegacyProjectAssetStorageRecord = ProjectAssetStorageFileRecord;
type ProjectAssetStorageStoredValue = ProjectAssetStorageRecord | LegacyProjectAssetStorageRecord;

export interface ProjectAssetStorage {
  getAsset(storageKey: string): Promise<ProjectAssetStorageRecord | null>;
  putAsset(storageKey: string, asset: ProjectAssetStorageRecord): Promise<void>;
  deleteAsset(storageKey: string): Promise<void>;
}

export interface ProjectAssetStorageAccessResult {
  storage: ProjectAssetStorage | null;
  diagnostic: string | null;
}

const PROJECT_ASSET_DATABASE_NAME = "webeditor3d-project-assets";
const PROJECT_ASSET_DATABASE_VERSION = 1;
const PROJECT_ASSET_OBJECT_STORE_NAME = "assets";

function cloneArrayBuffer(bytes: ArrayBuffer): ArrayBuffer {
  return bytes.slice(0);
}

function cloneFileRecord(file: ProjectAssetStorageFileRecord): ProjectAssetStorageFileRecord {
  return {
    bytes: cloneArrayBuffer(file.bytes),
    mimeType: file.mimeType
  };
}

export function cloneProjectAssetStorageRecord(record: ProjectAssetStorageRecord): ProjectAssetStorageRecord {
  const files: Record<string, ProjectAssetStorageFileRecord> = {};

  for (const [path, file] of Object.entries(record.files)) {
    files[path] = cloneFileRecord(file);
  }

  return {
    files
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isLegacyProjectAssetStorageRecord(value: unknown): value is LegacyProjectAssetStorageRecord {
  return (
    isObject(value) &&
    value.bytes instanceof ArrayBuffer &&
    typeof value.mimeType === "string"
  );
}

function isProjectAssetStoragePackageRecord(value: unknown): value is ProjectAssetStorageRecord {
  if (!isObject(value) || !isObject(value.files)) {
    return false;
  }

  return Object.values(value.files).every((entry) => {
    return (
      isObject(entry) &&
      entry.bytes instanceof ArrayBuffer &&
      typeof entry.mimeType === "string"
    );
  });
}

function normalizeStoredAssetRecord(storageKey: string, value: unknown): ProjectAssetStorageRecord | null {
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

function getErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Unknown error.";
}

function formatDiagnostic(prefix: string, error: unknown): string {
  return `${prefix} ${getErrorDetail(error)}`;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => {
      resolve(request.result);
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("IndexedDB request failed."));
    });
  });
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
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

class IndexedDbProjectAssetStorage implements ProjectAssetStorage {
  private readonly databasePromise: Promise<IDBDatabase>;

  constructor(databasePromise: Promise<IDBDatabase>) {
    this.databasePromise = databasePromise;
  }

  private async withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const database = await this.databasePromise;
    const transaction = database.transaction(PROJECT_ASSET_OBJECT_STORE_NAME, mode);
    const store = transaction.objectStore(PROJECT_ASSET_OBJECT_STORE_NAME);
    const result = await promisifyRequest(callback(store));

    await new Promise<void>((resolve, reject) => {
      transaction.addEventListener("complete", () => resolve());
      transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")));
      transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB transaction aborted.")));
    });

    return result;
  }

  async getAsset(storageKey: string): Promise<ProjectAssetStorageRecord | null> {
    const database = await this.databasePromise;
    const transaction = database.transaction(PROJECT_ASSET_OBJECT_STORE_NAME, "readonly");
    const store = transaction.objectStore(PROJECT_ASSET_OBJECT_STORE_NAME);
    const result = await promisifyRequest<unknown>(store.get(storageKey));

    return normalizeStoredAssetRecord(storageKey, result);
  }

  async putAsset(storageKey: string, asset: ProjectAssetStorageRecord): Promise<void> {
    await this.withStore("readwrite", (store) =>
      store.put(cloneProjectAssetStorageRecord(asset), storageKey)
    );
  }

  async deleteAsset(storageKey: string): Promise<void> {
    await this.withStore("readwrite", (store) => store.delete(storageKey));
  }
}

class InMemoryProjectAssetStorage implements ProjectAssetStorage {
  private readonly values = new Map<string, ProjectAssetStorageStoredValue>();

  constructor(initialValues: Record<string, ProjectAssetStorageStoredValue> = {}) {
    for (const [storageKey, asset] of Object.entries(initialValues)) {
      this.values.set(storageKey, cloneStoredAsset(asset));
    }
  }

  async getAsset(storageKey: string): Promise<ProjectAssetStorageRecord | null> {
    const asset = this.values.get(storageKey);

    if (asset === undefined) {
      return null;
    }

    return normalizeStoredAssetRecord(storageKey, asset);
  }

  async putAsset(storageKey: string, asset: ProjectAssetStorageRecord): Promise<void> {
    this.values.set(storageKey, cloneProjectAssetStorageRecord(asset));
  }

  async deleteAsset(storageKey: string): Promise<void> {
    this.values.delete(storageKey);
  }
}

function cloneStoredAsset(asset: ProjectAssetStorageStoredValue): ProjectAssetStorageStoredValue {
  if (isLegacyProjectAssetStorageRecord(asset)) {
    return cloneFileRecord(asset);
  }

  return cloneProjectAssetStorageRecord(asset);
}

export function createInMemoryProjectAssetStorage(
  initialValues: Record<string, ProjectAssetStorageStoredValue> = {}
): ProjectAssetStorage {
  return new InMemoryProjectAssetStorage(initialValues);
}

export async function getBrowserProjectAssetStorageAccess(): Promise<ProjectAssetStorageAccessResult> {
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
  } catch (error) {
    return {
      storage: null,
      diagnostic: formatDiagnostic("Project asset storage could not be opened.", error)
    };
  }
}
