import Widget from "./base_widget.js";
import "../ui/workspace_tabs";

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
	
				const tabContext = frappe.ui.workspace_tabs.prepareRouteContext(route, this.link_to);
				frappe.ui.workspace_tabs.openPrimaryTab({
					safeLabel: tabContext.safeLabel,
					displayLabel: tabContext.displayLabel,
					dataHref: tabContext.safeLabel,
					pageName: `page-pa-${tabContext.safeLabel}`,
					name: `pa-${tabContext.appName}`,
					onActivate: () => frappe.set_route(route),
					onClose: () => frappe.ui.workspace_tabs.closePageByClass(`page-pa-${tabContext.safeLabel}`),
				});
				frappe.ui.workspace_tabs.handleMobileSidebarToggle();

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

			const tabContext = frappe.ui.workspace_tabs.prepareRouteContext(route, this.link_to);
				frappe.ui.workspace_tabs.openPrimaryTab({
					safeLabel: tabContext.safeLabel,
					displayLabel: tabContext.displayLabel,
					dataHref: tabContext.safeLabel,
					pageName: `page-pa-${tabContext.safeLabel}`,
					name: `pa-${tabContext.appName}`,
					onActivate: () => frappe.set_route(route),
					onClose: () => frappe.ui.workspace_tabs.closePageByClass(`page-pa-${tabContext.safeLabel}`),
				});
				frappe.ui.workspace_tabs.handleMobileSidebarToggle();

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
