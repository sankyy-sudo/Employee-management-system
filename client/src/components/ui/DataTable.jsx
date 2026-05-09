import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import EmptyState from "./EmptyState";

export default function DataTable({
  columns,
  rows = [],
  empty = "No records found.",
  searchable = false,
  searchPlaceholder = "Search",
  pageSize = 8,
  className = ""
}) {
  const [sort, setSort] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const source = term
      ? rows.filter((row) => columns.some((column) => String(column.searchValue?.(row) ?? row[column.key] ?? "").toLowerCase().includes(term)))
      : rows;

    if (!sort) return source;
    const column = columns.find((item) => item.key === sort.key);
    return [...source].sort((a, b) => {
      const left = column?.sortValue?.(a) ?? a[sort.key] ?? "";
      const right = column?.sortValue?.(b) ?? b[sort.key] ?? "";
      return String(left).localeCompare(String(right), undefined, { numeric: true }) * (sort.direction === "asc" ? 1 : -1);
    });
  }, [columns, query, rows, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  return (
    <div className={`min-w-0 ${className}`}>
      {searchable && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Search size={16} className="text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 dark:text-slate-100"
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="max-h-[620px] min-w-0 overflow-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 text-slate-500 backdrop-blur dark:bg-slate-950/95 dark:text-slate-400">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {columns.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                    <button
                      type="button"
                      disabled={column.sortable === false}
                      onClick={() => column.sortable === false ? undefined : toggleSort(column.key)}
                      className="inline-flex items-center gap-1 rounded-lg text-left transition hover:text-slate-950 disabled:cursor-default disabled:hover:text-slate-500 dark:hover:text-white"
                    >
                      {column.label}
                      {sort?.key === column.key && (sort.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row._id || row.id || index} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-4 align-middle text-slate-700 dark:text-slate-300">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredRows.length && <div className="p-4"><EmptyState title={empty} /></div>}

        {filteredRows.length > pageSize && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-500 dark:text-slate-400">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-xl border border-slate-200 px-3 py-2 font-semibold disabled:opacity-50 dark:border-slate-800">Previous</button>
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount} className="rounded-xl border border-slate-200 px-3 py-2 font-semibold disabled:opacity-50 dark:border-slate-800">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
