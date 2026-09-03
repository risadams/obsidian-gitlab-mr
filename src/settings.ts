import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type GitlabMrPlugin from "./main";
import { GitlabAccount } from "./types";

export interface GitlabMrSettings {
	accounts: GitlabAccount[];
	cacheTtlMinutes: number;
	showAuthor: boolean;
	showPipelineStatus: boolean;
	showApprovals: boolean;
	openInBrowserOnClick: boolean;
}

export const DEFAULT_SETTINGS: GitlabMrSettings = {
	accounts: [
		{
			alias: "default",
			host: "https://gitlab.com",
			token: "",
			isDefault: true,
		},
	],
	cacheTtlMinutes: 15,
	showAuthor: true,
	showPipelineStatus: true,
	showApprovals: true,
	openInBrowserOnClick: true,
};

export class GitlabMrSettingTab extends PluginSettingTab {
	plugin: GitlabMrPlugin;

	constructor(app: App, plugin: GitlabMrPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "GitLab Merge Request" });

		new Setting(containerEl)
			.setName("Cache duration (minutes)")
			.setDesc("How long a merge request's status is cached before it is re-fetched from GitLab.")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.cacheTtlMinutes))
					.onChange(async (value) => {
						const parsed = Number(value);
						if (!Number.isNaN(parsed) && parsed >= 0) {
							this.plugin.settings.cacheTtlMinutes = parsed;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Show author")
			.setDesc("Display the merge request author in the rendered badge.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.showAuthor).onChange(async (v) => {
					this.plugin.settings.showAuthor = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Show pipeline status")
			.setDesc("Display the latest CI pipeline status.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.showPipelineStatus).onChange(async (v) => {
					this.plugin.settings.showPipelineStatus = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Show approvals")
			.setDesc("Display approval counts when the GitLab tier supports it.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.showApprovals).onChange(async (v) => {
					this.plugin.settings.showApprovals = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Open in browser on click")
			.setDesc("Clicking a rendered merge request badge opens it in your browser.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.openInBrowserOnClick).onChange(async (v) => {
					this.plugin.settings.openInBrowserOnClick = v;
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl("h3", { text: "Accounts" });
		containerEl.createEl("p", {
			text:
				"Configure one or more GitLab instances. Reference a non-default account in your notes with " +
				"\"alias:group/project!123\". The default account is used when no alias is given.",
			cls: "setting-item-description",
		});

		this.plugin.settings.accounts.forEach((account, index) => {
			const setting = new Setting(containerEl)
				.setName(account.alias || `Account ${index + 1}`)
				.addText((text) =>
					text
						.setPlaceholder("Alias (e.g. work)")
						.setValue(account.alias)
						.onChange(async (value) => {
							account.alias = value.trim();
							await this.plugin.saveSettings();
						})
				)
				.addText((text) =>
					text
						.setPlaceholder("https://gitlab.example.com")
						.setValue(account.host)
						.onChange(async (value) => {
							account.host = value.trim().replace(/\/+$/, "");
							await this.plugin.saveSettings();
						})
				)
				.addText((text) => {
					text
						.setPlaceholder("Personal access token")
						.setValue(account.token)
						.onChange(async (value) => {
							account.token = value.trim();
							await this.plugin.saveSettings();
						});
					text.inputEl.type = "password";
				});

			setting.addToggle((toggle) =>
				toggle
					.setTooltip("Default account")
					.setValue(account.isDefault)
					.onChange(async (value) => {
						if (value) {
							this.plugin.settings.accounts.forEach((a) => (a.isDefault = false));
							account.isDefault = true;
						} else {
							account.isDefault = false;
						}
						await this.plugin.saveSettings();
						this.display();
					})
			);

			setting.addExtraButton((btn) =>
				btn
					.setIcon("trash")
					.setTooltip("Remove account")
					.onClick(async () => {
						if (this.plugin.settings.accounts.length <= 1) {
							new Notice("At least one account is required.");
							return;
						}
						this.plugin.settings.accounts.splice(index, 1);
						if (!this.plugin.settings.accounts.some((a) => a.isDefault)) {
							this.plugin.settings.accounts[0].isDefault = true;
						}
						await this.plugin.saveSettings();
						this.display();
					})
			);
		});

		new Setting(containerEl).addButton((btn) =>
			btn
				.setButtonText("Add account")
				.setCta()
				.onClick(async () => {
					this.plugin.settings.accounts.push({
						alias: `account${this.plugin.settings.accounts.length + 1}`,
						host: "https://gitlab.com",
						token: "",
						isDefault: false,
					});
					await this.plugin.saveSettings();
					this.display();
				})
		);

		new Setting(containerEl).addButton((btn) =>
			btn.setButtonText("Clear cache").onClick(() => {
				this.plugin.cache.clear();
				new Notice("GitLab MR cache cleared.");
			})
		);
	}
}
