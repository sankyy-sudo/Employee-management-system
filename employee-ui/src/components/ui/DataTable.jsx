export default function DataTable({ columns, rows, empty = "No records found." }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-slate-500">
            {columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap px-3 py-3 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id || row.id} className="border-b border-slate-100 last:border-0">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-3 text-slate-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="px-3 py-8 text-center text-sm text-slate-500">{empty}</p>}
    </div>
  );
}
