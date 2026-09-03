import { MarkdownPostProcessorContext } from "obsidian";
import type GitlabMrPlugin from "./main";
import { parseMrRef, resolveAccount, resolveProjectPath } from "./parser";
import { fetchMergeRequest, GitlabApiError } from "./gitlabClient";
import { MergeRequestInfo } from "./types";

const STATE_LABEL: Record<string, string> = {
	opened: "Open",
	closed: "Closed",
	merged: "Merged",
	locked: "Locked",
};

const PIPELINE_LABEL: Record<string, string> = {
	success: "Passed",
	failed: "Failed",
	running: "Running",
	pending: "Pending",
	canceled: "Canceled",
	skipped: "Skipped",
	created: "Created",
	manual: "Manual",
};

export async function renderMrReference(
	plugin: GitlabMrPlugin,
	target: HTMLElement,
	rawRef: string,
	_ctx: MarkdownPostProcessorContext
): Promise<void> {
	const wrapper = target.createSpan({ cls: "gitlab-mr-badge gitlab-mr-loading" });
	wrapper.setText(`⏳ ${rawRef}`);

	const ref = parseMrRef(rawRef, plugin.settings.accounts);
	if (!ref) {
		setError(wrapper, `Could not parse GitLab MR reference: "${rawRef}"`);
		return;
	}

	const account = resolveAccount(ref, plugin.settings.accounts);
	if (!account) {
		setError(wrapper, `No GitLab account configured for "${rawRef}".`);
		return;
	}

	const projectPath = resolveProjectPath(ref, account);
	if (!projectPath) {
		setError(
			wrapper,
			`"${rawRef}" omits the project and account "${account.alias}" has no default project configured.`
		);
		return;
	}

	const host = ref.host ?? account.host;
	const cached = plugin.cache.get(host, projectPath, ref.iid);
	if (cached) {
		renderBadge(plugin, wrapper, cached);
		return;
	}

	try {
		const info = await fetchMergeRequest({ ...account, host }, projectPath, ref.iid);
		plugin.cache.set(host, projectPath, ref.iid, info);
		renderBadge(plugin, wrapper, info);
	} catch (err) {
		if (err instanceof GitlabApiError) {
			setError(wrapper, err.message, ref.webUrl ?? undefined);
		} else {
			setError(wrapper, `Unexpected error fetching "${rawRef}": ${(err as Error).message}`);
		}
	}
}

function renderBadge(plugin: GitlabMrPlugin, wrapper: HTMLElement, info: MergeRequestInfo): void {
	wrapper.empty();
	wrapper.removeClass("gitlab-mr-loading");
	wrapper.addClass(`gitlab-mr-state-${info.state}`);
	if (info.draft) wrapper.addClass("gitlab-mr-draft");

	wrapper.createSpan({ cls: "gitlab-mr-icon", text: stateIcon(info) });

	const stateEl = wrapper.createSpan({ cls: "gitlab-mr-state" });
	stateEl.setText(info.draft ? "Draft" : STATE_LABEL[info.state] ?? info.state);

	wrapper.createSpan({ cls: "gitlab-mr-iid", text: `!${info.iid}` });
	wrapper.createSpan({ cls: "gitlab-mr-title", text: info.title });

	if (plugin.settings.showAuthor) {
		wrapper.createSpan({ cls: "gitlab-mr-author", text: `@${info.author}` });
	}

	if (plugin.settings.showPipelineStatus && info.pipelineStatus) {
		const pipeline = wrapper.createSpan({
			cls: `gitlab-mr-pipeline gitlab-mr-pipeline-${info.pipelineStatus}`,
		});
		pipeline.setText(PIPELINE_LABEL[info.pipelineStatus] ?? info.pipelineStatus);
	}

	if (plugin.settings.showApprovals && info.approvalsRequired !== null) {
		wrapper.createSpan({
			cls: "gitlab-mr-approvals",
			text: `✓ ${info.approvalsGiven ?? 0}/${info.approvalsRequired}`,
		});
	}

	if (info.hasConflicts) {
		wrapper.createSpan({ cls: "gitlab-mr-conflict", text: "⚠ conflicts" });
	}

	if (plugin.settings.openInBrowserOnClick) {
		wrapper.addClass("gitlab-mr-clickable");
		wrapper.onClickEvent((evt) => {
			evt.preventDefault();
			window.open(info.webUrl, "_blank");
		});
	}

	wrapper.setAttribute("title", `${info.projectPath}!${info.iid} — ${info.title}`);
}

function stateIcon(info: MergeRequestInfo): string {
	if (info.draft) return "✎";
	switch (info.state) {
		case "merged":
			return "⇄";
		case "closed":
			return "✕";
		case "locked":
			return "🔒";
		default:
			return "●";
	}
}

function setError(wrapper: HTMLElement, message: string, link?: string): void {
	wrapper.empty();
	wrapper.removeClass("gitlab-mr-loading");
	wrapper.addClass("gitlab-mr-error");
	wrapper.setText(`⚠ ${message}`);
	wrapper.setAttribute("title", message);
	if (link) {
		wrapper.addClass("gitlab-mr-clickable");
		wrapper.onClickEvent((evt) => {
			evt.preventDefault();
			window.open(link, "_blank");
		});
	}
}
