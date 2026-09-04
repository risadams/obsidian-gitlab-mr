import type { GitlabAccount, ParsedMrRef } from "./types";

export const INLINE_PREFIX = "gitlab-mr:";

const URL_PATTERN = /^(https?:\/\/[^/]+)\/(.+?)\/-\/merge_requests\/(\d+)\/?$/i;
const SHORTHAND_PATTERN = /^(?:([\w.-]+):)?([\w.\-/]*)!(\d+)$/;
const INLINE_URL_REF = String.raw`https?:\/\/[^\s<>()]+?\/-\/merge_requests\/\d+\/?`;
const INLINE_SHORTHAND_REF = String.raw`(?:[\w.-]+:)?[\w.\-/]*!\d+`;

export interface InlineMrMatch {
	from: number;
	to: number;
	rawRef: string;
}

export function createInlineMrPattern(): RegExp {
	return new RegExp(`${INLINE_PREFIX}(${INLINE_URL_REF}|${INLINE_SHORTHAND_REF})`, "g");
}

export function findInlineMrRefs(text: string): InlineMrMatch[] {
	const pattern = createInlineMrPattern();
	const matches: InlineMrMatch[] = [];
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(text)) !== null) {
		matches.push({
			from: match.index,
			to: match.index + match[0].length,
			rawRef: match[1],
		});
	}
	return matches;
}

/**
 * Parses a single merge request reference such as:
 *   group/project!123
 *   work:group/project!123
 *   !123                                      (uses the resolved account's default project)
 *   work:!123
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

/**
 * Resolves the project path for a reference, falling back to the account's
 * configured default project when the reference omitted it (e.g. "!123").
 */
export function resolveProjectPath(ref: ParsedMrRef, account: GitlabAccount): string | null {
	if (ref.projectPath) return ref.projectPath;
	return account.defaultProjectPath?.trim() || null;
}

const CODE_BLOCK_LANGUAGE = "gitlab-mr";
export { CODE_BLOCK_LANGUAGE };
