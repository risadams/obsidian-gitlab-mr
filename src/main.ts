import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, GitlabMrSettings, GitlabMrSettingTab } from "./settings";
import { MrCache } from "./cache";
import { renderMrReference } from "./renderer";
import { CODE_BLOCK_LANGUAGE } from "./parser";
import { createLivePreviewExtension, renderInlineMrReferences } from "./inlineRenderer";

export default class GitlabMrPlugin extends Plugin {
	settings!: GitlabMrSettings;
	cache!: MrCache;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.cache = new MrCache(() => this.settings.cacheTtlMinutes);

		this.addSettingTab(new GitlabMrSettingTab(this.app, this));
		this.registerEditorExtension(createLivePreviewExtension(this));

		// ```gitlab-mr
		// group/project!123
		// work:group/project!456
		// ```
		this.registerMarkdownCodeBlockProcessor(CODE_BLOCK_LANGUAGE, async (source, el, ctx) => {
			const list = el.createDiv({ cls: "gitlab-mr-block" });
			const lines = source
				.split("\n")
				.map((l) => l.trim())
				.filter((l) => l.length > 0 && !l.startsWith("#"));

			for (const line of lines) {
				const row = list.createDiv({ cls: "gitlab-mr-block-row" });
				await renderMrReference(this, row, line, ctx);
			}
		});

		// Inline references in Reading view, including plain text and inline code.
		this.registerMarkdownPostProcessor(async (el, ctx) => {
			await renderInlineMrReferences(this, el, ctx);
		});
	}

	onunload(): void {
		this.cache.clear();
	}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<GitlabMrSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
		if (!this.settings.accounts || this.settings.accounts.length === 0) {
			this.settings.accounts = DEFAULT_SETTINGS.accounts.map((a) => ({ ...a }));
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
