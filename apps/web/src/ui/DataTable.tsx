import type { ReactNode } from 'react';
import { EmptyState } from './primitives';

type Column<Row> = { key: string; heading: string; cell: (row: Row) => ReactNode };
export function DataTable<Row>({ label, rows, columns, rowKey, empty, density = 'standard' }: { label: string; rows: readonly Row[]; columns: readonly Column<Row>[]; rowKey: (row: Row) => string; empty: string; density?: 'standard' | 'compact' }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return <div className="ui-table-region" role="region" aria-label={label} tabIndex={0}><table className={`ui-table ui-table-${density}`}><caption className="ui-sr-only">{label}</caption><thead><tr>{columns.map((column) => <th scope="col" key={column.key}>{column.heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key}>{column.cell(row)}</td>)}</tr>)}</tbody></table></div>;
}
