/**
 * LdapAuthProvider — IDirectoryProvider implementation via ldapts.
 *
 * Capabilities:
 *  - authenticate(): bind with user credentials (verify DN/password)
 *  - verify(): not applicable for LDAP; throws with guidance
 *  - refresh() / revoke(): no-ops (LDAP is stateless)
 *  - connect() / disconnect(): manage ldapts client lifecycle
 *  - searchUsers(): LDAP search with filter
 *  - getUser(): single user by username or DN
 *  - getGroups(): memberOf / group membership
 *  - syncUsers(): batch sync to IUserStore
 *
 * ldapts is a peer dependency — loaded lazily to avoid hard failure when not installed.
 */

import type {
  IDirectoryProvider,
  AuthUser,
  AuthToken,
  AuthResult,
  Credentials,
  DirectoryUser,
  DirectoryFilter,
  SyncOptions,
  SyncResult,
  IUserStore,
  CreateUserInput,
  UpdateUserInput,
} from '@foxframework/core';
import { InvalidCredentialsError, DirectoryError } from '@foxframework/core';

export interface LdapAuthProviderConfig {
  /** LDAP server URL, e.g. ldap://dc.example.com or ldaps://dc.example.com */
  url: string;
  /** Base DN for user searches, e.g. 'ou=users,dc=example,dc=com' */
  baseDn: string;
  /** DN of the service account for bind operations */
  bindDn: string;
  /** Service account password */
  bindPassword: string;
  /** Attribute used as username. Default: 'sAMAccountName' (AD) or 'uid' */
  usernameAttribute?: string;
  /** Attribute for email. Default: 'mail' */
  emailAttribute?: string;
  /** Attribute for display name. Default: 'cn' */
  displayNameAttribute?: string;
  /** Attribute for groups/membership. Default: 'memberOf' */
  groupAttribute?: string;
  /** Object class filter. Default: '(objectClass=person)' */
  userFilter?: string;
  /** Optional user store for sync operations */
  store?: IUserStore;
}

// Minimal ldapts type stubs (to avoid hard import)
type LdaptsClient = {
  bind(dn: string, password: string): Promise<void>;
  unbind(): Promise<void>;
  search(base: string, options: Record<string, unknown>): Promise<{ searchEntries: Array<Record<string, unknown>> }>;
};

type LdaptsModule = {
  Client: new (options: { url: string; tlsOptions?: Record<string, unknown> }) => LdaptsClient;
};

function loadLdapts(): LdaptsModule {
  try {
    return require('ldapts') as LdaptsModule;
  } catch {
    throw new DirectoryError(
      'ldapts is not installed. Run: npm install ldapts',
    );
  }
}

export class LdapAuthProvider implements IDirectoryProvider {
  readonly name = 'ldap';

  private readonly cfg: LdapAuthProviderConfig;
  private readonly usernameAttr: string;
  private readonly emailAttr: string;
  private readonly displayNameAttr: string;
  private readonly groupAttr: string;
  private readonly userFilter: string;

  private _client: LdaptsClient | null = null;
  private _connected = false;

  constructor(config: LdapAuthProviderConfig) {
    this.cfg = config;
    this.usernameAttr = config.usernameAttribute ?? 'sAMAccountName';
    this.emailAttr = config.emailAttribute ?? 'mail';
    this.displayNameAttr = config.displayNameAttribute ?? 'cn';
    this.groupAttr = config.groupAttribute ?? 'memberOf';
    this.userFilter = config.userFilter ?? '(objectClass=person)';
  }

  get isConnected(): boolean {
    return this._connected;
  }

  // -------------------------------------------------------------------------
  // IDirectoryProvider — lifecycle
  // -------------------------------------------------------------------------

  async connect(): Promise<void> {
    const { Client } = loadLdapts();
    this._client = new Client({ url: this.cfg.url });
    await this._client.bind(this.cfg.bindDn, this.cfg.bindPassword);
    this._connected = true;
  }

