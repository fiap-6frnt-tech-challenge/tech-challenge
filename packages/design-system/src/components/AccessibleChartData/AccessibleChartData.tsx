import { AccessibleDataProps } from './IAccessibleChartData';

export function AccessibleChartData({ caption, headers, rows }: AccessibleDataProps) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            {row.map((val, colIdx) => (
              <td key={colIdx}>{val}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
