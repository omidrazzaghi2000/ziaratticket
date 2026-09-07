/*
 * پنل مدیریت — تبدیل جدول‌ها به کارت روی موبایل
 *
 * جنگو برای سلول‌های جدول برچسب ستون نمی‌گذارد؛ این اسکریپت عنوان هر ستون را
 * از سربرگ می‌خواند و روی سلول متناظر به‌صورت data-label می‌نشاند تا CSS بتواند
 * هر سطر را به یک کارت با «برچسب: مقدار» تبدیل کند.
 *
 * همه‌ی قابلیت‌ها حفظ می‌شود: چک‌باکس انتخاب سطر، لینک ویرایش، عملیات گروهی و
 * مرتب‌سازی (سربرگ‌ها روی موبایل به‌صورت نوار چیپ قابل کلیک نمایش داده می‌شوند).
 */
(function () {
  "use strict";

  function labelCells(table) {
    var headRow = table.tHead && table.tHead.rows[0];
    if (!headRow) return;

    var labels = [].map.call(headRow.cells, function (th) {
      // متن سربرگ بدون فلش‌های مرتب‌سازی
      var clone = th.cloneNode(true);
      [].forEach.call(clone.querySelectorAll(".sortoptions, .text-muted, svg, i"), function (n) {
        n.parentNode.removeChild(n);
      });
      return (clone.textContent || "").replace(/\s+/g, " ").trim();
    });

    [].forEach.call(table.tBodies, function (tbody) {
      [].forEach.call(tbody.rows, function (row) {
        [].forEach.call(row.cells, function (cell, i) {
          if (cell.hasAttribute("data-label")) return;
          var label = labels[i] || "";
          // ستون چک‌باکس انتخاب برچسب لازم ندارد
          if (cell.querySelector('input[type="checkbox"]')) {
            cell.setAttribute("data-select-cell", "");
            return;
          }
          cell.setAttribute("data-label", label);
          // اولین ستون دارای لینک، عنوان کارت می‌شود
          if (!row.hasAttribute("data-titled") && cell.querySelector("a")) {
            cell.setAttribute("data-card-title", "");
            row.setAttribute("data-titled", "");
          }
        });
      });
    });
    table.setAttribute("data-cards", "");
  }

  function apply() {
    [].forEach.call(document.querySelectorAll("table"), function (t) {
      // جدول‌های چیدمانی (بدون سربرگ) دست‌نخورده می‌مانند
      if (t.tHead && t.tHead.rows.length) labelCells(t);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
  // فهرست‌هایی که با ای‌جکس به‌روزرسانی می‌شوند
  document.addEventListener("formset:added", apply);
})();
