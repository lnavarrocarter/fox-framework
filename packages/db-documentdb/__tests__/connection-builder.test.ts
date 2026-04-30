import { buildDocumentDbUri } from '../src/connection-builder';
import { DocumentDbConfig } from '@foxframework/core';

function makeConfig(overrides: Partial<DocumentDbConfig> = {}): DocumentDbConfig {
  return {
    uri: 'mongodb://user:pass@localhost:27017/mydb',
    database: 'mydb',
    ...overrides,
  };
}

describe('buildDocumentDbUri', () => {
  it('returns uri unchanged when tls is false', () => {
    const config = makeConfig({ tls: false });
    expect(buildDocumentDbUri(config)).toBe('mongodb://user:pass@localhost:27017/mydb');
  });

  it('appends tls=true, retryWrites=false, readPreference=secondaryPreferred when tls is omitted', () => {
    const config = makeConfig();
    const result = buildDocumentDbUri(config);
    const url = new URL(result);
    expect(url.searchParams.get('tls')).toBe('true');
    expect(url.searchParams.get('retryWrites')).toBe('false');
    expect(url.searchParams.get('readPreference')).toBe('secondaryPreferred');
  });

  it('appends tls params when tls is explicitly true', () => {
    const config = makeConfig({ tls: true });
    const result = buildDocumentDbUri(config);
    const url = new URL(result);
    expect(url.searchParams.get('tls')).toBe('true');
  });

  it('appends tlsCAFile when tlsCaFile is provided', () => {
    const config = makeConfig({ tlsCaFile: '/path/to/ca.pem' });
    const result = buildDocumentDbUri(config);
    const url = new URL(result);
    expect(url.searchParams.get('tlsCAFile')).toBe('/path/to/ca.pem');
  });

  it('does not append tlsCAFile when tlsCaFile is not provided', () => {
    const config = makeConfig();
    const result = buildDocumentDbUri(config);
    const url = new URL(result);
    expect(url.searchParams.has('tlsCAFile')).toBe(false);
  });

  it('merges with existing query params without duplication', () => {
    const config = makeConfig({ uri: 'mongodb://host:27017/db?authSource=admin' });
    const result = buildDocumentDbUri(config);
    const url = new URL(result);
    expect(url.searchParams.get('authSource')).toBe('admin');
    expect(url.searchParams.get('tls')).toBe('true');
    // Ensure tls param not duplicated
    expect(result.split('tls=true').length - 1).toBe(1);
  });

  it('works with URI without auth', () => {
    const config = makeConfig({ uri: 'mongodb://localhost:27017/mydb' });
    const result = buildDocumentDbUri(config);
    const url = new URL(result);
    expect(url.searchParams.get('tls')).toBe('true');
    expect(url.hostname).toBe('localhost');
  });

  it('works with URI without port', () => {
    const config = makeConfig({ uri: 'mongodb://user:pass@docdb.cluster.amazonaws.com/mydb' });
    const result = buildDocumentDbUri(config);
    const url = new URL(result);
    expect(url.searchParams.get('tls')).toBe('true');
    expect(url.hostname).toBe('docdb.cluster.amazonaws.com');
  });
});
