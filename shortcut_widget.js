// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

// page container
frappe.provide("frappe.pages");
frappe.provide("frappe.views");

window.cur_page = null;
frappe.views.Container = class  {
	// Container contains pages inside `#container` and manages page creation, switching
	constructor() {
		this.container = $("#body").get(0);
		this.page = null; // current page
		this.pagewidth = $(this.container).width();
		this.pagemargin = 50;

		var me = this;

		$(document).on("page-change", function () {
			// set data-route in body
			var route_str = frappe.get_route_str();
			$("body").attr("data-route", route_str);
			$("body").attr("data-sidebar", me.has_sidebar() ? 1 : 0);
		});

		$(document).bind("rename", function (event, dt, old_name, new_name) {
			frappe.breadcrumbs.rename(dt, old_name, new_name);
		});

		$(document).on("click.workspace-tabs-overflow", (event) => {
			if (!$(event.target).closest(".workspace-tabs-overflow-btn, .workspace-tabs-overflow-menu").length) {
				this.hide_workspace_tabs_overflow_menu();
			}
		});

		$(window).on("resize.workspace-tabs-overflow", () => {
			this.hide_workspace_tabs_overflow_menu();
			this.update_workspace_tabs_controls();
		});
	}
	ensure_overflow_tabs_button() {
		let topButtons = $("#page-Workspaces .layout-main .top-buttons");
		if (!topButtons.length) return;

		topButtons.off("scroll.workspace-tabs-overflow").on("scroll.workspace-tabs-overflow", () => {
			this.hide_workspace_tabs_overflow_menu();
			this.update_workspace_tabs_controls();
		});

		if (!topButtons.find(".workspace-tabs-overflow-btn").length) {
			let overflowButton = $(`
				<div class="workspace-tabs-overflow-btn workspace-tabs-control-btn" title="${__("Hidden Tabs")}" aria-label="${__("Hidden Tabs")}" style="position: sticky; right: 21px; top: 0px; z-index: 8; margin-left: auto; margin-right: 0px; margin-top: 0px; margin-bottom: 0px; width: 22px; min-width: 22px; height: 31px; border-radius: 0px; background: linear-gradient(180deg, #ffffff 0%, #f4fbfc 100%); color: #005a63; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px rgb(0 90 99 / 14%), 0 5px 14px rgb(0 0 0 / 14%); user-select: none;">
					<svg style="width: 14px; height: 14px;" class="es-icon" aria-hidden="true">
						<use href="#es-line-align-justify"></use>
					</svg>
					<span class="workspace-tabs-overflow-count" style="position: absolute; top: -5px; left: -4px; min-width: 15px; height: 14px; align-content: center; padding: 0 4px; border-radius: 999px; background: #ffffff; color: #005a63; font-size: 10px; line-height: 16px; font-weight: 700; text-align: center; box-shadow: 0 2px 8px rgb(0 0 0 / 12%); display: none;"></span>
				</div>
			`);

			overflowButton.on("click", (event) => {
				event.stopPropagation();
				this.toggle_workspace_tabs_overflow_menu();
			});

			let closeAllButton = topButtons.find(".close-all-tabs-btn");
			if (closeAllButton.length) {
				closeAllButton.before(overflowButton);
			} else {
				topButtons.append(overflowButton);
			}
		}

		this.update_workspace_tabs_overflow_button_state();
	}

	ensure_close_all_tabs_button() {
		let topButtons = $("#page-Workspaces .layout-main .top-buttons");
		if (!topButtons.length) return;

		if (!topButtons.find(".close-all-tabs-btn").length) {
			let closeAllButton = $(`
				<div class="close-all-tabs-btn workspace-tabs-control-btn" title="${__("Close All Tabs")}" aria-label="${__("Close All Tabs")}" style="position: sticky; right: 0px; top: 0px; z-index: 8; margin-right: 0px; margin-top: 0px; margin-bottom: 0px; width: 22px; min-width: 22px; height: 31px; border-radius: 0px 10px 0px 0px; background: linear-gradient(180deg, #ffffff 0%, #f4fbfc 100%); color: #005a63; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px rgb(0 90 99 / 14%), 0 5px 14px rgb(0 0 0 / 14%); user-select: none;">
					<svg style="width: 14px; height: 14px;" class="es-icon" aria-hidden="true">
						<use href="#es-line-close"></use>
					</svg>
				</div>
			`);

			closeAllButton.on("click", () => {
				this.close_all_workspace_tabs();
			});

			topButtons.append(closeAllButton);
		}

		this.ensure_overflow_tabs_button();
		this.update_workspace_tabs_controls();
	}

	get_hidden_workspace_tabs() {
		let topButtons = $("#page-Workspaces .layout-main .top-buttons");
		if (!topButtons.length) return [];

		let topButtonsElement = topButtons.get(0);
		let topButtonsRect = topButtonsElement.getBoundingClientRect();
		let controlsWidth = 0;
		topButtons.find(".workspace-tabs-control-btn").each(function () {
			controlsWidth += this.getBoundingClientRect().width;
		});

		let visibleLeft = topButtonsRect.left + 4;
		let visibleRight = topButtonsRect.right - controlsWidth - 0;

		return topButtons
			.find(".nav-btn-os")
			.toArray()
			.filter((tab) => {
				let rect = tab.getBoundingClientRect();
				return rect.left < visibleLeft || rect.right > visibleRight;
			});
	}
	format_workspace_tab_label(label) {
		if (!label) return "";

		let statusLabel = null;
		if (label.includes("List")) {
			statusLabel = "List";
		} else if (label.includes("Report")) {
			statusLabel = "Report";
		} else if (label.includes("Dashboard")) {
			statusLabel = "Dashboard";
		}

		let cleanedLabel = label
			.replace(/\/?List\/?/g, "")
			.replace(/\/?Report\/?/g, "")
			.replace(/\/?Dashboard\/?/g, "")
			.replace(/\//g, " ")
			.replace(/\s+/g, " ")
			.trim();

		if (statusLabel && cleanedLabel) {
			return `${__(statusLabel)} ${__(cleanedLabel)}`.trim();
		}

		return cleanedLabel || label;
	}
	get_workspace_tab_display_label(tab) {
		let tabElement = $(tab);
		let anchor = tabElement.find('a[data-href], a[type="Link"], .onboard-spotlight').first();

		let storedLabel = tabElement.attr("data-tab-label") || anchor.attr("data-label");
		if (storedLabel && storedLabel.trim()) {
			return storedLabel.trim();
		}

		let visibleText = anchor.text().replace(/\s+/g, " ").trim();
		if (visibleText) {
			return visibleText;
		}

		let fallbackLabel =
			anchor.attr("title") ||
			anchor.attr("data-href") ||
			tabElement.attr("data-tab-label") ||
			tabElement.attr("data-tap_id") ||
			"";

		if (!fallbackLabel) {
			let tabClassName =
				(tab.className || "")
					.split(" ")
					.find((className) => className.startsWith("div-")) || "";
			let safeLabel = tabClassName.replace(/^div-/, "");
			if (safeLabel) {
				let relatedPage = $(`.sub-layout-main-section-wrapper .page-${safeLabel}`).first();
				fallbackLabel =
					relatedPage.attr("data-page-route") ||
					relatedPage.attr("page-name-cl") ||
					relatedPage.attr("id") ||
					safeLabel;
			}
		}

		if (fallbackLabel && fallbackLabel.startsWith("page-")) {
			fallbackLabel = fallbackLabel.replace(/^page-/, "");
		}

		let finalLabel = this.format_workspace_tab_label(fallbackLabel) || __("Untitled Tab");
		tabElement.attr("data-tab-label", finalLabel);
		anchor.attr("data-label", finalLabel);

		return finalLabel;
	}
	update_workspace_tabs_overflow_button_state() {
		let topButtons = $("#page-Workspaces .layout-main .top-buttons");
		let overflowButton = topButtons.find(".workspace-tabs-overflow-btn");
		if (!overflowButton.length) return;

		let hiddenTabs = this.get_hidden_workspace_tabs();
		let hiddenCount = hiddenTabs.length;
		let counter = overflowButton.find(".workspace-tabs-overflow-count");

		overflowButton.css({
			opacity: hiddenCount ? "1" : "0.45",
			cursor: hiddenCount ? "pointer" : "not-allowed",
		});
		overflowButton.attr("aria-disabled", hiddenCount ? "false" : "true");

		if (hiddenCount) {
			counter.text(hiddenCount > 9 ? "9+" : hiddenCount).css("display", "block");
		} else {
			counter.css("display", "none");
		}
	}
	update_workspace_tabs_controls() {
		this.update_close_all_tabs_button_state();
		this.update_workspace_tabs_overflow_button_state();
	}
	move_workspace_tab_to_front(tab) {
		let topButtons = $("#page-Workspaces .layout-main .top-buttons");
		if (!topButtons.length || !tab) return;

		let currentTab = $(tab);
		let firstTab = topButtons.find(".nav-btn-os").first();

		if (!firstTab.length || firstTab.get(0) === currentTab.get(0)) {
			topButtons.scrollLeft(0);
			this.update_workspace_tabs_controls();
			return;
		}

		currentTab.insertBefore(firstTab);
		topButtons.scrollLeft(0);
		this.update_workspace_tabs_controls();
	}
	hide_workspace_tabs_overflow_menu() {
		$(".workspace-tabs-overflow-menu").remove();
		$(".workspace-tabs-overflow-btn").removeClass("is-open");
	}
	toggle_workspace_tabs_overflow_menu() {
		let topButtons = $("#page-Workspaces .layout-main .top-buttons");
		let overflowButton = topButtons.find(".workspace-tabs-overflow-btn");
		if (!overflowButton.length) return;

		if (overflowButton.hasClass("is-open")) {
			this.hide_workspace_tabs_overflow_menu();
			return;
		}

		let hiddenTabs = this.get_hidden_workspace_tabs();
		if (!hiddenTabs.length) return;

		this.hide_workspace_tabs_overflow_menu();
		overflowButton.addClass("is-open");

		let menu = $(`<div class="workspace-tabs-overflow-menu" style="position: fixed; min-width: 240px; max-width: 320px; max-height: 320px; overflow-y: auto; padding: 8px; border-radius: 14px; background: #ffffff; box-shadow: 0 18px 42px rgb(0 0 0 / 18%), inset 0 0 0 1px rgb(0 90 99 / 10%); z-index: 1100;"></div>`);

		hiddenTabs.forEach((tab) => {
			let anchor = $(tab).find('a[data-href], a[type="Link"], .onboard-spotlight').first();
			let title = this.get_workspace_tab_display_label(tab);
			let menuItem = $(`
				<button type="button" style="width: 100%; border: 0; background: transparent; text-align: right; padding: 9px 12px; border-radius: 10px; color: #10343a; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
					${title}
				</button>
			`);

			menuItem.on("mouseenter", function () {
				$(this).css("background", "#f4fbfc");
			});
			menuItem.on("mouseleave", function () {
				$(this).css("background", "transparent");
			});
			menuItem.on("click", () => {
				this.move_workspace_tab_to_front(tab);
				anchor.trigger("click");
				this.hide_workspace_tabs_overflow_menu();
			});

			menu.append(menuItem);
		});

		$("body").append(menu);

		let rect = overflowButton.get(0).getBoundingClientRect();
		let menuWidth = 260;
		let left = Math.max(12, rect.right - menuWidth);
		if (left + menuWidth > window.innerWidth - 12) {
			left = window.innerWidth - menuWidth - 12;
		}

		menu.css({
			top: `${rect.bottom + 8}px`,
			left: `${left}px`,
		});
	}
	update_close_all_tabs_button_state() {
		let topButtons = $("#page-Workspaces .layout-main .top-buttons");
		let closeAllButton = topButtons.find(".close-all-tabs-btn");
		if (!closeAllButton.length) return;

		let hasTabs = topButtons.find(".nav-btn-os").length > 0;
		closeAllButton.css({
			opacity: hasTabs ? "1" : "0.45",
			cursor: hasTabs ? "pointer" : "not-allowed",
		});
		closeAllButton.attr("aria-disabled", hasTabs ? "false" : "true");
	}
	close_all_workspace_tabs() {
		let topButtons = $("#page-Workspaces .layout-main .top-buttons");
		if (!topButtons.find(".nav-btn-os").length) return;

		$(document).trigger("page-change");
		$(".sub-layout-main-section-wrapper .page-container").hide();
		topButtons.find(".nav-btn-os").remove();
		this.hide_workspace_tabs_overflow_menu();
		this.update_workspace_tabs_controls();
	}
	add_page(label) {
		var page = $('<div class="content page-container"></div>')
			.attr("id", "page-" + label)
			.attr("data-page-route", label)
			.hide()
			.appendTo(this.container)
			.get(0);
		page.label = label;
		frappe.pages[label] = page;

		return page;
	}
	// change_to(label) {
	// 	cur_page = this;
	// 	let page;
	// 	if (label.tagName) {
	// 		// if sent the div, get the table
	// 		page = label;
	// 	} else {
	// 		page = frappe.pages[label];
	// 	}
	// 	if (!page) {
	// 		console.log(__("Page not found") + ": " + label);
	// 		return;
	// 	}

	// 	// hide dialog
	// 	if (window.cur_dialog && cur_dialog.display && !cur_dialog.keep_open) {
	// 		if (!cur_dialog.minimizable) {
	// 			cur_dialog.hide();
	// 		} else if (!cur_dialog.is_minimized) {
	// 			cur_dialog.toggle_minimize();
	// 		}
	// 	}

	// 	// hide current
	// 	if (this.page && this.page != page) {
	// 		$(this.page).hide();
	// 		$(this.page).trigger("hide");
	// 	}

	// 	// show new
	// 	if (!this.page || this.page != page) {
	// 		this.page = page;
	// 		// $(this.page).fadeIn(300);
	// 		$(this.page).show();
	// 	}

	// 	$(document).trigger("page-change");

	// 	this.page._route = frappe.router.get_sub_path();
	// 	$(this.page).trigger("show");
	// 	!this.page.disable_scroll_to_top && frappe.utils.scroll_to(0);
	// 	frappe.breadcrumbs.update();

	// 	return this.page;
	// }
	change_to(label) {
		cur_page = this;
		let page;
		if (label.tagName) {
			page = label; // إذا تم تمرير عنصر HTML، نستخدمه كما هو
		} else {
			page = frappe.pages[label]; // البحث عن الصفحة داخل Frappe
		}
	
		if (!page) {
			console.log(__("Page not found") + ": " + label);
			return;
		}
	
		// ✅ إذا كانت الصفحة الحالية هي "Workspaces"، لا نخفيها، فقط نغيّر المحتوى
		if ($("#page-Workspaces").length && label !== "Workspaces") {

			console.log(`🔄 تغيير محتوى #page-Workspaces: ${label}`);

			
			// container.find(".page-container").addClass(`page-${label}`);
			// $("#page-Workspaces .sub-layout-main-section-wrapper .page-container").removeClass(`sub-layout-main-section-wrapper`);
			// إضافة الصفحة الجديدة داخل Workspaces
			let tap_id = label.replace(/\/?Dashboard\/?/, "").replace(/\/?Report\/?/, "").replace(/\/?List\/?/g, "").replace(/[ /]/g, "-").replace(/-/g, " ");
			let safe_label = label.replace(/[ /]/g, "-");
			let display_label = label.replace(/\/?List\/?/g, "").replace(/\/?Report\/?/, "").replace(/\/?Dashboard\/?/, "").replace(/\//g, " ");
			let lable_if = label.replace(/\/?List\/?/, "");
			// let display_label = label.replace(/\/?List\/?/, "").replace(/\/?Report\/?/, "").replace(/\/?Dashboard\/?/, "").replace(/\//g, " ");
			// let display_label = label.replace(/\/?List\/?/g, "").replace(/\//g, " ");
			let page_btn_status = $(`#page-Workspaces .layout-main .top-buttons`);
			let page_name = null;
			if (page_btn_status.find(`.active_sup_btn_top`).length){
				page_name = $(`#page-Workspaces .layout-main .top-buttons .active_sup_btn_top`).attr("page");
			} else {
				page_name = $(`#page-Workspaces .layout-main .top-buttons .active_btn_top`).attr("page");
			}
			// افترضنا أن 'page' و 'page_name' متغيرات معرّفة مسبقاً
			const printPage = $(page).attr('data-page-route');

			// إذا كانت الصفحة هي صفحة الطباعة
			if (printPage === 'print') {
				// إنشاء عنصر الدايلوج
				const dialogContainer = document.createElement('div');
				dialogContainer.className = 'print-dialog-container';
				dialogContainer.style.cssText = `
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background-color: rgb(0 0 0 / 67%);
					display: flex;
					justify-content: center;
					align-items: center;
					z-index: 1050;
				`;
				
				// إنشاء محتوى الدايلوج
				const dialogContent = document.createElement('div');
				dialogContent.className = 'print-dialog-content';
				dialogContent.style.cssText = `
					background-color: white;
					border-radius: 8px;
					box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
					width: 90%;
					max-width: 1000px;
					max-height: 90vh;
					overflow: hidden;
					animation: dialog-fade-in 0.3s ease-out;
					overflow-y: scroll;
				`;

				// إنشاء زر الإغلاق
				const closeButton = document.createElement('button');
				closeButton.className = 'print-dialog-close';
				closeButton.innerHTML = '&times;';
				closeButton.style.cssText = `
					position: absolute;
					top: 15px;
					right: 15px;
					background: none;
					border: none;
					font-size: 1.5rem;
					cursor: pointer;
					color: #666;
					z-index: 10;
				`;
				
				// إضافة عناصر الصفحة الأصلية إلى الدايلوج
				dialogContent.append(closeButton, page);
				$(page).show().addClass(page_name).attr('page-name-cl', `${page_name}`);
				dialogContainer.append(dialogContent);

				// إضافة الدايلوج إلى body بدلاً من العنصر الداخلي
				document.body.appendChild(dialogContainer);

				
				
				// وظيفة إغلاق الدايلوج
				function closeDialog() {
					document.body.removeChild(dialogContainer);
					// إعادة الصفحة إلى مكانها الأصلي إذا لزم الأمر
				}

				// إضافة مستمع الأحداث لزر الإغلاق
				closeButton.addEventListener('click', closeDialog);

				// إغلاق الدايلوج عند النقر خارج المحتوى
				dialogContainer.addEventListener('click', function(e) {
					if (e.target === dialogContainer) {
						closeDialog();
					}
				});

				// إغلاق الدايلوج عند الضغط على زر Escape
				document.addEventListener('keydown', function(e) {
					if (e.key === 'Escape') {
						closeDialog();
					}
				});
			} else {
				$("#page-Workspaces .sub-layout-main-section-wrapper .page-container").hide();
				$(page).find(`.layout-side-section`).css("display", "none");
				// إذا لم تكن صفحة الطباعة، أضف الصفحة بشكل عادي
				$("#page-Workspaces .sub-layout-main-section-wrapper").append($(page).show().addClass(page_name).attr('page-name-cl', `${page_name}`));
			}
			// $("#page-Workspaces .sub-layout-main-section-wrapper").append($(page).show().addClass(`${page_name}`));
			// $("#page-Workspaces .sub-layout-main-section-wrapper").append($(page).show().addClass(`page-${safe_label}`));


			let topLinksContainer = $("#page-Workspaces .layout-main .top-buttons");
			this.ensure_close_all_tabs_button();

			let status_label = null;

			if (lable_if.includes("List")) {
				status_label = null;
				status_label = "List";
			}else if (lable_if.includes("Report")) {
				status_label = null;
				status_label = "Report";
			}else if (lable_if.includes("Dashboard")) {
				status_label = null;
				status_label = "Dashboard";
			}

			if (status_label !== null) {
				display_label = `${__(status_label)} ${__(display_label)}`;
			}
			
			// // التحقق من وجود الرابط مسبقًا
			if (!topLinksContainer.find(`[data-href='${label}']`).length) {
				let link = $(`
					<div data-tap_id=${tap_id} class="nav-btn-os div-${safe_label}" style="padding: 5px 5px 5px 07px; min-width: fit-content; margin-left: 7px; margin-top: 5px; border-radius: 2px 13px 0px 0px; box-shadow: inset -1px 0px 20px 6px hsl(0deg 0% 0% / 36%);">
						<a class="onboard-spotlight btn-${safe_label}" type="Link" title="${label}" data-href="${label}">
							
							${__(display_label)}
						</a>
						<a class="close-${safe_label}" style="cursor: pointer;">
							<svg style="width: 12px;" class="es-icon" aria-hidden="true">
								<use href="#es-small-close"></use>
							</svg>
						</a>
					</div>
				`);
				link.attr("data-tab-label", display_label);
				link.find('a[data-href], a[type="Link"], .onboard-spotlight').first().attr("data-label", display_label);
				
				// ✅ إضافة العنصر إلى القائمة
				// topLinksContainer.append(link);
				// topLinksContainer.prepend(link);

				// الكود الجديد  //
				topLinksContainer = $("#page-Workspaces .layout-main .top-buttons .new_btn_osama");
				let new_btn = $("#page-Workspaces .layout-main .top-buttons .new_btn");

				if (topLinksContainer.length) {
					let i = `${display_label}`;
					if (i === "Customize Form" || i === "DocType"){
						let ai = topLinksContainer.attr("data-tap-label");
						i = `${__(display_label)} ${ai}`;
					}
					i = `${__(i)}`;
					
					
					topLinksContainer.append(i);
					new_btn.removeClass("new_btn");
					new_btn.removeClass("hide");
					topLinksContainer.removeClass('new_btn_osama');
					console.log(`add tixt to btn`);
				} else if (new_btn.length) {
					new_btn.removeClass("new_btn");
					new_btn.removeClass("hide");
				}

				/////////////////////////////////////////////////

				// topLinksContainer.find(".nav-btn-os").css("background", "#0097a6");
				// topLinksContainer.find(`.div-${safe_label}`).css("background", "#fafafa");
				// topLinksContainer.find(".onboard-spotlight").attr("style", "color: #ffffff !important;");
				// topLinksContainer.find(`.btn-${safe_label}`).attr("style", "color: #000 !important;");
				

				
				// ✅ ربط الأحداث بعد التحميل الصحيح للصفحة
				topLinksContainer.on("click", `.btn-${safe_label}`, function (e) {
					e.preventDefault();
					
					// إعادة تعيين الخلفيات
					topLinksContainer.find(".onboard-spotlight").attr("style", "color: #ffffff !important;");
					$(this).closest(`.btn-${safe_label}`).attr("style", "color: #000 !important;");
					topLinksContainer.find(".nav-btn-os").css("background", "#0097a6");
					$(this).closest(".nav-btn-os").css("background", "#fafafa");
				
					// إخفاء جميع الصفحات وإظهار الصفحة المطلوبة
					$(".sub-layout-main-section-wrapper .page-container").hide();
					$(".sub-layout-main-section-wrapper").find(`.page-${safe_label}`).show();
				});
				
				$(`.close-${safe_label}`).on("click", () => {
					$(document).trigger("page-change");
					// إخفاء الصفحة وحذف العنصر
					$(".sub-layout-main-section-wrapper .page-container").hide();
					$('.top-buttons').find(`.div-${safe_label}`).remove();
					this.hide_workspace_tabs_overflow_menu();
					this.update_workspace_tabs_controls();
				});
				

			} else {
				let existingTab = topLinksContainer.find(`[data-href='${label}']`).closest(".nav-btn-os");
				existingTab.attr("data-tab-label", display_label);
				existingTab.find('a[data-href], a[type="Link"], .onboard-spotlight').first().attr("data-label", display_label);
				topLinksContainer.find(".nav-btn-os").css("background", "#0097a6");
				topLinksContainer.find(`.div-${safe_label}`).css("background", "#fafafa");
				topLinksContainer.find(".onboard-spotlight").attr("style", "color: #ffffff !important;");
				topLinksContainer.find(`.btn-${safe_label}`).attr("style", "color: #000 !important;");
			}

			// ✅ استخدام on() لربط الأحداث بعد تحميل الصفحة
			// $(page).appendTo(container).show();
			
			// let shoo = container.find(`.page-${label}`).removeClass("hidden");
			// تحديث عنوان الصفحة بدون تغيير المسار بالكامل
			document.title = page.label || "Workspaces";

			this.page = page;
			$(this.page).show();
			$(document).trigger("page-change");
		
			// this.page._route = frappe.router.get_sub_path();
			$(this.page).trigger("showalis");
			$(this.page).trigger("show_print");
			$(this.page).trigger("show-dashboard");
			$(`.sub-layout-main-section-wrapper .layout-side-section`).css("display", "none");
			this.ensure_close_all_tabs_button();

		
			// لا نُعيد الصفحة إلى الأعلى إذا كنا داخل Workspaces
			if (label !== "Workspaces") {
				!this.page.disable_scroll_to_top && frappe.utils.scroll_to(0);
			}

			frappe.breadcrumbs.update();
	
			return;
		}
	
		// 🔹 إذا لم تكن في Workspaces، استخدم النظام العادي
		// if (this.page && this.page !== page) {
		// 	$(this.page).hide();
		// 	$(this.page).trigger("hide");
		// }
	
		this.page = page;
		$(this.page).show();
		
		let safe_label = label.replace(/[ /]/g, "-");
		$(this.page).addClass(`page-${safe_label}`);
		if (label !== "Workspaces"){
			console.log("❌ تم ايجاد عنصر الخطاء المطلوب");
			$(this.page).addClass(`page_not_in_sub_list`);
		}
		$(document).trigger("page-change");
	
		this.page._route = frappe.router.get_sub_path();
		$(this.page).trigger("show");
		$(this.page).trigger("showalis");
		$(this.page).trigger("show_print");
		$(this.page).trigger("show-dashboard");
	
		// لا نُعيد الصفحة إلى الأعلى إذا كنا داخل Workspaces
		if (label !== "Workspaces") {
			!this.page.disable_scroll_to_top && frappe.utils.scroll_to(0);
		}
	
		frappe.breadcrumbs.update();

		
		$(".sidebar-child-item").addClass("hidden");
		let a = $("#page-Workspaces .layout-main .osama");
		let ptn_sid_nav = $("header .container");
		if (a.find(".sub-layout-main-section-wrapper").length === 0) {
			ptn_sid_nav.prepend(`<button style="z-index: 1000000000; margin-right: 10px;" class="btn-reset sidebar_toggle_btn_os" aria-label="Toggle Sidebar" data-original-title="" title="">
							<svg class="es-icon icon-md sidebar-toggle-placeholder">
								<use href="#es-line-align-justify"></use>
							</svg>
						</button>`);
			ptn_sid_nav = $("#page-Workspaces .page-head .page-title");
			
			$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "flex");
			$("header .container").find(".sidebar_toggle_btn_os").click((e) => {
				if ($("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display") === "none") {
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display", "block");
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "flex");
				} else {
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display", "none");
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "none");
				}
				if ($("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .layout-main-sid").css("display") === "none") {
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .layout-main-sid").css("display", "block");
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .sub-layout-main-section-wrapper").css("max-width", "85%");
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .sub-layout-main-section-wrapper").css("max-width", "85%");
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .sub-layout-main-section-wrapper .top-buttons").css("margin-top", "20px");
				} else {
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .layout-main-sid").css("display", "none");
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .sub-layout-main-section-wrapper").css("max-width", "100%");
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .sub-layout-main-section-wrapper").css("width", "100%");
					$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .sub-layout-main-section-wrapper .top-buttons").css("margin-top", "0px");
				}
				let mainsidebar = $('#page-Workspaces .page-body .page-wrapper .page-content .layout-main');
				mainsidebar.find(".layout-main-section-wrapper").toggleClass("opened");
				// mainsidebar.find(".cl").toggleClass("close-sidebar");
				console.log("❌");
			});
			a.append(`<div class="sub-layout-main-section-wrapper" style="max-width: 85%; width: 85%; background-repeat: round; background-position-x: left;"></div>`);
			let b = $("#page-Workspaces .layout-main .sub-layout-main-section-wrapper");
			b.append(`<div class="top-buttons" style="margin-bottom: 10px; margin-top: 20px; border-radius: 10px 10px 0px 0px; overflow-x: scroll; scrollbar-width: none; display: flex; direction: ltr; background-color: #0097a6; max-width: 100%; width: 100%;"></div>`);
			this.ensure_close_all_tabs_button();
		}

		/////////////////////////////////////////////////////////////////////
		let err_page = document.getElementsByClassName("page_not_in_sub_list");
		if (err_page){
			let elements = document.getElementsByClassName("page-container");
			let targetWrapper = document.getElementsByClassName("sub-layout-main-section-wrapper")[0];
	
	
			if (!targetWrapper) {
				console.log(`❌ لم يتم العثور على العنصر المستهدف: .sub-layout-main-section-wrapper ${label}`);
				if (label === "dashboard-view") {
					frappe.set_route('home');
				}else if (label === "print") {
					frappe.set_route('home');
				}
				
				return;
			} else {
				console.log(`✅ تم العثور على العنصر المستهدف: .sub-layout-main-section-wrapper ${label}`);
			}
	
			if (elements.length === 0) {
				console.log("❌ لم يتم العثور على أي عناصر 'page-container'");
				return;
			}
	
			// البحث عن أول عنصر لا يحتوي على .sub-layout-main-section-wrapper
			let elementWithoutWrapper = Array.from(elements).find(element =>
				!element.querySelector('.sub-layout-main-section-wrapper')
			);
	
			if (!elementWithoutWrapper) {
				console.log(`❌ لم يتم العثور على أي عنصر 'page-container' يحتاج إلى نقل`);
				return;
			}
	
			let elementId = elementWithoutWrapper.id || "بدون ID";
	
			// تحديد حالة العنصر إذا كان List, Report, أو Dashboard
			let status_label_s = null;
			if (elementId.includes("List")) {
				status_label_s = "List";
			} else if (elementId.includes("Report")) {
				status_label_s = "Report";
			} else if (elementId.includes("Dashboard")) {
				status_label_s = "Dashboard";
			}
	
			let zip_label_s = elementId.replace(/\/?Dashboard\/?/, "")
				.replace(/^page-/, "")
				.replace(/\/?Report\/?/, "")
				.replace(/\/?List\/?/g, "")
				.replace(/[ /]/g, "-")
				.replace(/-/g, " ");
			let safe_label_s = elementId.replace(/[ /]/g, "-").replace(/^page-/, "");
			let data_h = elementId.replace(/^page-/, "");
	
			let display_label_s = elementId.replace(/\/?List\/?/g, "")
				.replace(/\/?Report\/?/, "")
				.replace(/\/?Dashboard\/?/, "")
				.replace(/\//g, " ")
				.replace(/^page-/, "");
	
			if (status_label_s !== null) {
				display_label_s = `${__(status_label_s)} ${__(display_label_s)}`;
			}
	
			let topLinksContainer_s = document.querySelector("#page-Workspaces .layout-main .top-buttons");
	
			let add_btn_tap = document.querySelector(".page_not_in_sub_list");
			if (add_btn_tap){
				console.log('ddddddddddddddddddd');
				if (!topLinksContainer_s) {
					console.log("❌ لم يتم العثور على قائمة الأزرار لإضافة الرابط");
				} else {
					let existingLink = topLinksContainer_s.querySelector(`[data-href='${data_h}']`);
					if (!existingLink) {
						let link = document.createElement("div");
						link.setAttribute("data-tap_id", zip_label_s);
						link.setAttribute("data-tab-label", display_label_s);
						link.className = `nav-btn-os div-${safe_label_s}`;
						link.style = "padding: 5px 5px 5px 7px; min-width: fit-content; margin-left: 7px; margin-top: 5px; border-radius: 2px 13px 0px 0px; box-shadow: rgba(0, 0, 0, 0.36) -1px 0px 20px 6px inset; background: rgb(250, 250, 250);";
		
						let anchor = document.createElement("a");
						anchor.className = `onboard-spotlight btn-${safe_label_s}`;
						anchor.setAttribute("type", "Link");
						anchor.setAttribute("title", data_h);
						anchor.setAttribute("data-href", data_h);
						anchor.setAttribute("data-label", display_label_s);
						anchor.style = "color: #000 !important;";
						anchor.textContent = __(display_label_s);
		
						let closeIcon = document.createElement("a");
						closeIcon.className = `close-${safe_label_s}`;
						closeIcon.style = "cursor: pointer;";
						closeIcon.innerHTML = `<svg style="width: 12px;" class="es-icon" aria-hidden="true"><use href="#es-small-close"></use></svg>`;
		
						link.appendChild(anchor);
						link.appendChild(closeIcon);
						topLinksContainer_s.appendChild(link);
						this.hide_workspace_tabs_overflow_menu();
						this.update_workspace_tabs_controls();
		
						console.log(`✅ تمت إضافة الرابط: ${display_label_s}`);
					} else {
						console.log(`⚠️ الرابط موجود بالفعل: ${display_label_s}`);
					}
				}
			}
	
			$(`.close-${safe_label_s}`).on("click", () => {
				$(`.sub-layout-main-section-wrapper .page-${safe_label_s}`).removeClass(`page_not_in_sub_list`);
				// إخفاء الصفحة وحذف العنصر
				$(".sub-layout-main-section-wrapper .page-container").hide();
				$('.top-buttons').find(`.div-${safe_label_s}`).remove();
				this.hide_workspace_tabs_overflow_menu();
				this.update_workspace_tabs_controls();
			});
	
			$(`.btn-${safe_label_s}`).on("click", () => {
				$(".sub-layout-main-section-wrapper .page-container").hide();
				
				console.log(`⚠️ تمت عمليت النقر  : ${display_label_s}`);
				// إعادة تعيين الخلفيات
				$('.top-buttons').find(".onboard-spotlight").attr("style", "color: #ffffff !important;");
				$('.top-buttons').find(`.btn-${safe_label_s}`).attr("style", "color: #000 !important;");
				$('.top-buttons').find(".nav-btn-os").css("background", "#0097a6");
				$('.top-buttons').find(`.div-${safe_label_s}`).css("background", "#fafafa");
			
				
				$(`.sub-layout-main-section-wrapper .page-${safe_label_s}`).show();
			});


			targetWrapper.appendChild(elementWithoutWrapper);
			console.log(`✅ تم نقل العنصر بنجاح داخل .sub-layout-main-section-wrapper ${label}`);
			$(`.sub-layout-main-section-wrapper .layout-side-section`).css("display", "none");
		} else {
			console.log(`✅ لم يتم ايجاد عنصر ليس في مكانه الصحيح  ${label}`);
		}
		/////////////////////////////////////////////////

		
		return this.page;
	}
	
	has_sidebar() {
		var flag = 0;
		var route_str = frappe.get_route_str();
		// check in frappe.ui.pages
		flag = frappe.ui.pages[route_str] && !frappe.ui.pages[route_str].single_column;

		// sometimes frappe.ui.pages is updated later,
		// so check the dom directly
		if (!flag) {
			var page_route = route_str.split("/").slice(0, 2).join("/");
			flag = $(`.page-container[data-page-route="${page_route}"] .layout-side-section`)
				.length
				? 1
				: 0;
		}

		return flag;
	}
};
