import Widget from "./base_widget.js";
import { workspaceTabs } from "../ui/workspace_tabs.js";

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
				
				workspaceTabs.openOrActivatePrimaryTab({
					safeLabel: safe_label,
					displayLabel: display_label,
					app,
					route,
				});
	
	
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
			
			workspaceTabs.openOrActivatePrimaryTab({
				safeLabel: safe_label,
				displayLabel: display_label,
				app,
				route,
			});


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
