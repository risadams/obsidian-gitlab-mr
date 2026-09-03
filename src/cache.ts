import { CacheEntry, MergeRequestInfo } from "./types";

export class MrCache {
	private store = new Map<string, CacheEntry>();

	constructor(private ttlMinutesProvider: () => number) {}

	private key(host: string, projectPath: string, iid: number): string {
		return `${host}::${projectPath}::${iid}`;
	}

	get(host: string, projectPath: string, iid: number): MergeRequestInfo | null {
		const ttlMs = this.ttlMinutesProvider() * 60 * 1000;
		const entry = this.store.get(this.key(host, projectPath, iid));
		if (!entry) return null;
		if (ttlMs > 0 && Date.now() - entry.fetchedAt > ttlMs) {
			return null;
		}
		return entry.value;
	}

	set(host: string, projectPath: string, iid: number, value: MergeRequestInfo): void {
		this.store.set(this.key(host, projectPath, iid), { value, fetchedAt: Date.now() });
	}

	clear(): void {
		this.store.clear();
	}
}