  async disconnect(): Promise<void> {
    if (this._client) {
      await this._client.unbind().catch(() => {});
      this._client = null;
    }
    this._connected = false;
  }

  // -------------------------------------------------------------------------
  // IAuthProvider
  // -------------------------------------------------------------------------

  async authenticate(credentials: Credentials): Promise<AuthResult> {
    const username = credentials.username ?? credentials.email;
    if (!username || !credentials.password) throw new InvalidCredentialsError();

    // Find the user DN first using the service bind
    const user = await this.getUser(username);
    if (!user) throw new InvalidCredentialsError();

    // Now try to bind with the user's credentials
    const { Client } = loadLdapts();
    const tempClient = new Client({ url: this.cfg.url });
    try {
      await tempClient.bind(user.dn, credentials.password);
    } catch {
      throw new InvalidCredentialsError();
    } finally {
      await tempClient.unbind().catch(() => {});
    }

    const authUser = this._directoryUserToAuthUser(user);
    // LDAP doesn't issue tokens — return a minimal AuthToken marker
    const token: AuthToken = {
      accessToken: `ldap:${user.id}:${Date.now()}`,
      tokenType: 'ldap',
      expiresIn: 0,
      issuedAt: new Date().toISOString(),
    };
    return { status: 'authenticated', user: authUser, token };
  }

  async verify(token: string): Promise<AuthUser> {
    // LDAP tokens (as issued above) are session markers only.
    // Extract userId and look up the current directory entry.
    const parts = token.split(':');
    if (parts[0] !== 'ldap' || parts.length < 2) {
      const { DirectoryError: DE } = require('@foxframework/core') as typeof import('@foxframework/core');
      throw new DE('LDAP verify requires re-authentication');
    }
    const userId = parts[1];
    const user = await this.getUser(userId);
    if (!user) throw new Error(`User ${userId} not found in directory`);
    return this._directoryUserToAuthUser(user);
  }

  async refresh(_refreshToken: string): Promise<AuthToken> {
    throw new Error('LDAP does not support token refresh. Re-authenticate.');
  }

  async revoke(_token: string): Promise<void> {
    // LDAP is stateless — nothing to revoke
  }

  // -------------------------------------------------------------------------
  // IDirectoryProvider — search / sync
  // -------------------------------------------------------------------------

  async searchUsers(filter: DirectoryFilter): Promise<DirectoryUser[]> {
    const client = this._requireClient();
    const ldapFilter = this._buildFilter(filter);

    const { searchEntries } = await client.search(this.cfg.baseDn, {
      scope: 'sub',
      filter: ldapFilter,
      attributes: [
        'dn', this.usernameAttr, this.emailAttr, this.displayNameAttr,
        this.groupAttr, 'givenName', 'sn', 'objectGUID',
      ],
    });

    return searchEntries.map((e) => this._entryToDirectoryUser(e));
  }

  async getUser(usernameOrDn: string): Promise<DirectoryUser | null> {
    const client = this._requireClient();

    // If it looks like a DN, search by DN; otherwise by username attribute
    const isDn = usernameOrDn.toLowerCase().startsWith('cn=') ||
      usernameOrDn.toLowerCase().startsWith('uid=') ||
      usernameOrDn.toLowerCase().startsWith('ou=');

    const filter = isDn
      ? this.userFilter
      : `(&${this.userFilter}(${this.usernameAttr}=${this._escapeFilter(usernameOrDn)}))`;

    const base = isDn ? usernameOrDn : this.cfg.baseDn;

    const { searchEntries } = await client.search(base, {
      scope: isDn ? 'base' : 'sub',
      filter,
      attributes: [
        'dn', this.usernameAttr, this.emailAttr, this.displayNameAttr,
        this.groupAttr, 'givenName', 'sn',
      ],
    });

    if (!searchEntries.length) return null;
    return this._entryToDirectoryUser(searchEntries[0]);
  }

  async getGroups(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
    return user?.groups ?? [];
  }

