import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { build } from '../src/build.js';

describe('build', () => {
  
  it('should kiss my ass', () => {
    build();
    expect(true).toBe(true);
  });

});
