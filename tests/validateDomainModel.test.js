import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { runValidateCli } from '../src/validateDomainModel.js';

describe('runValidateCli', () => {
  let logSpy;
  let warnSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('lists available models when no argument is provided', () => {
    const result = runValidateCli([]);
    expect(result.status).toBe('listed');
    expect(result.models).toHaveLength(1);
    expect(result.models).toContain('realEstate');
    expect(logSpy).toHaveBeenCalledWith('Available models:');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('realEstate'));
  });

  it('validates the specified model and logs summary', () => {
    const result = runValidateCli(['realEstate']);

    expect(result.status).toBe('validated');
    expect(result.model.meta.domain).toBe('realEstate');
    expect(logSpy).toHaveBeenCalledWith('Domain model "realEstate" is valid.');
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Entities: \d+/));
  });
});
