frappe.ui.form.on("User", {
	setup: function (frm) {
		frm.set_query("default_workspace", () => {
			return {
				filters: {
					for_user: ["in", [null, frappe.session.user]],
					title: ["!=", "Welcome Workspace"],
				},
			};
		});




		frappe.call({
			method: "frappe.core.doctype.user.user.get_docperm_roles",
			callback: function (r) {
				if (r.message) {
					// Assuming r.message contains an array of role names
					var role_name = r.message[0].name; // Get the first role name for example
		
					// Set the value of the Link field
					//frm.set_value('permissionsuser', role_name);
		
					// Refresh the field to reflect changes
					//frm.refresh_field('permissionsuser');
				}
			}
		});


		

	},

	username: function(frm) {
		let username = frm.doc.username;

		 if (frm.is_new()) {

		frm.set_value('permissionsuser',username);

		 }
	},

	




	

	before_load: function (frm) {
		let update_tz_options = function () {
			frm.fields_dict.time_zone.set_data(frappe.all_timezones);
		};

		if (!frappe.all_timezones) {
			frappe.call({
				method: "frappe.core.doctype.user.user.get_timezones",
				callback: function (r) {
					frappe.all_timezones = r.message.timezones;
					update_tz_options();
				},
			});
		} else {
			update_tz_options();
		}
	},

	time_zone: function (frm) {
		if (frm.doc.time_zone && frm.doc.time_zone.startsWith("Etc")) {
			frm.set_df_property(
				"time_zone",
				"description",
				__("Note: Etc timezones have their signs reversed.")
			);
		}
	},

	role_profile_name: function (frm) {
		if (frm.doc.role_profile_name) {
			frappe.call({
				method: "frappe.core.doctype.user.user.get_role_profile",
				args: {
					role_profile: frm.doc.role_profile_name,
				},
				callback: function (data) {
					frm.set_value("roles", []);
					$.each(data.message || [], function (i, v) {
						var d = frm.add_child("roles");
						d.role = v.role;
					});
					frm.roles_editor.show();
				},
			});
		}
	},

	module_profile: function (frm) {
		if (frm.doc.module_profile) {
			frappe.call({
				method: "frappe.core.doctype.user.user.get_module_profile",
				args: {
					module_profile: frm.doc.module_profile,
				},
				callback: function (data) {
					frm.set_value("block_modules", []);
					$.each(data.message || [], function (i, v) {
						let d = frm.add_child("block_modules");
						d.module = v.module;
					});
					frm.module_editor && frm.module_editor.show();
				},
			});
		}
	},

	onload: function (frm) {
		frm.can_edit_roles = has_access_to_edit_user();

		if (frm.is_new() && frm.roles_editor) {
			frm.roles_editor.reset();
		}

		if (
			frm.can_edit_roles &&
			!frm.is_new() &&
			["System User", "Website User"].includes(frm.doc.user_type)
		) {
			if (!frm.roles_editor) {
				const role_area = $('<div class="role-editor">').appendTo(
					frm.fields_dict.roles_html.wrapper
				);

				frm.roles_editor = new frappe.RoleEditor(
					role_area,
					frm,
					frm.doc.role_profile_name ? 1 : 0
				);
				frm.events.ensure_add_role_button(frm, role_area);

				if (frm.doc.user_type == "System User") {
					var module_area = $("<div>").appendTo(frm.fields_dict.modules_html.wrapper);
					frm.module_editor = new frappe.ModuleEditor(frm, module_area);
				}
			} else {
				frm.events.ensure_add_role_button(frm, frm.fields_dict.roles_html.wrapper);
				frm.roles_editor.show();
			}
		}
	},

	ensure_add_role_button: function (frm, role_area) {
		const $role_area = $(role_area || frm.fields_dict.roles_html.wrapper);
		if (!$role_area.length || $role_area.find(".add-role-inline-actions").length) {
			return;
		}

		const actions = $(`
			<div class="add-role-inline-actions" style="display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
				<button type="button" class="btn btn-sm btn-default open-separate-permissions-tab-btn">
					${__("الإمكانيات المنفصلة")}
				</button>
				<button type="button" class="btn btn-sm btn-secondary add-role-inline-btn">
					${__("إضافة صلاحية")}
				</button>
			</div>
		`);

		actions.find(".open-separate-permissions-tab-btn").on("click", () => {
			frm.events.open_separate_permissions_tab(frm);
		});

		actions.find(".add-role-inline-btn").on("click", () => {
			frm.events.open_system_user_permissions_dialog(frm);
		});

		$role_area.prepend(actions);
	},

	open_separate_permissions_tab: function (frm) {
		const $tabLink = $("#user-separate_permissions_tab-tab");
		if ($tabLink.length) {
			$tabLink.tab("show");
			frm.events.render_separate_permissions_tab(frm);
		}
	},

	open_system_user_permissions_dialog: async function (frm) {
		const default_permission_name =
			frm.doc.permissionsuser || frm.doc.username || frm.doc.full_name || frm.doc.name || "";

		const dialog = new frappe.ui.Dialog({
			title: __("إضافة صلاحية"),
			size: "extra-large",
			fields: [
				{
					fieldtype: "Data",
					fieldname: "authority_role_name",
					label: __("اسم الصلاحية"),
					reqd: 1,
					default: default_permission_name,
				},
				{
					fieldtype: "HTML",
					fieldname: "permissions_html",
				},
			],
			primary_action_label: __("حفظ التعديلات"),
			primary_action: async (values) => {
				const role_name = (values.authority_role_name || "").trim();
				if (!role_name) {
					frappe.throw(__("يرجى إدخال اسم الصلاحية"));
				}

				const changes = dialog.__permission_changes || {};
				if ($.isEmptyObject(changes)) {
					frappe.show_alert({
						message: __("لا توجد تغييرات للحفظ"),
						indicator: "info",
					});
					return;
				}

				await frm.events.ensure_system_user_permission_record(role_name);

				const response = await frappe.call({
					method: "erpnext.accounts.doctype.system_user_permissions.system_user_permissions.save_doctype_permissions",
					args: {
						role: role_name,
						changes,
					},
				});

				if (response.message) {
					frappe.show_alert({ message: response.message, indicator: "green" });
					dialog.__permission_changes = {};
					if (!frm.doc.permissionsuser || frm.doc.permissionsuser !== role_name) {
						await frm.set_value("permissionsuser", role_name);
					}
					await frm.events.activate_permission_role_on_user(frm, role_name);
					if (frm.is_dirty()) {
						await frm.save();
					}
					frm.events.rebuild_roles_editor(frm);
					dialog.hide();
				}
			},
		});

		dialog.show();
		dialog.$wrapper.find(".modal-dialog").css("max-width", "96vw");
		dialog.$wrapper.find(".modal-content").css("min-height", "82vh");
		dialog.get_field("permissions_html").$wrapper.html(
			`<div class="text-muted small" style="padding: 12px 0;">${__("جاري تحميل واجهة الصلاحيات...")}</div>`
		);

		dialog.get_field("authority_role_name").$input.on("change", async () => {
			const role_name = (dialog.get_value("authority_role_name") || "").trim();
			if (!role_name) {
				dialog.get_field("permissions_html").$wrapper.empty();
				dialog.__permission_changes = {};
				return;
			}
			await frm.events.render_system_user_permissions_dialog(frm, dialog, role_name);
		});

		if (default_permission_name) {
			await frm.events.render_system_user_permissions_dialog(frm, dialog, default_permission_name);
		}
	},

	ensure_system_user_permission_record: async function (role_name) {
		const normalized_role = (role_name || "").trim();
		if (!normalized_role) {
			return;
		}

		const permission_exists = await frappe.db.exists("System User Permissions", normalized_role);
		if (permission_exists) {
			return;
		}

		try {
			await frappe.call({
				method: "frappe.client.insert",
				args: {
					doc: {
						doctype: "System User Permissions",
						authority_role_name: normalized_role,
					},
				},
			});
		} catch (error) {
			const role_exists = await frappe.db.exists("Role", normalized_role);
			if (!role_exists) {
				throw error;
			}
		}
	},

	activate_permission_role_on_user: async function (frm, role_name) {
		const normalized_role = (role_name || "").trim();
		if (!normalized_role) {
			return;
		}

		if (!frm.doc.roles) {
			frm.doc.roles = [];
		}

		const exists_in_roles_table = frm.doc.roles.some((row) => row.role === normalized_role);
		if (!exists_in_roles_table) {
			const role_doc = frappe.model.add_child(frm.doc, "Has Role", "roles");
			role_doc.role = normalized_role;
		}

		if (frm.roles_editor?.multicheck) {
			const selected_roles = new Set(frm.roles_editor.multicheck.get_checked_options());
			selected_roles.add(normalized_role);
			frm.roles_editor.multicheck.selected_options = Array.from(selected_roles);
			frm.roles_editor.multicheck.refresh_input();
			frm.roles_editor.set_roles_in_table();
			frm.roles_editor.show();
		}

		frm.refresh_field("roles");
		frm.dirty();
	},

	rebuild_roles_editor: function (frm) {
		if (!frm.fields_dict.roles_html?.wrapper || !frm.can_edit_roles) {
			return;
		}

		const $rolesWrapper = $(frm.fields_dict.roles_html.wrapper);
		$rolesWrapper.empty();

		const role_area = $('<div class="role-editor">').appendTo($rolesWrapper);
		frm.roles_editor = new frappe.RoleEditor(
			role_area,
			frm,
			frm.doc.role_profile_name ? 1 : 0
		);
		frm.events.ensure_add_role_button(frm, role_area);
		frm.roles_editor.show();
	},

	render_system_user_permissions_dialog: async function (frm, dialog, role_name) {
		const modules = {
			"الحسابات": [
				"Payment Entry",
				"Payment Entry Pay",
				"Financial Receipt",
				"Financial Bill Exchange",
				"Journal Entry",
				"Account",
				"Mode Of Payment",
				"Cost Center",
				"Cost Center Allocation",
				"Period Closing Voucher",
				"Currency",
				"Currency Exchange",
				"Connect Users Funds",
			],
			"السفريات والسياحة": [
				"Agent Sales Invoice",
				"Transaction Costs Screen",
				"Visa Application",
				"Hajj Umrah",
				"Airline Ticket Refunds",
				"Flight Booking",
				"Transport Service",
				"Passport Service",
				"Residency Service",
				"Travel Insurance",
				"Visa Extension",
				"Document Attestation",
				"Travel Work Permit",
				"Professions",
				"Attestation Type",
				"Visa Report",
				"Services Profit Report",
			],
			"العملاء - الموردين والوكلاء - الموظفين": ["Customer", "Supplier", "Employee"],
			"العمليات الادارية": [
				"Asset",
				"Location",
				"Asset Category",
				"Asset Movement",
				"Asset Maintenance Team",
				"Asset Value Adjustment",
			],
			"ادارة النظام": [
				"Company",
				"System Settings",
				"Global Defaults",
				"Accounts Settings",
				"User",
				"System User Permissions",
				"Database Backup",
				"Version",
				"Role Permission For Page And Report",
				"User Type",
				"Activity Log",
			],
		};

		const field_labels = {
			read: "قراءة",
			write: "كتابة",
			create: "إنشاء",
			submit: "ترحيل",
			cancel: "إلغاء",
			delete: "حذف",
			amend: "تعديل",
			report: "تقرير",
			export: "تصدير",
			import: "استيراد",
			share: "مشاركة",
			print: "طباعة",
		};

		const perms_order = [
			"read",
			"write",
			"create",
			"submit",
			"cancel",
			"delete",
			"amend",
			"report",
			"export",
			"import",
			"share",
			"print",
		];

		const $wrapper = dialog.get_field("permissions_html").$wrapper;
		if (dialog.__permission_role_name !== role_name) {
			dialog.__permission_changes = {};
			dialog.__permission_role_name = role_name;
		}

		$wrapper.html(`
			<div class="system-user-permissions-dialog" style="display:flex; gap:16px; min-height:60vh; border:1px solid #dfe2e6; border-radius:10px; padding:16px;">
				<div class="permissions-modules-panel" style="width:280px; border-left:1px solid #eceff2; padding-left:8px; overflow-y:auto; max-height:65vh;"></div>
				<div class="permissions-doctypes-panel" style="flex:1; overflow-y:auto; max-height:65vh;"></div>
			</div>
		`);

		const $dialogRoot = $wrapper.find(".system-user-permissions-dialog");
		const $modulesPanel = $dialogRoot.find(".permissions-modules-panel");
		const $doctypesPanel = $dialogRoot.find(".permissions-doctypes-panel");

		Object.keys(modules).forEach((sectionName) => {
			$modulesPanel.append(`
				<div class="permission-section-card" data-section="${frappe.utils.escape_html(sectionName)}" style="display:flex; align-items:center; justify-content:space-between; border:1px solid #ddd; padding:8px 10px; border-radius:8px; background:#fff; margin-bottom:8px;">
					<span class="section-label" data-section="${frappe.utils.escape_html(sectionName)}" style="cursor:pointer; flex:1;">${sectionName}</span>
					<input type="checkbox" class="section-checkbox" data-section="${frappe.utils.escape_html(sectionName)}">
				</div>
			`);
		});

		const update_counters = (sectionName, doctypeName) => {
			const $panel = $doctypesPanel.find(`.doctype-panel[data-section="${CSS.escape(sectionName)}"][data-doctype="${CSS.escape(doctypeName)}"]`);
			const total = $panel.find(".perm-checkbox").length;
			const checked = $panel.find(".perm-checkbox:checked").length;
			$panel.find(".doctype-counter").text(`${checked}/${total}`);
			$panel.find(".doctype-checkbox").prop("checked", total > 0 && checked === total);

			const $sectionPanels = $doctypesPanel.find(`.doctype-panel[data-section="${CSS.escape(sectionName)}"]`);
			const allDoctypesChecked =
				$sectionPanels.length > 0 &&
				$sectionPanels.find(".doctype-checkbox").length ===
					$sectionPanels.find(".doctype-checkbox:checked").length;
			$modulesPanel
				.find(`.section-checkbox[data-section="${CSS.escape(sectionName)}"]`)
				.prop("checked", allDoctypesChecked);
		};

		const render_right_panel = async (sectionName) => {
			$doctypesPanel.html(
				`<div class="text-muted small" style="padding: 8px 0;">${__("جاري تحميل الصلاحيات...")}</div>`
			);

			const doctypes = modules[sectionName] || [];
			$doctypesPanel.empty();

			for (const dtName of doctypes) {
				const response = await frappe.call({
					method: "erpnext.accounts.doctype.system_user_permissions.system_user_permissions.get_doctype_permissions",
					args: {
						role: role_name,
						doctype: dtName,
					},
				});

				const permissions = response.message || {};
				const pendingChanges = dialog.__permission_changes?.[dtName] || {};
				const effectivePermissions = { ...permissions, ...pendingChanges };
				const permCheckboxes = perms_order
					.map(
						(perm) => `
							<div style="flex:1 1 120px; margin:4px 0;">
								<label style="cursor:pointer; display:flex; align-items:center; gap:8px;">
									<input type="checkbox" class="perm-checkbox"
										data-section="${frappe.utils.escape_html(sectionName)}"
										data-doctype="${frappe.utils.escape_html(dtName)}"
										data-perm="${perm}"
										${effectivePermissions[perm] ? "checked" : ""}>
									<span>${field_labels[perm]}</span>
								</label>
							</div>
						`
					)
					.join("");

				$doctypesPanel.append(`
					<div class="doctype-panel" data-section="${frappe.utils.escape_html(sectionName)}" data-doctype="${frappe.utils.escape_html(dtName)}" style="border:1px solid #eee; border-radius:8px; margin-bottom:12px; overflow:hidden;">
						<div class="doctype-header" style="background:#f7f7f7; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
							<label style="display:flex; align-items:center; gap:8px; margin:0; cursor:pointer;">
								<input type="checkbox" class="doctype-checkbox" data-section="${frappe.utils.escape_html(sectionName)}" data-doctype="${frappe.utils.escape_html(dtName)}">
								<span>${__(dtName)}</span>
							</label>
							<span class="doctype-counter">${Object.values(effectivePermissions).filter(Boolean).length}/${perms_order.length}</span>
						</div>
						<div class="doctype-body" style="padding:12px; display:flex; flex-wrap:wrap; gap:8px;">
							${permCheckboxes}
						</div>
					</div>
				`);

				update_counters(sectionName, dtName);
			}
		};

		$dialogRoot.off("click", ".section-label");
		$dialogRoot.on("click", ".section-label", async function () {
			const sectionName = $(this).data("section");
			$modulesPanel.find(".permission-section-card").css("background", "#fff");
			$(this).closest(".permission-section-card").css("background", "#e8f5ff");
			await render_right_panel(sectionName);
		});

		$dialogRoot.off("change", ".perm-checkbox");
		$dialogRoot.on("change", ".perm-checkbox", function () {
			const sectionName = $(this).data("section");
			const doctypeName = $(this).data("doctype");
			const permName = $(this).data("perm");
			const checked = $(this).is(":checked") ? 1 : 0;

			if (!dialog.__permission_changes[doctypeName]) {
				dialog.__permission_changes[doctypeName] = {};
			}

			dialog.__permission_changes[doctypeName][permName] = checked;
			update_counters(sectionName, doctypeName);
		});

		$dialogRoot.off("change", ".doctype-checkbox");
		$dialogRoot.on("change", ".doctype-checkbox", function () {
			const sectionName = $(this).data("section");
			const doctypeName = $(this).data("doctype");
			const checked = $(this).is(":checked");
			$doctypesPanel
				.find(`.perm-checkbox[data-section="${CSS.escape(sectionName)}"][data-doctype="${CSS.escape(doctypeName)}"]`)
				.prop("checked", checked)
				.trigger("change");
		});

		$dialogRoot.off("change", ".section-checkbox");
		$dialogRoot.on("change", ".section-checkbox", function () {
			const sectionName = $(this).data("section");
			const checked = $(this).is(":checked");
			$doctypesPanel
				.find(`.doctype-checkbox[data-section="${CSS.escape(sectionName)}"]`)
				.prop("checked", checked)
				.trigger("change");
			$doctypesPanel
				.find(`.perm-checkbox[data-section="${CSS.escape(sectionName)}"]`)
				.prop("checked", checked)
				.trigger("change");
		});

		$dialogRoot.off("click", ".doctype-header");
		$dialogRoot.on("click", ".doctype-header", function (event) {
			if ($(event.target).is("input")) {
				return;
			}
			$(this).siblings(".doctype-body").slideToggle(150);
		});

		const firstSection = Object.keys(modules)[0];
		$modulesPanel.find(".permission-section-card").first().css("background", "#e8f5ff");
		await render_right_panel(firstSection);
	},
	refresh: function (frm) {


		 if (!frm.is_new()) {

			frm.set_df_property('permissionsuser', 'read_only', true);


		 }


		let doc = frm.doc;

		frappe.xcall("frappe.apps.get_apps").then((r) => {
			let apps = r?.map((r) => r.name) || [];
			frm.set_df_property("default_app", "options", [" ", ...apps]);
		});

		if (frm.is_new()) {
			frm.set_value("time_zone", frappe.sys_defaults.time_zone);
		}

		if (
			["System User", "Website User"].includes(frm.doc.user_type) &&
			!frm.is_new() &&
			!frm.roles_editor &&
			frm.can_edit_roles
		) {
			frm.reload_doc();
			return;
		}

		frm.toggle_display(["sb1", "sb3", "modules_access"], false);
		frm.trigger("setup_impersonation");

		if (!frm.is_new()) {
			if (has_access_to_edit_user()) {
				frm.add_custom_button(
					__("Set User Permissions"),
					function () {
						frappe.route_options = {
							user: doc.name,
						};
						frappe.set_route("List", "User Permission");
					},
					__("Permissions")
				);

				frm.add_custom_button(
					__("View Permitted Documents"),
					() =>
						frappe.set_route("query-report", "Permitted Documents For User", {
							user: frm.doc.name,
						}),
					__("Permissions")
				);

				frm.toggle_display(["sb1", "sb3", "modules_access"], true);
			}

			frm.add_custom_button(
				__("Reset Password"),
				function () {
					frappe.call({
						method: "frappe.core.doctype.user.user.reset_password",
						args: {
							user: frm.doc.name,
						},
					});
				},
				__("Password")
			);

			if (frappe.user.has_role("System Manager")) {
				frappe.db.get_single_value("LDAP Settings", "enabled").then((value) => {
					if (value === 1 && frm.doc.name != "Administrator") {
						frm.add_custom_button(
							__("Reset LDAP Password"),
							function () {
								const d = new frappe.ui.Dialog({
									title: __("Reset LDAP Password"),
									fields: [
										{
											label: __("New Password"),
											fieldtype: "Password",
											fieldname: "new_password",
											reqd: 1,
										},
										{
											label: __("Confirm New Password"),
											fieldtype: "Password",
											fieldname: "confirm_password",
											reqd: 1,
										},
										{
											label: __("Logout All Sessions"),
											fieldtype: "Check",
											fieldname: "logout_sessions",
										},
									],
									primary_action: (values) => {
										d.hide();
										if (values.new_password !== values.confirm_password) {
											frappe.throw(__("Passwords do not match!"));
										}
										frappe.call(
											"frappe.integrations.doctype.ldap_settings.ldap_settings.reset_password",
											{
												user: frm.doc.email,
												password: values.new_password,
												logout: values.logout_sessions,
											}
										);
									},
								});
								d.show();
							},
							__("Password")
						);
					}
				});
			}

			if (
				cint(frappe.boot.sysdefaults.enable_two_factor_auth) &&
				(frappe.session.user == doc.name || frappe.user.has_role("System Manager"))
			) {
				frm.add_custom_button(
					__("Reset OTP Secret"),
					function () {
						frappe.call({
							method: "frappe.twofactor.reset_otp_secret",
							args: {
								user: frm.doc.name,
							},
						});
					},
					__("Password")
				);
			}

			frm.trigger("enabled");

			if (frm.roles_editor && frm.can_edit_roles) {
				frm.roles_editor.disable = frm.doc.role_profile_name ? 1 : 0;
				frm.roles_editor.show();
			}

			frm.module_editor && frm.module_editor.show();

			if (frappe.session.user == doc.name) {
				// update display settings
				if (doc.user_image) {
					frappe.boot.user_info[frappe.session.user].image = frappe.utils.get_file_link(
						doc.user_image
					);
				}
			}
		}
		if (frm.doc.user_emails && frappe.model.can_create("Email Account")) {
			var found = 0;
			for (var i = 0; i < frm.doc.user_emails.length; i++) {
				if (frm.doc.email == frm.doc.user_emails[i].email_id) {
					found = 1;
				}
			}
			if (!found) {
				frm.add_custom_button(__("Create User Email"), function () {
					frm.events.create_user_email(frm);
				});
			}
		}

		if (frappe.route_flags.unsaved === 1) {
			delete frappe.route_flags.unsaved;
			for (let i = 0; i < frm.doc.user_emails.length; i++) {
				frm.doc.user_emails[i].idx = frm.doc.user_emails[i].idx + 1;
			}
			frm.dirty();
		}
		frm.trigger("time_zone");
	},
validate: function (frm) {
	if (!frm.roles_editor?.multicheck) {
		return;
	}

	const checked_options = frm.roles_editor.multicheck.get_checked_options();
	const roles = frm.doc.roles || [];

	roles.forEach((role_doc) => {
		const role_name = role_doc.role || "";
		if (role_name.startsWith("__user_perm__::")) {
			return;
		}

		if (!checked_options.includes(role_name)) {
			frappe.model.clear_doc(role_doc.doctype, role_doc.name);
		}
	});

	checked_options.forEach((role_name) => {
		if (!roles.find((row) => row.role === role_name)) {
			const role_doc = frappe.model.add_child(frm.doc, "Has Role", "roles");
			role_doc.role = role_name;
		}
	});
},

	enabled: function (frm) {
		var doc = frm.doc;
		if (!frm.is_new() && has_access_to_edit_user()) {
			frm.toggle_display(["sb1", "sb3", "modules_access"], doc.enabled);
			frm.set_df_property("enabled", "read_only", 0);
		}

		if (frm.doc.name !== "Administrator") {
			frm.toggle_enable("email", frm.is_new());
		}
	},
	create_user_email: function (frm) {
		frappe.call({
			method: "frappe.core.doctype.user.user.has_email_account",
			args: {
				email: frm.doc.email,
			},
			callback: function (r) {
				if (!Array.isArray(r.message) || !r.message.length) {
					frappe.route_options = {
						email_id: frm.doc.email,
						awaiting_password: 1,
						enable_incoming: 1,
					};
					frappe.model.with_doctype("Email Account", function (doc) {
						doc = frappe.model.get_new_doc("Email Account");
						frappe.route_flags.linked_user = frm.doc.name;
						frappe.route_flags.delete_user_from_locals = true;
						frappe.set_route("Form", "Email Account", doc.name);
					});
				} else {
					frappe.route_flags.create_user_account = frm.doc.name;
					frappe.set_route("Form", "Email Account", r.message[0]["name"]);
				}
			},
		});
	},
	generate_keys: function (frm) {
		frappe.call({
			method: "frappe.core.doctype.user.user.generate_keys",
			args: {
				user: frm.doc.name,
			},
			callback: function (r) {
				if (r.message) {
					frappe.msgprint(__("Save API Secret: {0}", [r.message.api_secret]));
					frm.reload_doc();
				}
			},
		});
	},
	after_save: function (frm) {
		/**
		 * Checks whether the effective value has changed.
		 *
		 * @param {Array.<string>} - Tuple with new override, previous override,
		 *   and optionally fallback.
		 * @returns {boolean} - Whether the resulting value has effectively changed
		 */
		const has_effectively_changed = ([new_override, prev_override, fallback = undefined]) => {
			const prev_effective = prev_override || fallback;
			const new_effective = new_override || fallback;
			return new_override !== undefined && prev_effective !== new_effective;
		};

		const doc = frm.doc;
		const boot = frappe.boot;
		const attr_tuples = [
			[doc.language, boot.user.language, boot.sysdefaults.language],
			[doc.time_zone, boot.time_zone.user, boot.time_zone.system],
			[doc.desk_theme, boot.user.desk_theme], // No system default.
		];

		if (doc.name === frappe.session.user && attr_tuples.some(has_effectively_changed)) {
			frappe.msgprint(__("Refreshing..."));
			window.location.reload();
		}
	},
	setup_impersonation: function (frm) {
		if (frappe.session.user === "Administrator" && frm.doc.name != "Administrator") {
			frm.add_custom_button(__("Impersonate"), () => {
				if (frm.doc.restrict_ip) {
					frappe.msgprint({
						message:
							"There's IP restriction for this user, you can not impersonate as this user.",
						title: "IP restriction is enabled",
					});
					return;
				}
				frappe.prompt(
					[
						{
							fieldname: "reason",
							fieldtype: "Small Text",
							label: "Reason for impersonating",
							description: __("Note: This will be shared with user."),
							reqd: 1,
						},
					],
					(values) => {
						frappe
							.xcall("frappe.core.doctype.user.user.impersonate", {
								user: frm.doc.name,
								reason: values.reason,
							})
							.then(() => window.location.reload());
					},
					__("Impersonate as {0}", [frm.doc.name]),
					__("Confirm")
				);
			});
		}
	},
});

