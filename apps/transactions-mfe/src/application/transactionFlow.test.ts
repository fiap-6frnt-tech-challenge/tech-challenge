import { describe, expect, it } from 'vitest';
import {
  initialFlowState,
  transactionFlow,
  type FlowEvent,
  type FlowState,
} from './transactionFlow';

type Draft = { description: string };

const draft: Draft = { description: 'Mercado' };
const receipt = new File(['a'], 'recibo.pdf', { type: 'application/pdf' });
const invoice = new File(['b'], 'nota.pdf', { type: 'application/pdf' });
const files = [receipt, invoice];

const states = {
  editing: { value: 'editing' },
  confirming: { value: 'confirming', draft, files },
  confirmingWithoutFiles: { value: 'confirming', draft, files: [] },
  saving: { value: 'saving', draft, files },
  savingWithoutFiles: { value: 'saving', draft, files: [] },
  uploading: {
    value: 'uploading',
    transactionId: 'tx-1',
    files,
    done: 1,
    total: 2,
    cancelling: false,
  },
  partialSuccess: { value: 'partialSuccess', transactionId: 'tx-1', failed: [invoice] },
  success: { value: 'success' },
  error: { value: 'error', draft, files, reason: 'falhou' },
  closed: { value: 'closed' },
} satisfies Record<string, FlowState<Draft>>;

const events = {
  SUBMIT: { type: 'SUBMIT', draft, files },
  CONFIRM: { type: 'CONFIRM' },
  BACK: { type: 'BACK' },
  SAVED: { type: 'SAVED', transactionId: 'tx-1' },
  FAILED: { type: 'FAILED', reason: 'falhou' },
  PROGRESS: { type: 'PROGRESS', done: 2 },
  UPLOADS_DONE: { type: 'UPLOADS_DONE', failed: [] },
  RETRY_FAILED: { type: 'RETRY_FAILED' },
  RETRY: { type: 'RETRY' },
  CANCEL: { type: 'CANCEL' },
  RESET: { type: 'RESET' },
} satisfies Record<FlowEvent<Draft>['type'], FlowEvent<Draft>>;

type StateName = keyof typeof states;
type EventName = keyof typeof events;

const validTransitions: [StateName, EventName, FlowState<Draft>][] = [
  ['editing', 'SUBMIT', { value: 'confirming', draft, files }],
  ['editing', 'CANCEL', { value: 'closed' }],
  ['confirming', 'CONFIRM', { value: 'saving', draft, files }],
  ['confirming', 'BACK', { value: 'editing' }],
  ['confirming', 'RESET', { value: 'editing' }],
  ['confirmingWithoutFiles', 'CONFIRM', { value: 'saving', draft, files: [] }],
  ['confirmingWithoutFiles', 'BACK', { value: 'editing' }],
  ['confirmingWithoutFiles', 'RESET', { value: 'editing' }],
  [
    'saving',
    'SAVED',
    { value: 'uploading', transactionId: 'tx-1', files, done: 0, total: 2, cancelling: false },
  ],
  ['saving', 'FAILED', { value: 'error', draft, files, reason: 'falhou' }],
  ['saving', 'RESET', { value: 'editing' }],
  ['savingWithoutFiles', 'SAVED', { value: 'success' }],
  ['savingWithoutFiles', 'FAILED', { value: 'error', draft, files: [], reason: 'falhou' }],
  ['savingWithoutFiles', 'RESET', { value: 'editing' }],
  [
    'uploading',
    'PROGRESS',
    { value: 'uploading', transactionId: 'tx-1', files, done: 2, total: 2, cancelling: false },
  ],
  ['uploading', 'UPLOADS_DONE', { value: 'success' }],
  [
    'uploading',
    'CANCEL',
    { value: 'uploading', transactionId: 'tx-1', files, done: 1, total: 2, cancelling: true },
  ],
  ['uploading', 'RESET', { value: 'editing' }],
  [
    'partialSuccess',
    'RETRY_FAILED',
    {
      value: 'uploading',
      transactionId: 'tx-1',
      files: [invoice],
      done: 0,
      total: 1,
      cancelling: false,
    },
  ],
  ['partialSuccess', 'CANCEL', { value: 'closed' }],
  ['partialSuccess', 'RESET', { value: 'editing' }],
  ['success', 'RESET', { value: 'editing' }],
  ['error', 'RETRY', { value: 'confirming', draft, files }],
  ['error', 'BACK', { value: 'editing' }],
  ['error', 'CANCEL', { value: 'closed' }],
  ['error', 'RESET', { value: 'editing' }],
  ['closed', 'RESET', { value: 'editing' }],
];

const valid = new Set(validTransitions.map(([state, event]) => `${state}:${event}`));
const invalidTransitions = (Object.keys(states) as StateName[]).flatMap((state) =>
  (Object.keys(events) as EventName[])
    .filter((event) => !valid.has(`${state}:${event}`))
    .map((event) => [state, event] as const)
);

describe('transactionFlow', () => {
  it('starts editing', () => {
    expect(initialFlowState).toEqual({ value: 'editing' });
  });

  it.each(validTransitions)('%s + %s → expected state', (state, event, expected) => {
    const next = transactionFlow<Draft>(states[state], events[event]);
    expect(next).toEqual(expected);
    expect(next).not.toBe(states[state]);
  });

  it.each(invalidTransitions)('%s ignores %s and keeps the same state', (state, event) => {
    expect(transactionFlow<Draft>(states[state], events[event])).toBe(states[state]);
  });

  it('ignores a second CONFIRM once saving, so a double click saves once', () => {
    const saving = transactionFlow<Draft>(states.confirming, events.CONFIRM);
    expect(transactionFlow<Draft>(saving, events.CONFIRM)).toBe(saving);
  });

  it('goes to partial success when any upload failed', () => {
    expect(
      transactionFlow<Draft>(states.uploading, { type: 'UPLOADS_DONE', failed: [invoice] })
    ).toEqual({ value: 'partialSuccess', transactionId: 'tx-1', failed: [invoice] });
  });

  it('keeps the same uploading state when progress does not change', () => {
    expect(transactionFlow<Draft>(states.uploading, { type: 'PROGRESS', done: 1 })).toBe(
      states.uploading
    );
  });

  it('clamps progress to the batch size', () => {
    const next = transactionFlow<Draft>(states.uploading, { type: 'PROGRESS', done: 9 });
    expect(next).toMatchObject({ done: 2, total: 2 });
  });

  it('keeps the files of the batch across progress updates', () => {
    const next = transactionFlow<Draft>(states.uploading, events.PROGRESS);
    expect(next.value === 'uploading' && next.files).toBe(files);
  });

  it('keeps the same state when cancelling twice', () => {
    const cancelling = transactionFlow<Draft>(states.uploading, events.CANCEL);
    expect(transactionFlow<Draft>(cancelling, events.CANCEL)).toBe(cancelling);
  });

  it('resets to the same editing state when already editing', () => {
    expect(transactionFlow<Draft>(states.editing, events.RESET)).toBe(states.editing);
  });
});
