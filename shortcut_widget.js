import Widget from "./base_widget.js";

frappe.provide("frappe.utils");

export default class ShortcutWidget extends Widget {
	constructor(opts) {
		opts.shadow = true;
		super(opts);
	}

	get_config() {
		return {
			name: this.name,
			icon: this.icon,
			label: this.label,
			format: this.format,
			link_to: this.link_to,
			doc_view: this.doc_view,
			color: this.color,
			restrict_to_domain: this.restrict_to_domain,
			stats_filter: this.stats_filter,
			type: this.type,
			url: this.url,
			kanban_board: this.kanban_board,
		};
	}

	setup_events() {
		let action_list = this.widget.find('.action-list');
		let action_widget = this.widget;
		if (this.doc_view == "New"){
			action_widget = this.widget.find('.widget-title')
			action_list.removeClass("hide")
			action_list.click((e) => {
				if (this.in_customize_mode) return;
	
				let route = frappe.utils.generate_route({
					route: this.route,
					name: this.link_to,
					type: this.type,
					is_query_report: this.is_query_report,
					doctype: this.ref_doctype,
					doc_view: 'List',
					kanban_board: this.kanban_board,
				});
	
				///app/blanket-order/new
				///app/blanket-order/view/list
	
				// shortcut_widget.js:51 route link_to Sales Invoice
	
				// route system /app/sales-invoice/new
				// shortcut_widget.js:50 route route undefined
				// shortcut_widget.js:52 route type DocType
				// shortcut_widget.js:53 route is_query_report undefined
				// shortcut_widget.js:54 route ref_doctype undefined
				// shortcut_widget.js:55 route doc_view New
				// shortcut_widget.js:56 route kanban_board null
	
				// route system /app/sales-invoice/view/list
	
	
	
				//////////////////////////////////////////////////////
				
				console.log(`click 1`);
				console.log(`route system ${route}`);
				console.log(`route route ${this.route}`);
				console.log(`route link_to ${this.link_to}`);
				console.log(`route type ${this.type}`);
				console.log(`route is_query_report ${this.is_query_report}`);
				console.log(`route ref_doctype ${this.ref_doctype}`);
				console.log(`route doc_view ${this.doc_view}`);
				console.log(`route kanban_board ${this.kanban_board}`);
				// if (lable_if.includes("/new")) {
				// 	console.log(`route system ${route}`);
				// 	route = route.replace(/\/?new\/?/g, "view/list")
				// }
	
				let tap_id = route.replace(/\/?view\/?/g, "/").replace(/\/?app\/?/g, "").replace(/\/?query-report\/?/, "").replace(/\/?dashboard\/?/, "").replace(/\/?report\/?/, "").replace(/\/?list\/?/g, "").replace(/[ /]/g, "-").replace(/-/g, " ");
				let safe_label = route.replace(/\/?view\/?/g, " ").replace(/\/?app\/?/g, "").replace(/\/?query-report\/?/, "").replace(/[ /]/g, "-");
				// let display_label = route.replace(/\/?view\/?/g, "/").replace(/\/?app\/?/g, "").replace(/\/?query-report\/?/, "").replace(/\/?list\/?/g, "").replace(/\/?report\/?/, "").replace(/\/?dashboard\/?/, "").replace(/-/g, " ");
				let display_label = this.link_to;
				display_label = display_label.split(' ').map(word => {
					return word.charAt(0).toUpperCase() +
					word.slice(1).toLowerCase();}).join(' ');
				let lable_if = route.replace(/\/?view\/?/g, "/").replace(/\/?app\/?/g, "").replace(/\/?List\/?/, "");
				
				let status_label = null;
	
				if (lable_if.includes("list")) {
					status_label = null;
					status_label = "List";
				}else if (lable_if.includes("Report")) {
					status_label = null;
					status_label = "Report";
				}else if (lable_if.includes("Dashboard")) {
					status_label = null;
					status_label = "Dashboard";
				}else if (lable_if.includes("query-report")) {
					status_label = null;
					status_label = "Report";
				}else if (lable_if.includes("new")) {
					status_label = null;
					status_label = "new";
				}
	
				if (route.includes("dashboard-view")){
					tap_id = tap_id.replace(/\/?dashboard-view\/?/g, "");
					safe_label = route.replace(/\/?app\/?/g, "").replace(/\/?dashboard-view\/?/g, "dashboard").replace(/[ /]/g, "-");
					display_label = display_label.replace(/\/?dashboard-view\/?/g, "").replace(/\/?[-/]\/?/g, "");
					lable_if = lable_if.replace(/\/?dashboard-view\/?/g, "");
					status_label = null;
					status_label = "dashboard";
				}
				
				if (route.includes("query-report")){
					tap_id = tap_id.replace(/\/?query-report\/?/g, "");
					safe_label = route.replace(/\/?app\/?/g, "").replace(/\/?query-report\/?/g, "Report ").replace(/[ ]/g, "-");
					status_label = null;
					status_label = "Report";
				}
				
				if (status_label == "new") {
					console.log(`click 1.1`);
					display_label = `${__(display_label)} ${__(status_label)}`;
				} else if (status_label !== null) {
					console.log(`click 1.2`);
					display_label = `${__(status_label)} ${__(display_label)}`;
				}
	
				let app_lap = `${__(this.link_to)}`;
				console.log(`app_lap v1 ${app_lap}`);
				let app = app_lap.replace(/ /g, "-");
				safe_label = safe_label.split(' ').map(word => {
					return word.charAt(0).toLowerCase() +
					word.slice(1).toLowerCase();}).join(' ');
				
				let topLinksContainer = $("#page-Workspaces .layout-main .top-buttons");
				if (!topLinksContainer.find(`[data-href='${safe_label}']`).length) {
					let link = $(`
						<div page="page-pa-${safe_label}" sup-name="null" name="pa-${app}" class="nav-btn-os div-${safe_label}">
							<div style="display: inline-flex;">
								<button style="vertical-align: text-bottom; padding: 0px; border: 0; background: #ffffff00; margin: 0px;" class="btn-top-op hidden">
									<svg class="es-icon es-line  icon-sm" style="stroke: #000000 !important;" aria-hidden="true">
										<use class="" href="#es-line-down"></use>
									</svg>
								</button>
								<a class="cl-btn btn-${safe_label}" type="Link" data-href="${safe_label}">
									${__(display_label)}
								</a>
								<a class="close-${safe_label} close-all" style="cursor: pointer;">
									<svg style="width: 12px;" class="es-icon" aria-hidden="true">
										<use href="#es-small-close"></use>
									</svg>
								</a>
							</div>
							<div style="position: absolute; z-index: 6800; background: #006d77;
										width: max-content; text-align: -webkit-center; background: #fafafa;
										padding: 6px; border-bottom: solid #ff9800 2px; border-top: solid #0097a6 2px;" class="ulSitBtn hidden ul-${__(app)}">
							</div>
						</div>
					`);
	
					link.find(".close-all").click((e) => {
						link.remove();
						let btn_page = $('#page-Workspaces .sub-layout-main-section-wrapper');
						if (btn_page.find(`.page-pa-${safe_label}`).length){
							console.log("true");
							btn_page = $(`#page-Workspaces .sub-layout-main-section-wrapper .page-pa-${safe_label}`).attr('page-name-cl');
							if (btn_page === `page-pa-${safe_label}`){
								btn_page = $('#page-Workspaces .sub-layout-main-section-wrapper');
								btn_page.find(`.page-pa-${safe_label}`).hide();
							}
						} else {
							console.log("false");
						}
					});
		
					link.find(".cl-btn").click((e) => {
						topLinksContainer.find(".nav-btn-os").removeClass("active_btn_top");
						topLinksContainer.find(".nav-btn-os").removeClass("active_sup_btn_top");
						link.attr("sup-name" , 'null');
						link.addClass("active_btn_top");
						frappe.set_route(route);
					});
	
					link.find(".btn-top-op").click((e) => {
						link.find(`.ulSitBtn`).toggleClass("hidden");
					});
	
					link.find(".ulSitBtn").hover(
						function () {
							link.find(`.ulSitBtn`).removeClass("hidden");
						},
						function () {
							link.find(`.ulSitBtn`).addClass("hidden");
						}
					);
		
					topLinksContainer.find(".nav-btn-os").removeClass("active_btn_top");
					topLinksContainer.find(".nav-btn-os").removeClass("active_sup_btn_top");
					link.addClass("active_btn_top");
					topLinksContainer.prepend(link);
					if (window.matchMedia("(max-width: 991px)").matches) {
						if ($("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display") === "none") {
							$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display", "block");
							$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "flex");
						} else {
							$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display", "none");
							$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "none");
						}
					
						let mainsidebar = $('#page-Workspaces .page-body .page-wrapper .page-content .layout-main');
						mainsidebar.find(".layout-main-section-wrapper").toggleClass("opened");
					}
				} else {
					topLinksContainer.find(".nav-btn-os").removeClass("active_btn_top");
					topLinksContainer.find(".nav-btn-os").removeClass("active_sup_btn_top");
					topLinksContainer.find(`.div-${safe_label}`).addClass("active_btn_top");
					if (window.matchMedia("(max-width: 991px)").matches) {
						if ($("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display") === "none") {
							$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display", "block");
							$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "flex");
						} else {
							$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display", "none");
							$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "none");
						}
					
						let mainsidebar = $('#page-Workspaces .page-body .page-wrapper .page-content .layout-main');
						mainsidebar.find(".layout-main-section-wrapper").toggleClass("opened");
					}
				}
	
	
				//////////////////////////////////////////////////////////////////////////////
	
