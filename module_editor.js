frappe.ModuleEditor = class ModuleEditor {
	constructor(frm, wrapper) {
		this.frm = frm;
		this.wrapper = wrapper;
		this.module_details_cache = {};

		const block_modules = this.frm.doc.block_modules.map((row) => row.module);
		this.multicheck = frappe.ui.form.make_control({
			parent: wrapper,
			df: {
				fieldname: "block_modules",
				fieldtype: "MultiCheck",
				select_all: true,
				columns: "15rem",
				get_data: () => {
					return this.frm.doc.__onload.all_modules.map((module) => {
						return {
							label: __(module),
							value: module,
							checked: !block_modules.includes(module),
						};
					});
				},
				on_change: () => {
					this.set_modules_in_table();
					this.frm.dirty();
				},
			},
			render_input: true,
		});

		const original_make_checkboxes = this.multicheck.make_checkboxes.bind(this.multicheck);
		this.multicheck.make_checkboxes = () => {
			original_make_checkboxes();
			this.decorate_module_rows();
		};
	}

	show() {
		const block_modules = this.frm.doc.block_modules.map((row) => row.module);
		const all_modules = this.frm.doc.__onload.all_modules;
		this.multicheck.selected_options = all_modules.filter((m) => !block_modules.includes(m));
		this.multicheck.refresh_input();
		this.decorate_module_rows();
	}

	set_modules_in_table() {
		let block_modules = this.frm.doc.block_modules || [];
		let unchecked_options = this.multicheck.get_unchecked_options();

		block_modules.map((module_doc) => {
			if (!unchecked_options.includes(module_doc.module)) {
				frappe.model.clear_doc(module_doc.doctype, module_doc.name);
			}
		});

		unchecked_options.map((module) => {
			if (!block_modules.find((d) => d.module === module)) {
				let module_doc = frappe.model.add_child(this.frm.doc, "Block Module", "block_modules");
				module_doc.module = module;
			}
		});
	}

	decorate_module_rows() {
		if (!this.multicheck?.$wrapper?.length) {
			return;
		}

		this.multicheck.$wrapper.find(".unit-checkbox").each((_, row) => {
			const $row = $(row);
			const module_name = $row.find(":checkbox").attr("data-unit");
			if (!module_name || $row.find(".module-details-btn").length) {
				return;
			}

			$row.css({
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "8px",
			});

			$row.find("label").css({
				display: "inline-flex",
				alignItems: "center",
				gap: "8px",
				marginBottom: 0,
			});

			const $button = $(`
				<button type="button" class="btn btn-xs btn-default module-details-btn">
					${__("تفاصيل")}
				</button>
			`);

			$button.on("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				this.show_module_details(module_name);
			});

			$row.append($button);
		});
	}

	make_module_details_dialog() {
		if (this.module_details_dialog) {
			return this.module_details_dialog;
		}

		this.module_details_dialog = new frappe.ui.Dialog({
			title: __("تفاصيل الوحدة"),
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "module_components_html",
				},
			],
		});

		this.module_details_dialog.$wrapper.find(".modal-dialog").css("max-width", "980px");
		this.module_details_dialog.$wrapper.find(".modal-body").css("max-height", "72vh");
		this.module_details_dialog.$wrapper.find(".modal-body").css("overflow", "auto");
		return this.module_details_dialog;
	}

	module_details_are_complete(data) {
		if (!data || !Array.isArray(data.workspaces)) {
			return false;
		}

		return data.workspaces.every((workspace) => {
			return (
				Array.isArray(workspace.headers) &&
				Array.isArray(workspace.shortcuts) &&
				Array.isArray(workspace.links)
			);
		});
	}

	render_default_list(items, render_item) {
		if (!items.length) {
			return `<div class="text-muted small">${__("لا توجد عناصر في هذا القسم")}</div>`;
		}

		return `
			<ul style="margin: 0; padding-right: 18px;">
				${items
					.map((item) => `<li style="margin-bottom: 8px; line-height: 1.8;">${render_item(item)}</li>`)
					.join("")}
			</ul>
		`;
	}

	render_workspace_details(workspaces) {
		if (!workspaces.length) {
			return `<div class="text-muted small">${__("لا توجد مساحات عمل في هذه الوحدة")}</div>`;
		}

		return workspaces
			.map((workspace) => {
				const headers = workspace.headers || [];
				const shortcuts = workspace.shortcuts || [];
				const links = workspace.links || [];

				const headers_html = headers.length
					? headers
							.map(
								(header) =>
									`<span style="display:inline-flex; padding:4px 10px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:12px;">${header}</span>`
							)
							.join("")
					: `<span class="text-muted small">${__("لا توجد رؤوس أقسام")}</span>`;

				const shortcuts_html = shortcuts.length
					? `<ul style="margin:0; padding-right:18px;">${shortcuts
							.map((shortcut) => `<li style="margin-bottom:6px;">${shortcut}</li>`)
							.join("")}</ul>`
					: `<div class="text-muted small">${__("لا توجد اختصارات")}</div>`;

				const links_html = links.length
					? `<ul style="margin:0; padding-right:18px;">${links
							.map(
								(link) =>
									`<li style="margin-bottom:6px;">${link.label || link.link_to} <span class="text-muted small">(${link.link_type || ""}${link.link_to ? `: ${link.link_to}` : ""})</span></li>`
							)
							.join("")}</ul>`
					: `<div class="text-muted small">${__("لا توجد روابط")}</div>`;

				return `
					<div style="border:1px solid #e5e7eb; border-radius:14px; padding:16px; background:#fff; margin-bottom:14px;">
						<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:12px;">
							<div>
								<div style="font-size:18px; font-weight:700; color:#0f172a;">${workspace.title || workspace.label || workspace.name}</div>
								<div class="text-muted small" style="margin-top:4px;">${workspace.route || ""}</div>
							</div>
							<div style="display:flex; gap:8px; flex-wrap:wrap;">
								<span style="display:inline-flex; padding:4px 10px; border-radius:999px; background:#ecfeff; color:#0f766e; font-size:12px;">${__("Shortcuts")}: ${workspace.shortcut_count || 0}</span>
								<span style="display:inline-flex; padding:4px 10px; border-radius:999px; background:#f8fafc; color:#475569; font-size:12px;">${__("Links")}: ${workspace.link_count || 0}</span>
								<span style="display:inline-flex; padding:4px 10px; border-radius:999px; background:${workspace.public ? "#dcfce7" : "#f1f5f9"}; color:${workspace.public ? "#166534" : "#475569"}; font-size:12px;">${workspace.public ? __("Public") : __("Private")}</span>
							</div>
						</div>
						<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
							<div style="border:1px solid #eef2f7; border-radius:12px; padding:12px;">
								<div style="font-weight:700; margin-bottom:8px;">${__("Headers")}</div>
								<div style="display:flex; gap:8px; flex-wrap:wrap;">${headers_html}</div>
							</div>
							<div style="border:1px solid #eef2f7; border-radius:12px; padding:12px;">
								<div style="font-weight:700; margin-bottom:8px;">${__("Shortcuts")}</div>
								${shortcuts_html}
							</div>
							<div style="border:1px solid #eef2f7; border-radius:12px; padding:12px;">
								<div style="font-weight:700; margin-bottom:8px;">${__("Links")}</div>
								${links_html}
							</div>
						</div>
					</div>
				`;
			})
			.join("");
	}

	render_module_details_shell(html_field, data) {
		const tabs = [
			{ key: "workspaces", title: __("مساحات العمل") },
			{ key: "doctypes", title: __("DocTypes") },
			{ key: "reports", title: __("التقارير") },
			{ key: "pages", title: __("Pages") },
		];

		const tab_contents = {
			workspaces: this.render_workspace_details(data.workspaces || []),
			doctypes: this.render_default_list(data.doctypes || [], (item) => {
				return `${item.name}${item.istable ? ` <span class="text-muted small">(${__("Child Table")})</span>` : ""}${item.issingle ? ` <span class="text-muted small">(${__("Single")})</span>` : ""}`;
			}),
			reports: this.render_default_list(data.reports || [], (item) => {
				return `${item.name}${item.ref_doctype ? ` <span class="text-muted small">(${__(item.ref_doctype)})</span>` : ""}`;
			}),
			pages: this.render_default_list(data.pages || [], (item) => item.title || item.name),
		};

		const tabs_html = tabs
			.map((tab, index) => {
				const count = (data[tab.key] || []).length;
				return `
					<button type="button"
						class="module-details-tab-btn ${index === 0 ? "active" : ""}"
						data-tab="${tab.key}"
						style="border:1px solid ${index === 0 ? "#0f766e" : "#d7dee7"}; background:${index === 0 ? "#0f766e" : "#fff"}; color:${index === 0 ? "#fff" : "#0f172a"}; border-radius:999px; padding:8px 14px; font-weight:700; display:inline-flex; align-items:center; gap:8px;">
						<span>${tab.title}</span>
						<span style="display:inline-flex; min-width:22px; height:22px; padding:0 6px; border-radius:999px; align-items:center; justify-content:center; background:${index === 0 ? "rgba(255,255,255,.16)" : "#f1f5f9"}; color:${index === 0 ? "#fff" : "#475569"}; font-size:12px;">${count}</span>
					</button>
				`;
			})
			.join("");

		const panes_html = tabs
			.map((tab, index) => {
				return `
					<div class="module-details-tab-pane" data-pane="${tab.key}" style="display:${index === 0 ? "block" : "none"};">
						${tab_contents[tab.key]}
					</div>
				`;
			})
			.join("");

		html_field.$wrapper.html(`
			<div class="module-details-shell" style="display:flex; flex-direction:column; gap:14px;">
				<div style="padding: 4px 0 6px; color:#64748b; line-height:1.8;">
					${__("هذه النافذة تعرض مكوّنات الوحدة حسب النوع. يمكنك التنقل بين التبويبات لعرض التفاصيل، وعند تبويب مساحات العمل ستجد تفاصيل كل Workspace نفسه.")}
				</div>
				<div class="module-details-tabs" style="display:flex; gap:10px; flex-wrap:wrap;">
					${tabs_html}
				</div>
				<div class="module-details-tab-content" style="border:1px solid #e5e7eb; border-radius:16px; padding:16px; background:#f8fafc;">
					${panes_html}
				</div>
			</div>
		`);

		html_field.$wrapper.find(".module-details-tab-btn").on("click", function () {
			const tab_key = $(this).data("tab");
			const $buttons = html_field.$wrapper.find(".module-details-tab-btn");
			const $panes = html_field.$wrapper.find(".module-details-tab-pane");

			$buttons.each((_, button) => {
				const $button = $(button);
				const is_active = $button.data("tab") === tab_key;
				$button.toggleClass("active", is_active).css({
					borderColor: is_active ? "#0f766e" : "#d7dee7",
					background: is_active ? "#0f766e" : "#fff",
					color: is_active ? "#fff" : "#0f172a",
				});
				$button.find("span:last").css({
					background: is_active ? "rgba(255,255,255,.16)" : "#f1f5f9",
					color: is_active ? "#fff" : "#475569",
				});
			});

			$panes.hide();
			$panes.filter(`[data-pane="${tab_key}"]`).show();
		});
	}

	async show_module_details(module_name) {
		const dialog = this.make_module_details_dialog();
		const html_field = dialog.get_field("module_components_html");

		dialog.set_title(__("تفاصيل الوحدة: {0}", [__(module_name)]));
		html_field.$wrapper.html(
			`<div class="text-muted small" style="padding: 12px 0;">${__("جارٍ تحميل مكوّنات الوحدة...")}</div>`
		);
		dialog.show();

		if (
			!this.module_details_cache[module_name] ||
			!this.module_details_are_complete(this.module_details_cache[module_name])
		) {
			const response = await frappe.call({
				method: "frappe.core.doctype.user.user.get_module_components",
				args: { module_name },
			});
			this.module_details_cache[module_name] = response.message || {};
		}

		this.render_module_details_shell(html_field, this.module_details_cache[module_name]);
	}
};
