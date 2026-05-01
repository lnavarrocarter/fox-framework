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
import type { IDirectoryProvider, AuthUser, AuthToken, AuthResult, Credentials, DirectoryUser, DirectoryFilter, SyncOptions, SyncResult, IUserStore } from '@foxframework/core';
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
export declare class LdapAuthProvider implements IDirectoryProvider {
    readonly name = "ldap";
    private readonly cfg;
    private readonly usernameAttr;
    private readonly emailAttr;
    private readonly displayNameAttr;
    private readonly groupAttr;
    private readonly userFilter;
    private _client;
    private _connected;
    constructor(config: LdapAuthProviderConfig);
    get isConnected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    authenticate(credentials: Credentials): Promise<AuthResult>;
    verify(token: string): Promise<AuthUser>;
    refresh(_refreshToken: string): Promise<AuthToken>;
    revoke(_token: string): Promise<void>;
    searchUsers(filter: DirectoryFilter): Promise<DirectoryUser[]>;
    getUser(usernameOrDn: string): Promise<DirectoryUser | null>;
    getGroups(userId: string): Promise<string[]>;
    syncUsers(options?: SyncOptions): Promise<SyncResult>;
    private _requireClient;
    private _buildFilter;
    private _entryToDirectoryUser;
    private _directoryUserToAuthUser;
    private _escapeFilter;
    private _adTimestamp;
}
//# sourceMappingURL=ldap-auth.provider.d.ts.map