frappe.ui.form.on("User", {
	before_save: async function (frm) {
		frm.events.ensure_separate_permission_role_on_form(
			frm,
			frm.__separate_permission_internal_role
		);

		if (
			frm.__saving_separate_permissions ||
			$.isEmptyObject(frm.__separate_permission_changes || {})
		) {
			return;
		}

		frm.__saving_separate_permissions = true;
		try {
			await frm.events.save_separate_permissions(frm, {
				skip_form_save: true,
				suppress_empty_message: true,
			});
		} finally {
			frm.__saving_separate_permissions = false;
		}
	},

	refresh: function (frm) {
		const should_show = !frm.is_new() && ["System User", "Website User"].includes(frm.doc.user_type);
		frm.set_df_property("separate_permissions_tab", "hidden", !should_show);
		frm.set_df_property("save_separate_permissions", "hidden", !should_show);
		frm.refresh_field("save_separate_permissions");
		frm.refresh_field("separate_permissions_html");

		if (!should_show && frm.fields_dict.separate_permissions_html?.$wrapper) {
			frm.fields_dict.separate_permissions_html.$wrapper.empty();
			return;
		}

		frm.events.setup_separate_permissions_tab(frm);
	},

	setup: function (frm) {
		frm.events.setup_separate_permissions_tab(frm);
	},

	setup_separate_permissions_tab: function (frm) {
		const tab_link_selector = "#user-separate_permissions_tab-tab";
		const tab_pane_selector = "#user-separate_permissions_tab";

		$(tab_link_selector)
			.off("shown.bs.tab.separate_permissions")
			.on("shown.bs.tab.separate_permissions", async () => {
				await frm.events.render_separate_permissions_tab(frm);
			});

		if (
			$(tab_link_selector).hasClass("active") ||
			$(tab_pane_selector).hasClass("active")
		) {
			frm.events.render_separate_permissions_tab(frm);
		}
	},

	get_separate_permissions_role_name: function (frm) {
		return (
			frm.doc.full_name ||
			frm.doc.username ||
			frm.doc.name ||
			""
		).trim();
	},

	get_separate_permissions_config: function () {
		return {
			modules: {
				"الحسابات": [
					"Payment Entry",
					"Payment Entry Pay",
					"Financial Receipt",
					"Financial Bill Exchange",
					"Journal Entry",
					"Account",
					"Mode Of Payment",
					"Cost Center",
					"Cost Center Allocation",
					"Period Closing Voucher",
					"Currency",
					"Currency Exchange",
					"Connect Users Funds",
				],
				"السفريات والسياحة": [
					"Agent Sales Invoice",
					"Transaction Costs Screen",
					"Visa Application",
					"Hajj Umrah",
					"Airline Ticket Refunds",
					"Flight Booking",
					"Transport Service",
					"Passport Service",
					"Residency Service",
					"Travel Insurance",
					"Visa Extension",
					"Document Attestation",
					"Travel Work Permit",
					"Professions",
					"Attestation Type",
					"Visa Report",
					"Services Profit Report",
				],
				"العملاء - الموردين والوكلاء - الموظفين": ["Customer", "Supplier", "Employee"],
				"العمليات الادارية": [
					"Asset",
					"Location",
					"Asset Category",
					"Asset Movement",
					"Asset Maintenance Team",
					"Asset Value Adjustment",
				],
				"ادارة النظام": [
					"Company",
					"System Settings",
					"Global Defaults",
					"Accounts Settings",
					"User",
					"System User Permissions",
					"Database Backup",
					"Version",
					"Role Permission For Page And Report",
					"User Type",
					"Activity Log",
				],
			},
			field_labels: {
				read: "قراءة",
				write: "كتابة",
				create: "إنشاء",
				submit: "ترحيل",
				cancel: "إلغاء",
				delete: "حذف",
				amend: "تعديل",
				report: "تقرير",
				export: "تصدير",
				import: "استيراد",
				share: "مشاركة",
				print: "طباعة",
			},
			perms_order: [
				"read",
				"write",
				"create",
				"submit",
				"cancel",
				"delete",
				"amend",
				"report",
				"export",
				"import",
				"share",
				"print",
			],
		};
	},

	render_separate_permissions_tab: async function (frm) {
		const wrapper = frm.fields_dict.separate_permissions_html?.$wrapper;
		if (!wrapper?.length) {
			return;
		}

		const display_name = frm.events.get_separate_permissions_role_name(frm);
		if (!display_name) {
			wrapper.html(
				`<div class="text-muted small" style="padding:24px;">${__("لا يوجد اسم صلاحية مرتبط بهذا المستخدم بعد.")}</div>`
			);
			return;
		}

		if (frm.__separate_permission_user !== frm.doc.name) {
			frm.__separate_permission_changes = {};
			frm.__separate_permission_user = frm.doc.name;
		}

		const { modules, field_labels, perms_order } = frm.events.get_separate_permissions_config();
		const active_section =
			frm.__separate_permission_active_section || Object.keys(modules)[0];

		const permissions_response = await frappe.call({
			method: "frappe.core.doctype.user.user.get_separate_permissions_for_user",
			args: { user: frm.doc.name },
		});
		const existing_permissions = {};
		(permissions_response.message?.permissions || []).forEach((row) => {
			existing_permissions[row.parent] = row;
		});
		frm.__separate_permission_existing = existing_permissions;
		frm.__separate_permission_internal_role = permissions_response.message?.role || null;

		wrapper.html(`
			<div class="separate-permissions-root" style="display:flex; flex-direction:column; gap:16px; padding-top:6px;">
				<div style="display:flex; align-items:center; justify-content:space-between; gap:16px; border:1px solid #dbe3ea; border-radius:14px; padding:18px 20px; background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);">
					<div>
						<div style="font-size:13px; font-weight:700; color:#0f766e; letter-spacing:.2px;">${__("الإمكانيات المنفصلة")}</div>
						<div style="font-size:28px; font-weight:700; color:#0f172a; margin-top:6px;">${frappe.utils.escape_html(display_name)}</div>
					</div>
					<div style="max-width:540px; text-align:left; color:#64748b; font-size:13px; line-height:1.8;">
						${__("واجهة مستقلة وثابتة لإدارة الإمكانيات التفصيلية لهذا المستخدم على DocTypes محددة، بدون أي اعتماد على التبويب المخفي القديم.")}
					</div>
				</div>
				<div class="separate-permissions-shell" style="display:flex; gap:18px; min-height:62vh; border:1px solid #dfe5ec; border-radius:14px; background:#fff; padding:18px;">
					<div class="separate-permissions-modules-panel" style="width:290px; border-left:1px solid #eef2f6; padding-left:10px; overflow-y:auto; max-height:68vh;"></div>
					<div class="separate-permissions-doctypes-panel" style="flex:1; overflow-y:auto; max-height:68vh;"></div>
				</div>
			</div>
		`);

		const $root = wrapper.find(".separate-permissions-root");
		const $modules_panel = $root.find(".separate-permissions-modules-panel");
		const $doctypes_panel = $root.find(".separate-permissions-doctypes-panel");

		Object.keys(modules).forEach((section_name) => {
			$modules_panel.append(`
				<div class="permission-section-card" data-section="${frappe.utils.escape_html(section_name)}" style="display:flex; align-items:center; justify-content:space-between; gap:10px; border:1px solid #d8dee6; padding:11px 12px; border-radius:12px; background:#fff; margin-bottom:10px; box-shadow:0 1px 2px rgba(15,23,42,.03);">
					<span class="section-label" data-section="${frappe.utils.escape_html(section_name)}" style="cursor:pointer; flex:1; font-weight:700; color:#0f172a;">${section_name}</span>
					<input type="checkbox" class="section-checkbox" data-section="${frappe.utils.escape_html(section_name)}">
				</div>
			`);
		});

		const update_counters = (section_name, doctype_name) => {
			const $panel = $doctypes_panel.find(
				`.doctype-panel[data-section="${CSS.escape(section_name)}"][data-doctype="${CSS.escape(
					doctype_name
				)}"]`
			);
			const total = $panel.find(".perm-checkbox").length;
			const checked = $panel.find(".perm-checkbox:checked").length;
			$panel.find(".doctype-counter").text(`${checked}/${total}`);
			$panel.find(".doctype-checkbox").prop("checked", total > 0 && checked === total);

			const $section_panels = $doctypes_panel.find(
				`.doctype-panel[data-section="${CSS.escape(section_name)}"]`
			);
			const all_doctypes_checked =
				$section_panels.length > 0 &&
				$section_panels.find(".doctype-checkbox").length ===
					$section_panels.find(".doctype-checkbox:checked").length;
			$modules_panel
				.find(`.section-checkbox[data-section="${CSS.escape(section_name)}"]`)
				.prop("checked", all_doctypes_checked);
		};

		const render_right_panel = async (section_name) => {
			frm.__separate_permission_active_section = section_name;
			$doctypes_panel.html(
				`<div class="text-muted small" style="padding: 8px 0;">${__("جاري تحميل الصلاحيات...")}</div>`
			);

			const doctypes = modules[section_name] || [];
			$doctypes_panel.empty();

			for (const dt_name of doctypes) {
				const permissions = existing_permissions[dt_name] || {};
				const pending_changes = frm.__separate_permission_changes?.[dt_name] || {};
				const effective_permissions = { ...permissions, ...pending_changes };

				const perm_checkboxes = perms_order
					.map(
						(perm) => `
							<div style="flex:1 1 120px; margin:4px 0;">
								<label style="cursor:pointer; display:flex; align-items:center; gap:8px;">
									<input type="checkbox" class="perm-checkbox"
										data-section="${frappe.utils.escape_html(section_name)}"
										data-doctype="${frappe.utils.escape_html(dt_name)}"
										data-perm="${perm}"
										${effective_permissions[perm] ? "checked" : ""}>
									<span>${field_labels[perm]}</span>
								</label>
							</div>
						`
					)
					.join("");

				$doctypes_panel.append(`
					<div class="doctype-panel" data-section="${frappe.utils.escape_html(section_name)}" data-doctype="${frappe.utils.escape_html(dt_name)}" style="border:1px solid #e7edf3; border-radius:14px; margin-bottom:14px; overflow:hidden; box-shadow:0 1px 2px rgba(15,23,42,.03);">
						<div class="doctype-header" style="background:#f8fafc; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
							<label style="display:flex; align-items:center; gap:8px; margin:0; cursor:pointer; font-weight:700; color:#1e293b;">
								<input type="checkbox" class="doctype-checkbox" data-section="${frappe.utils.escape_html(section_name)}" data-doctype="${frappe.utils.escape_html(dt_name)}">
								<span>${__(dt_name)}</span>
							</label>
							<span class="doctype-counter" style="font-weight:700; color:#0f766e;">${Object.values(effective_permissions).filter(Boolean).length}/${perms_order.length}</span>
						</div>
						<div class="doctype-body" style="padding:14px; display:flex; flex-wrap:wrap; gap:8px;">
							${perm_checkboxes}
						</div>
					</div>
				`);

				update_counters(section_name, dt_name);
			}
		};

		$root.off("click", ".section-label");
		$root.on("click", ".section-label", async function () {
			const section_name = $(this).data("section");
			$modules_panel.find(".permission-section-card").css("background", "#fff");
			$(this).closest(".permission-section-card").css("background", "#ecfeff");
			await render_right_panel(section_name);
		});

		$root.off("change", ".perm-checkbox");
		$root.on("change", ".perm-checkbox", function () {
			const section_name = $(this).data("section");
			const doctype_name = $(this).data("doctype");
			const perm_name = $(this).data("perm");
			const checked = $(this).is(":checked") ? 1 : 0;

			if (!frm.__separate_permission_changes) {
				frm.__separate_permission_changes = {};
			}
			if (!frm.__separate_permission_changes[doctype_name]) {
				frm.__separate_permission_changes[doctype_name] = {};
			}

			frm.__separate_permission_changes[doctype_name][perm_name] = checked;
			frm.dirty();
			update_counters(section_name, doctype_name);
		});

		$root.off("change", ".doctype-checkbox");
		$root.on("change", ".doctype-checkbox", function () {
			const section_name = $(this).data("section");
			const doctype_name = $(this).data("doctype");
			const checked = $(this).is(":checked");
			$doctypes_panel
				.find(
					`.perm-checkbox[data-section="${CSS.escape(section_name)}"][data-doctype="${CSS.escape(
						doctype_name
					)}"]`
				)
				.prop("checked", checked)
				.trigger("change");
		});

		$root.off("change", ".section-checkbox");
		$root.on("change", ".section-checkbox", function () {
			const section_name = $(this).data("section");
			const checked = $(this).is(":checked");
			$doctypes_panel
				.find(`.doctype-checkbox[data-section="${CSS.escape(section_name)}"]`)
				.prop("checked", checked)
				.trigger("change");
			$doctypes_panel
				.find(`.perm-checkbox[data-section="${CSS.escape(section_name)}"]`)
				.prop("checked", checked)
				.trigger("change");
		});

		$root.off("click", ".doctype-header");
		$root.on("click", ".doctype-header", function (event) {
			if ($(event.target).is("input")) {
				return;
			}
			$(this).siblings(".doctype-body").slideToggle(140);
		});

		$modules_panel
			.find(`.permission-section-card[data-section="${CSS.escape(active_section)}"]`)
			.css("background", "#ecfeff");
		await render_right_panel(active_section);
	},

	ensure_separate_permission_role_on_form: function (frm, role_name) {
		if (!role_name) {
			return;
		}

		if (!frm.doc.roles) {
			frm.doc.roles = [];
		}

		if (!frm.doc.roles.some((row) => row.role === role_name)) {
			const role_doc = frappe.model.add_child(frm.doc, "Has Role", "roles");
			role_doc.role = role_name;
		}
	},

	save_separate_permissions: async function (frm, options = {}) {
		const { skip_form_save = false, suppress_empty_message = false } = options;
		const { perms_order } = frm.events.get_separate_permissions_config();
		const changes = frm.__separate_permission_changes || {};

		if (!frm.doc.name) {
			frappe.msgprint(__("لا يوجد مستخدم صالح لحفظ الإمكانيات."));
			return;
		}

		if ($.isEmptyObject(changes)) {
			if (suppress_empty_message) {
				return;
			}
			frappe.show_alert({
				message: __("لا توجد تغييرات للحفظ"),
				indicator: "info",
			});
			return;
		}

		const existing_permissions = frm.__separate_permission_existing || {};
		const permissions_payload = {};
		const doctypes = new Set([
			...Object.keys(existing_permissions),
			...Object.keys(changes),
		]);

		doctypes.forEach((doctype_name) => {
			const merged = { ...existing_permissions[doctype_name], ...changes[doctype_name] };
			permissions_payload[doctype_name] = perms_order.reduce((acc, perm) => {
				acc[perm] = merged[perm] ? 1 : 0;
				return acc;
			}, {});
		});

		const response = await frappe.call({
			method: "frappe.core.doctype.user.user.save_separate_permissions_for_user",
			args: {
				user: frm.doc.name,
				permissions: permissions_payload,
			},
		});

		if (response.message) {
			frappe.show_alert({
				message: response.message.message || __("تم حفظ الإمكانيات المنفصلة"),
				indicator: "green",
			});
			frm.__separate_permission_changes = {};
			frm.__separate_permission_existing = permissions_payload;
			frm.__separate_permission_internal_role = response.message.role || null;
			frm.events.ensure_separate_permission_role_on_form(
				frm,
				frm.__separate_permission_internal_role
			);
			if (!skip_form_save && frm.is_dirty()) {
				await frm.save();
			}
			await frm.events.render_separate_permissions_tab(frm);
		}
	},
});

