import type { CSSProperties } from 'react';
import { AccessibleDataProps } from './IAccessibleChartData';

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function AccessibleChartData({ caption, headers, rows }: AccessibleDataProps) {
  return (
    <div className="sr-only" style={visuallyHidden}>
      <table>
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
    </div>
  );
}
