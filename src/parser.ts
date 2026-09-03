import { GitlabAccount, ParsedMrRef } from "./types";

const URL_PATTERN = /^(https?:\/\/[^/]+)\/(.+?)\/-\/merge_requests\/(\d+)\/?$/i;
const SHORTHAND_PATTERN = /^(?:([\w.-]+):)?([\w.\-/]+)!(\d+)$/;

/**
 * Parses a single merge request reference such as:
 *   group/project!123
 *   work:group/project!123
 *   https://gitlab.example.com/group/project/-/merge_requests/123
 */
export function parseMrRef(raw: string, accounts: GitlabAccount[]): ParsedMrRef | null {
	const text = raw.trim();
	if (!text) return null;

	const urlMatch = text.match(URL_PATTERN);
	if (urlMatch) {
		const [, host, projectPath, iid] = urlMatch;
		return {
			raw: text,
			accountAlias: null,
			host,
			projectPath,
			iid: Number(iid),
			webUrl: text,
		};
	}

	const shortMatch = text.match(SHORTHAND_PATTERN);
	if (shortMatch) {
		const [, alias, projectPath, iid] = shortMatch;
		return {
			raw: text,
			accountAlias: alias ?? null,
			host: null,
			projectPath,
			iid: Number(iid),
			webUrl: null,
		};
	}

	return null;
}

export function resolveAccount(ref: ParsedMrRef, accounts: GitlabAccount[]): GitlabAccount | null {
	if (ref.host) {
		const byHost = accounts.find((a) => stripTrailingSlash(a.host) === stripTrailingSlash(ref.host!));
		if (byHost) return byHost;
		// Unknown host referenced via full URL: synthesize a token-less lookup against
		// any account matching the host, otherwise fall back to default so at least the
		// link renders even if the API call later fails auth.
	}
	if (ref.accountAlias) {
		return accounts.find((a) => a.alias === ref.accountAlias) ?? null;
	}
	return accounts.find((a) => a.isDefault) ?? accounts[0] ?? null;
}

function stripTrailingSlash(url: string): string {
	return url.replace(/\/+$/, "");
}

const CODE_BLOCK_LANGUAGE = "gitlab-mr";
export const INLINE_PREFIX = "gitlab-mr:";
export { CODE_BLOCK_LANGUAGE };
