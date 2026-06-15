'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface MdxTableProps extends React.HTMLAttributes<HTMLTableElement> {
  children?: React.ReactNode;
}

export const MdxTable = memo(function MdxTable({
  children,
  className,
  ...props
}: MdxTableProps) {
  return (
    <div className="not-prose my-4 w-full overflow-x-auto">
      <table
        className={cn(
          'w-full border-collapse text-sm',
          'border border-border rounded-lg overflow-hidden',
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
});

export const MdxTableHead = memo(function MdxTableHead({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-muted/50', className)} {...props}>
      {children}
    </thead>
  );
});

export const MdxTableBody = memo(function MdxTableBody({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-border', className)} {...props}>
      {children}
    </tbody>
  );
});

export const MdxTableRow = memo(function MdxTableRow({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('transition-colors hover:bg-muted/30', className)} {...props}>
      {children}
    </tr>
  );
});

export const MdxTableHeader = memo(function MdxTableHeader({
  children,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
});

export const MdxTableCell = memo(function MdxTableCell({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-2.5 text-foreground', className)} {...props}>
      {children}
    </td>
  );
});
