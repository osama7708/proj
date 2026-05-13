import Widget from "./base_widget.js";
import "../ui/workspace_tabs";

frappe.provide("frappe.utils");

export default class ShortcutWidget extends Widget {
	constructor(opts) {
		opts.shadow = true;
		super(opts);
	}

	build_route(doc_view = this.doc_view) {
		return frappe.utils.generate_route({
			route: this.route,
			name: this.link_to,
			type: this.type,
			is_query_report: this.is_query_report,
			doctype: this.ref_doctype,
			doc_view: doc_view,
			kanban_board: this.kanban_board,
		});
	}

	apply_route_filters() {
		let filters = frappe.utils.get_filter_from_json(this.stats_filter);
		if (this.type == "DocType" && filters) {
			frappe.route_options = filters;
		}
	}

	handle_url_navigation(e) {
		if (this.type != "URL") return false;

		if (e.ctrlKey || e.metaKey) {
			frappe.open_in_new_tab = true;
		}

		if (frappe.open_in_new_tab) {
			window.open(this.url, "_blank");
			frappe.open_in_new_tab = false;
		} else {
			window.location.href = this.url;
		}

		return true;
	}

	trigger_shortcut(route, e) {
		this.apply_route_filters();

		if (this.handle_url_navigation(e)) {
			return;
		}

		if (e.ctrlKey || e.metaKey) {
			frappe.open_in_new_tab = true;
		}

		frappe.set_route(route);
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

				let route = this.build_route("List");
				this.trigger_shortcut(route, e);
			});
		} else {
			action_list.remove();
		}

		
		action_widget.click((e) => {
			if (this.in_customize_mode) return;

			let route = this.build_route();
			this.trigger_shortcut(route, e);
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
