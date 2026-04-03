# Day 49-50: Visual Consistency & UX

> **Depends on:** Day 43-45 accessibility changes must be applied first. `Modal.tsx` and `FeedbackModal.tsx` require `panelRef` (added in Day 43-45 Task 1) before Task 4 of this doc can be implemented.

## Goal

Fix the remaining UX gaps: wire the existing `EmptyState` component, expose and display fetch error state, and add entry animations to modals and the mobile nav drawer.

---

## Audit Summary

| #   | Issue                                                                                                                                         | Severity | File                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| 1   | `TransactionList` uses inline empty state with hardcoded non-DS colors instead of `EmptyState` component                                      | HIGH     | `TransactionList.tsx`                                                  |
| 2   | `fetchTransactions` silently swallows errors — no `isError` state exposed; user sees empty list instead of error message                      | HIGH     | `TransactionsContext.tsx`, `app/page.tsx`, `app/transactions/page.tsx` |
| 3   | Modal action buttons (`ConfirmTransactionModal`, `DeleteTransactionModal`) are `flex justify-end` — not mobile-friendly (missed in Day 46-48) | MEDIUM   | `ConfirmTransactionModal.tsx`, `DeleteTransactionModal.tsx`            |
| 4   | Modals appear instantly — no enter animation; jarring visual pop                                                                              | MEDIUM   | `Modal.tsx`, `FeedbackModal.tsx`                                       |
| 5   | Mobile nav drawer appears instantly — no slide animation                                                                                      | LOW      | `Header.tsx`                                                           |

**Already good:**

- CRUD error feedback via `FeedbackModal` (success/error after add/edit/delete) ✓
- Button `loading` spinner during submit ✓
- `Skeleton` / `SkeletonList` during initial data load ✓
- Form validation errors with helper text ✓
- Design tokens used consistently across all components (design system audit passed) ✓

---

## Execution Order

| Day    | Tasks                                                                  |
| ------ | ---------------------------------------------------------------------- |
| **49** | Task 1 (EmptyState) · Task 2 (isError) · Task 3 (Modal action buttons) |
| **50** | Task 4 (Modal animation) · Task 5 (Drawer animation)                   |

---

## Task 1 — Wire `EmptyState` in `TransactionList`

**File:** `components/features/TransactionList/TransactionList.tsx`

**Problem:** The empty state is an inline `<div>` with hardcoded colors (`border-gray-300`, `bg-white`, `text-gray-400`) — bypasses the design system. The `EmptyState` component already exists and is unused here.

**Fix:** Add the `EmptyState` import at the top of the file, then replace the inline block.

```tsx
// New import — add at the top of the file alongside the existing imports
import { EmptyState } from '@/components/ui/EmptyState';
```

```tsx
// Before (lines 24-29)
if (transactions.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white py-16 text-gray-400">
      <ReceiptText size={32} />
      <p className="text-sm">{emptyMessage}</p>
    </div>
  );
}

// After
if (transactions.length === 0) {
  return <EmptyState icon={<ReceiptText size={32} />} title={emptyMessage} />;
}
```

> Keep the `ReceiptText` import — it is still used as the `icon` prop in the new code.

---

## Task 2 — Expose `isError` from `TransactionsContext` and handle it in pages

**WCAG:** 4.1.3 Status Messages (error states must be communicated to the user)

### 2a — `context/TransactionsContext.tsx`

**Problem:** `fetchTransactions` uses a `finally` block but no `catch`. If `TransactionService.getAll()` throws, `isLoading` flips to `false` and `transactions` stays empty — the user sees an empty list, not an error.

Add `isError` state:

```tsx
// Add to interface
interface TransactionsContextValue {
  transactions: Transaction[];
  balance: number;
  recentTransactions: Transaction[];
  isLoading: boolean;
  isError: boolean; // ← add this
  addTransaction: (data: NewTransaction) => Promise<void>;
  updateTransaction: (id: string, data: UpdateTransaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}
```

