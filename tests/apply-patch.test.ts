import { describe, it, expect } from 'vitest';
import { applyPatch } from '../src/core/apply-patch';

describe('applyPatch', () => {
  it('patches a nested field path', () => {
    const base = { payment: { type: 'COD', balance: 250 } };
    const result = applyPatch(base, { 'payment.type': 'BANK' }) as typeof base;
    expect(result.payment.type).toBe('BANK');
    expect(result.payment.balance).toBe(250);
  });

  it('patches an array index path', () => {
    const base = { basket: { products: [{ isFree: false }] } };
    const result = applyPatch(base, { 'basket.products.0.isFree': true }) as typeof base;
    expect(result.basket.products[0].isFree).toBe(true);
  });

  it('patches a field with null', () => {
    const base = { status: 'PENDING', payment: { type: 'COD' } };
    const result = applyPatch(base, { payment: null }) as typeof base;
    expect(result.payment).toBeNull();
  });

  it('patches a field with an object replacement', () => {
    const base = { payment: { type: 'COD' } };
    const result = applyPatch(base, { payment: { type: 'BANK', balance: 100 } }) as typeof base;
    expect(result.payment).toEqual({ type: 'BANK', balance: 100 });
  });

  it('patches a field with an array replacement', () => {
    const base = { tags: ['A'] };
    const result = applyPatch(base, { tags: ['A', 'B', 'C'] }) as typeof base;
    expect(result.tags).toEqual(['A', 'B', 'C']);
  });

  it('does not mutate the original base', () => {
    const base = { status: 'PENDING' };
    applyPatch(base, { status: 'COMPLETE' });
    expect(base.status).toBe('PENDING');
  });
});
