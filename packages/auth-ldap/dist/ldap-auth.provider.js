"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LdapAuthProvider = void 0;
const core_1 = require("@foxframework/core");
function loadLdapts() {
    try {
        return require('ldapts');
    }
    catch {
        throw new core_1.DirectoryError('ldapts is not installed. Run: npm install ldapts');
    }
}
class LdapAuthProvider {
    constructor(config) {
        this.name = 'ldap';
        this._client = null;
        this._connected = false;
        this.cfg = config;
        this.usernameAttr = config.usernameAttribute ?? 'sAMAccountName';
        this.emailAttr = config.emailAttribute ?? 'mail';
        this.displayNameAttr = config.displayNameAttribute ?? 'cn';
        this.groupAttr = config.groupAttribute ?? 'memberOf';
        this.userFilter = config.userFilter ?? '(objectClass=person)';
    }
    get isConnected() {
        return this._connected;
    }
    // -------------------------------------------------------------------------
    // IDirectoryProvider — lifecycle
    // -------------------------------------------------------------------------
    async connect() {
        const { Client } = loadLdapts();
        this._client = new Client({ url: this.cfg.url });
        await this._client.bind(this.cfg.bindDn, this.cfg.bindPassword);
        this._connected = true;
    }
    async disconnect() {
        if (this._client) {
            await this._client.unbind().catch(() => { });
            this._client = null;
        }
        this._connected = false;
    }
    // -------------------------------------------------------------------------
    // IAuthProvider
    // -------------------------------------------------------------------------
    async authenticate(credentials) {
        const username = credentials.username ?? credentials.email;
        if (!username || !credentials.password)
            throw new core_1.InvalidCredentialsError();
        // Find the user DN first using the service bind
        const user = await this.getUser(username);
        if (!user)
            throw new core_1.InvalidCredentialsError();
        // Now try to bind with the user's credentials
        const { Client } = loadLdapts();
        const tempClient = new Client({ url: this.cfg.url });
        try {
            await tempClient.bind(user.dn, credentials.password);
        }
        catch {
            throw new core_1.InvalidCredentialsError();
        }
        finally {
            await tempClient.unbind().catch(() => { });
        }
        const authUser = this._directoryUserToAuthUser(user);
        // LDAP doesn't issue tokens — return a minimal AuthToken marker
        const token = {
            accessToken: `ldap:${user.id}:${Date.now()}`,
            tokenType: 'ldap',
            expiresIn: 0,
            issuedAt: new Date().toISOString(),
        };
        return { status: 'authenticated', user: authUser, token };
    }
    async verify(token) {
        // LDAP tokens (as issued above) are session markers only.
        // Extract userId and look up the current directory entry.
        const parts = token.split(':');
        if (parts[0] !== 'ldap' || parts.length < 2) {
            const { DirectoryError: DE } = require('@foxframework/core');
            throw new DE('LDAP verify requires re-authentication');
        }
        const userId = parts[1];
        const user = await this.getUser(userId);
        if (!user)
            throw new Error(`User ${userId} not found in directory`);
        return this._directoryUserToAuthUser(user);
    }
    async refresh(_refreshToken) {
        throw new Error('LDAP does not support token refresh. Re-authenticate.');
    }
    async revoke(_token) {
        // LDAP is stateless — nothing to revoke
    }
    // -------------------------------------------------------------------------
    // IDirectoryProvider — search / sync
    // -------------------------------------------------------------------------
    async searchUsers(filter) {
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
    async getUser(usernameOrDn) {
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
        if (!searchEntries.length)
            return null;
        return this._entryToDirectoryUser(searchEntries[0]);
    }
    async getGroups(userId) {
        const user = await this.getUser(userId);
        return user?.groups ?? [];
    }
    async syncUsers(options = {}) {
        const store = this.cfg.store;
        if (!store)
            throw new core_1.DirectoryError('syncUsers requires a store to be configured');
        const start = Date.now();
        const result = { created: 0, updated: 0, deleted: 0, errors: [], durationMs: 0 };
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
                            });
                        }
                        result.updated++;
                    }
                    else {
                        if (!options.dryRun) {
                            await store.create({
                                username: entry.username,
                                email: entry.email,
                                displayName: entry.displayName,
                                roles: entry.groups,
                                permissions: [],
                                metadata: { ldapDn: entry.dn, ...entry.attributes },
                            });
                        }
                        result.created++;
                    }
                }
                catch (err) {
                    result.errors.push({ dn: entry.dn, error: err.message });
                }
            }
        }
        result.durationMs = Date.now() - start;
        return result;
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    _requireClient() {
        if (!this._client || !this._connected) {
            throw new core_1.DirectoryError('LdapAuthProvider: call connect() before any directory operation');
        }
        return this._client;
    }
    _buildFilter(filter) {
        if (filter.custom)
            return filter.custom;
        const parts = [this.userFilter];
        if (filter.username)
            parts.push(`(${this.usernameAttr}=${this._escapeFilter(filter.username)})`);
        if (filter.email)
            parts.push(`(${this.emailAttr}=${this._escapeFilter(filter.email)})`);
        if (filter.group)
            parts.push(`(${this.groupAttr}=${this._escapeFilter(filter.group)})`);
        return parts.length === 1 ? parts[0] : `(&${parts.join('')})`;
    }
    _entryToDirectoryUser(entry) {
        const str = (v) => (Array.isArray(v) ? v[0] : String(v ?? ''));
        const arr = (v) => Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];
        return {
            dn: str(entry['dn']),
            id: str(entry[this.usernameAttr] ?? entry['dn']),
            username: str(entry[this.usernameAttr]),
            email: str(entry[this.emailAttr]) || undefined,
            displayName: str(entry[this.displayNameAttr]) || undefined,
            firstName: str(entry['givenName']) || undefined,
            lastName: str(entry['sn']) || undefined,
            groups: arr(entry[this.groupAttr]),
            attributes: Object.fromEntries(Object.entries(entry)
                .filter(([k]) => k !== 'dn')
                .map(([k, v]) => [k, Array.isArray(v) ? v : String(v ?? '')])),
        };
    }
    _directoryUserToAuthUser(du) {
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
    _escapeFilter(value) {
        return value.replace(/[\\*()\x00]/g, (c) => `\\${c.charCodeAt(0).toString(16).padStart(2, '0')}`);
    }
    _adTimestamp(date) {
        // Active Directory generalized time format: YYYYMMDDHHmmss.0Z
        return date.toISOString().replace(/[-:T]/g, '').split('.')[0] + '.0Z';
    }
}
exports.LdapAuthProvider = LdapAuthProvider;
//# sourceMappingURL=ldap-auth.provider.js.map