```tsx
// Inside TransactionsProvider
const [isLoading, setIsLoading] = useState(true);
const [isError, setIsError] = useState(false); // ← add this

async function fetchTransactions() {
  setIsError(false);
  try {
    await new Promise((res) => setTimeout(res, 100));
    const data = await TransactionService.getAll();
    setTransactionsMap(new Map(data.map((t) => [t.id, t])));
  } catch {
    setIsError(true); // ← add this
  } finally {
    setIsLoading(false);
  }
}
```

```tsx
// In the Provider value
value={{
  transactions: getAll(transactions),
  balance: calculateBalance(transactions),
  recentTransactions: getRecent(transactions),
  isLoading,
  isError,                                         // ← add this
  addTransaction,
  updateTransaction,
  deleteTransaction,
}}
```

### 2b — `app/page.tsx`

Consume `isError` and show a fallback when data fails to load.

```tsx
// Before
const { transactions, balance, isLoading } = useTransactions();

// After
const { transactions, balance, isLoading, isError } = useTransactions();
```

Add an error state for both columns. Wrap the existing JSX:

```tsx
if (isError) {
  return (
    <EmptyState
      icon={<AlertCircle size={32} />}
      title="Não foi possível carregar os dados"
      description="Tente recarregar a página."
    />
  );
}

return (
  // ... existing layout
);
```

Add the import:

```tsx
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';
```

### 2c — `app/transactions/page.tsx`

Same pattern inside `TransactionsContent`:

```tsx
// Destructure isError
const { transactions, isLoading, isError, deleteTransaction, updateTransaction } =
  useTransactions();

// Before the return, add:
if (isError) {
  return (
    <EmptyState
      icon={<AlertCircle size={32} />}
      title="Não foi possível carregar as transações"
      description="Tente recarregar a página."
    />
  );
}
```

---

## Task 3 — Modal action buttons on mobile

**Files:** `components/features/ConfirmTransactionModal/ConfirmTransactionModal.tsx`, `components/features/DeleteTransactionModal/DeleteTransactionModal.tsx`

**Problem:** Both modals have `flex justify-end gap-sm` for their action buttons — same issue as `TransactionForm` (Day 46). These were missed in the responsiveness pass.

**Fix:** Same pattern — stack on mobile, row on `sm+`.

### `ConfirmTransactionModal.tsx`

```tsx
// Before (line 23)
<div className="flex justify-end gap-sm">

// After
<div className="flex flex-col gap-sm sm:flex-row sm:justify-end">
```

### `DeleteTransactionModal.tsx`

```tsx
// Before (line 22)
<div className="flex justify-end gap-sm">

// After
<div className="flex flex-col gap-sm sm:flex-row sm:justify-end">
```

With `flex-col`, buttons go full-width on mobile. On `sm+` they restore to a right-aligned row.

> The button order (Cancel first, then confirm/delete) is correct in the DOM — on mobile Cancel renders above, which is fine since the destructive action is at the bottom.

---

## Task 4 — Modal enter animation

**Files:** `app/globals.css`, `components/ui/Modal/Modal.tsx`, `components/ui/FeedbackModal/FeedbackModal.tsx`

> **Prerequisite:** This task assumes the Day 43-45 accessibility changes have already been applied to `Modal.tsx` and `FeedbackModal.tsx`. Specifically, both files must have `panelRef` attached to the panel `<div>` — that ref is referenced in the "before" snippets below. If Day 43-45 is not yet done, apply this task after it.

**Problem:** Modals mount instantly — the panel and backdrop just appear. Even a subtle fade-in makes the transition feel intentional rather than jarring.

**Pattern:** Because the modal unmounts when closed (`if (!isOpen) return null`), we can only animate the **enter**. Exit animation would require keeping the modal mounted while fading out — out of scope here. Enter-only animation is standard for most design systems.

### Step 1 — Add keyframes to `app/globals.css`

