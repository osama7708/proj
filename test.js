









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

				if (frm.doc.user_type == "System User") {
					var module_area = $("<div>").appendTo(frm.fields_dict.modules_html.wrapper);
					frm.module_editor = new frappe.ModuleEditor(frm, module_area);
				}
			} else {
				frm.roles_editor.show();
			}
		}
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
    // تحديث أدوار المحرر إن وجد
    if (frm.roles_editor) {
        frm.roles_editor.set_roles_in_table();
    }

   

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