  async syncUsers(options: SyncOptions = {}): Promise<SyncResult> {
    const store = this.cfg.store;
    if (!store) throw new DirectoryError('syncUsers requires a store to be configured');

    const start = Date.now();
    const result: SyncResult = { created: 0, updated: 0, deleted: 0, errors: [], durationMs: 0 };

    let filter = this.userFilter;
    if (options.since) {
      // Active Directory whenChanged filter
      const ts = this._adTimestamp(options.since);
      filter = `(&${this.userFilter}(whenChanged>=${ts}))`;
    }

    const entries = await this.searchUsers({ custom: filter });
    const batchSize = options.batchSize ?? 100;

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      for (const entry of batch) {
        try {
          const existing = await store.findOne({ username: entry.username });
          if (existing) {
            if (!options.dryRun) {
              await store.update(existing.id, {
                email: entry.email,
                displayName: entry.displayName,
                roles: entry.groups,
                metadata: { ldapDn: entry.dn, ...entry.attributes },
              } as UpdateUserInput);
            }
            result.updated++;
          } else {
            if (!options.dryRun) {
              await store.create({
                username: entry.username,
                email: entry.email,
                displayName: entry.displayName,
                roles: entry.groups,
                permissions: [],
                metadata: { ldapDn: entry.dn, ...entry.attributes },
              } as CreateUserInput);
            }
            result.created++;
          }
        } catch (err) {
          result.errors.push({ dn: entry.dn, error: (err as Error).message });
        }
      }
    }

    result.durationMs = Date.now() - start;
    return result;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _requireClient(): LdaptsClient {
    if (!this._client || !this._connected) {
      throw new DirectoryError('LdapAuthProvider: call connect() before any directory operation');
    }
    return this._client;
  }

  private _buildFilter(filter: DirectoryFilter): string {
    if (filter.custom) return filter.custom;
    const parts: string[] = [this.userFilter];
    if (filter.username) parts.push(`(${this.usernameAttr}=${this._escapeFilter(filter.username)})`);
    if (filter.email) parts.push(`(${this.emailAttr}=${this._escapeFilter(filter.email)})`);
    if (filter.group) parts.push(`(${this.groupAttr}=${this._escapeFilter(filter.group)})`);
    return parts.length === 1 ? parts[0] : `(&${parts.join('')})`;
  }

  private _entryToDirectoryUser(entry: Record<string, unknown>): DirectoryUser {
    const str = (v: unknown): string => (Array.isArray(v) ? v[0] : String(v ?? ''));
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];

    return {
      dn: str(entry['dn']),
      id: str(entry[this.usernameAttr] ?? entry['dn']),
      username: str(entry[this.usernameAttr]),
      email: str(entry[this.emailAttr]) || undefined,
      displayName: str(entry[this.displayNameAttr]) || undefined,
      firstName: str(entry['givenName']) || undefined,
      lastName: str(entry['sn']) || undefined,
      groups: arr(entry[this.groupAttr]),
      attributes: Object.fromEntries(
        Object.entries(entry)
          .filter(([k]) => k !== 'dn')
          .map(([k, v]) => [k, Array.isArray(v) ? v : String(v ?? '')]),
      ),
    };
  }

  private _directoryUserToAuthUser(du: DirectoryUser): AuthUser {
    return {
      id: du.id,
      email: du.email,
      displayName: du.displayName,
      username: du.username,
      roles: du.groups,
      permissions: [],
      metadata: { ldapDn: du.dn, ...du.attributes },
    };
  }

  private _escapeFilter(value: string): string {
    return value.replace(/[\\*()\x00]/g, (c) => `\\${c.charCodeAt(0).toString(16).padStart(2, '0')}`);
  }

  private _adTimestamp(date: Date): string {
    // Active Directory generalized time format: YYYYMMDDHHmmss.0Z
    return date.toISOString().replace(/[-:T]/g, '').split('.')[0] + '.0Z';
  }
}