Append after the existing rules:

```css
@keyframes modal-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modal-panel-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

### Step 2 — Apply to `Modal.tsx`

Add the animation class to the backdrop and panel. The animation runs once on mount (which is when `isOpen` becomes true, since the component returns `null` otherwise).

```tsx
{
  /* Backdrop — before */
}
<div className="absolute inset-0 bg-content-primary/50" onClick={onClose} aria-hidden="true" />;

{
  /* Backdrop — after */
}
<div
  className="absolute inset-0 bg-content-primary/50 [animation:modal-backdrop-in_150ms_ease-out]"
  onClick={onClose}
  aria-hidden="true"
/>;
```

```tsx
{/* Panel — before */}
<div
  ref={panelRef}
  className={cn(
    'relative z-10 w-full max-w-[30rem] rounded-default bg-surface p-lg shadow-card',
    className
  )}
>

{/* Panel — after */}
<div
  ref={panelRef}
  className={cn(
    'relative z-10 w-full max-w-[30rem] rounded-default bg-surface p-lg shadow-card',
    '[animation:modal-panel-in_200ms_ease-out]',
    className
  )}
>
```

The Tailwind arbitrary property syntax `[animation:...]` applies the named keyframe inline without a utility class.

### Step 3 — Apply same classes to `FeedbackModal.tsx`

Same changes: `[animation:modal-backdrop-in_150ms_ease-out]` on the backdrop, `[animation:modal-panel-in_200ms_ease-out]` on the panel.

---

## Task 5 — Mobile nav drawer transition

**File:** `components/ui/Header/Header.tsx`

**Problem:** The mobile nav drawer (`fixed inset-0 top-16 z-30 bg-brand-dark`) appears instantly on hamburger click.

**Fix:** Add a slide-down + fade animation using the same keyframe approach.

### Step 1 — Add keyframe to `app/globals.css`

```css
@keyframes drawer-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Step 2 — Apply to the drawer div in `Header.tsx`

```tsx
{
  /* Before */
}
{
  menuOpen && (
    <div
      id="mobile-nav"
      className="fixed inset-0 top-16 z-30 bg-brand-dark sm:hidden"
      role="dialog"
      aria-label="Menu de navegação"
    >
      <Sidebar onLinkClick={() => setMenuOpen(false)} />
    </div>
  );
}

{
  /* After */
}
{
  menuOpen && (
    <div
      id="mobile-nav"
      className="fixed inset-0 top-16 z-30 bg-brand-dark sm:hidden [animation:drawer-in_200ms_ease-out]"
      role="dialog"
      aria-label="Menu de navegação"
    >
      <Sidebar onLinkClick={() => setMenuOpen(false)} />
    </div>
  );
}
```

---

## Final `globals.css` additions (all keyframes together)

Place these at the bottom of `app/globals.css`, after the existing `:focus-visible` rule:

```css
@keyframes modal-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modal-panel-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes drawer-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Manual Testing Checklist

- [x] `TransactionList` with no transactions: `EmptyState` renders with icon and message, no gray border, no hardcoded colors
- [x] `TransactionList` on transactions page with all filters set to no match: same `EmptyState` renders
- [x] Home page when `isError = true`: `EmptyState` with alert icon renders instead of BalanceCard/list
- [x] Transactions page when `isError = true`: `EmptyState` renders instead of the list
- [x] Open any modal: backdrop fades in over 150ms, panel scales + fades in over 200ms — smooth, not jarring
- [x] Open `FeedbackModal`: same animation
- [x] Tap hamburger menu on mobile: drawer slides down and fades in over 200ms
- [ ] On slow CPU (DevTools → Performance → CPU throttle 4x): animations still feel snappy, not laggy
- [x] `ConfirmTransactionModal` on 375px: buttons are stacked full-width
- [x] `DeleteTransactionModal` on 375px: buttons are stacked full-width; "Excluir" (danger action) is at the bottom