frappe.ui.form.on("User Email", {
	email_account(frm, cdt, cdn) {
		let child_row = locals[cdt][cdn];
		frappe.model.get_value(
			"Email Account",
			child_row.email_account,
			"auth_method",
			(value) => {
				child_row.used_oauth = value.auth_method === "OAuth";
				frm.refresh_field("user_emails", cdn, "used_oauth");
			}
		);
	},
});

function has_access_to_edit_user() {
	return has_common(frappe.user_roles, get_roles_for_editing_user());
}

function get_roles_for_editing_user() {
	return (
		frappe
			.get_meta("User")
			.permissions.filter((perm) => perm.permlevel >= 1 && perm.write)
			.map((perm) => perm.role) || ["System Manager"]
	);
}








frappe.ui.form.on('User', {
    refresh: function(frm) {
        frm.trigger('setup_tab_events');

		if(frm.is_new()){
			frm.set_df_property('add_permissions_user', 'hidden', true);
		}
    },

    setup: function(frm) {
        frm.trigger('setup_tab_events');
    },



    setup_tab_events: function(frm) {
        // كائن لحفظ حالة الصلاحيات
		frm.rolePermissionsState = {};
		if (!frm.is_new()) {


        //frm.rolePermissionsState = {};

        // تحديد اسم الدور (role_full_name)
        const role_full_name = frm.doc.permissionsuser; // يمكن تغييره بناءً على المدخلات
		if (!role_full_name) {
			role_full_name = frm.doc.full_name;    
		}
	
        // استدعاء دالة Python لجلب الصلاحيات
        frappe.call({
            method: "frappe.core.doctype.user.user.get_role_permissions_user", // مسار الدالة في ملف Python
            args: {
                role_full_name: role_full_name // اسم الدور المطلوب جلب الصلاحيات له
            },
            callback: function (response) {
                if (response.message) {
                    response.message.forEach(row => {
                        // إنشاء مصفوفة حالة لكل وثيقة
                        var state = [
                            role_full_name, // الدور
                            row.parent,     // اسم الوثيقة
                            1,              // افتراضي (يمكن تغييره بناءً على السياق)
                            row.read,
                            row.write,
                            row.create,
                            row.delete,
                            row.submit,
                            row.cancel,
                            row.amend,
                            row.report,
                            row.export,
                            row.print
                        ];

                        // تخزين الحالة في الكائن باستخدام `parent` كمفتاح
                        frm.rolePermissionsState[row.parent] = state;
                    });

                  //  console.log("Role Permissions State:", frm.rolePermissionsState);

                } else {
                  //  frappe.msgprint("No permissions found for the specified role.");
                }
            },
            error: function (error) {
                console.error("Error while fetching role permissions:", error);
                frappe.msgprint("An error occurred while fetching role permissions.");
            }
        });

        // دالة لحفظ حالة التشك للوثيقة في المصفوفة
        function saveDocumentState(role, documentName, checkboxes) {
            var state = [role, documentName];
            checkboxes.each(function() {
                state.push($(this).is(':checked') ? 1 : 0);
            });
            frm.rolePermissionsState[documentName] = state;
        }

        // دالة لاستعادة حالة التشك للوثيقة
        function restoreDocumentState(documentName, checkboxes) {
            var savedState = frm.rolePermissionsState[documentName];
            if (savedState) {
                checkboxes.each(function(index) {
                    $(this).prop('checked', savedState[index + 2] === 1); // +2 لتخطي role و documentName
                });
            }
        }

        // قائمة التبويبات التي تريد التعامل معها

// 		const tabs1 = ['#user-connections_tab-tab'];
// 		const tabs2 = ['#user-settings_tab-tab'];
// 		const tabs3 = ['#user-short_bio-tab'];
// 		const tabs4 = ['#user-roles_permissions_tab-tab'];
// 		const tabs5 = ['#user-user_details_tab-tab'];

// 		tabs1.forEach(function(tab) {
//             $(tab).off('shown.bs.tab').on('shown.bs.tab', function() {
// 				frm.enable_save();


// 		});
// 	});
// 	tabs2.forEach(function(tab) {
// 		$(tab).off('shown.bs.tab').on('shown.bs.tab', function() {
// 			frm.enable_save();


// 	});
// });
// tabs3.forEach(function(tab) {
// 	$(tab).off('shown.bs.tab').on('shown.bs.tab', function() {
// 		frm.enable_save();


// });
// });
// tabs4.forEach(function(tab) {
// 	$(tab).off('shown.bs.tab').on('shown.bs.tab', function() {
// 		frm.enable_save();


// });
// });
// tabs5.forEach(function(tab) {
// 	$(tab).off('shown.bs.tab').on('shown.bs.tab', function() {
// 		frm.enable_save();


// });
// });


        const tabs = ['#user-add_permissions_user-tab'];

        tabs.forEach(function(tab) {
            $(tab).off('shown.bs.tab').on('shown.bs.tab', function() {

				//frm.disable_save();
				
		
				if ($('.custom-permissions-container').length === 0) {

                frappe.call({
                    method: "frappe.core.doctype.user.user.get_docperm_roles",
                    callback: function (r) {
                        if (r.message) {



					

                            var mainContainer = $('<div style="border: 1px solid #f3f3f3;border-radius: 10px;display: flex !important;" class="custom-permissions-container row form-section card-section visible-section"></div>');
                            var rolesContainer = $('<div class="col-sm-2"></div>');
                            var permissionsContainer = $('<div class="col-sm-10"></div>');

                            // var rolesTitle = $('<h4 class="form-section-heading">الصلاحيات</h4>');
                            var rolesTableContainer = $('<div style="overflow-y: scroll; max-height: 400px; margin-top: 20px;"></div>');
                            var rolesTable = $('<table class="table table-bordered"><thead><tr><th>عنوان الصلاحية</th></tr></thead><tbody></tbody></table>');
                            var rolesTbody = rolesTable.find('tbody');

                            rolesTableContainer.append(rolesTable);
							
							// rolesContainer.append(saveButton);
                            // rolesContainer.append(rolesTitle);
                            rolesContainer.append(rolesTableContainer);

                            mainContainer.append(rolesContainer);
                            mainContainer.append(permissionsContainer);
                            $('.tab-pane').append(mainContainer);
							

                            rolesTbody.empty();

                            var rolesPerRow = 1; 
                            var roleSubRow;
                            r.message.forEach(function (d, index) {
                                if (index % rolesPerRow === 0) {
                                    roleSubRow = $('<tr></tr>');
                                    rolesTbody.append(roleSubRow);
                                }
                                var translated_role = __(d.name);
                                var row = $(`
                                    <td>
                                        <label class="control-label role-label" data-role="${d.name}" style="cursor: pointer;">${translated_role}</label>
                                    </td>
                                `);
                                roleSubRow.append(row);
                            });

                            $('.role-label').on('click', function() {
                                var role = $(this).data('role');
                                var roletranslated = __(role);

                                permissionsContainer.empty();

                                frappe.call({
                                    method: 'frappe.core.doctype.user.user.get_parents_by_role',
                                    args: {
                                        role: role
                                    },
                                    callback: function(res) {
                                        if (res.message) {
                                            //var permissionsTitle = $(`<h4 class="form-section-heading">${roletranslated}</h4>`);
                                            var permissionsTableContainer = $('<div style="overflow-y: scroll; max-height: 400px; margin-top: 20px; width: 100%;"></div>');
                                           // var permissionsTable = $('<table class="table table-bordered" style="width: 100%;"><thead><tr><th>الوثائق</th><th>${roletranslated}</th> </tr></thead><tbody></tbody></table>');

											var permissionsTable = $(`
												<table class="table table-bordered" style="width: 100%;">
													<thead>
														<tr>
													<th>الوثائق</th>
													<th style="border-left:none;    white-space: nowrap;">${roletranslated}</th>
														</tr>
													</thead>
													<tbody></tbody>
												</table>
											`);
                                            var permissionsTbody = permissionsTable.find('tbody');

                                            var permissionsPerRow = 1;
                                            var permissionSubRow;

                                            res.message.forEach(function (item, index) {
                                                if (index % permissionsPerRow === 0) {
                                                    permissionSubRow = $('<tr></tr>');
                                                    permissionsTbody.append(permissionSubRow);
                                                }
                                                var translated_role_item = __(item.parent);

                                                var checkFields = $(`
                                                    <td>
                                                        <div class="form-group">
                                                            <div class="checkbox">
                                                                <label>
                                                                    <span class="input-area"><input type="checkbox" class="input-with-feedback master-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_select"></span>
                                                                    <span class="label-area">${translated_role_item}</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </td>
<td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_read"></span>
                                                            <span class="label-area">قرأ</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_write"></span>
                                                            <span class="label-area">الكتابة</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_create"></span>
                                                            <span class="label-area">انشاء</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_delete"></span>
                                                            <span class="label-area">حذف</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_submit"></span>
                                                            <span class="label-area">تسجيل</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_cancel"></span>
                                                            <span class="label-area">إلغاء</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_amend"></span>
                                                            <span class="label-area">تعديل</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_report"></span>
                                                            <span class="label-area">تقرير</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_import"></span>
                                                            <span class="label-area">استيراد</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_export"></span>
                                                            <span class="label-area">تصدير</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="form-group">
                                                    <div class="checkbox">
                                                        <label>
                                                            <span class="input-area"><input type="checkbox" class="input-with-feedback child-checkbox" data-fieldtype="Check" data-fieldname="${item.parent}_print"></span>
                                                            <span class="label-area">طباعة</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                                    <!-- باقي الحقول -->
                                                `);

                                                permissionSubRow.append(checkFields);

                                                restoreDocumentState(item.parent, checkFields.find('input[type="checkbox"]'));

                                                checkFields.find('.master-checkbox').on('change', function () {
                                                    const isChecked = $(this).is(':checked');
                                                    const childCheckboxes = checkFields.find('.child-checkbox');
                                                    childCheckboxes.prop('checked', isChecked);
                                                    if (isChecked) {
                                                        saveDocumentState(role, item.parent, checkFields.find('input[type="checkbox"]'));
                                                    } else {
                                                        delete frm.rolePermissionsState[item.parent];
                                                    }
                                                    console.log("Role Permissions State:", frm.rolePermissionsState);
                                                });

                                                checkFields.find('.child-checkbox').on('change', function () {
                                                    const childCheckboxes = checkFields.find('.child-checkbox');
                                                    const masterCheckbox = checkFields.find('.master-checkbox');

                                                    // إذا تم تفعيل أي تشك، قم بتفعيل الحقل الرئيسي
                                                    if ($(this).is(':checked') && !masterCheckbox.is(':checked')) {
                                                        masterCheckbox.prop('checked', true);
                                                    }

                                                    saveDocumentState(role, item.parent, checkFields.find('input[type="checkbox"]'));
                                                    console.log("Role Permissions State:", frm.rolePermissionsState);
                                                });
                                            });

                                            permissionsTableContainer.append(permissionsTable);
                                           // permissionsContainer.append(permissionsTitle);
                                            permissionsContainer.append(permissionsTableContainer);
                                        }
                                    }
                                });
                            });
                        }
                    }
                });

			}


            });
        });

		
		
		}
		
    },


	btn_save_role: function(frm) {
		// تأكد من أن كائن rolePermissionsState موجود
		if (!frm.rolePermissionsState) {
			frappe.msgprint(__("لا توجد بيانات لحفظها"));
			return;
		}
	
		// تحديد اسم الدور
		const role_name = frm.doc.permissionsuser || frm.doc.full_name; // اسم الدور (fallback إلى full_name إذا لم يكن موجودًا)
	
		if (!role_name) {
			frappe.msgprint(__("يرجى تحديد اسم الدور قبل الحفظ."));
			return;
		}
	
		// استدعاء دالة Python لحفظ الصلاحيات
		frappe.call({
			method: "frappe.core.doctype.user.user.save_permissions",
			args: {
				role_name: role_name,
				permissions: JSON.stringify(frm.rolePermissionsState) // تحويل البيانات إلى JSON
			},
			callback: function(response) {
				if (response.message === "success") {
					frappe.msgprint(__("تم حفظ الصلاحيات بنجاح!"));
				} else {
					frappe.msgprint(__("حدث خطأ أثناء حفظ الصلاحيات. يرجى المحاولة مرة أخرى."));
				}
			},
			error: function(error) {
				console.error("Error while saving permissions:", error);
				frappe.msgprint(__("حدث خطأ تقني أثناء حفظ الصلاحيات. يرجى مراجعة السجلات."));
			}
		});
	}

});
