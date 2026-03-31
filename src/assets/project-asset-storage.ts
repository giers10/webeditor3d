export interface ProjectAssetStorageRecord {
  bytes: ArrayBuffer;
  mimeType: string;
}

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

  constructor() {
    this.databasePromise = openIndexedDb();
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
    const result = await promisifyRequest<ProjectAssetStorageRecord | undefined>(store.get(storageKey));

    return result === undefined ? null : { bytes: cloneArrayBuffer(result.bytes), mimeType: result.mimeType };
  }

  async putAsset(storageKey: string, asset: ProjectAssetStorageRecord): Promise<void> {
    await this.withStore("readwrite", (store) =>
      store.put(
        {
          bytes: cloneArrayBuffer(asset.bytes),
          mimeType: asset.mimeType
        },
        storageKey
      )
    );
  }

  async deleteAsset(storageKey: string): Promise<void> {
    await this.withStore("readwrite", (store) => store.delete(storageKey));
  }
}

class InMemoryProjectAssetStorage implements ProjectAssetStorage {
  private readonly values = new Map<string, ProjectAssetStorageRecord>();

  constructor(initialValues: Record<string, ProjectAssetStorageRecord> = {}) {
    for (const [storageKey, asset] of Object.entries(initialValues)) {
      this.values.set(storageKey, {
        bytes: cloneArrayBuffer(asset.bytes),
        mimeType: asset.mimeType
      });
    }
  }

  async getAsset(storageKey: string): Promise<ProjectAssetStorageRecord | null> {
    const asset = this.values.get(storageKey);

    if (asset === undefined) {
      return null;
    }

    return {
      bytes: cloneArrayBuffer(asset.bytes),
      mimeType: asset.mimeType
    };
  }

  async putAsset(storageKey: string, asset: ProjectAssetStorageRecord): Promise<void> {
    this.values.set(storageKey, {
      bytes: cloneArrayBuffer(asset.bytes),
      mimeType: asset.mimeType
    });
  }

  async deleteAsset(storageKey: string): Promise<void> {
    this.values.delete(storageKey);
  }
}

export function createInMemoryProjectAssetStorage(initialValues: Record<string, ProjectAssetStorageRecord> = {}): ProjectAssetStorage {
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
    return {
      storage: new IndexedDbProjectAssetStorage(),
      diagnostic: null
    };
  } catch (error) {
    return {
      storage: null,
      diagnostic: formatDiagnostic("Project asset storage could not be opened.", error)
    };
  }
}

