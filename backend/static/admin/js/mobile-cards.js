/*
 * پنل مدیریت — اصلاحات ساختاری موبایل
 *
 *  ۱) تبدیل جدول‌ها به کارت: جنگو برای سلول‌های جدول برچسب ستون نمی‌گذارد؛
 *     این اسکریپت عنوان هر ستون را از سربرگ می‌خواند و روی سلول متناظر
 *     به‌صورت data-label می‌نشاند تا CSS بتواند هر سطر را به یک کارت
 *     «برچسب | مقدار» تبدیل کند.
 *  ۲) جمع‌کردن فیلترهای فهرست در یک آکاردئون تا داده‌ها بالاتر بیایند.
 *  ۳) افزودن برچسب و راهنما به کادر جستجوی فهرست که خالی و بی‌نام بود.
 *
 * همه‌ی قابلیت‌ها حفظ می‌شود: چک‌باکس انتخاب سطر، ستون‌های ویرایش‌پذیر،
 * لینک ویرایش، عملیات گروهی و مرتب‌سازی.
 */
(function () {
  "use strict";

  var MOBILE = "(max-width: 991.98px)";

  /* ── ۱) جدول → کارت ─────────────────────────────────────────── */

  // ستون‌هایی که ارزش خبری کمی دارند و ته کارت می‌روند
  var META_LABELS = /^(id|شناسه|#|pk)$/i;

  function headerLabels(headRow) {
    return [].map.call(headRow.cells, function (th) {
      var clone = th.cloneNode(true);
      [].forEach.call(clone.querySelectorAll(".sortoptions, .text-muted, svg, i"), function (n) {
        n.parentNode.removeChild(n);
      });
      return (clone.textContent || "").replace(/\s+/g, " ").trim();
    });
  }

  function labelCells(table) {
    var headRow = table.tHead && table.tHead.rows[0];
    if (!headRow) return;
    var labels = headerLabels(headRow);

    [].forEach.call(table.tBodies, function (tbody) {
      [].forEach.call(tbody.rows, function (row) {
        var titled = false;

        [].forEach.call(row.cells, function (cell, i) {
          if (cell.hasAttribute("data-label")) {
            titled = titled || cell.hasAttribute("data-card-title");
            return;
          }
          var label = labels[i] || "";

          // فقط ستون انتخاب سطرِ جنگو بدون برچسب می‌ماند. چک‌باکس‌های
          // ویرایش‌پذیر (list_editable) باید برچسب ستونشان را نگه دارند،
          // وگرنه در کارت یک مربع بی‌نام دیده می‌شود.
          if (cell.classList.contains("action-checkbox")) {
            cell.setAttribute("data-select-cell", "");
            cell.setAttribute("data-label", "");
            return;
          }

          cell.setAttribute("data-label", label);

          if (META_LABELS.test(label)) {
            cell.setAttribute("data-row-meta", "");
            return;                       // شناسه هیچ‌وقت عنوان کارت نمی‌شود
          }

          // عنوان کارت = اولین ستون لینک‌دارِ معنادار (نام رکورد، نه شماره‌اش)
          if (!titled && cell.querySelector("a") && !/^[\s۰-۹0-9.,-]*$/.test(cell.textContent || "")) {
            cell.setAttribute("data-card-title", "");
            titled = true;
          }
        });

        // اگر هیچ ستون متنی لینک‌داری نبود، به همان اولین لینک برمی‌گردیم
        if (!titled) {
          var first = row.querySelector("td[data-label] a, th[data-label] a");
          if (first) {
            var host = first.closest("td, th");
            host.setAttribute("data-card-title", "");
            host.removeAttribute("data-row-meta");
          }
        }
      });
    });

    table.setAttribute("data-cards", "");
  }

  /* ── ۲) آکاردئون فیلترها ────────────────────────────────────── */

  function collapseFilters() {
    var form = document.querySelector("#change-list-filters form#changelist-search");
    if (!form || form.querySelector("details.mobile-filters")) return;

    var groups = [].filter.call(form.querySelectorAll(":scope > .form-group"), function (g) {
      return g.querySelector("select.search-filter");
    });
    if (!groups.length) return;

    var active = groups.filter(function (g) {
      var s = g.querySelector("select.search-filter");
      return s && s.selectedIndex > 0 && s.value !== "";
    }).length;

    var details = document.createElement("details");
    details.className = "mobile-filters";
    if (active) details.open = true;

    var summary = document.createElement("summary");
    summary.textContent = "فیلترها";
    if (active) {
      var badge = document.createElement("span");
      badge.className = "badge-count";
      badge.textContent = String(active).replace(/[0-9]/g, function (d) {
        return "۰۱۲۳۴۵۶۷۸۹"[+d];
      });
      summary.appendChild(badge);
    }
    details.appendChild(summary);

    var body = document.createElement("div");
    body.className = "mobile-filters-body";
    details.appendChild(body);

    groups[0].parentNode.insertBefore(details, groups[0]);
    groups.forEach(function (g) { body.appendChild(g); });
  }

  function unwrapFilters() {
    var details = document.querySelector("details.mobile-filters");
    if (!details) return;
    var body = details.querySelector(".mobile-filters-body");
    while (body && body.firstChild) details.parentNode.insertBefore(body.firstChild, details);
    details.parentNode.removeChild(details);
  }

  /* ── ۳) کادر جستجوی فهرست ───────────────────────────────────── */

  function labelSearch() {
    var input = document.querySelector("#change-list-filters input[name='q']");
    if (!input || input.getAttribute("placeholder")) return;
    var text = "جستجو در این فهرست…";
    input.setAttribute("placeholder", text);
    input.setAttribute("aria-label", text);
    input.setAttribute("type", "search");
  }

  /* ── اجرا ───────────────────────────────────────────────────── */

  function apply() {
    [].forEach.call(document.querySelectorAll("table"), function (t) {
      // جدول‌های چیدمانی (بدون سربرگ) دست‌نخورده می‌مانند
      if (t.tHead && t.tHead.rows.length) labelCells(t);
    });
    labelSearch();
    if (window.matchMedia(MOBILE).matches) collapseFilters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }

  // چرخش صفحه یا تغییر اندازه پنجره: آکاردئون فقط مال موبایل است
  var mq = window.matchMedia(MOBILE);
  var onChange = function (e) { e.matches ? collapseFilters() : unwrapFilters(); };
  mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);

  // فهرست‌هایی که با ای‌جکس به‌روزرسانی می‌شوند
  document.addEventListener("formset:added", apply);
})();