				let filters = frappe.utils.get_filter_from_json(this.stats_filter);
				if (this.type == "DocType" && filters) {
					frappe.route_options = filters;
				}
	
				if (e.ctrlKey || e.metaKey) {
					frappe.open_in_new_tab = true;
				}
	
				if (this.type == "URL") {
					if (frappe.open_in_new_tab) {
						window.open(this.url, "_blank");
						frappe.open_in_new_tab = false;
					} else {
						window.location.href = this.url;
					}
					return;
				}
	
				frappe.set_route(route);
			});
		} else {
			action_list.remove();
		}

		
		action_widget.click((e) => {
			if (this.in_customize_mode) return;

			let route = frappe.utils.generate_route({
				route: this.route,
				name: this.link_to,
				type: this.type,
				is_query_report: this.is_query_report,
				doctype: this.ref_doctype,
				doc_view: this.doc_view,
				kanban_board: this.kanban_board,
			});

			///app/blanket-order/new
			///app/sales-invoice/view/list

			//////////////////////////////////////////////////////
			
			console.log(`click 1`);
			console.log(`route system ${route}`);

			let tap_id = route.replace(/\/?view\/?/g, "/").replace(/\/?app\/?/g, "").replace(/\/?query-report\/?/, "").replace(/\/?dashboard\/?/, "").replace(/\/?report\/?/, "").replace(/\/?list\/?/g, "").replace(/[ /]/g, "-").replace(/-/g, " ");
			let safe_label = route.replace(/\/?view\/?/g, " ").replace(/\/?app\/?/g, "").replace(/\/?query-report\/?/, "").replace(/[ /]/g, "-");
			// let display_label = route.replace(/\/?view\/?/g, "/").replace(/\/?app\/?/g, "").replace(/\/?query-report\/?/, "").replace(/\/?list\/?/g, "").replace(/\/?report\/?/, "").replace(/\/?dashboard\/?/, "").replace(/-/g, " ");
			let display_label = this.link_to;
			display_label = display_label.split(' ').map(word => {
				return word.charAt(0).toUpperCase() +
				word.slice(1).toLowerCase();}).join(' ');
			let lable_if = route.replace(/\/?view\/?/g, "/").replace(/\/?app\/?/g, "").replace(/\/?List\/?/, "");
			
			let status_label = null;

			if (lable_if.includes("list")) {
				status_label = null;
				status_label = "List";
			}else if (lable_if.includes("Report")) {
				status_label = null;
				status_label = "Report";
			}else if (lable_if.includes("Dashboard")) {
				status_label = null;
				status_label = "Dashboard";
			}else if (lable_if.includes("query-report")) {
				status_label = null;
				status_label = "Report";
			}else if (lable_if.includes("new")) {
				status_label = null;
				status_label = "new";
			}

			if (route.includes("dashboard-view")){
				tap_id = tap_id.replace(/\/?dashboard-view\/?/g, "");
				safe_label = route.replace(/\/?app\/?/g, "").replace(/\/?dashboard-view\/?/g, "dashboard").replace(/[ /]/g, "-");
				display_label = display_label.replace(/\/?dashboard-view\/?/g, "").replace(/\/?[-/]\/?/g, "");
				lable_if = lable_if.replace(/\/?dashboard-view\/?/g, "");
				status_label = null;
				status_label = "dashboard";
			}
			
			if (route.includes("query-report")){
				tap_id = tap_id.replace(/\/?query-report\/?/g, "");
				safe_label = route.replace(/\/?app\/?/g, "").replace(/\/?query-report\/?/g, "Report ").replace(/[ ]/g, "-");
				status_label = null;
				status_label = "Report";
			}
			
			if (status_label == "new") {
				console.log(`click 1.1`);
				display_label = `${__(display_label)} ${__(status_label)}`;
			} else if (status_label !== null) {
				console.log(`click 1.2`);
				display_label = `${__(status_label)} ${__(display_label)}`;
			}

			let app_lap = `${__(this.link_to)}`;
			console.log(`app_lap ${app_lap}`);
			let app = app_lap.replace(/ /g, "-");
			safe_label = safe_label.split(' ').map(word => {
				return word.charAt(0).toLowerCase() +
				word.slice(1).toLowerCase();}).join(' ');
			
			let topLinksContainer = $("#page-Workspaces .layout-main .top-buttons");
			if (!topLinksContainer.find(`[data-href='${safe_label}']`).length) {
				let link = $(`
					<div page="page-pa-${safe_label}" sup-name="null" name="pa-${app}" class="nav-btn-os div-${safe_label}">
						<div style="display: inline-flex;">
							<button style="vertical-align: text-bottom; padding: 0px; border: 0; background: #ffffff00; margin: 0px;" class="btn-top-op hidden">
								<svg class="es-icon es-line  icon-sm" style="stroke: #000000 !important;" aria-hidden="true">
									<use class="" href="#es-line-down"></use>
								</svg>
							</button>
							<a class="cl-btn btn-${safe_label}" type="Link" data-href="${safe_label}">
								${__(display_label)}
							</a>
							<a class="close-${safe_label} close-all" style="cursor: pointer;">
								<svg style="width: 12px;" class="es-icon" aria-hidden="true">
									<use href="#es-small-close"></use>
								</svg>
							</a>
						</div>
						<div style="position: absolute; z-index: 6800; background: #006d77;
									width: max-content; text-align: -webkit-center; background: #fafafa;
									padding: 6px; border-bottom: solid #ff9800 2px; border-top: solid #0097a6 2px;" class="ulSitBtn hidden ul-${__(app)}">
						</div>
					</div>
				`);

				link.find(".close-all").click((e) => {
					link.remove();
					let btn_page = $('#page-Workspaces .sub-layout-main-section-wrapper');
					if (btn_page.find(`.page-pa-${safe_label}`).length){
						console.log("true");
						btn_page = $(`#page-Workspaces .sub-layout-main-section-wrapper .page-pa-${safe_label}`).attr('page-name-cl');
						if (btn_page === `page-pa-${safe_label}`){
							btn_page = $('#page-Workspaces .sub-layout-main-section-wrapper');
							btn_page.find(`.page-pa-${safe_label}`).hide();
						}
					} else {
						console.log("false");
					}
				});
	
				link.find(".cl-btn").click((e) => {
					topLinksContainer.find(".nav-btn-os").removeClass("active_btn_top");
					topLinksContainer.find(".nav-btn-os").removeClass("active_sup_btn_top");
					link.attr("sup-name" , 'null');
					link.addClass("active_btn_top");
					frappe.set_route(route);
				});

				link.find(".btn-top-op").click((e) => {
					link.find(`.ulSitBtn`).toggleClass("hidden");
				});

				link.find(".ulSitBtn").hover(
					function () {
						link.find(`.ulSitBtn`).removeClass("hidden");
					},
					function () {
						link.find(`.ulSitBtn`).addClass("hidden");
					}
				);
	
				topLinksContainer.find(".nav-btn-os").removeClass("active_btn_top");
				topLinksContainer.find(".nav-btn-os").removeClass("active_sup_btn_top");
				link.addClass("active_btn_top");
				topLinksContainer.prepend(link);
				if (window.matchMedia("(max-width: 991px)").matches) {
					if ($("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display") === "none") {
						$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display", "block");
						$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "flex");
					} else {
						$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display", "none");
						$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "none");
					}
				
					let mainsidebar = $('#page-Workspaces .page-body .page-wrapper .page-content .layout-main');
					mainsidebar.find(".layout-main-section-wrapper").toggleClass("opened");
				}
			} else {
				topLinksContainer.find(".nav-btn-os").removeClass("active_btn_top");
				topLinksContainer.find(".nav-btn-os").removeClass("active_sup_btn_top");
				topLinksContainer.find(`.div-${safe_label}`).addClass("active_btn_top");
				if (window.matchMedia("(max-width: 991px)").matches) {
					if ($("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display") === "none") {
						$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display", "block");
						$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "flex");
					} else {
						$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .main-side").css("display", "none");
						$("#page-Workspaces .page-body .page-wrapper .page-content .layout-main .lay_sid_pare").css("display", "none");
					}
				
					let mainsidebar = $('#page-Workspaces .page-body .page-wrapper .page-content .layout-main');
					mainsidebar.find(".layout-main-section-wrapper").toggleClass("opened");
				}
			}


			//////////////////////////////////////////////////////////////////////////////

			let filters = frappe.utils.get_filter_from_json(this.stats_filter);
			if (this.type == "DocType" && filters) {
				frappe.route_options = filters;
			}

			if (e.ctrlKey || e.metaKey) {
				frappe.open_in_new_tab = true;
			}

			if (this.type == "URL") {
				if (frappe.open_in_new_tab) {
					window.open(this.url, "_blank");
					frappe.open_in_new_tab = false;
				} else {
					window.location.href = this.url;
				}
				return;
			}

			frappe.set_route(route);
		});
	}

	set_actions() {
		if (this.in_customize_mode) return;

		$(frappe.utils.icon("es-line-arrow-up-right", "xs", "", "", "ml-2")).appendTo(
			this.action_area
		);

		this.widget.addClass("shortcut-widget-box");

		// Make it tabbable
		this.widget.attr({
			role: "link",
			tabindex: 0,
			"aria-label": this.label,
		});

		let filters = frappe.utils.process_filter_expression(this.stats_filter);

		if (this.type == "DocType" && this.doc_view != "New" && filters) {
			frappe.db
				.count(this.link_to, {
					filters: filters,
				})
				.then((count) => this.set_count(count));
		}
	}

	set_count(count) {
		const get_label = () => {
			if (this.format) {
				return __(this.format).replace(/{}/g, count);
			}
			return count;
		};

		this.action_area.empty();
		const label = get_label();
		let color = this.color && count ? this.color.toLowerCase() : "gray";
		$(
			`<div class="indicator-pill no-indicator-dot ellipsis ${color}">${label}</div>`
		).appendTo(this.action_area);

		$(frappe.utils.icon("es-line-arrow-up-right", "xs", "", "", "ml-2")).appendTo(
			this.action_area
		);
	}
}
