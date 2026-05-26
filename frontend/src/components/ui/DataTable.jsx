export const DataTable = ({ columns, data, keyField = "_id", onRowClick }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
      <thead className="bg-slate-50">
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className="px-4 py-3 font-medium text-slate-600"
              style={col.width ? { width: col.width } : undefined}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {data.map((row) => (
          <tr
            key={row[keyField]}
            onClick={() => onRowClick?.(row)}
            className={onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}
          >
            {columns.map((col) => (
              <td key={col.key} className="px-4 py-3 text-slate-800">
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
